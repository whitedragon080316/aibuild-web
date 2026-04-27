// /admin/livestream — Bago 派 portal v1.5「自動化直播」module（5/28 直播 demo 用 minimum 版）
//
// Mount in server.js:
//   app.use('/admin/livestream', require('./routes/admin-livestream'));
//
// Auth: 沿用同一個 admin_token cookie（與 /admin/lumi /admin/ads 等共用 ADMIN_TOKEN）。
// 沒登入 → 導去 /admin/lumi/login（登入後 cookie path=/admin/lumi 不會自動帶過來，
// 所以這裡和 admin-ads.js 一樣 parse cookie + 順便補一份 path=/admin/livestream 的 cookie）。
//
// v1.5 minimum demo：場次/流程都 hard-code，registrations 從 LumiSession 拿來模擬 demo data
// （read-only 不寫）。v3 才做真實「新增場次 / 編輯流程 / 自動化銷講」。

const express = require('express');
const path = require('path');
const fs = require('fs');

let LumiSession = null;
try { LumiSession = require('../models/LumiSession'); } catch (e) { /* optional */ }

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
  if (cookies.admin_token === expected) {
    const maxAge = 7 * 24 * 60 * 60;
    res.setHeader('Set-Cookie', `admin_token=${encodeURIComponent(expected)}; HttpOnly; Path=/admin/livestream; SameSite=Lax; Max-Age=${maxAge}`);
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

// ===== Hard-code data sources =====

// 從 process.env SESSION_1..N 解析格式：「id_時間描述_url」 例：「0528_5/28 晚上8點_https://youtube.com/live/xxx」
function loadSessionsFromEnv() {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const raw = process.env['SESSION_' + i];
    if (!raw) continue;
    const parts = raw.split('_');
    if (parts.length < 3) continue;
    const id = parts[0];
    const url = parts[parts.length - 1];
    const time = parts.slice(1, -1).join('_');
    out.push({ id, time, url });
  }
  return out;
}

// 5 個 demo 場次（hard-code，env 有值優先 merge）
function getDemoSessions() {
  const envSessions = loadSessionsFromEnv();
  const demo = [
    { id: '0528', title: 'AI 造局術 · 5/28 直播首場', time: '5/28（三）晚上 8:00', url: 'https://youtube.com/live/demo-0528', registrations: 86, status: 'upcoming' },
    { id: '0604', title: 'AI 造局術 · 6/4 加場', time: '6/4（三）晚上 8:00', url: 'https://youtube.com/live/demo-0604', registrations: 23, status: 'upcoming' },
    { id: '0521', title: '預錄試播場（內部）', time: '5/21（三）下午 2:00', url: 'https://youtube.com/live/demo-0521', registrations: 4, status: 'upcoming' },
    { id: '0507', title: 'Lumi 7Q 體驗會', time: '5/7（三）晚上 8:00', url: 'https://youtube.com/live/demo-0507', registrations: 64, status: 'ended' },
    { id: '0423', title: 'Bago 派首播 · AI 造局術預告', time: '4/23（三）晚上 8:00', url: 'https://youtube.com/live/demo-0423', registrations: 142, status: 'ended' },
  ];

  // 若 env 有設場次，把同 id 的 url/time 蓋過去；env 多出來的 append 到最前面
  const envIds = new Set();
  for (const s of envSessions) {
    envIds.add(s.id);
    const hit = demo.find(d => d.id === s.id);
    if (hit) {
      hit.time = s.time;
      hit.url = s.url;
    } else {
      demo.unshift({
        id: s.id,
        title: '直播場次 ' + s.id,
        time: s.time,
        url: s.url,
        registrations: 0,
        status: 'upcoming',
      });
    }
  }
  return demo;
}

