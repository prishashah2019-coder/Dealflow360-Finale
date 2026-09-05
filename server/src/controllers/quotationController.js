const { Quotation, Customer, AuditLog, User } = require('../models');
const { computeBlendedRiskScore } = require('../services/riskScore');
const { suggestFulfillmentSplit, commitFulfillmentSplit } = require('../services/fulfillment');
const { generateBillingArtifacts } = require('../services/billing');

async function log(entityId, action, userId, reason = '') {
  await AuditLog.create({ entityType: 'Quotation', entityId, action, userId, reason });
}

async function listQuotations(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.auth.role === 'sales_rep') filter.salesRepId = req.auth.sub;
  const quotations = await Quotation.find(filter)
    .populate('customerId', 'name tier')
    .populate('salesRepId', 'name')
    .populate('fulfillmentSplits.warehouseId', 'name')
    .sort({ updatedAt: -1 });

  // Decorate each row with the discount-vs-limit pair for its most heavily
  // discounted line, so list screens (Approvals, Quotations) can show a
  // "Limit %" column without every consumer re-deriving it.
  const decorated = await Promise.all(
    quotations.map(async (q) => {
      const plain = q.toObject();
      if (!q.lines.length || !q.customerId) return { ...plain, maxLineDiscountPct: 0, maxLineLimitPct: null };
      const { lineBreakdown } = await computeBlendedRiskScore(q.lines, q.customerId.tier);
      const worst = lineBreakdown.reduce((a, b) => (b.discountGiven > a.discountGiven ? b : a), lineBreakdown[0]);
      return { ...plain, maxLineDiscountPct: worst.discountGiven, maxLineLimitPct: worst.limitAllowed };
    })
  );

  res.json(decorated);
}

async function createQuotation(req, res) {
  const { customerId, lines } = req.body;
  const quotation = await Quotation.create({
    customerId,
    salesRepId: req.auth.sub,
    status: 'Draft',
    lines: lines || [],
  });
  await log(quotation._id, 'created', req.auth.sub);
  res.status(201).json(quotation);
}

// Decorates each line with why-flagged info (limitAllowed/overagePct/givenBy)
// computed live against the current discount config, and attaches the audit
// trail - both are derived data the "Why This Quote Was Flagged" and "Audit
// Trail" screens need but that isn't worth persisting on the quotation itself.
async function attachDerivedDetail(quotation) {
  const plain = quotation.toObject();

  const customer = await Customer.findById(plain.customerId?._id || plain.customerId);
  if (customer) {
    const { lineBreakdown } = await computeBlendedRiskScore(quotation.lines, customer.tier);
    const byLineId = new Map(lineBreakdown.map((b) => [String(b.lineId), b]));
    plain.lines = plain.lines.map((line) => {
      const b = byLineId.get(String(line._id));
      return b ? { ...line, limitAllowed: b.limitAllowed, overagePct: b.overagePct, givenBy: b.givenBy } : line;
    });
  }

  const logs = await AuditLog.find({ entityType: 'Quotation', entityId: quotation._id }).sort({ timestamp: 1 });
  const userIds = [...new Set(logs.map((l) => String(l.userId)).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).select('name role');
  const userById = new Map(users.map((u) => [String(u._id), u]));
  plain.auditLog = logs.map((l) => {
    const u = userById.get(String(l.userId));
    return { user: u?.name || 'System', role: u?.role || '—', action: l.action, date: l.timestamp, note: l.reason };
  });

  return plain;
}

async function getQuotation(req, res) {
  const quotation = await Quotation.findById(req.params.id)
    .populate('customerId')
    .populate('salesRepId', 'name email')
    .populate('lines.productId')
    .populate('approvals.approverId', 'name role')
    .populate('fulfillmentSplits.warehouseId', 'name')
    .populate('fulfillmentSplits.productId', 'name');
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  res.json(await attachDerivedDetail(quotation));
}

async function updateQuotation(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  if (quotation.status !== 'Draft') {
    return res.status(400).json({ error: 'Only Draft quotations can be edited directly' });
  }
  if (req.body.lines) quotation.lines = req.body.lines;
  await quotation.save();
  await log(quotation._id, 'lines_updated', req.auth.sub);
  res.json(quotation);
}

async function addNegotiationComment(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  if (['Confirmed', 'Rejected'].includes(quotation.status)) {
    return res.status(400).json({ error: 'Closed quotations cannot be negotiated.' });
  }
  const { lineId, commentText, counterDiscountPct, requestedDeliveryDate } = req.body;
  if (!commentText && counterDiscountPct == null && !requestedDeliveryDate) {
    return res.status(400).json({ error: 'Add a message, discount, or delivery date.' });
  }
  if (counterDiscountPct != null && (Number(counterDiscountPct) < 0 || Number(counterDiscountPct) > 100)) {
    return res.status(400).json({ error: 'Discount must be between 0 and 100.' });
  }
  if (lineId && !quotation.lines.id(lineId)) return res.status(400).json({ error: 'Line does not belong to this quotation.' });
  quotation.negotiationComments.push({ authorType: 'rep', lineId: lineId || null, commentText: commentText || '', counterDiscountPct, requestedDeliveryDate });
  if (counterDiscountPct != null && lineId) quotation.lines.id(lineId).discountPct = Number(counterDiscountPct);
  quotation.status = 'Under Negotiation';
  await quotation.save();
  await log(quotation._id, 'negotiation_response', req.auth.sub, commentText || 'Updated negotiated terms');
  res.status(201).json(quotation);
}

async function submitForApproval(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  const customer = await Customer.findById(quotation.customerId);

  const { blendedRiskScore, requiredRoles } = await computeBlendedRiskScore(quotation.lines, customer.tier);
  quotation.blendedRiskScore = blendedRiskScore;

  if (requiredRoles.length === 0) {
    quotation.status = 'Approved';
    quotation.approvals = [];
  } else {
    quotation.status = 'Pending Approval';
    quotation.approvals = requiredRoles.map((role, i) => ({
      stepOrder: i + 1,
      approverRole: role,
      status: 'pending',
    }));
  }

  await quotation.save();
  await log(quotation._id, 'submitted_for_approval', req.auth.sub, `risk score ${blendedRiskScore.toFixed(2)}`);
  res.json(quotation);
}

async function decideApprovalStep(req, res) {
  const { action, comment } = req.body; // approve | reject | return
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });

  const step = quotation.approvals.id(req.params.stepId);
  if (!step) return res.status(404).json({ error: 'Approval step not found' });

  const firstPending = quotation.approvals.find((s) => s.status === 'pending');
  if (!firstPending || String(firstPending._id) !== String(step._id)) {
    return res.status(400).json({ error: 'This step is not currently actionable' });
  }
  if (req.auth.role !== step.approverRole && req.auth.role !== 'admin') {
    return res.status(403).json({ error: `Requires role ${step.approverRole}` });
  }

  step.approverId = req.auth.sub;
  step.comment = comment || '';
  step.decidedAt = new Date();

  if (action === 'approve') {
    step.status = 'approved';
    const stillPending = quotation.approvals.some((s) => s.status === 'pending' && String(s._id) !== String(step._id));
    quotation.status = stillPending ? 'Pending Approval' : 'Approved';
  } else if (action === 'reject') {
    step.status = 'rejected';
    quotation.status = 'Rejected';
  } else if (action === 'return') {
    step.status = 'returned';
    quotation.status = 'Draft';
    quotation.approvals = [];
  } else {
    return res.status(400).json({ error: 'action must be approve, reject, or return' });
  }

  await quotation.save();
  await log(quotation._id, `approval_${action}`, req.auth.sub, comment);
  res.json(quotation);
}

