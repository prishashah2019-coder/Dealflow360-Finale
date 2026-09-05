const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  qtyAvailable: { type: Number, default: 0 },
  replenishmentRule: { type: String, default: '' },
}, { timestamps: true });

stockSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
