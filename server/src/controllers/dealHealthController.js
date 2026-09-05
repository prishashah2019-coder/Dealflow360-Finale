const { computeDealHealth } = require('../services/dealHealth');
const { Quotation, AuditLog, User } = require('../models');

async function getDealHealth(req, res) {
  res.json(await computeDealHealth());
}

async function nudgeRep(req, res) {
  const { quotationId } = req.body;
  await AuditLog.create({
    entityType: 'Quotation',
    entityId: quotationId,
    action: 'nudge_sent',
    userId: req.auth.sub,
    reason: 'Deal health nudge triggered from dashboard',
  });
  res.json({ ok: true });
}

async function escalate(req, res) {
  const { quotationId } = req.body;
  await AuditLog.create({
    entityType: 'Quotation',
    entityId: quotationId,
    action: 'escalated',
    userId: req.auth.sub,
    reason: 'Deal health escalation triggered from dashboard',
  });
  res.json({ ok: true });
}

// Cross-role feature: when a Sales Manager nudges/escalates a deal from the
// Deal Health dashboard, the owning Sales Rep sees it surfaced on their own
// dashboard - so the two roles' screens are genuinely connected, not just
// differently-labeled copies of the same data.
async function getNudgesForMe(req, res) {
  const myQuotations = await Quotation.find({ salesRepId: req.auth.sub }).select('_id customerId').populate('customerId', 'name');
  const idByQuotation = new Map(myQuotations.map((q) => [String(q._id), q]));
  if (myQuotations.length === 0) return res.json([]);

  const logs = await AuditLog.find({
    entityType: 'Quotation',
    entityId: { $in: myQuotations.map((q) => q._id) },
    action: { $in: ['nudge_sent', 'escalated'] },
  }).sort({ timestamp: -1 }).limit(10);

  const userIds = [...new Set(logs.map((l) => String(l.userId)).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).select('name role');
  const userById = new Map(users.map((u) => [String(u._id), u]));

  res.json(logs.map((l) => {
    const q = idByQuotation.get(String(l.entityId));
    const by = userById.get(String(l.userId));
    return {
      quotationId: l.entityId,
      customer: q?.customerId?.name || 'A customer',
      action: l.action,
      by: by?.name || 'Your manager',
      timestamp: l.timestamp,
    };
  }));
}

module.exports = { getDealHealth, nudgeRep, escalate, getNudgesForMe };
