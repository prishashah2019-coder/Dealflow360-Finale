const { Subscription, CreditNote } = require('../models');

async function listSubscriptions(req, res) {
  const subs = await Subscription.find()
    .populate('customerId', 'name')
    .populate('planId', 'name billingCycle')
    .sort({ nextBillingDate: 1 });
  res.json(subs);
}

async function getSubscription(req, res) {
  const sub = await Subscription.findById(req.params.id)
    .populate('customerId')
    .populate('planId')
    .populate({ path: 'quotationId', populate: { path: 'lines.productId', select: 'name' } });
  if (!sub) return res.status(404).json({ error: 'Not found' });

  // The Billing Detail screen shows the one-time lines from the originating
  // order alongside this subscription's own recurring line(s) - both live on
  // the same quotation, so shape that split here instead of making the
  // frontend reach into quotationId.lines itself.
  const lines = sub.quotationId?.lines || [];
  const lineAmount = (l) => Math.round(l.unitPrice * (1 - (l.discountPct || 0) / 100) * l.quantity * 100) / 100;
  const oneTimeLines = lines
    .filter((l) => l.lineType === 'one_time')
    .map((l) => ({ product: l.productId?.name, qty: l.quantity, price: l.unitPrice, amount: lineAmount(l) }));
  const recurringLines = lines
    .filter((l) => l.lineType === 'recurring')
    .map((l) => ({
      plan: sub.planId?.name,
      cycle: sub.planId?.billingCycle,
      nextBilling: sub.nextBillingDate,
      amount: lineAmount(l),
    }));

  res.json({ ...sub.toObject(), customer: sub.customerId?.name, oneTimeLines, recurringLines });
}

async function modifySubscription(req, res) {
  const sub = await Subscription.findById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const { nextBillingDate, prorationAmount, reason } = req.body;
  if (nextBillingDate) sub.nextBillingDate = nextBillingDate;
  await sub.save();
  if (prorationAmount) {
    await CreditNote.create({ subscriptionId: sub._id, amount: prorationAmount, reason: reason || 'mid-cycle change proration' });
  }
  res.json(sub);
}

async function cancelSubscription(req, res) {
  const sub = await Subscription.findById(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  sub.status = 'cancelled';
  await sub.save();
  if (req.body.refundAmount) {
    await CreditNote.create({
      subscriptionId: sub._id,
      amount: req.body.refundAmount,
      reason: req.body.reason || 'cancellation partial refund',
    });
  }
  res.json(sub);
}

module.exports = { listSubscriptions, getSubscription, modifySubscription, cancelSubscription };
