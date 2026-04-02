const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  lineUserId: { type: String, index: true },
  name: String,
  email: String,
  phone: String,
  courseToken: { type: String, unique: true, sparse: true },
  purchasedCourses: [String],
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  source: String, // 來源追蹤：fb_ad, line, portaly, direct
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});

module.exports = mongoose.model('User', userSchema);
