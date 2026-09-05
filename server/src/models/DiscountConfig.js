const mongoose = require('mongoose');

// Singleton-style config document (one row expected) backing the
// "Discount tiers and approval chains" admin screen.
const discountConfigSchema = new mongoose.Schema({
  tierCeilings: [{
    tierName: { type: String, enum: ['Bronze', 'Silver', 'Gold'] },
    maxDiscountPct: Number,
  }],
  categoryCeilings: [{
    category: String,
    maxDiscountPct: Number,
  }],
  approvalChainRules: [{
    minScore: Number,
    maxScore: Number, // null/Infinity-sentinel (use 999999) for open-ended top range
    requiredRoles: [{ type: String, enum: ['sales_manager', 'finance'] }],
    label: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('DiscountConfig', discountConfigSchema);
