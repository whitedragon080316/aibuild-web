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
const Course = require('../models/Course');

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

// ============= v1.5 升級：上架新課程 =============

// GET /admin/course/api/courses — list 所有後台 Course（不含 chapter detail，列表用）
router.get('/api/courses', checkAdminAuth, async (req, res) => {
  try {
    const list = await Course.find({})
      .select('slug title coverImage price earlyPrice earlyDeadline status createdAt updatedAt chapters')
      .sort({ updatedAt: -1 })
      .lean();
    // 把 chapters 換成 chapterCount 減少 payload
    const courses = list.map(c => ({
      _id: c._id,
      slug: c.slug,
      title: c.title,
      coverImage: c.coverImage,
      price: c.price,
      earlyPrice: c.earlyPrice,
      earlyDeadline: c.earlyDeadline,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      chapterCount: (c.chapters || []).length,
    }));
    res.json({ courses, total: courses.length });
  } catch (e) {
    console.error('[admin-course/api/courses GET]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/course/api/courses/:slug — detail（含 chapters）
router.get('/api/courses/:slug', checkAdminAuth, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ error: 'course not found' });
    res.json({ course });
  } catch (e) {
    console.error('[admin-course/api/courses/:slug GET]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/course/api/courses — 建立新課程
router.post('/api/courses', checkAdminAuth, express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.slug || !body.title) {
      return res.status(400).json({ error: 'slug 與 title 必填' });
    }
    // slug 限制：英中數 + dash / 底線（避免 URL 特殊字元）
    const cleanSlug = String(body.slug).trim().replace(/^\/+|\/+$/g, '');
    if (!cleanSlug) return res.status(400).json({ error: 'slug 不可為空' });

    const exists = await Course.findOne({ slug: cleanSlug });
    if (exists) return res.status(409).json({ error: 'slug 已存在，請改用其他' });

    const doc = await Course.create({
      slug: cleanSlug,
      title: body.title,
      description: body.description || '',
      coverImage: body.coverImage || '',
      chapters: Array.isArray(body.chapters) ? body.chapters.map(c => ({
        name: c.name || '',
        videoUrl: c.videoUrl || '',
        duration: c.duration || '',
        intro: c.intro || '',
      })) : [],
      price: body.price != null ? Number(body.price) : undefined,
      earlyPrice: body.earlyPrice != null ? Number(body.earlyPrice) : undefined,
      earlyDeadline: body.earlyDeadline ? new Date(body.earlyDeadline) : undefined,
      status: ['draft', 'published', 'unpublished'].includes(body.status) ? body.status : 'draft',
    });
    res.json({ ok: true, course: doc.toObject() });
  } catch (e) {
    console.error('[admin-course/api/courses POST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /admin/course/api/courses/:slug — 更新 / 上架 / 下架
router.patch('/api/courses/:slug', checkAdminAuth, express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    const fields = ['title', 'description', 'coverImage', 'chapters', 'price', 'earlyPrice', 'earlyDeadline', 'status'];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (update.status && !['draft', 'published', 'unpublished'].includes(update.status)) {
      return res.status(400).json({ error: '無效的 status' });
    }
    if (update.chapters && !Array.isArray(update.chapters)) {
      return res.status(400).json({ error: 'chapters 必須是 array' });
    }
    if (update.earlyDeadline) update.earlyDeadline = new Date(update.earlyDeadline);

    const course = await Course.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: update },
      { new: true }
    ).lean();
    if (!course) return res.status(404).json({ error: 'course not found' });
    res.json({ ok: true, course });
  } catch (e) {
    console.error('[admin-course/api/courses PATCH]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /admin/course/api/courses/:slug — placeholder（v1.5 改為下架，不真刪）
router.delete('/api/courses/:slug', checkAdminAuth, async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: { status: 'unpublished', updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!course) return res.status(404).json({ error: 'course not found' });
    // v1.5: soft delete = 改 status，不真刪 doc
    res.json({ ok: true, soft: true, course });
  } catch (e) {
    console.error('[admin-course/api/courses DELETE]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /course/preview?slug=xxx — admin 預覽 LP 用（不公開上線）
// 註：mount 在 /admin/course 下變成 /admin/course/preview，符合 admin scope
// 路徑名暫用 /preview，前端 button 開新分頁打 /admin/course/preview?slug=xxx
router.get('/preview', checkAdminAuth, async (req, res) => {
  try {
    const slug = (req.query.slug || '').trim();
    if (!slug) return res.status(400).send('缺少 slug');
    const course = await Course.findOne({ slug }).lean();
    if (!course) return res.status(404).send('找不到此課程');

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);

    const fmtMoney = n => n == null ? '' : 'NT$ ' + Number(n).toLocaleString('zh-TW');
    const fmtDate = d => d ? new Date(d).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }) : '';

    const chaptersHtml = (course.chapters || []).map((c, i) => `
      <div class="chap">
        <div class="chap-i">第 ${i + 1} 章</div>
        <div class="chap-name">${esc(c.name)}</div>
        ${c.duration ? `<div class="chap-meta">${esc(c.duration)}</div>` : ''}
        ${c.intro ? `<div class="chap-intro">${esc(c.intro)}</div>` : ''}
      </div>
    `).join('');

    const earlyBlock = course.earlyPrice ? `
      <div class="price-row">
        <span class="price-label">早鳥價</span>
        <span class="price-early">${fmtMoney(course.earlyPrice)}</span>
        ${course.earlyDeadline ? `<span class="deadline">${fmtDate(course.earlyDeadline)} 截止</span>` : ''}
      </div>
    ` : '';

    const statusBadge = {
      draft: '<span class="status draft">草稿（僅後台預覽）</span>',
      published: '<span class="status published">已上架</span>',
      unpublished: '<span class="status unpublished">已下架</span>',
    }[course.status] || '';

    const html = `<!DOCTYPE html><html lang="zh-TW"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(course.title)} — 預覽</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Noto Sans TC',sans-serif;background:#fafafa;color:#1c1c1e;line-height:1.7}
.preview-bar{background:#D99A2B;color:#fff;padding:8px 24px;font-size:13px;font-weight:600;text-align:center}
.cover{width:100%;max-height:420px;object-fit:cover;display:block}
.cover-placeholder{width:100%;height:280px;background:linear-gradient(135deg,#3B5BDB,#2B44B0);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700}
.wrap{max-width:760px;margin:0 auto;padding:32px 24px}
h1{font-size:32px;color:#2B44B0;margin-bottom:8px}
.status{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:18px}
.status.draft{background:#FFF3E0;color:#D99A2B}
.status.published{background:#E3F2E3;color:#2e7d32}
.status.unpublished{background:#FFEBEE;color:#c62828}
.desc{font-size:15px;color:#4a4a4e;white-space:pre-wrap;margin:18px 0 30px;padding:18px 0;border-top:1px solid #e5e5ea;border-bottom:1px solid #e5e5ea}
.section-title{font-size:18px;color:#1c1c1e;margin:30px 0 14px;font-weight:700}
.chap{background:#fff;border:1px solid #e5e5ea;border-radius:8px;padding:14px 18px;margin-bottom:10px}
.chap-i{font-size:11px;color:#888;letter-spacing:0.06em}
.chap-name{font-weight:600;font-size:15px;margin:4px 0}
.chap-meta{font-size:12px;color:#888;margin-bottom:6px}
.chap-intro{font-size:13px;color:#4a4a4e}
.price-card{background:#fff;border:1px solid #e5e5ea;border-radius:10px;padding:24px;margin-top:24px}
.price-row{display:flex;align-items:baseline;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.price-label{font-size:13px;color:#888;width:60px}
.price-main{font-size:28px;font-weight:700;color:#2B44B0}
.price-early{font-size:24px;font-weight:700;color:#D99A2B}
.deadline{font-size:12px;color:#c62828}
.cta{display:block;width:100%;background:#2B44B0;color:#fff;text-align:center;padding:14px;border-radius:8px;font-weight:700;margin-top:18px;text-decoration:none;opacity:0.6;cursor:not-allowed}
.cta-note{font-size:11px;color:#888;text-align:center;margin-top:8px}
</style></head><body>
<div class="preview-bar">📋 後台預覽（v1.5）— 此頁僅 admin 可見，未真實上線</div>
${course.coverImage
  ? `<img class="cover" src="${esc(course.coverImage)}" alt="${esc(course.title)}">`
  : `<div class="cover-placeholder">${esc(course.title)}</div>`}
<div class="wrap">
  ${statusBadge}
  <h1>${esc(course.title)}</h1>
  <div style="font-size:13px;color:#888">slug: <code>/course/${esc(course.slug)}</code></div>
  ${course.description ? `<div class="desc">${esc(course.description)}</div>` : ''}
  ${(course.chapters || []).length ? `
    <div class="section-title">課程章節（${course.chapters.length}）</div>
    ${chaptersHtml}
  ` : ''}
  <div class="price-card">
    ${course.price != null ? `
      <div class="price-row">
        <span class="price-label">定價</span>
        <span class="price-main">${fmtMoney(course.price)}</span>
      </div>` : ''}
    ${earlyBlock}
    <a class="cta" href="javascript:void(0)" onclick="alert('預覽模式 — CTA 暫未串接')">立即報名</a>
    <div class="cta-note">v1.5 預覽 — CTA 與金流尚未串接</div>
  </div>
</div>
</body></html>`;
    res.send(html);
  } catch (e) {
    console.error('[admin-course/preview]', e.message);
    res.status(500).send('預覽失敗：' + e.message);
  }
});

module.exports = router;
