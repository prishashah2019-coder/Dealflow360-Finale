const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  discountPct: { type: Number, default: 0 },
  lineType: { type: String, enum: ['one_time', 'recurring'], default: 'one_time' },
  subscriptionPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
}, { timestamps: true });

const approvalStepSchema = new mongoose.Schema({
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  stepOrder: { type: Number, required: true },
  approverRole: { type: String, enum: ['sales_manager', 'finance'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'returned'], default: 'pending' },
  comment: { type: String, default: '' },
  decidedAt: { type: Date, default: null },
}, { timestamps: true });

const fulfillmentSplitSchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qtyFulfilled: { type: Number, required: true },
  shipmentCost: { type: Number, default: 0 },
  status: { type: String, enum: ['suggested', 'accepted', 'overridden'], default: 'suggested' },
  isBackorder: { type: Boolean, default: false },
}, { timestamps: true });

const negotiationCommentSchema = new mongoose.Schema({
  authorType: { type: String, enum: ['customer', 'rep'], required: true },
  lineId: { type: mongoose.Schema.Types.ObjectId, default: null },
  commentText: { type: String, default: '' },
  counterDiscountPct: { type: Number, default: null },
}, { timestamps: true });

const dealHealthAlertSchema = new mongoose.Schema({
  alertType: { type: String, enum: ['stalled', 'discount_anomaly', 'delivery_slippage'], required: true },
  detectedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'nudged', 'escalated', 'resolved'], default: 'open' },
}, { timestamps: true });

const quotationSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Under Negotiation', 'Confirmed', 'Rejected'],
    default: 'Draft',
  },
  blendedRiskScore: { type: Number, default: 0 },
  lines: [lineSchema],
  approvals: [approvalStepSchema],
  fulfillmentSplits: [fulfillmentSplitSchema],
  negotiationComments: [negotiationCommentSchema],
  dealHealthAlerts: [dealHealthAlertSchema],
}, { timestamps: true });

module.exports = mongoose.model('Quotation', quotationSchema);
