// Bago 派 portal v1.5 — Setup Wizard module（5/28 直播 demo 用）
// Cookie auth 同 admin-lumi（admin_token）；本 router 用獨立 path /admin/setup-wizard
// 主線在 server.js mount: app.use('/admin/setup-wizard', require('./routes/admin-setup-wizard'))

const express = require('express');
const path = require('path');
const fs = require('fs');
const SetupProgress = require('../models/SetupProgress');

const router = express.Router();

const VALID_STEPS = ['step1', 'step2', 'step3', 'step4', 'step5'];
const VALID_STATUS = ['pending', 'in_progress', 'done'];
const DEFAULT_ADMIN_ID = 'bago';

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

// ==== Helper：default 全 pending ====
function defaultStepStatus() {
  return VALID_STEPS.reduce((acc, s) => ({ ...acc, [s]: 'pending' }), {});
}

// ==== Page ====
router.get('/', checkAdminAuth, (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin-setup-wizard.html'), 'utf8');
  res.send(html);
});

// ==== API: 拿進度 ====
router.get('/api/progress', checkAdminAuth, async (req, res) => {
  try {
    let doc = await SetupProgress.findOne({ adminId: DEFAULT_ADMIN_ID }).lean();
    if (!doc) {
      doc = { adminId: DEFAULT_ADMIN_ID, stepStatus: defaultStepStatus(), updatedAt: new Date() };
    }
    // 補齊缺的 step（避免舊 doc 漏 key）
    const merged = { ...defaultStepStatus(), ...(doc.stepStatus || {}) };
    res.json({ adminId: doc.adminId, stepStatus: merged, updatedAt: doc.updatedAt });
  } catch (e) {
    console.error('[admin-setup-wizard/progress]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==== API: 更新單一 step ====
router.patch('/api/progress/:step', checkAdminAuth, async (req, res) => {
  try {
    const { step } = req.params;
    const { status } = req.body || {};
    if (!VALID_STEPS.includes(step)) {
      return res.status(400).json({ error: `invalid step (${VALID_STEPS.join(',')})` });
    }
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `invalid status (${VALID_STATUS.join(',')})` });
    }
    let doc = await SetupProgress.findOne({ adminId: DEFAULT_ADMIN_ID });
    if (!doc) {
      doc = new SetupProgress({ adminId: DEFAULT_ADMIN_ID, stepStatus: defaultStepStatus() });
    }
    const next = { ...defaultStepStatus(), ...(doc.stepStatus || {}), [step]: status };
    doc.stepStatus = next;
    doc.markModified('stepStatus');
    await doc.save();
    res.json({ adminId: doc.adminId, stepStatus: next, updatedAt: doc.updatedAt });
  } catch (e) {
    console.error('[admin-setup-wizard/patch]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
