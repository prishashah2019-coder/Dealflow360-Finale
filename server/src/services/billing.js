const { Subscription, Invoice, SubscriptionPlan } = require('../models');

const CYCLE_DAYS = { monthly: 30, quarterly: 90, yearly: 365 };

function lineSubtotal(line) {
  const discounted = line.unitPrice * (1 - (line.discountPct || 0) / 100);
  return Math.round(discounted * line.quantity * 100) / 100;
}

/**
 * On quotation confirm: creates one Invoice for the one-time lines (if any),
 * one Invoice for the first recurring billing period (if any), and a
 * Subscription document per recurring line with its next billing date.
 */
async function generateBillingArtifacts(quotation) {
  const oneTimeLines = quotation.lines.filter((l) => l.lineType === 'one_time');
  const recurringLines = quotation.lines.filter((l) => l.lineType === 'recurring');

  const invoices = [];
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  if (oneTimeLines.length) {
    const amount = oneTimeLines.reduce((sum, l) => sum + lineSubtotal(l), 0);
    const invoice = await Invoice.create({
      quotationId: quotation._id,
      customerId: quotation.customerId,
      type: 'one_time',
      amount,
      status: 'Unpaid',
      dueDate,
      lines: oneTimeLines.map((l) => ({ quotationLineId: l._id, amount: lineSubtotal(l) })),
    });
    invoices.push(invoice);
  }

  if (recurringLines.length) {
    const amount = recurringLines.reduce((sum, l) => sum + lineSubtotal(l), 0);
    const invoice = await Invoice.create({
      quotationId: quotation._id,
      customerId: quotation.customerId,
      type: 'recurring',
      amount,
      status: 'Unpaid',
      dueDate,
      lines: recurringLines.map((l) => ({ quotationLineId: l._id, amount: lineSubtotal(l) })),
    });
    invoices.push(invoice);

    for (const line of recurringLines) {
      const plan = await SubscriptionPlan.findById(line.subscriptionPlanId);
      const cycleDays = CYCLE_DAYS[plan?.billingCycle] || 30;
      await Subscription.create({
        customerId: quotation.customerId,
        planId: line.subscriptionPlanId,
        quotationId: quotation._id,
        quotationLineId: line._id,
        startDate: new Date(),
        status: 'active',
        nextBillingDate: new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000),
      });
    }
  }

  return invoices;
}

module.exports = { generateBillingArtifacts, lineSubtotal };
