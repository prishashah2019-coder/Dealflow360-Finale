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

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randomInt(0, arr.length - 1)]; }
function daysAgo(n) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000); }
function inDays(n) { return new Date(Date.now() + n * 24 * 60 * 60 * 1000); }

function log(entityId, action, userId, reason = '', timestamp) {
  return AuditLog.create({ entityType: 'Quotation', entityId, action, userId, reason, ...(timestamp ? { timestamp } : {}) });
}

// Runs a draft quotation through the exact same business logic the live API
// uses (submit-for-approval -> approve every required step -> optionally
// suggest+accept fulfillment -> confirm), so seed demo data is guaranteed
// consistent with real app behavior instead of hand-computed numbers. Also
// writes the same AuditLog trail the live controllers would, so the Audit
// Trail / Audit Log screens have real history instead of empty tables.
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
  await log(quotation._id, 'submitted_for_approval', quotation.salesRepId, `risk score ${blendedRiskScore.toFixed(2)}`);
  if (targetStatus === 'Pending Approval' || !autoApprove) return quotation;

  for (const step of quotation.approvals) {
    step.status = 'approved';
    step.decidedAt = new Date();
    step.approverId = step.approverRole === 'finance' ? finance?._id : manager?._id;
    step.comment = 'Approved (seed data)';
    await log(quotation._id, 'approval_approve', step.approverId, step.comment);
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
  await log(quotation._id, 'fulfillment_accepted', finance?._id || manager?._id);
  if (targetStatus === 'Confirmed-no-fulfillment') return quotation;

  quotation.status = 'Confirmed';
  await quotation.save();
  const invoices = await generateBillingArtifacts(quotation);
  await log(quotation._id, 'confirmed', finance?._id || manager?._id);
  return { quotation, invoices };
}

// Submits for approval, then rejects at the first step - a Rejected quotation
// never goes through driveQuotationToStatus's happy path, so it needs its own
// short flow (still using the real risk-score calc so the numbers hold up).
async function driveToRejected(quotation, { manager, finance }) {
  const customer = await Customer.findById(quotation.customerId);
  const { blendedRiskScore, requiredRoles } = await computeBlendedRiskScore(quotation.lines, customer.tier);
  quotation.blendedRiskScore = blendedRiskScore;
  const roles = requiredRoles.length ? requiredRoles : ['sales_manager'];
  quotation.status = 'Pending Approval';
  quotation.approvals = roles.map((role, i) => ({ stepOrder: i + 1, approverRole: role, status: 'pending' }));
  await quotation.save();
  await log(quotation._id, 'submitted_for_approval', quotation.salesRepId, `risk score ${blendedRiskScore.toFixed(2)}`);

  const firstStep = quotation.approvals[0];
  firstStep.status = 'rejected';
  firstStep.decidedAt = new Date();
  firstStep.approverId = firstStep.approverRole === 'finance' ? finance?._id : manager?._id;
  firstStep.comment = 'Discount exceeds what we can support for this account right now.';
  quotation.status = 'Rejected';
  await quotation.save();
  await log(quotation._id, 'approval_reject', firstStep.approverId, firstStep.comment);
  return quotation;
}

// Scenario: Sales Manager approves, but Finance rejects afterwards - a
// two-step chain that doesn't make it all the way through, unlike the
// single-step rejection above (which never even reaches Finance).
async function driveToRejectedAtFinance(quotation, { manager, finance }) {
  const customer = await Customer.findById(quotation.customerId);
  const { blendedRiskScore } = await computeBlendedRiskScore(quotation.lines, customer.tier);
  quotation.blendedRiskScore = blendedRiskScore;
  quotation.status = 'Pending Approval';
  quotation.approvals = ['sales_manager', 'finance'].map((role, i) => ({ stepOrder: i + 1, approverRole: role, status: 'pending' }));
  await quotation.save();
  await log(quotation._id, 'submitted_for_approval', quotation.salesRepId, `risk score ${blendedRiskScore.toFixed(2)}`);

  const step1 = quotation.approvals[0];
  step1.status = 'approved';
  step1.decidedAt = new Date();
  step1.approverId = manager._id;
  step1.comment = 'Looks good from a discount-policy standpoint.';
  await quotation.save();
  await log(quotation._id, 'approval_approve', manager._id, step1.comment);

  const step2 = quotation.approvals[1];
  step2.status = 'rejected';
  step2.decidedAt = new Date();
  step2.approverId = finance._id;
  step2.comment = 'Margin does not clear our finance threshold after freight costs.';
  quotation.status = 'Rejected';
  await quotation.save();
  await log(quotation._id, 'approval_reject', finance._id, step2.comment);
  return quotation;
}

