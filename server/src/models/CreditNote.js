const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', creditNoteSchema);
