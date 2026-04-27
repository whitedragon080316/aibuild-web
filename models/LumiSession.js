const mongoose = require('mongoose');

const lumiSessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, index: true },
  lineUserId: { type: String, index: true },
  displayName: String,
  // chatHistory: [{ role: 'user'|'assistant'|'system', content, ts }]
  chatHistory: { type: Array, default: [] },
  // answers: { q1: "...", q2: "...", ..., q7: "..." }
  answers: { type: Object, default: {} },
  currentQuestion: { type: Number, default: 1 },
  reportMarkdown: { type: String, default: '' },
  reportGeneratedAt: Date,
  reportPushedAt: Date,
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['new', 'completed_7q', 'chatting', 'stuck', 'converted'],
    default: 'new',
    index: true,
  },
  adminNotes: { type: String, default: '' },
  lastAdminAction: Date,
});

module.exports = mongoose.model('LumiSession', lumiSessionSchema);
