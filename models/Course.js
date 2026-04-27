const mongoose = require('mongoose');

// Bago 派 Portal v1.5 — 課程 admin 上架用
// 跟 course.json（既有公開課）是兩份 DB，未來 sync 是後話
// status: draft（草稿，後台預覽用） / published（已上架）/ unpublished（下架）

const chapterSchema = new mongoose.Schema({
  name: String,
  videoUrl: String,
  duration: String,
  intro: String,
}, { _id: false });

const courseSchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  coverImage: String,
  chapters: { type: [chapterSchema], default: [] },
  price: Number,
  earlyPrice: Number,
  earlyDeadline: Date,
  status: { type: String, enum: ['draft', 'published', 'unpublished'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

courseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

courseSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Course', courseSchema);
