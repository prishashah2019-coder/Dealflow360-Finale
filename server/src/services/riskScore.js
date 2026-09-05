const { Product, DiscountConfig } = require('../models');

/**
 * Computes the value-weighted "blended discount risk score" for a quotation's lines,
 * and the resolved approval chain (list of required roles, in order) for that score.
 *
 * Per line: effectiveLimit = min(customerTierMaxPct, categoryCeilingMaxPct).
 * overagePct = max(0, discountGiven - effectiveLimit).
 * blendedRiskScore = sum(overagePct * lineSubtotal) / sum(lineSubtotal)
 * -> a single line that blows its own limit always produces a score > 0, even if
 *    every other line is compliant and the order-level average discount looks fine.
 */
async function computeBlendedRiskScore(lines, customerTier) {
  const config = await DiscountConfig.findOne();
  const tierMax = config?.tierCeilings?.find((t) => t.tierName === customerTier)?.maxDiscountPct ?? 0;

  // line.productId may be a raw ObjectId or an already-populated Product
  // document (callers like getQuotation populate lines.productId for
  // display) - normalize to the id string either way before using it as a
  // map key, otherwise a populated doc silently fails the lookup below and
  // every line falls back to "Uncategorized" with no category ceiling.
  const rawProductId = (l) => String(l.productId?._id ?? l.productId);

  const productIds = lines.map((l) => rawProductId(l));
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [String(p._id), p]));

  let weightedOverageSum = 0;
  let subtotalSum = 0;
  const lineBreakdown = [];

  for (const line of lines) {
    const product = productById.get(rawProductId(line));
    const category = product?.category || 'Uncategorized';
    const categoryMax = config?.categoryCeilings?.find((c) => c.category === category)?.maxDiscountPct;
    const effectiveLimit = categoryMax != null ? Math.min(tierMax, categoryMax) : tierMax;

    const subtotal = line.unitPrice * line.quantity;
    const overagePct = Math.max(0, (line.discountPct || 0) - effectiveLimit);
    const limitSource = categoryMax == null ? 'tier'
      : categoryMax === tierMax ? 'tier & category'
      : categoryMax < tierMax ? 'category' : 'tier';

    weightedOverageSum += overagePct * subtotal;
    subtotalSum += subtotal;

    lineBreakdown.push({
      lineId: line._id,
      productId: line.productId,
      productName: product?.name,
      category,
      discountGiven: line.discountPct || 0,
      limitAllowed: effectiveLimit,
      overagePct,
      givenBy: limitSource,
    });
  }

  const blendedRiskScore = subtotalSum > 0 ? weightedOverageSum / subtotalSum : 0;

  let requiredRoles = [];
  if (config?.approvalChainRules?.length) {
    const rule = config.approvalChainRules.find(
      (r) => blendedRiskScore >= r.minScore && blendedRiskScore <= r.maxScore
    );
    requiredRoles = rule?.requiredRoles || [];
  } else if (blendedRiskScore > 0) {
    // Sensible default if admin hasn't configured chain rules yet.
    requiredRoles = blendedRiskScore > 5 ? ['sales_manager', 'finance'] : ['sales_manager'];
  }

  return { blendedRiskScore, requiredRoles, lineBreakdown };
}

module.exports = { computeBlendedRiskScore };
