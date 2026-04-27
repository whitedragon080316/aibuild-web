const mongoose = require('mongoose');

// Bago 派 portal v1.5 — LINE 圖卡模板
// type: welcome / reg / diag / report / roadmap
// config: { title, body, buttonLabel, buttonUrl, ... } — minimum schema, mixed type 給未來擴充
const lineCardTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['welcome', 'reg', 'diag', 'report', 'roadmap'],
    required: true,
    index: true,
  },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

lineCardTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('LineCardTemplate', lineCardTemplateSchema);
