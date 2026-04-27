// Bago 派 portal v1.5 — LINE 圖卡管理 module（5/28 直播 demo minimum 版）
// Cookie auth 同 admin-lumi（admin_token, path=/admin/lumi）；本 router 用獨立 path /admin/line-cards
// 主線在 server.js mount: app.use('/admin/line-cards', require('./routes/admin-line-cards'))

const express = require('express');
const path = require('path');
const fs = require('fs');
const LineCardTemplate = require('../models/LineCardTemplate');

const router = express.Router();

// ==== 預設模板 seed（首次 GET /api/templates 自動補齊）====
const SEED_TEMPLATES = [
  {
    name: '歡迎卡',
    type: 'welcome',
    config: {
      title: '歡迎加入 Bago 派！',
      body: '我是 Bago，AI 造局術的設計者。\n接下來會帶你看看怎麼用 AI 把事業跑起來。',
      buttonLabel: '開始 7 題診斷',
      buttonUrl: 'https://liff.line.me/2009874507-vMOk2taj',
    },
  },
  {
    name: '報名直播卡',
    type: 'reg',
    config: {
      title: 'Bago 親自直播 — AI 造局術拆解',
      body: '一場直播看完整套：從無到有把事業跑起來的 AI 工作流。\n名額有限，先到先佔位。',
      buttonLabel: '我要報名',
      buttonUrl: 'https://aibuilding.zeabur.app/live',
    },
  },
  {
    name: '諮詢診斷卡',
    type: 'diag',
    config: {
      title: '7 題找出你的事業卡點',
      body: 'Lumi 會用 7 題快速診斷你目前最大的造局 bottleneck，3 分鐘出報告。',
      buttonLabel: '開始診斷',
      buttonUrl: 'https://aibuilding.zeabur.app/lumi',
    },
  },
  {
    name: '報告生成卡',
    type: 'report',
    config: {
      title: '你的造局診斷報告好了',
      body: '我把你 7 題的回答整理成一份專屬報告，含三個立刻可動的下一步。',
      buttonLabel: '看完整報告',
      buttonUrl: 'https://aibuilding.zeabur.app/lumi/report/SAMPLE',
    },
  },
  {
    name: '5 大 module 路線圖卡',
    type: 'roadmap',
    config: {
      title: 'AI 造局術 — 5 大 module 路線圖',
      body: '從 Builder 到 Partner：定位 → 內容 → 流量 → 成交 → 自動化，一張圖看懂。',
      buttonLabel: '看路線圖',
      buttonUrl: 'https://aibuilding.zeabur.app/lp#roadmap',
    },
  },
];

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

// ==== Helper：自動補 seed templates ====
async function ensureSeedTemplates() {
  const count = await LineCardTemplate.countDocuments();
  if (count > 0) return;
  await LineCardTemplate.insertMany(SEED_TEMPLATES);
  console.log('[admin-line-cards] seeded', SEED_TEMPLATES.length, 'default templates');
}

// ==== Page ====
router.get('/', checkAdminAuth, (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin-line-cards.html'), 'utf8');
  res.send(html);
});

// ==== API: list ====
router.get('/api/templates', checkAdminAuth, async (req, res) => {
  try {
    await ensureSeedTemplates();
    const templates = await LineCardTemplate.find({}).sort({ type: 1, updatedAt: -1 }).lean();
    res.json({ templates });
  } catch (e) {
    console.error('[admin-line-cards/list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==== API: detail ====
router.get('/api/templates/:id', checkAdminAuth, async (req, res) => {
  try {
    const tpl = await LineCardTemplate.findById(req.params.id).lean();
    if (!tpl) return res.status(404).json({ error: 'not found' });
    res.json({ template: tpl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==== API: update ====
router.patch('/api/templates/:id', checkAdminAuth, async (req, res) => {
  try {
    const { name, config } = req.body || {};
    const update = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (config !== undefined) update.config = config;
    const tpl = await LineCardTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );
    if (!tpl) return res.status(404).json({ error: 'not found' });
    res.json({ template: tpl });
  } catch (e) {
    console.error('[admin-line-cards/patch]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==== API: 推給管理者自己（test） ====
// Reuse existing /internal/admin-push endpoint on bot 端（純文字）
router.post('/api/templates/:id/test-push', checkAdminAuth, async (req, res) => {
  try {
    const tpl = await LineCardTemplate.findById(req.params.id).lean();
    if (!tpl) return res.status(404).json({ error: 'not found' });

    const adminLineUserId = process.env.ADMIN_LINE_USER_ID;
    const botUrl = process.env.BOT_INTERNAL_URL;
    const sharedSecret = process.env.LUMI_SHARED_SECRET;
    if (!adminLineUserId || !botUrl || !sharedSecret) {
      return res.status(503).json({
        error: 'ADMIN_LINE_USER_ID / BOT_INTERNAL_URL / LUMI_SHARED_SECRET not all configured',
      });
    }

    const c = tpl.config || {};
    const text = `[圖卡預覽 · ${tpl.name}]\n\n${c.title || ''}\n\n${c.body || ''}\n\n→ ${c.buttonLabel || '按鈕'}\n${c.buttonUrl || ''}`;

    const resp = await fetch(`${botUrl.replace(/\/$/, '')}/internal/admin-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId: adminLineUserId, text, sharedSecret }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json({ error: body.error || `bot returned ${resp.status}` });
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin-line-cards/test-push]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