const FLOWS = [
  {
    id: 'vip_welcome',
    name: 'VIP 歡迎與專屬資源',
    trigger: '貼上「VIP」標籤',
    triggerType: 'tag',
    steps: 2,
    runs: 0,
    enabled: false,
    description: '收到 VIP 標籤後 → 推 VIP 歡迎卡片 → 24h 後寄專屬資源連結',
  },
  {
    id: 'after_live_chase',
    name: '直播結束後追單流程',
    trigger: '直播結束（手動觸發 / 場次結束時間 +30min）',
    triggerType: 'event',
    steps: 3,
    runs: 36,
    enabled: true,
    description: '直播結束 30 分 → 推「課程連結 + 限時優惠」→ 隔天追「還沒下單原因」→ 第 3 天最後通知',
  },
  {
    id: 'nurture_3day',
    name: '報名後 3 天養流程',
    trigger: '完成直播報名',
    triggerType: 'event',
    steps: 3,
    runs: 0,
    enabled: false,
    description: 'Day 0 推直播提醒 → Day 1 推 Bago 派 IP 介紹 → Day 2 推學員見證',
  },
  {
    id: 'add_friend_welcome',
    name: '加好友歡迎序列',
    trigger: '加入好友（follow event）',
    triggerType: 'follow',
    steps: 5,
    runs: 0,
    enabled: false,
    description: '加好友當下推歡迎 → 1h 推 Lumi 7Q → 1d 推直播報名 → 3d 推學員故事 → 7d 推課程',
  },
];

// ===== Routes =====

router.get('/', checkAdminAuth, (req, res) => {
  servePage(res, 'admin-livestream.html', {});
});

