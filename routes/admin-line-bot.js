// Bago 派 portal v1.5 — LINE 機器人建置 module（5/28 直播 demo minimum 版）
// Cookie auth 同 admin-lumi（admin_token, path=/admin/lumi）；本 router 用獨立 path /admin/line-bot
// 主線在 server.js mount: app.use('/admin/line-bot', require('./routes/admin-line-bot'))
//
// 範圍：
//   - GET /                     → admin-line-bot.html SPA
//   - GET /api/status           → 讀 env vars 回 LINE Bot 健康度
//   - GET /api/config/:key      → BotConfig.findOne lean
//   - PATCH /api/config/:key    → upsert BotConfig

const express = require('express');
const path = require('path');
const fs = require('fs');
const BotConfig = require('../models/BotConfig');

const router = express.Router();

// ==== Auth：cookie admin_token vs ADMIN_TOKEN ====
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(p => {
    const [k, ...v] = p.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

function checkAdminAuth(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: 'ADMIN_TOKEN not configured' });
  const cookies = parseCookies(req);
  const token = cookies.admin_token || req.headers['x-admin-token'];
  if (token !== expected) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'invalid token' });
    }
    return res.redirect('/admin/lumi/login');
  }
  next();
}

// ==== Page ====
router.get('/', checkAdminAuth, (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin-line-bot.html'), 'utf8');
  res.send(html);
});

// ==== API: status — 讀 env vars 回 LINE Bot 健康度 ====
// 不對外 leak token 值，只回 boolean
router.get('/api/status', checkAdminAuth, (req, res) => {
  try {
    const hasChannelToken = !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN.length > 10);
    const hasChannelSecret = !!(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_SECRET.length > 10);
    const publicBase = process.env.PUBLIC_BASE_URL || process.env.SITE_URL || '';
    const webhookUrl = publicBase ? `${publicBase.replace(/\/$/, '')}/webhook` : '';
    const hasAiKey = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY
    );
    res.json({
      hasChannelToken,
      hasChannelSecret,
      webhookUrl,
      hasAiKey,
    });
  } catch (e) {
    console.error('[admin-line-bot/status]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==== API: get config by key ====
router.get('/api/config/:key', checkAdminAuth, async (req, res) => {
  try {
    const cfg = await BotConfig.findOne({ key: req.params.key }).lean();
    res.json({ config: cfg || null });
  } catch (e) {
    console.error('[admin-line-bot/config/get]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==== API: upsert config by key ====
router.patch('/api/config/:key', checkAdminAuth, async (req, res) => {
  try {
    const { value } = req.body || {};
    if (value === undefined) return res.status(400).json({ error: 'value required' });
    const cfg = await BotConfig.findOneAndUpdate(
      { key: req.params.key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ config: cfg });
  } catch (e) {
    console.error('[admin-line-bot/config/patch]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
