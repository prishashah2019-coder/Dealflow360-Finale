const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  quotationLineId: { type: mongoose.Schema.Types.ObjectId, required: true },
  startDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  nextBillingDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
