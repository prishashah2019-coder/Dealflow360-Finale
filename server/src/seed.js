require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const {
  User, Customer, Product, Warehouse, Stock, DiscountConfig,
  SubscriptionPlan, UpsellRule, Quotation, Subscription, Invoice, Payment,
  CreditNote, AuditLog, PriceList,
} = require('./models');
const { computeBlendedRiskScore } = require('./services/riskScore');
const { suggestFulfillmentSplit, commitFulfillmentSplit } = require('./services/fulfillment');
const { generateBillingArtifacts } = require('./services/billing');

// Runs a draft quotation through the exact same business logic the live API
// uses (submit-for-approval -> approve every required step -> optionally
// suggest+accept fulfillment -> confirm), so seed demo data is guaranteed
// consistent with real app behavior instead of hand-computed numbers.
async function driveQuotationToStatus(quotation, targetStatus, { manager, finance, autoApprove = true } = {}) {
  const customer = await Customer.findById(quotation.customerId);
  const { blendedRiskScore, requiredRoles } = await computeBlendedRiskScore(quotation.lines, customer.tier);
  quotation.blendedRiskScore = blendedRiskScore;

  if (requiredRoles.length === 0) {
    quotation.status = 'Approved';
  } else {
    quotation.status = 'Pending Approval';
    quotation.approvals = requiredRoles.map((role, i) => ({ stepOrder: i + 1, approverRole: role, status: 'pending' }));
  }
  await quotation.save();
  if (targetStatus === 'Pending Approval' || !autoApprove) return quotation;

  for (const step of quotation.approvals) {
    step.status = 'approved';
    step.decidedAt = new Date();
    step.approverId = step.approverRole === 'finance' ? finance?._id : manager?._id;
    step.comment = 'Approved (seed data)';
  }
  if (quotation.approvals.length) quotation.status = 'Approved';
  await quotation.save();
  if (targetStatus === 'Approved') return quotation;

  const splits = await suggestFulfillmentSplit(quotation.lines);
  quotation.fulfillmentSplits = splits;
  await quotation.save();
  await commitFulfillmentSplit(splits);
  quotation.fulfillmentSplits.forEach((s) => { if (!s.isBackorder) s.status = 'accepted'; });
  await quotation.save();
  if (targetStatus === 'Confirmed-no-fulfillment') return quotation;

  quotation.status = 'Confirmed';
  await quotation.save();
  const invoices = await generateBillingArtifacts(quotation);
  return { quotation, invoices };
}

