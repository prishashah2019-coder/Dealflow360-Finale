const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  tier: { type: String, enum: ['Bronze', 'Silver', 'Gold'], default: 'Bronze' },
  portalLoginType: { type: String, enum: ['magic_link', 'password'], default: 'password' },
  currency: { type: String, default: 'USD' },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