// Scenario: Sales Manager sends it back for revision instead of deciding
// outright - the quotation returns to Draft, matching what the live
// "Return for Revision" action does.
async function driveToReturned(quotation, { manager }) {
  const customer = await Customer.findById(quotation.customerId);
  const { blendedRiskScore, requiredRoles } = await computeBlendedRiskScore(quotation.lines, customer.tier);
  quotation.blendedRiskScore = blendedRiskScore;
  const roles = requiredRoles.length ? requiredRoles : ['sales_manager'];
  quotation.status = 'Pending Approval';
  quotation.approvals = roles.map((role, i) => ({ stepOrder: i + 1, approverRole: role, status: 'pending' }));
  await quotation.save();
  await log(quotation._id, 'submitted_for_approval', quotation.salesRepId, `risk score ${blendedRiskScore.toFixed(2)}`);

  const comment = 'Needs a tighter justification for this discount before I can approve - please revise and resubmit.';
  quotation.status = 'Draft';
  quotation.approvals = [];
  await quotation.save();
  await log(quotation._id, 'approval_return', manager._id, comment);
  return quotation;
}

// Drives to Approved, then layers a customer counter-discount request on top
// (mirrors what the portal's "Submit Request" action does live).
const NEGOTIATION_COMMENTS = [
  'Can we get a better rate given the order size?',
  'Our budget this quarter is tighter than expected - any flexibility here?',
  'We can commit to a longer term if the price comes down.',
  'Matching a competing quote we received would help us move forward.',
  'Would like to revisit pricing before we sign off.',
  'Need this to land under a hard budget cap this quarter - can you work with us?',
];
const REP_REPLIES = [
  'I can get you a bit more off if we lock in a 12-month term.',
  'Let me check with my manager and get back to you on that.',
  'I can match part of that - here is what I can offer.',
  'That is a bigger ask than I can approve alone, escalating now.',
];
async function driveToUnderNegotiation(quotation, { manager, finance }) {
  await driveQuotationToStatus(quotation, 'Approved', { manager, finance });
  const line = pick(quotation.lines);
  const counterPct = Math.min(90, (line.discountPct || 0) + randomInt(5, 20));
  quotation.negotiationComments.push({
    authorType: 'customer',
    lineId: line._id,
    commentText: pick(NEGOTIATION_COMMENTS),
    counterDiscountPct: counterPct,
    requestedDeliveryDate: Math.random() < 0.5 ? inDays(randomInt(5, 20)) : null,
  });
  line.discountPct = counterPct;
  quotation.status = 'Under Negotiation';
  await quotation.save();
  return quotation;
}

// Scenario: a rush order - customer counters with both a discount ask and a
// tight requested delivery date, ends Under Negotiation.
async function driveToRushNegotiation(quotation, { manager, finance }) {
  await driveQuotationToStatus(quotation, 'Approved', { manager, finance });
  const line = pick(quotation.lines);
  const counterPct = Math.min(90, (line.discountPct || 0) + randomInt(5, 15));
  quotation.negotiationComments.push({
    authorType: 'customer',
    lineId: line._id,
    commentText: 'We need this expedited - can you also move on price given the rush?',
    counterDiscountPct: counterPct,
    requestedDeliveryDate: inDays(randomInt(2, 6)),
  });
  line.discountPct = counterPct;
  quotation.status = 'Under Negotiation';
  await quotation.save();
  return quotation;
}