async function seed() {
  await connectDB();

  // Wipe everything, including deal data - quotations/subscriptions/invoices
  // reference User/Customer/Product _ids that are recreated below, so
  // partially reseeding (e.g. only the catalog) would orphan old deal data
  // against IDs that no longer exist.
  await Promise.all([
    User.deleteMany({}), Customer.deleteMany({}), Product.deleteMany({}),
    Warehouse.deleteMany({}), Stock.deleteMany({}), DiscountConfig.deleteMany({}),
    SubscriptionPlan.deleteMany({}), UpsellRule.deleteMany({}),
    Quotation.deleteMany({}), Subscription.deleteMany({}), Invoice.deleteMany({}),
    Payment.deleteMany({}), CreditNote.deleteMany({}), AuditLog.deleteMany({}),
    PriceList.deleteMany({}),
  ]);

  const pwd = await bcrypt.hash('password123', 10);

  const [rep, manager, finance, admin] = await User.create([
    { name: 'Dana Rep', email: 'rep@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
    { name: 'Morgan Manager', email: 'manager@dealflow360.com', passwordHash: pwd, role: 'sales_manager' },
    { name: 'Farrah Finance', email: 'finance@dealflow360.com', passwordHash: pwd, role: 'finance' },
    { name: 'Alex Admin', email: 'admin@dealflow360.com', passwordHash: pwd, role: 'admin' },
  ]);

  const [acme, beta, delta] = await Customer.create([
    { name: 'Acme Corp', email: 'buyer@acme.com', passwordHash: pwd, tier: 'Gold', currency: 'USD' },
    { name: 'Beta Industries', email: 'buyer@beta.com', passwordHash: pwd, tier: 'Silver', currency: 'USD' },
    { name: 'Delta LLC', email: 'buyer@delta.com', passwordHash: pwd, tier: 'Bronze', currency: 'USD' },
  ]);

  const [laptop, mouse, dockingStation, setupService, carePlan] = await Product.create([
    {
      name: 'Laptop Pro 14', category: 'Hardware', basePrice: 1400, unit: 'unit', taxPct: 8, isSubscription: false,
      description: '14" business laptop, base configuration.',
      variants: [
        { attributeName: 'RAM', attributeValue: '8GB', extraPrice: 0 },
        { attributeName: 'RAM', attributeValue: '16GB', extraPrice: 150 },
        { attributeName: 'Color', attributeValue: 'Silver', extraPrice: 0 },
        { attributeName: 'Color', attributeValue: 'Black', extraPrice: 0 },
      ],
    },
    { name: 'Wireless Mouse', category: 'Hardware', basePrice: 40, unit: 'unit', taxPct: 8, isSubscription: false },
    { name: 'Docking Station', category: 'Hardware', basePrice: 120, unit: 'unit', taxPct: 8, isSubscription: false },
    { name: 'Onsite Setup Service', category: 'Services', basePrice: 300, unit: 'engagement', taxPct: 0, isSubscription: false },
    { name: 'Care Plan 2yr', category: 'Services', basePrice: 25, unit: 'month', taxPct: 0, isSubscription: true },
  ]);

  const [mainWarehouse, eastDepot] = await Warehouse.create([
    { name: 'Main Warehouse', shippingCostWeight: 1 },
    { name: 'East Depot', shippingCostWeight: 1.3 },
  ]);

  await Stock.create([
    { productId: laptop._id, warehouseId: mainWarehouse._id, qtyAvailable: 3, replenishmentRule: 'reorder at 2' },
    { productId: laptop._id, warehouseId: eastDepot._id, qtyAvailable: 5, replenishmentRule: 'reorder at 2' },
    { productId: mouse._id, warehouseId: mainWarehouse._id, qtyAvailable: 40, replenishmentRule: 'reorder at 10' },
    { productId: dockingStation._id, warehouseId: mainWarehouse._id, qtyAvailable: 15, replenishmentRule: 'reorder at 5' },
    { productId: setupService._id, warehouseId: mainWarehouse._id, qtyAvailable: 9999, replenishmentRule: 'n/a - service' },
  ]);

  await PriceList.create([
    { name: 'Bronze Standard', customerTier: 'Bronze', currency: 'USD', items: [{ productId: laptop._id, price: laptop.basePrice }] },
    { name: 'Gold Preferred', customerTier: 'Gold', currency: 'USD', items: [{ productId: laptop._id, price: Math.round(laptop.basePrice * 0.9) }] },
    { name: 'Gold Preferred EUR', customerTier: 'Gold', currency: 'EUR', items: [{ productId: laptop._id, price: Math.round(laptop.basePrice * 0.9 * 0.92) }] },
  ]);

  await DiscountConfig.create({
    tierCeilings: [
      { tierName: 'Bronze', maxDiscountPct: 5 },
      { tierName: 'Silver', maxDiscountPct: 10 },
      { tierName: 'Gold', maxDiscountPct: 15 },
    ],
    categoryCeilings: [
      { category: 'Hardware', maxDiscountPct: 15 },
      { category: 'Services', maxDiscountPct: 10 },
    ],
    approvalChainRules: [
      { minScore: 0, maxScore: 0, requiredRoles: [], label: 'Within tier/category limit - no approval needed' },
      { minScore: 0.0001, maxScore: 5, requiredRoles: ['sales_manager'], label: 'Over limit, blended risk medium - Sales Manager' },
      { minScore: 5.0001, maxScore: 999999, requiredRoles: ['sales_manager', 'finance'], label: 'Over limit, blended risk high - Sales Manager then Finance' },
    ],
  });

  const [carePlanMonthly] = await SubscriptionPlan.create([
    { name: 'Care Plan 2yr', billingCycle: 'monthly', prorationRule: 'daily_proration', cancellationRule: 'prorated_refund' },
    { name: 'Support SLA', billingCycle: 'quarterly', prorationRule: 'daily_proration', cancellationRule: 'prorated_refund' },
  ]);

  await UpsellRule.create([
    { sourceProductId: laptop._id, suggestedProductId: mouse._id, minMarginThreshold: 10, isPromoted: true },
    { sourceProductId: laptop._id, suggestedProductId: dockingStation._id, minMarginThreshold: 15, isPromoted: false },
    { sourceProductId: laptop._id, suggestedProductId: carePlan._id, minMarginThreshold: 20, isPromoted: true },
  ]);

  // --- Demo quotations spanning every pipeline stage, so every screen has
  // real data to show without a live demo having to build the whole flow
  // from an empty pipeline first. ---

  // 1) Draft - Acme Corp, untouched line-item builder in progress.
  await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [
      { productId: laptop._id, quantity: 1, unitPrice: laptop.basePrice, discountPct: 5, lineType: 'one_time' },
      { productId: mouse._id, quantity: 2, unitPrice: mouse.basePrice, discountPct: 0, lineType: 'one_time' },
    ],
  });

  // 2) Pending Approval - Beta Industries, Setup Service discount busts both
  // the Silver tier ceiling (10%) and the Services category ceiling (10%),
  // scoring high enough to require Sales Manager then Finance.
  const betaQuote = await Quotation.create({
    customerId: beta._id, salesRepId: rep._id, status: 'Draft',
    lines: [{ productId: setupService._id, quantity: 1, unitPrice: setupService.basePrice, discountPct: 22, lineType: 'one_time' }],
  });
  await driveQuotationToStatus(betaQuote, 'Pending Approval');
  await AuditLog.create({ entityType: 'Quotation', entityId: betaQuote._id, action: 'submitted_for_approval', userId: rep._id, reason: `risk score ${betaQuote.blendedRiskScore.toFixed(2)}` });

  // 3) Approved, fulfillment suggested but not yet accepted - Acme Corp
  // laptop order that will split across both warehouses (3 in Main + 2 more
  // needed from East Depot once qty > 3).
  const acmeFulfillQuote = await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [{ productId: laptop._id, quantity: 4, unitPrice: laptop.basePrice, discountPct: 12, lineType: 'one_time' }],
  });
  await driveQuotationToStatus(acmeFulfillQuote, 'Approved', { manager });
  const splits = await suggestFulfillmentSplit(acmeFulfillQuote.lines);
  acmeFulfillQuote.fulfillmentSplits = splits;
  await acmeFulfillQuote.save();

  // 4) Confirmed + paid - Delta LLC, straightforward one-time order.
  const deltaQuote = await Quotation.create({
    customerId: delta._id, salesRepId: rep._id, status: 'Draft',
    lines: [
      { productId: mouse._id, quantity: 10, unitPrice: mouse.basePrice, discountPct: 0, lineType: 'one_time' },
      { productId: dockingStation._id, quantity: 5, unitPrice: dockingStation.basePrice, discountPct: 0, lineType: 'one_time' },
    ],
  });
  const { invoices: deltaInvoices } = await driveQuotationToStatus(deltaQuote, 'Confirmed', { manager });
  const deltaInvoice = deltaInvoices[0];
  await Payment.create({ invoiceId: deltaInvoice._id, amount: deltaInvoice.amount, method: 'card' });
  deltaInvoice.status = 'Paid';
  await deltaInvoice.save();

  // 5) Confirmed hybrid order - Acme Corp, one-time laptop + recurring Care
  // Plan 2yr on the same order (Billing Detail / Subscriptions demo data).
  const acmeHybridQuote = await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [
      { productId: laptop._id, quantity: 1, unitPrice: laptop.basePrice, discountPct: 10, lineType: 'one_time' },
      { productId: carePlan._id, quantity: 1, unitPrice: carePlan.basePrice, discountPct: 0, lineType: 'recurring', subscriptionPlanId: carePlanMonthly._id },
    ],
  });
  await driveQuotationToStatus(acmeHybridQuote, 'Confirmed', { manager });

  // 6) Under Negotiation - Acme Corp, customer countered a discount through
  // the portal; this is the quotation "me" resolves to for buyer@acme.com
  // (most recently updated non-Draft quotation), ready for the negotiation
  // screen demo without any manual setup.
  const negotiationQuote = await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [{ productId: laptop._id, quantity: 1, unitPrice: laptop.basePrice, discountPct: 0, lineType: 'one_time' }],
  });
  await driveQuotationToStatus(negotiationQuote, 'Approved', { manager });
  const negotiatedLineId = negotiationQuote.lines[0]._id;
  negotiationQuote.negotiationComments.push({
    authorType: 'customer', lineId: negotiatedLineId,
    commentText: 'Can we get 20% off given the order size?', counterDiscountPct: 20,
  });
  negotiationQuote.lines[0].discountPct = 20;
  negotiationQuote.status = 'Under Negotiation';
  await negotiationQuote.save();

  console.log('Seed complete. Sample logins (password: password123):');
  console.log('  Sales Rep:      rep@dealflow360.com');
  console.log('  Sales Manager:  manager@dealflow360.com');
  console.log('  Finance:        finance@dealflow360.com');
  console.log('  Admin:          admin@dealflow360.com');
  console.log('  Customer (Acme Corp, Gold):     buyer@acme.com    <- has an "Under Negotiation" quote, use this for the portal demo');
  console.log('  Customer (Beta Industries, Silver): buyer@beta.com');
  console.log('  Customer (Delta LLC, Bronze):   buyer@delta.com');
  console.log('Products: Laptop Pro 14 (Hardware), Wireless Mouse (Hardware), Docking Station (Hardware),');
  console.log('          Onsite Setup Service (Services), Care Plan 2yr (Services, subscription)');
  console.log('Seeded quotations: Acme Draft, Beta Pending Approval (Mgr+Finance), Acme Approved');
  console.log('  w/ fulfillment split suggested, Delta Confirmed+Paid, Acme Confirmed hybrid');
  console.log('  (one-time + subscription), Acme Under Negotiation (portal demo).');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
