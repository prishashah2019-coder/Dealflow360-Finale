const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema({
  quotationLineId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['one_time', 'recurring'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Sent', 'Unpaid', 'Partially Paid', 'Paid'], default: 'Unpaid' },
  dueDate: { type: Date, required: true },
  lines: [invoiceLineSchema],
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