// Every fulfillment mutation below re-populates warehouseId/productId before
// responding - without it, the split table shows raw ObjectIds instead of
// names until the page happens to reload via getQuotation (which does populate).
async function populateSplits(quotation) {
  return quotation.populate([
    { path: 'fulfillmentSplits.warehouseId', select: 'name' },
    { path: 'fulfillmentSplits.productId', select: 'name' },
  ]);
}

async function suggestFulfillment(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  const splits = await suggestFulfillmentSplit(quotation.lines);
  quotation.fulfillmentSplits = splits;
  await quotation.save();
  res.json(await populateSplits(quotation));
}

async function acceptFulfillment(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  await commitFulfillmentSplit(quotation.fulfillmentSplits);
  quotation.fulfillmentSplits.forEach((s) => {
    if (!s.isBackorder) s.status = 'accepted';
  });
  await quotation.save();
  await log(quotation._id, 'fulfillment_accepted', req.auth.sub);
  res.json(await populateSplits(quotation));
}

async function overrideFulfillment(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  quotation.fulfillmentSplits = (req.body.splits || []).map((s) => ({ ...s, status: 'overridden' }));
  await commitFulfillmentSplit(quotation.fulfillmentSplits);
  await quotation.save();
  await log(quotation._id, 'fulfillment_overridden', req.auth.sub);
  res.json(await populateSplits(quotation));
}

async function confirmQuotation(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Not found' });
  if (!['Approved', 'Under Negotiation'].includes(quotation.status)) {
    return res.status(400).json({ error: 'Quotation must be Approved before it can be confirmed' });
  }
  quotation.status = 'Confirmed';
  await quotation.save();
  const invoices = await generateBillingArtifacts(quotation);
  await log(quotation._id, 'confirmed', req.auth.sub);
  res.json({ quotation, invoices });
}

module.exports = {
  listQuotations, createQuotation, getQuotation, updateQuotation,
  addNegotiationComment,
  submitForApproval, decideApprovalStep,
  suggestFulfillment, acceptFulfillment, overrideFulfillment,
  confirmQuotation,
};
