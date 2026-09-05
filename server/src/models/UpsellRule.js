const mongoose = require('mongoose');

const upsellRuleSchema = new mongoose.Schema({
  sourceProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  suggestedProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  minMarginThreshold: { type: Number, default: 0 },
  isPromoted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('UpsellRule', upsellRuleSchema);
