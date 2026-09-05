const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shippingCostWeight: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
