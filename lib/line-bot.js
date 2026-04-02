// LINE Bot core logic for knowu template
// Handles: follow → registration → reminders → remarketing

const crypto = require('crypto');
const { messagingApi } = require('@line/bot-sdk');
const Registration = require('../models/Registration');
const Remarketing = require('../models/Remarketing');
const cards = require('./flex-cards');

let client;
const activeTimers = new Map(); // regKey → [timeoutIds]

// ============ CONFIG ============

const BRAND_NAME = process.env.BRAND_NAME || 'knowu 國際顧問';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '';

// 提醒時間點（直播前）
const PRE_REMINDERS = [
  { key: '24h', offset: -24 * 60 * 60 * 1000 },
  { key: '6h', offset: -6 * 60 * 60 * 1000 },
  { key: '2h', offset: -2 * 60 * 60 * 1000 },
  { key: '10m', offset: -10 * 60 * 1000 }
];

// 追單時間點（直播後）
const POST_WAVES = [
  { key: 'wave1', offset: 2 * 60 * 60 * 1000 },       // +2h
  { key: 'wave2', offset: 24 * 60 * 60 * 1000 },      // D+1
  { key: 'wave3', offset: 48 * 60 * 60 * 1000 }       // D+2
];

// ============ INIT ============

function initBot() {
  if (!process.env.LINE_CHANNEL_TOKEN) {
    console.log('LINE Bot: No CHANNEL_TOKEN, bot disabled');
    return null;
  }

  client = new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_TOKEN
  });

  // Parse sessions from env
  const sessions = parseSessions();
  console.log(`LINE Bot: initialized, ${sessions.length} sessions configured`);

  // Restore reminders for existing registrations
  restoreReminders(sessions);

  // Start remarketing cron (every 60 seconds)
  setInterval(() => cronRemarketing(), 60 * 1000);

  return client;
}

// Parse SESSION_1=MMDD_LABEL_URL from env
function parseSessions() {
  const sessions = [];
  for (let i = 1; i <= 20; i++) {
    const val = process.env[`SESSION_${i}`];
    if (!val) continue;
    const parts = val.split('_');
    if (parts.length < 2) continue;

    const date = parts[0]; // MMDD
    const label = parts[1]; // e.g. "4/15 下午2點"
    const link = parts[2] || '';

    // Calculate session timestamp
    const month = parseInt(date.substring(0, 2));
    const day = parseInt(date.substring(2, 4));
    const now = new Date();
    const year = now.getFullYear();
    const sessionTime = new Date(year, month - 1, day, 14, 0, 0); // default 2pm

    sessions.push({ date, label, link, sessionTime });
  }
  return sessions;
}

// ============ WEBHOOK HANDLER ============

function webhookMiddleware(req, res) {
  // Verify signature
  const signature = req.headers['x-line-signature'];
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!signature || !secret) return res.status(403).send('No signature');

  const hash = crypto.createHmac('SHA256', secret).update(req.rawBody).digest('base64');
  if (hash !== signature) return res.status(403).send('Invalid signature');

  // Process events
  const events = req.body.events || [];
  Promise.all(events.map(e => handleEvent(e)))
    .then(() => res.json({ status: 'ok' }))
    .catch(err => {
      console.error('Webhook error:', err);
      res.status(500).json({ error: err.message });
    });
}

// ============ EVENT HANDLER ============

async function handleEvent(event) {
  if (!client) return;
  const userId = event.source?.userId;
  if (!userId) return;

  // Follow event → welcome
  if (event.type === 'follow') {
    return handleFollow(userId);
  }

  // Message event
  if (event.type === 'message' && event.message.type === 'text') {
    return handleText(userId, event.message.text.trim());
  }

  return null;
}

// ============ FOLLOW ============

async function handleFollow(userId) {
  const sessions = parseSessions();

  // Send welcome message
  const messages = [cards.buildWelcomeMessage(BRAND_NAME)];

  // Show available sessions
  if (sessions.length > 0) {
    messages.push(cards.buildSessionCarousel(sessions));
  }

  await client.pushMessage({ to: userId, messages });
}

// ============ TEXT HANDLER ============

