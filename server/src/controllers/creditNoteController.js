const { CreditNote, Subscription, Invoice, Customer } = require('../models');

// Finance "reconciles recurring billing and credit notes" - this is where
// they actually see the credit notes that subscription modify/cancel
// actions generate (previously only existed in the database with no UI).
async function listCreditNotes(req, res) {
  const notes = await CreditNote.find().sort({ createdAt: -1 }).limit(200);

  const subIds = [...new Set(notes.map((n) => String(n.subscriptionId)).filter((id) => id !== 'null'))];
  const invIds = [...new Set(notes.map((n) => String(n.invoiceId)).filter((id) => id !== 'null'))];
  const subs = await Subscription.find({ _id: { $in: subIds } }).populate('customerId', 'name').populate('planId', 'name');
  const invoices = await Invoice.find({ _id: { $in: invIds } }).populate('customerId', 'name');
  const subById = new Map(subs.map((s) => [String(s._id), s]));
  const invById = new Map(invoices.map((i) => [String(i._id), i]));

  res.json(notes.map((n) => {
    const sub = subById.get(String(n.subscriptionId));
    const inv = invById.get(String(n.invoiceId));
    const customer = sub?.customerId?.name || inv?.customerId?.name || 'Unknown';
    const source = sub ? `Subscription: ${sub.planId?.name || 'plan'}` : inv ? `Invoice ${String(inv._id).slice(-6).toUpperCase()}` : '—';
    return {
      _id: n._id,
      customer,
      source,
      amount: n.amount,
      reason: n.reason,
      createdAt: n.createdAt,
    };
  }));
}

module.exports = { listCreditNotes };
