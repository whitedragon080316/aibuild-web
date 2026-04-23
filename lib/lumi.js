// Lumi session + report helpers
// - loads AI prompt from bot/prompts/ai-workers/ai-avatar.md (shared across repos in monorepo)
// - manages 7 Q discovery flow (code-enforced question index)
// - generates report at Q7
// - pushes report to LINE via bot internal endpoint

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { aiChatWithRetry } = require('./ai-chat');

const LIVESTREAM_URL = process.env.LIVESTREAM_URL || '（未設定 LIVESTREAM_URL）';
const BETA_SIGNUP_URL = process.env.BETA_SIGNUP_URL || '（未設定 BETA_SIGNUP_URL）';

// Load Lumi avatar prompt. Try monorepo path first, then fallback to web/prompts copy.
function loadAvatarPrompt() {
  const candidates = [
    path.join(__dirname, '..', '..', 'bot', 'prompts', 'ai-workers', 'ai-avatar.md'),
    path.join(__dirname, '..', 'prompts', 'ai-avatar.md'),
  ];
  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      return raw
        .replace(/\{\{LIVESTREAM_URL\}\}/g, LIVESTREAM_URL)
        .replace(/\{\{BETA_SIGNUP_URL\}\}/g, BETA_SIGNUP_URL);
    } catch (e) { /* try next */ }
  }
  console.warn('[lumi] avatar prompt not found; using minimal fallback');
  return '你是 Lumi，Bago 老師的 AI 顧問。用 1-2 句、≤40 字、最多 1 個問號回覆。';
}

const AVATAR_PROMPT = loadAvatarPrompt();

// 7 Q main questions — code-enforced progression
const DISCOVERY_QUESTIONS = [
  { n: 1, key: 'vision',    text: '你的目標是什麼？理想中的樣子長什麼樣？' },
  { n: 2, key: 'gap',       text: '現實跟理想之間的落差，你覺得差在哪？' },
  { n: 3, key: 'block',     text: '是什麼讓這段差距一直沒辦法追上？' },
  { n: 4, key: 'value',     text: '你的事業裡，什麼是你最重要的 value？' },
  { n: 5, key: 'unique',    text: '什麼是非你不可的事？' },
  { n: 6, key: 'delegate',  text: '針對目標，有什麼可以交給別人或 AI？' },
  { n: 7, key: 'reality',   text: '這樣做，真的會更靠近你的理想嗎？' },
];

function generateSessionId() {
  return 'lumi_' + crypto.randomBytes(12).toString('hex');
}

function buildSystemPrompt(session) {
  const q = session.currentQuestion;
  const qInfo = DISCOVERY_QUESTIONS.find(x => x.n === q);
  const progress = `\n\n---\n當前對話進度：第 ${q}/7 題（${qInfo?.key || 'done'}）。`;
  const nextHint = q <= 7
    ? `\n這一題主軸：「${qInfo.text}」\n如果用戶已答過這題，等用戶下一則後你就進入下一題。`
    : '\n7 題已答完，請生成診斷報告。';
  return AVATAR_PROMPT + progress + nextHint;
}

// Ask AI for a reply given session state + user message
async function askLumi(session, userMessage) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(session) },
    ...session.chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];
  const resp = await aiChatWithRetry(messages, { temperature: 0.8 });
  return resp.choices[0].message.content.trim();
}

// Generate the final diagnosis report (Q7 done)
async function generateReport(session) {
  const answers = session.answers || {};
  const reportPrompt = `你是 Lumi。根據以下 7 題 discovery 答案，照 ai-avatar.md 的「診斷報告」模板產出一整則報告。

用戶名：${session.displayName || '學員'}

答案：
Q1 Vision 理想：${answers.q1 || '（未答）'}
Q2 Gap 落差：${answers.q2 || '（未答）'}
Q3 Block 阻礙：${answers.q3 || '（未答）'}
Q4 Value 核心價值：${answers.q4 || '（未答）'}
Q5 Unique 非你不可：${answers.q5 || '（未答）'}
Q6 Delegate 可委派：${answers.q6 || '（未答）'}
Q7 Reality 靠近理想：${answers.q7 || '（未答）'}

請嚴格照「📋 造局診斷報告｜...」格式輸出，包含【你的現況】【你的造局起點】【3 個下一步】【為什麼我這樣說】，最後接 CTA（LIVESTREAM_URL=${LIVESTREAM_URL}, BETA_SIGNUP_URL=${BETA_SIGNUP_URL}）。Markdown 格式，用 ## 標題。`;

  const messages = [
    { role: 'system', content: AVATAR_PROMPT },
    { role: 'user', content: reportPrompt },
  ];
  const resp = await aiChatWithRetry(messages, { temperature: 0.7 });
  return resp.choices[0].message.content.trim();
}

// Push report notification to LINE via bot internal endpoint
async function pushReportToBot(lineUserId, reportUrl) {
  const botUrl = process.env.BOT_INTERNAL_URL;
  const sharedSecret = process.env.LUMI_SHARED_SECRET;
  if (!botUrl || !sharedSecret) {
    console.warn('[lumi] BOT_INTERNAL_URL or LUMI_SHARED_SECRET not set, skip push');
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const resp = await fetch(`${botUrl.replace(/\/$/, '')}/internal/push-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId, reportUrl, sharedSecret }),
    });
    const body = await resp.text();
    if (!resp.ok) {
      console.error('[lumi] push-report failed:', resp.status, body);
      return { ok: false, reason: body };
    }
    return { ok: true };
  } catch (e) {
    console.error('[lumi] push-report error:', e.message);
    return { ok: false, reason: e.message };
  }
}

module.exports = {
  DISCOVERY_QUESTIONS,
  generateSessionId,
  askLumi,
  generateReport,
  pushReportToBot,
};
