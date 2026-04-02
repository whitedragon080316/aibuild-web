require('dotenv').config();
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/knowu';
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

// 結帳頁
app.get('/checkout', (req, res) => {
  servePage(res, 'checkout.html', {
    siteName: process.env.SITE_NAME || 'AI 造局術',
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    price: courseData.price,
    courseTitle: courseData.title
  });
});

// 結帳 API (placeholder)
app.post('/api/checkout', async (req, res) => {
  try {
    const { name, email, phone, method } = req.body;
    const orderId = 'KU' + Date.now();
    const token = crypto.randomBytes(32).toString('hex');

    const user = await User.findOneAndUpdate(
      { email },
      { name, email, phone, courseToken: token, source: method },
      { upsert: true, new: true }
    );

    await Payment.create({
      userId: user._id,
      orderId,
      courseName: courseData.title,
      amount: courseData.price,
      method,
      status: 'pending'
    });

    // Placeholder: in production, redirect to ECPay or Portaly
    res.json({
      success: true,
      message: '訂單已建立（測試模式）',
      orderId,
      paymentUrl: `/checkout/success?order=${orderId}&token=${token}`
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

// 付款成功頁 (placeholder - simulates ECPay callback)
app.get('/checkout/success', async (req, res) => {
  const { order, token } = req.query;
  if (order) {
    const payment = await Payment.findOneAndUpdate(
      { orderId: order },
      { status: 'success', paidAt: new Date() },
      { new: true }
    );
    // Notify via LINE Bot (if user has lineUserId)
    if (payment) {
      const user = await User.findById(payment.userId);
      if (user?.lineUserId) {
        await onPaymentSuccess(user.lineUserId, token).catch(() => {});
      }
    }
  }
  servePage(res, 'success.html', {
    brandName: process.env.BRAND_NAME || 'knowu 國際顧問',
    courseTitle: courseData.title,
    token: token || '',
    courseUrl: `/course?token=${token || ''}`
  });
});

// 綠界回調 (placeholder)
app.post('/api/ecpay/callback', async (req, res) => {
  // TODO: 驗證 CheckMacValue, 更新付款狀態, 發 LINE 通知
  console.log('ECPay callback:', req.body);
  res.send('1|OK');
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

// 追蹤
app.get('/track', (req, res) => {
  const { src } = req.query;
  console.log('Track:', src, new Date().toISOString());
  res.redirect('/');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowu-web', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`knowu-web running on port ${PORT}`));
