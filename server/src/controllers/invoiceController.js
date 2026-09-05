const { Invoice, Payment } = require('../models');

async function listInvoices(req, res) {
  const invoices = await Invoice.find().populate('customerId', 'name').sort({ dueDate: 1 });
  res.json(invoices);
}

async function getInvoice(req, res) {
  const invoice = await Invoice.findById(req.params.id)
    .populate('customerId')
    .populate({ path: 'quotationId', populate: { path: 'lines.productId', select: 'name' } });
  if (!invoice) return res.status(404).json({ error: 'Not found' });

  // invoice.lines only stores { quotationLineId, amount } - resolve each back
  // to its product name via the populated quotation for display.
  const quotationLines = invoice.quotationId?.lines || [];
  const plain = invoice.toObject();
  plain.lines = plain.lines.map((l) => {
    const src = quotationLines.find((ql) => String(ql._id) === String(l.quotationLineId));
    return { ...l, product: src?.productId?.name || 'Line item' };
  });

  const payments = await Payment.find({ invoiceId: invoice._id });
  res.json({ invoice: plain, payments });
}

async function recordPayment(req, res) {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });

  const payment = await Payment.create({
    invoiceId: invoice._id,
    amount: req.body.amount,
    method: req.body.method || 'card',
  });

  const payments = await Payment.find({ invoiceId: invoice._id });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  invoice.status = totalPaid >= invoice.amount ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
  await invoice.save();

  res.status(201).json({ payment, invoice });
}

module.exports = { listInvoices, getInvoice, recordPayment };
