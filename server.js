try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const User = require('./models/User');
const Payment = require('./models/Payment');
const { initBot, webhookMiddleware, onPaymentSuccess } = require('./lib/line-bot');

const app = express();

// LINE webhook needs raw body for signature verification
app.post('/webhook', express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}), webhookMiddleware);

// Other routes use normal JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Load course data
const courseData = JSON.parse(fs.readFileSync(path.join(__dirname, 'course.json'), 'utf8'));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_CONNECTION_STRING || process.env.MONGO_URI || 'mongodb://localhost:27017/knowu';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Initialize LINE Bot after DB is ready
    initBot();
  })
  .catch(e => console.error('MongoDB error:', e));

// Helper: serve HTML with variable injection
function servePage(res, filename, vars = {}) {
  let html = fs.readFileSync(path.join(__dirname, 'views', filename), 'utf8');
  for (const [key, val] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, typeof val === 'object' ? JSON.stringify(val) : val);
  }
  res.send(html);
}

// ============ ROUTES ============

// LP 落地頁
app.get('/', (req, res) => {
  servePage(res, 'lp.html', {
    siteName: process.env.SITE_NAME || 'AI 造局術',
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    courseData: JSON.stringify(courseData)
  });
});

// 直播 LP（廣告導流用）
app.get('/live', (req, res) => {
  servePage(res, 'live.html', {
    siteName: process.env.SITE_NAME || 'AI 造局術',
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問'
  });
});

// === TapPay 金流 ===
const TAPPAY_PARTNER_KEY = process.env.TAPPAY_PARTNER_KEY || '';
const TAPPAY_MERCHANT_ID = process.env.TAPPAY_MERCHANT_ID || '';
const TAPPAY_APP_ID = process.env.TAPPAY_APP_ID || '12348';
const TAPPAY_APP_KEY = process.env.TAPPAY_APP_KEY || 'app_pa1pQwXUzaRoMd7svcJawNKgWOBIlBBsIfiPlTZy7ZOiPgCaRKkRGeYRAV1Y';
const TAPPAY_ENV = process.env.TAPPAY_ENV || 'sandbox';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.SITE_URL || 'https://aibuilding.zeabur.app';
const TAPPAY_BASE = TAPPAY_ENV === 'production' ? 'https://prod.tappaysdk.com' : 'https://sandbox.tappaysdk.com';
const TAPPAY_API = TAPPAY_BASE + '/tpc/payment/pay-by-prime';
const TAPPAY_RECORD_API = TAPPAY_BASE + '/tpc/transaction/query';

// 結帳頁
app.get('/checkout', (req, res) => {
  const plan = req.query.plan === 'v2' ? 'v2' : 'v1';
  const price = plan === 'v2' ? (courseData.priceV2 || 79800) : courseData.price;
  servePage(res, 'checkout.html', {
    siteName: process.env.SITE_NAME || 'AI 造局術',
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    price,
    courseTitle: courseData.title,
    plan,
    priceV1: courseData.price,
    priceV2: courseData.priceV2 || 79800,
    tappayAppId: TAPPAY_APP_ID,
    tappayAppKey: TAPPAY_APP_KEY,
    tappayEnv: TAPPAY_ENV,
  });
});

