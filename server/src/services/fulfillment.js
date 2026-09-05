const { Stock } = require('../models');

/**
 * Greedy warehouse-split suggestion: for each line, allocate from the warehouse
 * with the most available stock first, spilling into the next-best warehouse
 * until the quantity is covered or stock runs out (remainder -> backorder).
 */
async function suggestFulfillmentSplit(lines) {
  const splits = [];

  for (const line of lines) {
    if (line.lineType === 'recurring') continue; // subscriptions aren't warehouse-fulfilled

    const stocks = await Stock.find({ productId: line.productId }).sort({ qtyAvailable: -1 });
    let remaining = line.quantity;

    for (const stock of stocks) {
      if (remaining <= 0) break;
      if (stock.qtyAvailable <= 0) continue;
      const take = Math.min(remaining, stock.qtyAvailable);
      remaining -= take;
      splits.push({
        warehouseId: stock.warehouseId,
        productId: line.productId,
        qtyFulfilled: take,
        shipmentCost: take * 5, // flat placeholder cost model, kept simple for the demo
        status: 'suggested',
        isBackorder: false,
      });
    }

    if (remaining > 0) {
      splits.push({
        warehouseId: null,
        productId: line.productId,
        qtyFulfilled: remaining,
        shipmentCost: 0,
        status: 'suggested',
        isBackorder: true,
      });
    }
  }

  return splits;
}

/** Decrements stock for each accepted (non-backorder) split. */
async function commitFulfillmentSplit(splits) {
  for (const split of splits) {
    if (split.isBackorder || !split.warehouseId) continue;
    await Stock.updateOne(
      { productId: split.productId, warehouseId: split.warehouseId },
      { $inc: { qtyAvailable: -split.qtyFulfilled } }
    );
  }
}

module.exports = { suggestFulfillmentSplit, commitFulfillmentSplit };
