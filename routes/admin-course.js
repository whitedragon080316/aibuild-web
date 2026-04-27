// Bago 派 Portal v1.5 — 課程後台 GUI module
// 5/28 直播 demo 用 read-only minimum 版
// Mount: app.use('/admin/course', require('./routes/admin-course'))
//
// Auth: 沿用 admin_token cookie pattern（同 admin/lumi）
// Path scope: /admin/course → cookie path 用 /admin/course
//
// v1.5 只做 read，不做編輯/退款/改課程內容（5/28 後再加寫操作）

const express = require('express');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Payment = require('../models/Payment');

const router = express.Router();

// ----- helpers -----
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
  // 接受兩種 cookie path：/admin/course（本 router 設的）或 /admin/lumi（既有 portal 設的）
  // 這樣從 lumi 進來的 admin 可以直接看 course，不用再登入
  const token = cookies.admin_token || req.headers['x-admin-token'];
  if (token !== expected) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'invalid token' });
    }
    // 沒登入 → 導去既有 lumi login（共用同一組 ADMIN_TOKEN）
    return res.redirect('/admin/lumi/login');
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

// ----- routes -----

// GET /admin/course — UI 頁
router.get('/', checkAdminAuth, (req, res) => {
  servePage(res, 'admin-course.html', {});
});

// GET /admin/course/api/course — 課程內容（讀 course.json）
router.get('/api/course', checkAdminAuth, (req, res) => {
  try {
    const courseData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'course.json'), 'utf8')
    );
    res.json(courseData);
  } catch (e) {
    console.error('[admin-course/api/course]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/course/api/users?q=keyword
router.get('/api/users', checkAdminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q && q.trim()) {
      const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: re },
        { email: re },
        { phone: re },
        { lineUserId: re },
      ];
    }
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ users, total: users.length });
  } catch (e) {
    console.error('[admin-course/api/users]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/course/api/payments?status=paid|pending|all
router.get('/api/payments', checkAdminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    // Payment.status enum: pending | success | failed
    // 課程後台口語：paid = success，pending = pending
    if (status === 'paid') filter.status = 'success';
    else if (status === 'pending') filter.status = 'pending';
    else if (status === 'failed') filter.status = 'failed';
    // status === 'all' 或沒帶就不過濾

    const payments = await Payment.find(filter)
      .populate('userId', 'name email lineUserId')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // 統計（不受 filter 影響的全局數據）
    const [allPayments, allUsers] = await Promise.all([
      Payment.find({}).lean(),
      User.countDocuments({}),
    ]);
    const paidList = allPayments.filter(p => p.status === 'success');
    const pendingList = allPayments.filter(p => p.status === 'pending');
    const stats = {
      totalUsers: allUsers,
      totalPaidAmount: paidList.reduce((s, p) => s + (p.amount || 0), 0),
      paidCount: paidList.length,
      pendingCount: pendingList.length,
    };

    res.json({ payments, stats, total: payments.length });
  } catch (e) {
    console.error('[admin-course/api/payments]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