async function handleText(userId, text) {
  const sessions = parseSessions();

  // Check if text matches a session date (MMDD or MM/DD)
  const dateMatch = text.match(/^(\d{1,2})[\/\-]?(\d{2})$/);
  if (dateMatch) {
    const mmdd = dateMatch[1].padStart(2, '0') + dateMatch[2];
    const session = sessions.find(s => s.date === mmdd);
    if (session) {
      return handleRegistration(userId, session);
    }
  }

  // Exact match for session dates
  const exactSession = sessions.find(s => text === s.date || text === s.label);
  if (exactSession) {
    return handleRegistration(userId, exactSession);
  }

  // "777" completion marker
  if (text === '777') {
    return handleCompletion(userId);
  }

  // Course interest keywords
  if (text.includes('了解課程') || text.includes('我要報名') || text.includes('報名課程')) {
    return handleCourseInterest(userId);
  }

  // Replay request
  if (text.includes('回放') || text.includes('重播')) {
    return handleReplay(userId);
  }

  // Show sessions
  if (text.includes('場次') || text.includes('直播')) {
    if (sessions.length > 0) {
      await client.pushMessage({
        to: userId,
        messages: [cards.buildSessionCarousel(sessions)]
      });
    }
    return;
  }

  return null;
}

// ============ REGISTRATION ============

async function handleRegistration(userId, session) {
  const regKey = `${userId}:${session.date}`;

  // Check if already registered
  const existing = await Registration.findOne({ userId, sessionDate: session.date });
  if (existing) {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: `你已經報名 ${session.label} 了！我會在直播前提醒你 👍` }]
    });
    return;
  }

  // Create registration
  await Registration.create({
    userId,
    sessionDate: session.date,
    sessionTime: session.sessionTime,
    sessionLabel: session.label,
    sessionLink: session.link
  });

  // Create remarketing entry
  await Remarketing.findOneAndUpdate(
    { userId, sessionDate: session.date },
    { userId, sessionDate: session.date, sessionTime: session.sessionTime },
    { upsert: true }
  );

  // Schedule reminders
  scheduleReminders(regKey, session);

  // Send confirmation
  await client.pushMessage({
    to: userId,
    messages: [cards.buildConfirmCard(session)]
  });

  // Notify admin
  if (ADMIN_USER_ID) {
    await client.pushMessage({
      to: ADMIN_USER_ID,
      messages: [{ type: 'text', text: `📋 新報名！\n場次：${session.label}\nUser: ${userId.substring(0, 8)}...` }]
    }).catch(() => {});
  }
}

// ============ REMINDERS ============

function scheduleReminders(regKey, session) {
  // Clear existing timers
  const existing = activeTimers.get(regKey);
  if (existing) existing.forEach(t => clearTimeout(t));

  const timers = [];
  const now = Date.now();
  const sessionMs = session.sessionTime.getTime ? session.sessionTime.getTime() : new Date(session.sessionTime).getTime();

  for (const rem of PRE_REMINDERS) {
    const fireAt = sessionMs + rem.offset;
    const delay = fireAt - now;
    if (delay <= 0) continue; // Already passed

    const timer = setTimeout(async () => {
      try {
        const userId = regKey.split(':')[0];
        const reg = await Registration.findOne({ userId, sessionDate: regKey.split(':')[1] });
        if (!reg || reg.reminders[rem.key]) return;

        await client.pushMessage({
          to: userId,
          messages: [cards.buildReminderCard(rem.key, session)]
        });

        // Mark reminder as sent
        reg.reminders[rem.key] = true;
        await reg.save();

        console.log(`Reminder ${rem.key} sent to ${userId.substring(0, 8)}`);
      } catch (err) {
        console.error(`Reminder ${rem.key} failed:`, err.message);
      }
    }, delay);

    timers.push(timer);
  }

  activeTimers.set(regKey, timers);
}

async function restoreReminders(sessions) {
  try {
    const regs = await Registration.find({});
    let restored = 0;

    for (const reg of regs) {
      const session = sessions.find(s => s.date === reg.sessionDate) || {
        sessionTime: reg.sessionTime,
        label: reg.sessionLabel,
        link: reg.sessionLink
      };

      const regKey = `${reg.userId}:${reg.sessionDate}`;
      scheduleReminders(regKey, session);
      restored++;
    }

    if (restored > 0) console.log(`LINE Bot: restored ${restored} reminder sets`);
  } catch (err) {
    console.error('Restore reminders error:', err.message);
  }
}

// ============ REMARKETING CRON ============

