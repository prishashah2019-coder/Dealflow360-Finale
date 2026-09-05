const { Quotation, Product } = require('../models');

async function getReports(req, res) {
  const { period, repId, status, productId } = req.query;
  const filter = {};

  if (repId) filter.salesRepId = repId;
  if (status) filter.status = status;
  if (productId) filter['lines.productId'] = productId;
  if (period) {
    // Accepts named periods (today/week/month/ytd) or a "<n>d" / bare-number
    // day count, so either filter convention a client picks works.
    const named = { today: 1, week: 7, month: 30, ytd: 365 }[period];
    const days = named ?? Number(String(period).replace(/d$/, '')) ?? 30;
    filter.createdAt = { $gte: new Date(Date.now() - (Number.isFinite(days) ? days : 30) * 24 * 60 * 60 * 1000) };
  }

  const quotations = await Quotation.find(filter).populate('salesRepId', 'name').populate('customerId', 'name');

  const quotesCreated = quotations.length;

  const approvalDurationsMs = [];
  for (const q of quotations) {
    const decided = q.approvals.filter((a) => a.decidedAt);
    if (decided.length) {
      const last = decided.reduce((a, b) => (a.decidedAt > b.decidedAt ? a : b));
      approvalDurationsMs.push(new Date(last.decidedAt) - new Date(q.createdAt));
    }
  }
  const avgApprovalTimeHours = approvalDurationsMs.length
    ? approvalDurationsMs.reduce((s, v) => s + v, 0) / approvalDurationsMs.length / 3.6e6
    : 0;

  const productCounts = new Map();
  for (const q of quotations) {
    for (const line of q.lines) {
      const key = String(line.productId);
      productCounts.set(key, (productCounts.get(key) || 0) + line.quantity);
    }
  }
  let topUpsoldProductId = null;
  let topCount = 0;
  for (const [id, count] of productCounts) {
    if (count > topCount) { topCount = count; topUpsoldProductId = id; }
  }
  const topProduct = topUpsoldProductId ? await Product.findById(topUpsoldProductId).select('name') : null;

  res.json({
    quotesCreated,
    avgApprovalTime: Math.round(avgApprovalTimeHours * 10) / 10, // hours
    topUpsoldProduct: topProduct ? `${topProduct.name} (${topCount} units)` : '—',
    quotations,
  });
}

module.exports = { getReports };
