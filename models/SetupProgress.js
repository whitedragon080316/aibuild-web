const mongoose = require('mongoose');

// Bago 派 portal v1.5 — Setup Wizard 進度
// 純 single-admin v1（5/28 後 multi-admin 加 adminId index）
// stepStatus: { step1: 'pending'|'in_progress'|'done', step2: ..., step3: ..., step4: ..., step5: ... }
const setupProgressSchema = new mongoose.Schema({
  adminId: { type: String, default: 'bago', index: true },
  stepStatus: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

setupProgressSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SetupProgress', setupProgressSchema);
