const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: String, unique: true },
  courseName: String,
  amount: Number,
  method: { type: String, enum: ['ecpay', 'portaly', 'manual'], default: 'ecpay' },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  ecpayTradeNo: String,
  rawData: Object, // 原始回調資料
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});

module.exports = mongoose.model('Payment', paymentSchema);
