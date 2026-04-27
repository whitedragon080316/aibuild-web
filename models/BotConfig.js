const mongoose = require('mongoose');

// Bago 派 portal v1.5 — LINE Bot 建置 module 設定值
// key 例：ai_avatar_prompt / wave_schedule_config / welcome_flow_meta
// value 用 Mixed type，給未來擴充（string / object / array 都收）
const botConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now },
});

botConfigSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('BotConfig', botConfigSchema);
