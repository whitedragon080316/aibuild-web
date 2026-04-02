const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sessionDate: { type: String, required: true }, // MMDD format
  sessionTime: { type: Date, required: true },
  sessionLabel: String, // e.g. "4/15 下午2點"
  sessionLink: String,  // YouTube live URL
  reminders: {
    '24h': { type: Boolean, default: false },
    '6h': { type: Boolean, default: false },
    '2h': { type: Boolean, default: false },
    '10m': { type: Boolean, default: false }
  },
  source: String, // 來源追蹤
  createdAt: { type: Date, default: Date.now }
});

registrationSchema.index({ userId: 1, sessionDate: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
