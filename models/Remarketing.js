const mongoose = require('mongoose');

const remarketingSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sessionDate: { type: String, required: true },
  sessionTime: { type: Date, required: true },
  attended: { type: Boolean, default: false },
  converted: { type: Boolean, default: false }, // true = 已付款，停止追單
  waves: {
    wave1: { type: Boolean, default: false }, // +2h
    wave2: { type: Boolean, default: false }, // D+1
    wave3: { type: Boolean, default: false }  // D+2
  },
  createdAt: { type: Date, default: Date.now }
});

remarketingSchema.index({ userId: 1, sessionDate: 1 }, { unique: true });

module.exports = mongoose.model('Remarketing', remarketingSchema);
