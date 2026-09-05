const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String, default: '' },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
