const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  lineUserId: { type: String, index: true },
  name: String,
  email: String,
  phone: String,
  courseToken: { type: String, unique: true, sparse: true },
  purchasedCourses: [String],
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  plan: { type: String, enum: ['v1', 'v2'], default: 'v1' },
  source: String, // 來源追蹤：fb_ad, line, portaly, direct
  completedLessons: [String], // ['s1-1', 's1-2', ...]
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});

module.exports = mongoose.model('User', userSchema);