// Helper: call TapPay API
function callTapPay(url, data) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const postData = JSON.stringify(data);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TAPPAY_PARTNER_KEY }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// TapPay 付款 API（3D Secure）
app.post('/api/pay', async (req, res) => {
  try {
    const { prime, name, email, phone, plan } = req.body;
    if (!prime) return res.status(400).json({ success: false, message: '缺少付款資訊' });

    const selectedPlan = plan === 'v2' ? 'v2' : 'v1';
    const amount = selectedPlan === 'v2' ? (courseData.priceV2 || 79800) : courseData.price;
    const planLabel = selectedPlan === 'v2' ? 'AI 造局術 PRO' : 'AI 造局術 STARTER';

    const orderId = 'KU' + Date.now();
    const courseToken = crypto.randomBytes(32).toString('hex');

    // 建立用戶 + 訂單
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, phone, courseToken, source: 'tappay', plan: selectedPlan },
      { upsert: true, new: true }
    );

    await Payment.create({
      userId: user._id, orderId,
      courseName: planLabel, amount,
      plan: selectedPlan, method: 'tappay', status: 'pending'
    });

    // 呼叫 TapPay Pay by Prime API（含 3D Secure）
    const result = await callTapPay(TAPPAY_API, {
      prime,
      partner_key: TAPPAY_PARTNER_KEY,
      merchant_id: TAPPAY_MERCHANT_ID,
      amount,
      currency: 'TWD',
      details: planLabel,
      cardholder: {
        phone_number: phone.startsWith('+') ? phone : '+886' + phone.replace(/^0/, ''),
        name,
        email
      },
      order_number: orderId,
      remember: false,
      three_domain_secure: true,
      result_url: {
        frontend_redirect_url: PUBLIC_BASE_URL + '/api/tappay/return',
        backend_notify_url: PUBLIC_BASE_URL + '/api/tappay/notify'
      }
    });

    console.log('TapPay result:', result.status, result.msg);

    if (result.status === 0) {
      // 直接成功（不需 3D 驗證）
      await Payment.findOneAndUpdate(
        { orderId },
        { status: 'success', paidAt: new Date(), tradeId: result.rec_trade_id }
      );
      if (user.lineUserId) {
        await onPaymentSuccess(user.lineUserId, courseToken).catch(() => {});
      }
      res.json({
        success: true,
        redirectUrl: `/checkout/success?order=${orderId}&token=${courseToken}`
      });
    } else if (result.payment_url) {
      // 需要 3D 驗證 — 導向銀行驗證頁
      res.json({
        success: true,
        requires3DS: true,
        redirectUrl: result.payment_url
      });
    } else {
      await Payment.findOneAndUpdate({ orderId }, { status: 'failed' });
      res.json({ success: false, message: '付款失敗：' + (result.msg || '請重試') });
    }
  } catch (err) {
    console.error('Pay error:', err);
    res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

// TapPay 3D Secure 前端跳轉回來
app.get('/api/tappay/return', async (req, res) => {
  const { rec_trade_id, order_number, status } = req.query;
  console.log('TapPay 3DS return:', { rec_trade_id, order_number, status });

  if (String(status) === '0' && order_number) {
    // 用 Record API 確認交易狀態
    try {
      const record = await callTapPay(TAPPAY_RECORD_API, {
        partner_key: TAPPAY_PARTNER_KEY,
        filters: { order_number }
      });

      if (record.status === 0 && record.trade_records && record.trade_records.length > 0) {
        const trade = record.trade_records[0];
        if (trade.record_status === 0) {
          // 交易成功 — 更新 DB
          const payment = await Payment.findOneAndUpdate(
            { orderId: order_number },
            { status: 'success', paidAt: new Date(), tradeId: rec_trade_id }
          );
          if (payment) {
            const user = await User.findById(payment.userId);
            if (user && user.lineUserId) {
              await onPaymentSuccess(user.lineUserId, user.courseToken).catch(() => {});
            }
            return res.redirect(`/checkout/success?order=${order_number}&token=${user?.courseToken || ''}`);
          }
        }
      }
    } catch (e) {
      console.error('TapPay record check error:', e);
    }
  }

  // 失敗或異常
  if (order_number) {
    await Payment.findOneAndUpdate({ orderId: order_number }, { status: 'failed' }).catch(() => {});
  }
  res.redirect('/checkout?error=payment-failed');
});

// TapPay 3D Secure 後端通知
app.post('/api/tappay/notify', async (req, res) => {
  const { rec_trade_id, order_number, status, amount } = req.body;
  console.log('TapPay 3DS notify:', { rec_trade_id, order_number, status, amount });

  if (status === 0 && order_number) {
    const payment = await Payment.findOneAndUpdate(
      { orderId: order_number, status: 'pending' },
      { status: 'success', paidAt: new Date(), tradeId: rec_trade_id }
    );
    if (payment) {
      const user = await User.findById(payment.userId);
      if (user && user.lineUserId) {
        await onPaymentSuccess(user.lineUserId, user.courseToken).catch(() => {});
      }
    }
  } else if (order_number) {
    await Payment.findOneAndUpdate(
      { orderId: order_number, status: 'pending' },
      { status: 'failed' }
    );
  }

  res.status(200).json({ ok: true });
});

// 付款成功頁
app.get('/checkout/success', async (req, res) => {
  const { order, token } = req.query;
  servePage(res, 'success.html', {
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    courseTitle: courseData.title,
    token: token || '',
    courseUrl: `/course?token=${token || ''}`
  });
});

// 課程預覽（管理者用）
app.get('/course/preview', (req, res) => {
  servePage(res, 'course.html', {
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    courseData: JSON.stringify(courseData),
    userName: '預覽模式',
    token: 'preview'
  });
});

// 課程頁
app.get('/course', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/?msg=need-login');

  const user = await User.findOne({ courseToken: token });
  if (!user) return res.redirect('/?msg=invalid-token');

  servePage(res, 'course.html', {
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    courseData: JSON.stringify(courseData),
    userName: user.name || '學員',
    token
  });
});

