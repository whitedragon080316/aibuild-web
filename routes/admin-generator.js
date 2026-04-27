// /admin/generator/* — Bago 派 portal v1.5「網站生成」module
// Auth: 同 /admin/lumi 的 cookie pattern，但 cookie path=/admin/generator
//       (因為 lumi cookie path=/admin/lumi 不會送來這條 route，generator 自己管自己的登入)
// 主線在 server.js mount 時：app.use('/admin/generator', require('./routes/admin-generator'))

const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateLP } = require('../lib/template-generator');

const router = express.Router();

// router 內部要解析 form 跟 json
router.use(express.urlencoded({ extended: false }));
router.use(express.json({ limit: '256kb' }));

// ---- Helpers ----

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
    return res.redirect('/admin/generator/login');
  }
  next();
}

function servePage(res, filename, vars = {}) {
  const file = path.join(__dirname, '..', 'views', filename);
  let html = fs.readFileSync(file, 'utf8');
  for (const [key, val] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, typeof val === 'object' ? JSON.stringify(val) : val);
  }
  res.send(html);
}

// ---- Auth Routes ----

router.get('/login', (req, res) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).send('ADMIN_TOKEN not configured');
  const errMsg = req.query.err
    ? '<div style="color:#c62828;font-size:13px;margin-bottom:10px">Token 不對</div>'
    : '';
  res.send(`<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIbuild · 網站生成登入</title>
<style>
body{font-family:-apple-system,'Noto Sans TC',sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.06);width:340px;border:1px solid #e5e5ea;}
h1{color:#2B44B0;font-size:20px;margin:0 0 6px;letter-spacing:0.02em;}
.sub{color:#888;font-size:12px;margin-bottom:20px;}
input{width:100%;padding:12px 14px;border:1.5px solid #e5e5ea;border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box;}
input:focus{outline:none;border-color:#3B5BDB;}
button{width:100%;padding:12px;margin-top:12px;background:linear-gradient(135deg,#3B5BDB,#2B44B0);color:#fff;border:0;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
button:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(43,68,176,0.25);}
</style></head><body>
<form class="card" method="POST" action="/admin/generator/login">
  <h1>AIbuild · 網站生成</h1>
  <div style="color:#888;font-size:11px;margin:-2px 0 16px;letter-spacing:0.04em;">始於自己 終於 AI</div>
  <div class="sub">輸入 admin token 進入</div>
  ${errMsg}
  <input type="password" name="token" placeholder="Admin token" required autofocus autocomplete="off">
  <button type="submit">進入</button>
</form>
</body></html>`);
});

router.post('/login', (req, res) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).send('ADMIN_TOKEN not configured');
  const token = (req.body && req.body.token) || '';
  if (token !== expected) return res.redirect('/admin/generator/login?err=1');
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader('Set-Cookie', `admin_token=${encodeURIComponent(token)}; HttpOnly; Path=/admin/generator; SameSite=Lax; Max-Age=${maxAge}`);
  res.redirect('/admin/generator');
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/admin/generator; Max-Age=0');
  res.redirect('/admin/generator/login');
});

// ---- App Routes ----

router.get('/', checkAdminAuth, (req, res) => {
  servePage(res, 'admin-generator.html', {
    ZEABUR_DEPLOY_URL: process.env.ZEABUR_DEPLOY_URL || 'https://zeabur.com/dashboard',
  });
});

router.post('/api/generate', checkAdminAuth, async (req, res) => {
  try {
    const spec = req.body || {};
    if (!spec.niche && !spec.solution) {
      return res.status(400).json({ error: '至少要填領域或解方' });
    }
    const { html } = await generateLP(spec);
    res.json({ ok: true, html });
  } catch (e) {
    console.error('[admin-generator] generate error:', e.message);
    res.status(500).json({ error: e.message || '生成失敗' });
  }
});

module.exports = router;