// API: sessions list（hard-code + env merge）
router.get('/api/sessions', checkAdminAuth, (req, res) => {
  try {
    res.json({ sessions: getDemoSessions() });
  } catch (e) {
    console.error('[admin/livestream/sessions]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// API: registrations（從 LumiSession 模擬 demo data，read-only）
// query: session=<id>, from=<date>, to=<date>, q=<name search>
router.get('/api/registrations', checkAdminAuth, async (req, res) => {
  try {
    const { session: sessionId, from, to, q } = req.query;
    const sessions = getDemoSessions();
    const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s]));

    let registrations = [];

    if (LumiSession) {
      // 拉最近 200 個 LumiSession 當 demo registrations
      const filter = {};
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
      }
      if (q) {
        filter.displayName = { $regex: q, $options: 'i' };
      }
      const lumiSessions = await LumiSession.find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      // 把 LumiSession 對映成 registration shape，同時用 sessionId hash 分配到場次（demo 用）
      registrations = lumiSessions.map((ls, i) => {
        // 用 sessionId 字串末位 hash 分散到場次裡
        const hash = (ls.sessionId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const pickedSession = sessions[hash % sessions.length] || sessions[0];
        // 觀看進度：completed_7q 100%、chatting 60%、converted 100%、其他 0~30
        let progress = 0;
        if (ls.status === 'completed_7q' || ls.status === 'converted') progress = 100;
        else if (ls.status === 'chatting') progress = 60;
        else if (ls.status === 'stuck') progress = 30;
        else progress = (hash % 30);

        return {
          id: ls.sessionId,
          name: ls.displayName || '（無名）',
          email: ls.email || '—',
          sessionId: pickedSession.id,
          sessionTitle: pickedSession.title,
          sessionTime: pickedSession.time,
          registeredAt: ls.createdAt,
          progress,
          lineUserId: ls.lineUserId || '',
          isGuest: (ls.lineUserId || '').startsWith('guest_'),
        };
      });

      if (sessionId && sessionId !== 'all') {
        registrations = registrations.filter(r => r.sessionId === sessionId);
      }
    }

    res.json({
      registrations,
      sessions: sessions.map(s => ({ id: s.id, title: s.title })),
      total: registrations.length,
    });
  } catch (e) {
    console.error('[admin/livestream/registrations]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// API: flows list（hard-code）
router.get('/api/flows', checkAdminAuth, (req, res) => {
  res.json({ flows: FLOWS });
});

// API: live chat demo data（hard-code）— Tab 3 即時訊息互動
const LIVE_CHAT_MESSAGES = [
  { id: 'm1', type: 'script', identity: '藍色', identityColor: '#3B5BDB', user: '小王', text: '準時報到！', at: '20:01' },
  { id: 'm2', type: 'real',   identity: null,   identityColor: '#D99A2B', user: '陳小姐', text: '老師好，第一次參加', at: '20:02' },
  { id: 'm3', type: 'script', identity: '紅色', identityColor: '#c62828', user: 'Amy',   text: '老師超期待！', at: '20:03' },
  { id: 'm4', type: 'real',   identity: null,   identityColor: '#D99A2B', user: 'David', text: '可以分享 Bago 派 IP 框架嗎？', at: '20:05' },
  { id: 'm5', type: 'script', identity: '紫色', identityColor: '#7B3FA0', user: '阿杰',   text: '同問！', at: '20:06' },
  { id: 'm6', type: 'script', identity: '藍色', identityColor: '#3B5BDB', user: '小琪',   text: '這段超收穫！', at: '20:08' },
];

const SCHEDULED_MESSAGES = [
  { id: 's1', at: '20:10', identity: '藍色', text: '老師講的 4-tier agent 階梯太實用了', status: '已送' },
  { id: 's2', at: '20:25', identity: '紅色', text: '我也想試試看 Lumi 7Q！', status: '排程中' },
  { id: 's3', at: '20:40', identity: '紫色', text: '請問課程連結在哪？', status: '排程中' },
  { id: 's4', at: '21:00', identity: '藍色', text: '剛報名了，期待開課！', status: '排程中' },
];

const QUICK_REPLIES = [
  '準時報到', '老師超期待', '同問！', '這段超收穫', '太實用了', '已截圖',
  '老師講得好清楚', '+1', '想試試看', '請問課程連結？',
];

const IDENTITIES = [
  { name: '藍色', color: '#3B5BDB' },
  { name: '紅色', color: '#c62828' },
  { name: '紫色', color: '#7B3FA0' },
];

router.get('/api/live-chat', checkAdminAuth, (req, res) => {
  res.json({
    messages: LIVE_CHAT_MESSAGES,
    scheduled: SCHEDULED_MESSAGES,
    quickReplies: QUICK_REPLIES,
    identities: IDENTITIES,
    currentSession: { id: '0528', title: 'AI 造局術 · 5/28 直播首場', countdown: '1天 03:14:22' },
  });
});

// API: media library demo data（hard-code）— Tab 5 媒體庫
const MEDIA_LIBRARY = [
  { id: 'v1', kind: 'video', title: '5/28 直播完整檔', duration: '1:42:30', thumb: '🎬', tagged: true,  size: '2.1 GB', uploadedAt: '2026-04-23' },
  { id: 'v2', kind: 'video', title: 'Lumi 7Q 體驗 demo', duration: '12:08', thumb: '🎥', tagged: false, size: '420 MB', uploadedAt: '2026-04-20' },
  { id: 'v3', kind: 'video', title: 'Bago 派 IP 框架簡介', duration: '7:20', thumb: '📺', tagged: true,  size: '180 MB', uploadedAt: '2026-04-15' },
  { id: 'i1', kind: 'image', title: '直播首圖（橫式）', thumb: '🖼️', tagged: true,  size: '380 KB', uploadedAt: '2026-04-22' },
  { id: 'i2', kind: 'image', title: '直播倒數海報', thumb: '🎨', tagged: false, size: '510 KB', uploadedAt: '2026-04-21' },
  { id: 'i3', kind: 'image', title: '學員見證圖卡 #1', thumb: '📸', tagged: true,  size: '290 KB', uploadedAt: '2026-04-18' },
  { id: 'i4', kind: 'image', title: '學員見證圖卡 #2', thumb: '📸', tagged: false, size: '310 KB', uploadedAt: '2026-04-18' },
  { id: 'i5', kind: 'image', title: 'CTA 連結圖卡', thumb: '🖼️', tagged: true,  size: '220 KB', uploadedAt: '2026-04-16' },
  { id: 'v4', kind: 'video', title: '4/23 首播檔案', duration: '1:55:12', thumb: '🎬', tagged: false, size: '2.4 GB', uploadedAt: '2026-04-23' },
];

router.get('/api/media', checkAdminAuth, (req, res) => {
  res.json({ media: MEDIA_LIBRARY });
});

module.exports = router;
