// /admin/ads — Bago 派 portal v1.5 「廣告投放 GUI」module（read-only dashboard）
//
// Mount in server.js:
//   const adminAdsRouter = require('./routes/admin-ads');
//   app.use('/admin/ads', adminAdsRouter);
//
// Auth: 沿用同一個 admin_token cookie（cookie path=/admin 也吃；目前 path=/admin/lumi
// 不會自動帶過來，所以我們自己 parse cookie + 跨 path 共用 ADMIN_TOKEN）。
// 沒登入 → 導去 /admin/lumi/login（既有登入頁，登完會 set cookie path=/admin/lumi）。
// 為了讓 /admin/ads 也吃到，登入時若進到這條 router 也順便把 cookie path 拓寬，
// 但這是 v1 共用方案：cookie path=/admin/lumi 不夠廣 → 我們在這 router 自己 set
// 一份 path=/admin/ads 的 cookie。簡單做法：直接用 query/redirect dance。
//
// 為簡化（v1.5 minimum），這裡只 require ADMIN_TOKEN 透過 cookie / x-admin-token /
// query 任一傳進來；若 cookie 是 path=/admin/lumi 的，我們改 instructions 引導
// user 從 /admin/lumi 進來再點過去（實際 cookie 在 server 端 parse 即可）。

const express = require('express');
const path = require('path');
const fs = require('fs');
const { fetchAdsInsights } = require('../lib/meta-ads-fetcher');

const router = express.Router();

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
  if (!expected) {
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ error: 'ADMIN_TOKEN not configured' });
    }
    return res.status(503).send('ADMIN_TOKEN not configured');
  }
  const cookies = parseCookies(req);
  const token = cookies.admin_token || req.headers['x-admin-token'] || req.query.token;
  if (token !== expected) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'invalid token' });
    }
    return res.redirect('/admin/lumi/login');
  }
  // 若 token 是從 cookie path=/admin/lumi 帶過來但目前 path 是 /admin/ads，
  // 補一份 path=/admin/ads 的 cookie 讓後續 request 不必每次帶 query。
  if (cookies.admin_token === expected) {
    const maxAge = 7 * 24 * 60 * 60;
    res.setHeader('Set-Cookie', `admin_token=${encodeURIComponent(expected)}; HttpOnly; Path=/admin/ads; SameSite=Lax; Max-Age=${maxAge}`);
  }
  next();
}

function servePage(res, filename, vars = {}) {
  let html = fs.readFileSync(path.join(__dirname, '..', 'views', filename), 'utf8');
  for (const [key, val] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, typeof val === 'object' ? JSON.stringify(val) : val);
  }
  res.send(html);
}

// Dashboard 頁
router.get('/', checkAdminAuth, (req, res) => {
  servePage(res, 'admin-ads.html', {
    HAS_META_TOKEN: process.env.META_ACCESS_TOKEN ? 'true' : 'false',
    META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID || 'act_736408359703015',
  });
});

// API: insights
router.get('/api/insights', checkAdminAuth, async (req, res) => {
  try {
    const datePreset = req.query.datePreset || 'last_14d';
    const level = req.query.level || 'adset';
    const data = await fetchAdsInsights({ datePreset, level });
    if (!data.ok) {
      // 200 + ok=false：UI 自己顯示錯誤，不要讓前端誤判 5xx
      return res.json(data);
    }
    res.json(data);
  } catch (e) {
    console.error('[admin/ads/insights]', e.message);
    res.status(500).json({ ok: false, reason: 'server_error', message: e.message });
  }
});

module.exports = router;
