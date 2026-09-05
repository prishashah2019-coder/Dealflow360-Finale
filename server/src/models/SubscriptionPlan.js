const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
  prorationRule: { type: String, default: 'daily_proration' },
  cancellationRule: { type: String, default: 'prorated_refund' },
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
