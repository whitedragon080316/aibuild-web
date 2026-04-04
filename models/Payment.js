const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: String, unique: true },
  courseName: String,
  amount: Number,
  plan: { type: String, enum: ['v1', 'v2'], default: 'v1' },
  method: { type: String, enum: ['tappay', 'manual'], default: 'tappay' },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  tradeId: String, // TapPay rec_trade_id
  rawData: Object, // 原始回調資料
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});

module.exports = mongoose.model('Payment', paymentSchema);
