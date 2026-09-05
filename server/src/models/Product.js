const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  attributeName: String,
  attributeValue: String,
  extraPrice: { type: Number, default: 0 },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  basePrice: { type: Number, required: true },
  unit: { type: String, default: 'unit' },
  taxPct: { type: Number, default: 0 },
  description: { type: String, default: '' },
  isSubscription: { type: Boolean, default: false },
  variants: [variantSchema],
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