// 課程進度 API
app.get('/api/progress/:token', async (req, res) => {
  const user = await User.findOne({ courseToken: req.params.token });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json({ completed: user.completedLessons || [] });
});

app.post('/api/progress/:token', async (req, res) => {
  const { lessonId } = req.body;
  if (!lessonId) return res.status(400).json({ error: 'missing lessonId' });
  await User.findOneAndUpdate(
    { courseToken: req.params.token },
    { $addToSet: { completedLessons: lessonId } }
  );
  res.json({ ok: true });
});

// 追蹤
app.get('/track', (req, res) => {
  const { src } = req.query;
  console.log('Track:', src, new Date().toISOString());
  res.redirect('/');
});

// === 數據儀表板 ===
app.get('/dashboard', async (req, res) => {
  const Registration = require('./models/Registration');
  const Remarketing = require('./models/Remarketing');

  const totalRegs = await Registration.countDocuments();
  const totalRmk = await Remarketing.countDocuments();
  const attended = await Remarketing.countDocuments({ attended: true });
  const converted = await Remarketing.countDocuments({ converted: true });
  const totalPayments = await Payment.countDocuments({ status: 'success' });
  const revenue = await Payment.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalRevenue = revenue[0]?.total || 0;
  const totalUsers = await User.countDocuments();

  // 每場次報名數
  const sessionBreakdown = await Registration.aggregate([
    { $group: { _id: '$sessionDate', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $limit: 10 }
  ]);

  // 追單波次完成率
  const waveStats = {};
  if (totalRmk > 0) {
    for (const w of ['wave1', 'wave2', 'wave3']) {
      const sent = await Remarketing.countDocuments({ [`waves.${w}`]: true });
      waveStats[w] = { sent, rate: (sent / totalRmk * 100).toFixed(1) + '%' };
    }
  }

  const data = {
    totalUsers, totalRegs, attended, converted, totalPayments, totalRevenue,
    conversionRate: totalRegs > 0 ? (converted / totalRegs * 100).toFixed(1) : '0',
    attendRate: totalRegs > 0 ? (attended / totalRegs * 100).toFixed(1) : '0',
    sessionBreakdown: sessionBreakdown.map(s => ({ date: s._id, count: s.count })),
    waveStats,
  };

  res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>數據儀表板 — ${process.env.SITE_NAME || 'knowu'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Noto Sans TC',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:32px 20px}
.container{max-width:960px;margin:0 auto}
h1{font-size:24px;font-weight:800;margin-bottom:4px;color:#fff}
.sub{color:#64748b;font-size:13px;margin-bottom:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:28px}
.card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px 16px;text-align:center}
.card .num{font-size:28px;font-weight:900;color:#3b82f6}
.card .num.green{color:#22c55e}
.card .num.gold{color:#eab308}
.card .num.purple{color:#a855f7}
.card .label{font-size:12px;color:#64748b;margin-top:4px}
.section{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;margin-bottom:16px}
.section h2{font-size:16px;font-weight:700;color:#94a3b8;margin-bottom:14px}
.funnel{display:flex;flex-direction:column;gap:8px}
.funnel-row{display:flex;align-items:center;gap:12px}
.funnel-bar{height:28px;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:12px;font-weight:700;color:#fff;min-width:40px}
.funnel-label{font-size:13px;color:#94a3b8;width:80px;text-align:right;flex-shrink:0}
.funnel-num{font-size:13px;color:#64748b;width:60px}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:12px;color:#64748b;padding:8px 12px;border-bottom:1px solid #334155}
td{font-size:14px;padding:8px 12px;border-bottom:1px solid #1e293b}
.tag{font-size:11px;padding:2px 8px;border-radius:6px;font-weight:600}
.tag-green{background:rgba(34,197,94,.15);color:#4ade80}
.tag-blue{background:rgba(59,130,246,.15);color:#60a5fa}
.tag-gray{background:rgba(100,116,139,.15);color:#94a3b8}
.refresh{text-align:center;margin-top:20px}
.refresh a{color:#3b82f6;font-size:13px;text-decoration:none}
</style>
</head>
<body>
<div class="container">
<h1>數據儀表板</h1>
<div class="sub">${process.env.SITE_NAME || 'knowu'} — ${new Date().toLocaleString('zh-TW', {timeZone:'Asia/Taipei'})}</div>

<div class="cards">
  <div class="card"><div class="num">${data.totalUsers}</div><div class="label">總用戶</div></div>
  <div class="card"><div class="num">${data.totalRegs}</div><div class="label">報名數</div></div>
  <div class="card"><div class="num green">${data.attended}</div><div class="label">到課</div></div>
  <div class="card"><div class="num gold">${data.totalPayments}</div><div class="label">成交</div></div>
  <div class="card"><div class="num purple">$${data.totalRevenue.toLocaleString()}</div><div class="label">營收</div></div>
</div>

<div class="section">
  <h2>漏斗轉換</h2>
  <div class="funnel">
    <div class="funnel-row">
      <div class="funnel-label">報名</div>
      <div class="funnel-bar" style="width:100%;background:#3b82f6;">${data.totalRegs}</div>
    </div>
    <div class="funnel-row">
      <div class="funnel-label">到課</div>
      <div class="funnel-bar" style="width:${data.attendRate}%;background:#22c55e;">${data.attended}</div>
      <div class="funnel-num">${data.attendRate}%</div>
    </div>
    <div class="funnel-row">
      <div class="funnel-label">成交</div>
      <div class="funnel-bar" style="width:${data.conversionRate}%;background:#eab308;min-width:${data.converted > 0 ? '40' : '4'}px;">${data.converted}</div>
      <div class="funnel-num">${data.conversionRate}%</div>
    </div>
  </div>
</div>

${data.sessionBreakdown.length > 0 ? `
<div class="section">
  <h2>場次報名</h2>
  <table>
    <tr><th>場次</th><th>報名數</th></tr>
    ${data.sessionBreakdown.map(s => `<tr><td>${s.date}</td><td>${s.count}</td></tr>`).join('')}
  </table>
</div>` : ''}

${Object.keys(data.waveStats).length > 0 ? `
<div class="section">
  <h2>追單波次</h2>
  <table>
    <tr><th>波次</th><th>已發送</th><th>覆蓋率</th></tr>
    ${Object.entries(data.waveStats).map(([k,v]) => `<tr><td>${k}</td><td>${v.sent}</td><td>${v.rate}</td></tr>`).join('')}
  </table>
</div>` : ''}

<div class="refresh"><a href="/dashboard">重新整理</a></div>
</div>
</body>
</html>`);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowu-web', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`knowu-web running on port ${PORT}`));