// Scenario: multi-round back-and-forth - customer asks, rep counters back in
// the thread (authorType 'rep'), and (60% of the time) the customer accepts
// the rep's counter and the deal confirms right there in the negotiation.
async function driveToMultiRoundNegotiation(quotation, { manager, finance, rep }) {
  await driveQuotationToStatus(quotation, 'Approved', { manager, finance });
  const line = pick(quotation.lines);

  const askPct = Math.min(90, (line.discountPct || 0) + randomInt(10, 20));
  quotation.negotiationComments.push({
    authorType: 'customer', lineId: line._id,
    commentText: pick(NEGOTIATION_COMMENTS), counterDiscountPct: askPct,
    requestedDeliveryDate: Math.random() < 0.4 ? inDays(randomInt(5, 15)) : null,
  });
  quotation.status = 'Under Negotiation';
  await quotation.save();

  const repCounter = Math.max(line.discountPct || 0, askPct - randomInt(3, 8));
  quotation.negotiationComments.push({
    authorType: 'rep', lineId: line._id,
    commentText: pick(REP_REPLIES), counterDiscountPct: repCounter,
  });
  await quotation.save();

  if (Math.random() < 0.6) {
    line.discountPct = repCounter;
    quotation.negotiationComments.push({
      authorType: 'customer', lineId: line._id,
      commentText: 'That works for us, thank you.', counterDiscountPct: null,
    });
    quotation.status = 'Confirmed';
    await quotation.save();
    const invoices = await generateBillingArtifacts(quotation);
    await log(quotation._id, 'confirmed', rep._id, 'Confirmed after negotiation (seed data)');
    return { quotation, invoices };
  }
  return { quotation, invoices: [] };
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

  // --- Core documented demo logins (unchanged - README/SPEC reference these
  // exact addresses) plus a realistic bench of extra users per role, so
  // every internal role has more than one person to pick in dropdowns
  // (approver, rep filter, etc.) and dashboards showing "your team" have
  // more than one row. ---
  const [rep, manager, finance, admin] = await User.create([
    { name: 'Dana Rep', email: 'rep@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
    { name: 'Morgan Manager', email: 'manager@dealflow360.com', passwordHash: pwd, role: 'sales_manager' },
    { name: 'Farrah Finance', email: 'finance@dealflow360.com', passwordHash: pwd, role: 'finance' },
    { name: 'Alex Admin', email: 'admin@dealflow360.com', passwordHash: pwd, role: 'admin' },
  ]);

  const extraReps = await User.create([
    { name: 'Priya Nair', email: 'priya.nair@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
    { name: 'Sam Torres', email: 'sam.torres@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
    { name: 'Jordan Lee', email: 'jordan.lee@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
    { name: 'Casey Kim', email: 'casey.kim@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
    { name: 'Riley Chen', email: 'riley.chen@dealflow360.com', passwordHash: pwd, role: 'sales_rep' },
  ]);
  const extraManagers = await User.create([
    { name: 'Avery Brooks', email: 'avery.brooks@dealflow360.com', passwordHash: pwd, role: 'sales_manager' },
    { name: 'Jamie Ortiz', email: 'jamie.ortiz@dealflow360.com', passwordHash: pwd, role: 'sales_manager' },
    { name: 'Taylor Reyes', email: 'taylor.reyes@dealflow360.com', passwordHash: pwd, role: 'sales_manager' },
  ]);
  const extraFinance = await User.create([
    { name: 'Jordan Blake', email: 'jordan.blake@dealflow360.com', passwordHash: pwd, role: 'finance' },
    { name: 'Casey Patel', email: 'casey.patel@dealflow360.com', passwordHash: pwd, role: 'finance' },
    { name: 'Riley Summers', email: 'riley.summers@dealflow360.com', passwordHash: pwd, role: 'finance' },
  ]);
  const extraAdmins = await User.create([
    { name: 'Jess Osei', email: 'jess.osei@dealflow360.com', passwordHash: pwd, role: 'admin' },
  ]);

  const allReps = [rep, ...extraReps];
  const allManagers = [manager, ...extraManagers];
  const allFinance = [finance, ...extraFinance];
  const allAdmins = [admin, ...extraAdmins];

  const [acme, beta, delta] = await Customer.create([
    { name: 'Acme Corp', email: 'buyer@acme.com', passwordHash: pwd, tier: 'Gold', currency: 'USD' },
    { name: 'Beta Industries', email: 'buyer@beta.com', passwordHash: pwd, tier: 'Silver', currency: 'USD' },
    { name: 'Delta LLC', email: 'buyer@delta.com', passwordHash: pwd, tier: 'Bronze', currency: 'USD' },
  ]);

  const EXTRA_CUSTOMER_NAMES = [
    'Northwind Traders', 'Harborline Foods', 'Cascade Retailers', 'Vertex Manufacturing',
    'Bluepeak Logistics', 'Summit Health Group', 'Ironclad Security', 'Meridian Software',
    'Solstice Energy', 'Fairview Hospitality', 'Crestline Analytics', 'Oakridge Financial',
    'Pinnacle Robotics', 'Silverline Media', 'Redwood Biotech', 'Amberfield Retail',
    'Lakeshore Telecom',
  ];
  const TIER_CYCLE = ['Gold', 'Silver', 'Bronze'];
  const extraCustomers = await Customer.create(
    EXTRA_CUSTOMER_NAMES.map((name, i) => ({
      name,
      email: `buyer@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      passwordHash: pwd,
      tier: TIER_CYCLE[i % TIER_CYCLE.length],
      currency: 'USD',
    }))
  );
  const allCustomers = [acme, beta, delta, ...extraCustomers];

  // Brand-new customers with zero orders - deliberately never given a single
  // quotation below, so the "just onboarded, nothing in the pipeline yet"
  // situation is represented (an empty portal / no purchase history).
  const FRESH_CUSTOMER_NAMES = [
    { name: 'Driftwood Coastal Supply', tier: 'Silver' },
    { name: 'Granite Peak Outfitters', tier: 'Gold' },
    { name: 'Willowbrook Dental Group', tier: 'Bronze' },
    { name: 'Quantum Loop Robotics', tier: 'Gold' },
    { name: 'Marigold Event Co.', tier: 'Silver' },
  ];
  await Customer.create(
    FRESH_CUSTOMER_NAMES.map((c) => ({
      name: c.name,
      email: `buyer@${c.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      passwordHash: pwd,
      tier: c.tier,
      currency: 'USD',
    }))
  );

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

  const [externalSSD, premiumOnboarding, analyticsAddon] = await Product.create([
    { name: 'External SSD 1TB', category: 'Hardware', basePrice: 90, unit: 'unit', taxPct: 8, isSubscription: false },
    { name: 'Premium Onboarding', category: 'Services', basePrice: 500, unit: 'engagement', taxPct: 0, isSubscription: false },
    { name: 'Analytics Add-on', category: 'Services', basePrice: 15, unit: 'month', taxPct: 0, isSubscription: true },
  ]);

  const [mainWarehouse, eastDepot] = await Warehouse.create([
    { name: 'Main Warehouse', shippingCostWeight: 1 },
    { name: 'East Depot', shippingCostWeight: 1.3 },
  ]);
  const [westCoastHub] = await Warehouse.create([
    { name: 'West Coast Hub', shippingCostWeight: 1.15 },
  ]);

  await Stock.create([
    { productId: laptop._id, warehouseId: mainWarehouse._id, qtyAvailable: 3, replenishmentRule: 'reorder at 2' },
    { productId: laptop._id, warehouseId: eastDepot._id, qtyAvailable: 5, replenishmentRule: 'reorder at 2' },
    { productId: mouse._id, warehouseId: mainWarehouse._id, qtyAvailable: 40, replenishmentRule: 'reorder at 10' },
    { productId: dockingStation._id, warehouseId: mainWarehouse._id, qtyAvailable: 15, replenishmentRule: 'reorder at 5' },
    { productId: setupService._id, warehouseId: mainWarehouse._id, qtyAvailable: 9999, replenishmentRule: 'n/a - service' },
  ]);

  await Stock.create([
    { productId: laptop._id, warehouseId: westCoastHub._id, qtyAvailable: 2, replenishmentRule: 'reorder at 2' },
    { productId: mouse._id, warehouseId: westCoastHub._id, qtyAvailable: 30, replenishmentRule: 'reorder at 10' },
    { productId: dockingStation._id, warehouseId: westCoastHub._id, qtyAvailable: 12, replenishmentRule: 'reorder at 5' },
    { productId: externalSSD._id, warehouseId: mainWarehouse._id, qtyAvailable: 60, replenishmentRule: 'reorder at 15' },
    { productId: externalSSD._id, warehouseId: eastDepot._id, qtyAvailable: 25, replenishmentRule: 'reorder at 10' },
    { productId: externalSSD._id, warehouseId: westCoastHub._id, qtyAvailable: 20, replenishmentRule: 'reorder at 10' },
    { productId: premiumOnboarding._id, warehouseId: mainWarehouse._id, qtyAvailable: 9999, replenishmentRule: 'n/a - service' },
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

  const [carePlanMonthly, analyticsPlan, enterpriseYearly] = await SubscriptionPlan.create([
    { name: 'Care Plan 2yr', billingCycle: 'monthly', prorationRule: 'daily_proration', cancellationRule: 'prorated_refund' },
    { name: 'Analytics Add-on', billingCycle: 'monthly', prorationRule: 'daily_proration', cancellationRule: 'prorated_refund' },
    // Yearly-cycle plan - a long-renewal-window subscription, distinct from
    // the monthly/quarterly ones above.
    { name: 'Enterprise Support', billingCycle: 'yearly', prorationRule: 'daily_proration', cancellationRule: 'prorated_refund' },
  ]);
  await SubscriptionPlan.create([
    { name: 'Support SLA', billingCycle: 'quarterly', prorationRule: 'daily_proration', cancellationRule: 'prorated_refund' },
  ]);

  await UpsellRule.create([
    { sourceProductId: laptop._id, suggestedProductId: mouse._id, minMarginThreshold: 10, isPromoted: true },
    { sourceProductId: laptop._id, suggestedProductId: dockingStation._id, minMarginThreshold: 15, isPromoted: false },
    { sourceProductId: laptop._id, suggestedProductId: carePlan._id, minMarginThreshold: 20, isPromoted: true },
    { sourceProductId: laptop._id, suggestedProductId: externalSSD._id, minMarginThreshold: 12, isPromoted: false },
  ]);

  // --- Curated demo quotations spanning every pipeline stage, so every
  // screen has real, hand-picked data before any bulk/randomized records are
  // layered on top. ---

  // 1) Draft - Acme Corp, untouched line-item builder in progress.
  const draftQuote = await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [
      { productId: laptop._id, quantity: 1, unitPrice: laptop.basePrice, discountPct: 5, lineType: 'one_time' },
      { productId: mouse._id, quantity: 2, unitPrice: mouse.basePrice, discountPct: 0, lineType: 'one_time' },
    ],
  });
  await log(draftQuote._id, 'created', rep._id);

  // 2) Pending Approval - Beta Industries, Setup Service discount busts both
  // the Silver tier ceiling (10%) and the Services category ceiling (10%),
  // scoring high enough to require Sales Manager then Finance.
  const betaQuote = await Quotation.create({
    customerId: beta._id, salesRepId: rep._id, status: 'Draft',
    lines: [{ productId: setupService._id, quantity: 1, unitPrice: setupService.basePrice, discountPct: 22, lineType: 'one_time' }],
  });
  await log(betaQuote._id, 'created', rep._id);
  await driveQuotationToStatus(betaQuote, 'Pending Approval');

  // 3) Approved, fulfillment suggested but not yet accepted - Acme Corp
  // laptop order that will split across both warehouses (3 in Main + 2 more
  // needed from East Depot once qty > 3).
  const acmeFulfillQuote = await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [{ productId: laptop._id, quantity: 4, unitPrice: laptop.basePrice, discountPct: 12, lineType: 'one_time' }],
  });
  await log(acmeFulfillQuote._id, 'created', rep._id);
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
  await log(deltaQuote._id, 'created', rep._id);
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
  await log(acmeHybridQuote._id, 'created', rep._id);
  await driveQuotationToStatus(acmeHybridQuote, 'Confirmed', { manager });

  // 6) Under Negotiation - Acme Corp, customer countered a discount through
  // the portal; this is the quotation "me" resolves to for buyer@acme.com
  // (most recently updated non-Draft quotation), ready for the negotiation
  // screen demo without any manual setup.
  const negotiationQuote = await Quotation.create({
    customerId: acme._id, salesRepId: rep._id, status: 'Draft',
    lines: [{ productId: laptop._id, quantity: 1, unitPrice: laptop.basePrice, discountPct: 0, lineType: 'one_time' }],
  });
  await log(negotiationQuote._id, 'created', rep._id);
  await driveQuotationToStatus(negotiationQuote, 'Approved', { manager });
  const negotiatedLineId = negotiationQuote.lines[0]._id;
  negotiationQuote.negotiationComments.push({
    authorType: 'customer', lineId: negotiatedLineId,
    commentText: 'Can we get 20% off given the order size?', counterDiscountPct: 20,
  });
  negotiationQuote.lines[0].discountPct = 20;
  negotiationQuote.status = 'Under Negotiation';
  await negotiationQuote.save();

  // --- Bulk sample data: ~65 more quotations spread across every sales rep
  // and every customer, at every pipeline stage, so every list/kanban/report
  // screen for every role has real volume to show instead of a handful of
  // hand-picked rows. ---
  const TIER_MAX = { Bronze: 5, Silver: 10, Gold: 15 };
  const ONE_TIME_POOL = [mouse, dockingStation, setupService, externalSSD, premiumOnboarding, laptop];
  const RECURRING_POOL = [[carePlan, carePlanMonthly], [analyticsAddon, analyticsPlan]];
  const PAYMENT_METHODS = ['card', 'bank_transfer', 'check'];

  function oneTimeLine(product, tierMax, { forceDiscount } = {}) {
    let discountPct = forceDiscount;
    if (discountPct == null) {
      const roll = Math.random();
      if (roll < 0.5) discountPct = 0;
      else if (roll < 0.8) discountPct = randomInt(1, Math.max(1, tierMax));
      else discountPct = randomInt(tierMax + 5, tierMax + 25);
    }
    return {
      productId: product._id,
      quantity: randomInt(1, product.name === 'Laptop Pro 14' ? 3 : 6),
      unitPrice: product.basePrice,
      discountPct,
      lineType: 'one_time',
    };
  }
  function recurringLine(product, plan) {
    return {
      productId: product._id, quantity: 1, unitPrice: product.basePrice, discountPct: 0,
      lineType: 'recurring', subscriptionPlanId: plan._id,
    };
  }

  const STATUS_PLAN = [
    ...Array(32).fill('Draft'),
    ...Array(14).fill('Pending Approval'),
    ...Array(16).fill('Approved'),
    ...Array(12).fill('Under Negotiation'),
    ...Array(12).fill('Confirmed'),
    ...Array(6).fill('Rejected'),
  ];

  const bulkQuotations = [];

  for (let i = 0; i < STATUS_PLAN.length; i++) {
    const targetStatus = STATUS_PLAN[i];
    const salesRep = allReps[i % allReps.length];
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;

    const numLines = randomInt(1, 2);
    const lines = [];
    const usedProductIds = new Set();
    while (lines.length < numLines) {
      const product = pick(ONE_TIME_POOL);
      if (usedProductIds.has(String(product._id))) continue;
      usedProductIds.add(String(product._id));
      lines.push(oneTimeLine(product, tierMax));
    }
    if (Math.random() < 0.15) {
      const [recProduct, plan] = pick(RECURRING_POOL);
      lines.push(recurringLine(recProduct, plan));
    }

    const quotation = await Quotation.create({ customerId: customer._id, salesRepId: salesRep._id, status: 'Draft', lines });
    await log(quotation._id, 'created', salesRep._id);
    bulkQuotations.push(quotation);

    const managerForThis = pick(allManagers);
    const financeForThis = pick(allFinance);

    if (targetStatus === 'Draft') continue;
    if (targetStatus === 'Rejected') { await driveToRejected(quotation, { manager: managerForThis, finance: financeForThis }); continue; }
    if (targetStatus === 'Under Negotiation') { await driveToUnderNegotiation(quotation, { manager: managerForThis, finance: financeForThis }); continue; }

    if (targetStatus === 'Confirmed') {
      const result = await driveQuotationToStatus(quotation, 'Confirmed', { manager: managerForThis, finance: financeForThis });
      for (const inv of result.invoices) {
        const roll = Math.random();
        if (roll < 0.5) {
          await Payment.create({ invoiceId: inv._id, amount: inv.amount, method: pick(PAYMENT_METHODS) });
          inv.status = 'Paid';
          await inv.save();
        } else if (roll < 0.75) {
          const partial = Math.round(inv.amount * 0.4 * 100) / 100;
          await Payment.create({ invoiceId: inv._id, amount: partial, method: pick(PAYMENT_METHODS) });
          inv.status = 'Partially Paid';
          await inv.save();
        }
      }
      continue;
    }

    // Pending Approval / Approved
    await driveQuotationToStatus(quotation, targetStatus, { manager: managerForThis, finance: financeForThis });
  }

  // --- Deal Health demo data: Deal Health is computed live off `updatedAt`
  // age, so a handful of open quotations need to genuinely look stale (not
  // just be tagged stale) - backdate them via the raw driver so Mongoose's
  // auto-timestamp doesn't immediately overwrite it back to "now". Two of
  // these are pinned to Dana Rep specifically so the documented rep login
  // shows real nudge/escalate banners without depending on random luck. ---
  const openStatuses = ['Draft', 'Pending Approval', 'Approved', 'Under Negotiation'];
  const danaOpenQuotes = bulkQuotations.filter((q) => String(q.salesRepId) === String(rep._id) && openStatuses.includes(q.status));
  const danaStalled = danaOpenQuotes.slice(0, 2);
  for (const q of danaStalled) {
    await Quotation.collection.updateOne({ _id: q._id }, { $set: { updatedAt: daysAgo(randomInt(8, 15)) } });
  }
  if (danaStalled[0]) await log(danaStalled[0]._id, 'nudge_sent', manager._id, 'Deal health nudge (seed data)');
  if (danaStalled[1]) await log(danaStalled[1]._id, 'escalated', manager._id, 'Deal health escalation (seed data)');

  const otherOpenQuotes = bulkQuotations.filter((q) => openStatuses.includes(q.status) && !danaStalled.includes(q));
  for (const q of otherOpenQuotes.slice(0, 6)) {
    await Quotation.collection.updateOne({ _id: q._id }, { $set: { updatedAt: daysAgo(randomInt(8, 20)) } });
  }

  // --- Credit notes: simulate Finance modifying/cancelling a handful of the
  // subscriptions the bulk Confirmed quotations just generated, so the
  // Credit Notes screen and each subscription's Billing Detail have real
  // adjustment history instead of an empty table. ---
  const allSubs = await Subscription.find();
  for (const sub of allSubs) {
    if (sub.status === 'active' && Math.random() < 0.35) {
      await CreditNote.create({ subscriptionId: sub._id, amount: randomInt(5, 40), reason: 'Mid-cycle plan change proration (seed data)' });
    }
  }
  const cancelCandidates = allSubs.filter((s) => s.status === 'active');
  for (const sub of cancelCandidates.slice(0, 2)) {
    sub.status = 'cancelled';
    await sub.save();
    await CreditNote.create({ subscriptionId: sub._id, amount: randomInt(10, 60), reason: 'Cancellation partial refund (seed data)' });
  }

  // --- Scenario data: another ~75 quotations covering distinct situations
  // the bulk randomizer above doesn't specifically target - empty carts,
  // rush orders, enterprise multi-line deals, multi-round negotiation with
  // rep replies, a two-step rejection, a return-for-revision loop, forced
  // backorders, yearly-plan subscriptions, a loaded vs. an idle rep, a hot
  // nudge->escalate chain, and contrasting subscription cancellations. ---
  const SCENARIO_POOL = [mouse, dockingStation, setupService, externalSSD, premiumOnboarding];
  const scenarioQuotations = [];
  async function makeScenarioQuotation(customer, salesRep, lines) {
    const q = await Quotation.create({ customerId: customer._id, salesRepId: salesRep._id, status: 'Draft', lines });
    await log(q._id, 'created', salesRep._id);
    scenarioQuotations.push(q);
    return q;
  }

  const priya = allReps.find((r) => r.name === 'Priya Nair') || allReps[1];
  const rileyChen = allReps.find((r) => r.name === 'Riley Chen') || allReps[allReps.length - 1];
  const samTorres = allReps.find((r) => r.name === 'Sam Torres') || allReps[2];

  // Scenario A: empty-cart drafts - a rep just opened a new quotation and
  // hasn't picked any line items yet.
  for (let i = 0; i < 10; i++) {
    await makeScenarioQuotation(pick(allCustomers), pick(allReps), []);
  }

  // Scenario B: rush orders - discount + tight delivery date ask, Under Negotiation.
  for (let i = 0; i < 14; i++) {
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;
    const lines = [oneTimeLine(pick(SCENARIO_POOL), tierMax)];
    const q = await makeScenarioQuotation(customer, pick(allReps), lines);
    await driveToRushNegotiation(q, { manager: pick(allManagers), finance: pick(allFinance) });
  }

  // Scenario C: large enterprise multi-line Gold deals, Confirmed, with a
  // deliberately mixed set of resulting invoice states (Paid / overdue
  // Unpaid / Sent-not-yet-due) so Finance's Invoices screen shows every
  // status, not just Paid/Unpaid.
  const goldCustomers = allCustomers.filter((c) => c.tier === 'Gold');
  const enterpriseInvoices = [];
  for (let i = 0; i < 10; i++) {
    const customer = pick(goldCustomers.length ? goldCustomers : allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 15;
    const lineProducts = [laptop, dockingStation, externalSSD, premiumOnboarding].sort(() => Math.random() - 0.5).slice(0, randomInt(3, 4));
    const lines = lineProducts.map((p) => oneTimeLine(p, tierMax));
    const q = await makeScenarioQuotation(customer, priya, lines);
    const result = await driveQuotationToStatus(q, 'Confirmed', { manager: pick(allManagers), finance: pick(allFinance) });
    enterpriseInvoices.push(...result.invoices);
  }
  for (const inv of enterpriseInvoices.slice(0, 2)) {
    inv.dueDate = daysAgo(randomInt(5, 20));
    inv.status = 'Unpaid';
    await inv.save();
  }
  if (enterpriseInvoices[2]) {
    enterpriseInvoices[2].status = 'Sent';
    await enterpriseInvoices[2].save();
  }
  for (const inv of enterpriseInvoices.slice(3)) {
    if (Math.random() < 0.5) {
      await Payment.create({ invoiceId: inv._id, amount: inv.amount, method: pick(PAYMENT_METHODS) });
      inv.status = 'Paid';
      await inv.save();
    }
  }

  // Scenario D: small single-item Bronze deals - the opposite end of the
  // spectrum from the enterprise deals above.
  const bronzeCustomers = allCustomers.filter((c) => c.tier === 'Bronze');
  for (let i = 0; i < 10; i++) {
    const customer = pick(bronzeCustomers.length ? bronzeCustomers : allCustomers);
    const lines = [oneTimeLine(mouse, 5)];
    const q = await makeScenarioQuotation(customer, pick(allReps), lines);
    if (Math.random() < 0.5) await driveQuotationToStatus(q, 'Approved', { manager, finance });
  }

  // Scenario E: multi-round negotiation, including the rep replying
  // in-thread (authorType 'rep', not used anywhere in the bulk random data).
  for (let i = 0; i < 8; i++) {
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;
    const lines = [oneTimeLine(pick(SCENARIO_POOL), tierMax, { forceDiscount: 0 })];
    const salesRep = pick(allReps);
    const q = await makeScenarioQuotation(customer, salesRep, lines);
    await driveToMultiRoundNegotiation(q, { manager: pick(allManagers), finance: pick(allFinance), rep: salesRep });
  }

  // Scenario F: two-step approval that dies at Finance, after Sales Manager
  // already signed off - distinct from a single-step rejection.
  for (let i = 0; i < 8; i++) {
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;
    const lines = [oneTimeLine(pick(SCENARIO_POOL), tierMax, { forceDiscount: tierMax + randomInt(10, 20) })];
    const q = await makeScenarioQuotation(customer, pick(allReps), lines);
    await driveToRejectedAtFinance(q, { manager: pick(allManagers), finance: pick(allFinance) });
  }

  // Scenario G: returned for revision - the approval loop that sends a
  // quotation back to Draft instead of approving or rejecting it outright.
  for (let i = 0; i < 8; i++) {
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;
    const lines = [oneTimeLine(pick(SCENARIO_POOL), tierMax, { forceDiscount: tierMax + randomInt(5, 15) })];
    const q = await makeScenarioQuotation(customer, pick(allReps), lines);
    await driveToReturned(q, { manager: pick(allManagers) });
  }

  // Scenario H: a few more straightforward single-step rejections, for volume.
  for (let i = 0; i < 6; i++) {
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;
    const lines = [oneTimeLine(pick(SCENARIO_POOL), tierMax, { forceDiscount: tierMax + randomInt(10, 25) })];
    const q = await makeScenarioQuotation(customer, pick(allReps), lines);
    await driveToRejected(q, { manager: pick(allManagers), finance: pick(allFinance) });
  }

  // Scenario I: heavy backorder - laptop quantity deliberately well beyond
  // remaining warehouse stock, guaranteeing a real backorder split on confirm.
  for (let i = 0; i < 8; i++) {
    const customer = pick(allCustomers);
    const lines = [{ productId: laptop._id, quantity: randomInt(8, 15), unitPrice: laptop.basePrice, discountPct: 0, lineType: 'one_time' }];
    const q = await makeScenarioQuotation(customer, pick(allReps), lines);
    await driveQuotationToStatus(q, 'Confirmed', { manager: pick(allManagers), finance: pick(allFinance) });
  }

  // Scenario J: recurring-only deals on the new yearly plan - a
  // long-renewal-window subscription, contrasted with a near-term renewal
  // forced on the second one below.
  const yearlySubQuotations = [];
  for (let i = 0; i < 2; i++) {
    const customer = pick(allCustomers);
    const lines = [recurringLine(carePlan, enterpriseYearly)];
    const q = await makeScenarioQuotation(customer, priya, lines);
    await driveQuotationToStatus(q, 'Confirmed', { manager, finance });
    yearlySubQuotations.push(q);
  }
  const yearlySubs = await Subscription.find({ quotationId: { $in: yearlySubQuotations.map((q) => q._id) } });
  if (yearlySubs[0]) { yearlySubs[0].nextBillingDate = inDays(1); await yearlySubs[0].save(); }

  // Scenario K: heavily loaded pipeline for one specific rep (Priya Nair),
  // so her dashboard/"my deals" view looks genuinely busy next to a rep with
  // almost nothing (Scenario L below).
  for (let i = 0; i < 14; i++) {
    const customer = pick(allCustomers);
    const tierMax = TIER_MAX[customer.tier] ?? 5;
    const lines = [oneTimeLine(pick(SCENARIO_POOL), tierMax)];
    const q = await makeScenarioQuotation(customer, priya, lines);
    const roll = Math.random();
    if (roll < 0.4) continue; // stays Draft
    else if (roll < 0.7) await driveQuotationToStatus(q, 'Approved', { manager, finance });
    else await driveQuotationToStatus(q, 'Confirmed', { manager, finance });
  }

  // Scenario L: a nearly-idle rep (Riley Chen) - only two quotations total,
  // both old and untouched, the opposite extreme from Priya's load.
  const idleQuotes = [];
  for (let i = 0; i < 2; i++) {
    const customer = pick(allCustomers);
    const q = await makeScenarioQuotation(customer, rileyChen, [oneTimeLine(pick(SCENARIO_POOL), 5)]);
    idleQuotes.push(q);
  }
  for (const q of idleQuotes) {
    await Quotation.collection.updateOne({ _id: q._id }, { $set: { updatedAt: daysAgo(randomInt(25, 40)) } });
  }

  // Scenario M: a "hot" escalation - one deal that gets nudged and then
  // escalated in sequence (with realistic, distinct timestamps), assigned to
  // a rep who didn't already get a nudge above (Sam Torres).
  const hotCustomer = pick(allCustomers);
  const hotQuote = await makeScenarioQuotation(hotCustomer, samTorres, [oneTimeLine(pick(SCENARIO_POOL), 5, { forceDiscount: 20 })]);
  await driveQuotationToStatus(hotQuote, 'Pending Approval');
  await Quotation.collection.updateOne({ _id: hotQuote._id }, { $set: { updatedAt: daysAgo(9) } });
  await log(hotQuote._id, 'nudge_sent', manager._id, 'Deal health nudge (seed data)', daysAgo(5));
  await log(hotQuote._id, 'escalated', manager._id, 'Deal health escalation (seed data)', daysAgo(1));

  // Scenario N: contrasting subscription cancellations - one clean (no
  // credit note, the customer just let it lapse), one refunded as a goodwill
  // gesture, and one billing-error correction (all with reasons distinct
  // from the "mid-cycle proration" ones generated earlier).
  const activeSubs = await Subscription.find({ status: 'active' });
  if (activeSubs[0]) { activeSubs[0].status = 'cancelled'; await activeSubs[0].save(); }
  if (activeSubs[1]) {
    activeSubs[1].status = 'cancelled';
    await activeSubs[1].save();
    await CreditNote.create({ subscriptionId: activeSubs[1]._id, amount: randomInt(20, 80), reason: 'Executive goodwill cancellation, no penalty (seed data)' });
  }
  if (activeSubs[2]) {
    await CreditNote.create({ subscriptionId: activeSubs[2]._id, amount: randomInt(10, 30), reason: 'Billing error correction (seed data)' });
  }

  const [userCount, customerCount, quotationCount, invoiceCount, subCount, paymentCount, creditNoteCount, auditLogCount] = await Promise.all([
    User.countDocuments(), Customer.countDocuments(), Quotation.countDocuments(), Invoice.countDocuments(),
    Subscription.countDocuments(), Payment.countDocuments(), CreditNote.countDocuments(), AuditLog.countDocuments(),
  ]);

  console.log('Seed complete. Sample logins (password: password123):');
  console.log(`  Sales Rep:      rep@dealflow360.com        (+ ${extraReps.length} more sales reps)`);
  console.log(`  Sales Manager:  manager@dealflow360.com    (+ ${extraManagers.length} more sales managers)`);
  console.log(`  Finance:        finance@dealflow360.com    (+ ${extraFinance.length} more finance users)`);
  console.log(`  Admin:          admin@dealflow360.com      (+ ${extraAdmins.length} more admins)`);
  console.log('  Customer (Acme Corp, Gold):     buyer@acme.com    <- has an "Under Negotiation" quote, use this for the portal demo');
  console.log('  Customer (Beta Industries, Silver): buyer@beta.com');
  console.log('  Customer (Delta LLC, Bronze):   buyer@delta.com');
  console.log(`  (+ ${extraCustomers.length} more customers across Gold/Silver/Bronze tiers, + ${FRESH_CUSTOMER_NAMES.length} brand-new zero-activity customers)`);
  console.log('Products: Laptop Pro 14, Wireless Mouse, Docking Station, Onsite Setup Service, Care Plan 2yr (sub),');
  console.log('          External SSD 1TB, Premium Onboarding, Analytics Add-on (sub)');
  console.log('Scenario coverage: empty carts, rush orders, enterprise multi-line deals, small deals,');
  console.log('  multi-round negotiation w/ rep replies, finance-stage rejection, returned-for-revision,');
  console.log('  heavy backorders, yearly-plan subscriptions, loaded vs. idle rep pipelines, a hot');
  console.log('  nudge->escalate chain, and contrasting subscription cancellations.');
  console.log('Record counts:');
  console.log(`  Users: ${userCount}, Customers: ${customerCount}, Quotations: ${quotationCount}`);
  console.log(`  Invoices: ${invoiceCount}, Subscriptions: ${subCount}, Payments: ${paymentCount}`);
  console.log(`  Credit Notes: ${creditNoteCount}, Audit Log entries: ${auditLogCount}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
