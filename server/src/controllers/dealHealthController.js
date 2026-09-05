const { computeDealHealth } = require('../services/dealHealth');
const { Quotation, AuditLog } = require('../models');

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

module.exports = { getDealHealth, nudgeRep, escalate };
