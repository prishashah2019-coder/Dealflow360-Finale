const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'card' },
  paidAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['succeeded', 'failed'], default: 'succeeded' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
