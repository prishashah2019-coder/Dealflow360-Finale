const { Quotation } = require('../models');

const STALLED_DAYS = 7;
const ANOMALY_MULTIPLIER = 1.75; // flag if a quote's avg discount is >=75% above the rep's own historical average

function avgDiscount(quotation) {
  if (!quotation.lines.length) return 0;
  return quotation.lines.reduce((sum, l) => sum + (l.discountPct || 0), 0) / quotation.lines.length;
}

/**
 * Computes deal-health alerts live across all open quotations (no cron needed
 * for a 24h hackathon demo - always reflects current state).
 */
async function computeDealHealth() {
  const openStatuses = ['Draft', 'Pending Approval', 'Approved', 'Under Negotiation'];
  const quotations = await Quotation.find({ status: { $in: openStatuses } })
    .populate('customerId', 'name')
    .populate('salesRepId', 'name');

  const now = Date.now();
  const repAverages = new Map(); // repId -> { sum, count }

  for (const q of quotations) {
    const repId = String(q.salesRepId?._id);
    const avg = avgDiscount(q);
    const bucket = repAverages.get(repId) || { sum: 0, count: 0 };
    bucket.sum += avg;
    bucket.count += 1;
    repAverages.set(repId, bucket);
  }

  const stalled = [];
  const anomalies = [];
  const slippage = [];

  for (const q of quotations) {
    const daysSinceUpdate = (now - new Date(q.updatedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceUpdate >= STALLED_DAYS) {
      stalled.push({
        quotationId: q._id,
        customer: q.customerId?.name,
        rep: q.salesRepId?.name,
        issue: `Inactive for ${Math.floor(daysSinceUpdate)} days`,
        flaggedAt: q.updatedAt,
      });
    }

    const repId = String(q.salesRepId?._id);
    const bucket = repAverages.get(repId);
    const repAvg = bucket && bucket.count > 1 ? (bucket.sum - avgDiscount(q)) / (bucket.count - 1) : null;
    const thisAvg = avgDiscount(q);
    if (repAvg != null && repAvg > 0 && thisAvg > repAvg * ANOMALY_MULTIPLIER) {
      anomalies.push({
        quotationId: q._id,
        customer: q.customerId?.name,
        rep: q.salesRepId?.name,
        issue: `Discount ${thisAvg.toFixed(1)}% vs rep avg ${repAvg.toFixed(1)}%`,
        flaggedAt: new Date(),
      });
    }

    const hasUnresolvedFulfillment = q.fulfillmentSplits.some((s) => s.status === 'suggested' || s.isBackorder);
    if (q.status === 'Approved' && hasUnresolvedFulfillment && daysSinceUpdate >= 3) {
      slippage.push({
        quotationId: q._id,
        customer: q.customerId?.name,
        rep: q.salesRepId?.name,
        issue: 'Fulfillment split still unresolved / backordered',
        flaggedAt: q.updatedAt,
      });
    }
  }

  return { stalled, anomalies, slippage };
}

module.exports = { computeDealHealth };
