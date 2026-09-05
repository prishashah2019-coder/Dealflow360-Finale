const mongoose = require('mongoose');

const priceListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  customerTier: { type: String, enum: ['Bronze', 'Silver', 'Gold'], required: true },
  currency: { type: String, default: 'USD' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    price: Number,
  }],
}, { timestamps: true });

module.exports = mongoose.model('PriceList', priceListSchema);