async function cronRemarketing() {
  if (!client) return;

  try {
    const rmks = await Remarketing.find({ converted: false });
    const now = Date.now();

    for (const rmk of rmks) {
      const sessionMs = new Date(rmk.sessionTime).getTime();
      const elapsed = now - sessionMs;

      // Skip if > 7 days old
      if (elapsed > 7 * 24 * 60 * 60 * 1000) continue;
      // Skip if session hasn't happened yet
      if (elapsed < 0) continue;

      for (const wave of POST_WAVES) {
        if (rmk.waves[wave.key]) continue; // Already sent
        if (elapsed < wave.offset) continue; // Not time yet

        try {
          const msg = cards.buildWaveMessage(wave.key, {
            label: rmk.sessionDate,
            link: ''
          }, rmk.attended);

          await client.pushMessage({ to: rmk.userId, messages: [msg] });

          rmk.waves[wave.key] = true;
          await rmk.save();

          console.log(`Remarketing ${wave.key} sent to ${rmk.userId.substring(0, 8)}`);
        } catch (err) {
          console.error(`Remarketing ${wave.key} failed:`, err.message);
        }

        break; // One wave per user per cycle
      }
    }
  } catch (err) {
    console.error('Cron remarketing error:', err.message);
  }
}

// ============ COMPLETION & INTEREST ============

async function handleCompletion(userId) {
  // Mark as attended
  await Remarketing.updateMany({ userId }, { attended: true });

  await client.pushMessage({
    to: userId,
    messages: [{ type: 'text', text: '感謝你看完直播！🎉\n\n如果有任何問題，隨時問我。\n想了解課程詳情，回覆「了解課程」' }]
  });

  if (ADMIN_USER_ID) {
    await client.pushMessage({
      to: ADMIN_USER_ID,
      messages: [{ type: 'text', text: `✅ 完課！User: ${userId.substring(0, 8)}...` }]
    }).catch(() => {});
  }
}

async function handleCourseInterest(userId) {
  const courseUrl = process.env.SITE_URL || 'https://knowu-web.zeabur.app';

  await client.pushMessage({
    to: userId,
    messages: [{
      type: 'flex',
      altText: 'AI 造局術課程資訊',
      contents: {
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '🎯 AI 造局術', weight: 'bold', size: 'lg', color: '#1E293B' },
            { type: 'text', text: '4 大階段 × 24 堂課\n學完帶走一套完整的自動化銷售漏斗', size: 'sm', color: '#94A3B8', wrap: true, margin: 'md' }
          ]
        },
        footer: {
          type: 'box', layout: 'vertical', spacing: 'sm',
          contents: [
            { type: 'button', style: 'primary', color: '#3B5BDB',
              action: { type: 'uri', label: '查看課程詳情', uri: courseUrl } },
            { type: 'button', style: 'secondary',
              action: { type: 'uri', label: '直接報名', uri: `${courseUrl}/checkout` } }
          ]
        }
      }
    }]
  });

  // Notify admin
  if (ADMIN_USER_ID) {
    await client.pushMessage({
      to: ADMIN_USER_ID,
      messages: [{ type: 'text', text: `🔥 高意願！User: ${userId.substring(0, 8)}... 回覆了「${userId.includes('了解') ? '了解課程' : '報名'}」` }]
    }).catch(() => {});
  }
}

async function handleReplay(userId) {
  // TODO: 設定回放連結 env
  const replayUrl = process.env.REPLAY_URL || '';
  if (replayUrl) {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: `📺 直播回放連結：\n${replayUrl}\n\n看完回覆「777」讓我知道！` }]
    });
  } else {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: '回放影片準備中，稍後會發給你！' }]
    });
  }
}

// ============ PAYMENT CALLBACK ============

// 付款成功後呼叫：停止追單 + 發課程連結
async function onPaymentSuccess(userId, courseToken) {
  // Stop remarketing
  await Remarketing.updateMany({ userId }, { converted: true });

  const courseUrl = `${process.env.SITE_URL || ''}/course?token=${courseToken}`;

  if (client) {
    await client.pushMessage({
      to: userId,
      messages: [{
        type: 'flex',
        altText: '付款成功！課程已開通',
        contents: {
          type: 'bubble',
          body: {
            type: 'box', layout: 'vertical', spacing: 'md',
            contents: [
              { type: 'text', text: '🎉 付款成功！', weight: 'bold', size: 'lg', color: '#22C55E' },
              { type: 'text', text: '你的課程已經開通，點擊下方按鈕開始學習。', size: 'sm', color: '#94A3B8', wrap: true, margin: 'md' },
              { type: 'text', text: '這個連結是你專屬的，請收藏好。', size: 'xs', color: '#CBD5E1', margin: 'sm' }
            ]
          },
          footer: {
            type: 'box', layout: 'vertical',
            contents: [{
              type: 'button', style: 'primary', color: '#22C55E',
              action: { type: 'uri', label: '開始上課', uri: courseUrl }
            }]
          }
        }
      }]
    }).catch(err => console.error('Payment LINE notify failed:', err.message));
  }
}

module.exports = {
  initBot,
  webhookMiddleware,
  onPaymentSuccess
};
