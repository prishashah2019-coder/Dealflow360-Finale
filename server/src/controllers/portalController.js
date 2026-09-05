const { Quotation, Customer } = require('../models');
const { computeBlendedRiskScore } = require('../services/riskScore');
const { generateBillingArtifacts } = require('../services/billing');

// All handlers here are restricted (via requireCustomer middleware) to the
// customer that owns the quotation - a customer can never open another
// customer's deal, and can never reach any internal-only screen or route.
// `id` is either a real quotation _id, or the literal "me" - the frontend
// portal landing route resolves to the customer's own most-recently-updated
// non-draft quotation, so login doesn't need to already know a quotation id.
async function resolveOwnQuotation(customerId, id) {
  const query = { customerId };
  if (id !== 'me') query._id = id;
  else query.status = { $ne: 'Draft' };

  const cursor = Quotation.findOne(query)
    .populate('customerId', 'name tier')
    .populate('lines.productId', 'name category');
  return id === 'me' ? cursor.sort({ updatedAt: -1 }) : cursor;
}

async function listOwnQuotations(req, res) {
  const quotations = await Quotation.find({ customerId: req.auth.sub, status: { $ne: 'Draft' } })
    .select('_id status blendedRiskScore updatedAt')
    .sort({ updatedAt: -1 });
  res.json(quotations);
}

async function getOwnQuotation(req, res) {
  const quotation = await resolveOwnQuotation(req.auth.sub, req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  res.json(quotation);
}

async function addComment(req, res) {
  const quotation = await resolveOwnQuotation(req.auth.sub, req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });

  const { lineId, commentText, counterDiscountPct } = req.body;
  quotation.negotiationComments.push({ authorType: 'customer', lineId, commentText, counterDiscountPct });

  if (counterDiscountPct != null && lineId) {
    const line = quotation.lines.id(lineId);
    if (line) line.discountPct = counterDiscountPct;
  }
  quotation.status = 'Under Negotiation';
  await quotation.save();
  res.status(201).json(quotation);
}

async function confirmOwnQuotation(req, res) {
  const quotation = await resolveOwnQuotation(req.auth.sub, req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  const customer = await Customer.findById(quotation.customerId);

  const { blendedRiskScore, requiredRoles } = await computeBlendedRiskScore(quotation.lines, customer.tier);
  quotation.blendedRiskScore = blendedRiskScore;

  if (requiredRoles.length > 0) {
    // Terms moved beyond threshold during negotiation -> auto re-enter approval flow.
    quotation.status = 'Pending Approval';
    quotation.approvals = requiredRoles.map((role, i) => ({ stepOrder: i + 1, approverRole: role, status: 'pending' }));
    await quotation.save();
    return res.json({ quotation, reEnteredApproval: true });
  }

  quotation.status = 'Confirmed';
  await quotation.save();
  const invoices = await generateBillingArtifacts(quotation);
  res.json({ quotation, invoices, reEnteredApproval: false });
}

module.exports = { listOwnQuotations, getOwnQuotation, addComment, confirmOwnQuotation };
