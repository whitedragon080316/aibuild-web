// Lumi session + report helpers
// - loads AI prompt from bot/prompts/ai-workers/ai-avatar.md (shared across repos in monorepo)
// - manages 7 Q discovery flow (code-enforced question index)
// - generates report at Q7
// - pushes report to LINE via bot internal endpoint

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { aiChatWithRetry } = require('./ai-chat');

const LIVESTREAM_URL = process.env.LIVESTREAM_URL || 'https://lin.ee/uRKyXnW';
const BETA_SIGNUP_URL = process.env.BETA_SIGNUP_URL || 'https://lin.ee/uRKyXnW';
const LINE_ADD_URL = process.env.LINE_ADD_URL || 'https://lin.ee/uRKyXnW';
const BUILDER_LP_URL = process.env.BUILDER_LP_URL || 'https://aibuilding.zeabur.app/lp';

// Load Lumi avatar prompt. Use web-specific copy (bot's version is neutered LIFF-gateway).
function loadAvatarPrompt() {
  const candidates = [
    path.join(__dirname, '..', 'prompts', 'lumi.md'),
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
  const nextQ = DISCOVERY_QUESTIONS.find(x => x.n === q + 1);
  const progress = `\n\n---\n當前進度：第 ${q}/7 題（${qInfo?.key || 'done'}）。`;
  let nextHint;
  if (q >= 1 && q <= 6) {
    nextHint = `\n用戶剛答完 Q${q}「${qInfo.text}」。\n\n**你這輪要做 2 件事（缺一不可）**：\n1. 用 1-2 句做鏡子 reflection — 點出他答案背後你看見的（不是重複他的話）\n2. **緊接著完整問出下一題**，格式必須是：「**第 ${q + 1} 題**：${nextQ.text}」\n\n範例：「聽起來你卡在區分『什麼是你獨有』和『什麼可以交出去』。\\n\\n**第 ${q + 1} 題**：${nextQ.text}」\n\n絕對不要只說「繼續下一題」「下一題」「請說明你的想法」這種空話 — 必須把第 ${q + 1} 題題目完整講出來。`;
  } else if (q === 7) {
    nextHint = `\n這是最後一題（Q7）。用戶答完後系統會自動生成報告，你只需要用 1-2 句收尾：「好，我整理一下你這 7 題的答案，幫你出一份造局診斷報告。」不要再問任何問題。`;
  } else {
    nextHint = '\n7 題已答完。';
  }
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
  const displayName = session.displayName || '學員';
  const reportPrompt = `你是 Lumi，Bago 老師的 AI 顧問分身。
根據下面 7 題答案，產出一份「造局診斷報告」。這份報告是鏡子，不是評論 — 點出用戶沒看見的、敢斷言、有觀點。

用戶名：${displayName}

7 題答案：
Q1 Vision 理想：${answers.q1 || '（未答）'}
Q2 Gap 落差：${answers.q2 || '（未答）'}
Q3 Block 阻礙：${answers.q3 || '（未答）'}
Q4 Value 核心價值：${answers.q4 || '（未答）'}
Q5 Unique 非你不可：${answers.q5 || '（未答）'}
Q6 Delegate 可委派：${answers.q6 || '（未答）'}
Q7 Reality 靠近理想：${answers.q7 || '（未答）'}

=== 輸出格式（嚴格照順序，5 段）===

📋 造局診斷報告｜${displayName}

## 1️⃣ 你的造局類型
從下面 4 種類型挑一個最貼近用戶的，用 2-3 句解釋為什麼（要引用他的具體答案）：
- A. 無方向接案者（有能力但沒方向，什麼都接）
- B. 有貨無漏斗（作品／產品／價值夠，缺讓客戶找得到的路徑）
- C. 漏斗有但卡住（有流量但轉單卡住，或收單但交付爆掉）
- D. 已成系統缺擴展（自己跑順了，想複製／授權但沒框架）

## 2️⃣ 你真正卡在哪
從他的 7 題裡，找出他「沒講出來但顯而易見」的卡點。
重點：不是重複他講的，是點出他沒意識到的 — 鏡子模式。
2-3 個 bullet，每個一句話，精準到痛。

## 3️⃣ 你下週能做的 1 件具體事
只給 1 件（不是 3 件），要具體到「下週三前做 XX」。
不能寫「明確目標」「尋找資源」這種空話。
範例：「下週三前，列出你絕對不接的 3 類客戶，貼牆上」。
要可驗證、可 check。

## 4️⃣ 你接下來 1 個月會撞的牆
根據他的 造局類型 + 卡點，預測接下來會遇到什麼。
2-3 點，每點 1 句。
這段是「種子」：讓他感覺「我需要陪跑」。

## 5️⃣ 為什麼你不該自己慢慢試

200 字左右，一段話（不是 bullet），講故事不放連結。必含：
- 引用第 2 段的卡點，說「我這 2 年見過 60+ 個一樣卡著的」
- **你缺的不是 1 件事，是 3 件同時**：會自己跑的獲客銷售系統 + 可複製的交付（產品／課程／服務包／銷售腳本）+ 陪你建的 AI 顧問
- 單獨做 1 件會散 — 做完 funnel 沒產品、做完產品沒 traffic、自己硬搞 AI 一知半解

語氣參考（講故事，不放連結）：
> 你的問題不是能力，是結構。
> 你現在賣的是你的時間 — 客戶要找你，要靠你親自回應、親自接。
> 你需要的不是一件事，是 3 件同時：會自己跑的獲客銷售系統、
> 可複製的交付、陪你建的 AI 顧問。
> 單獨做 1 件會散；3 件綁一起做通才有槓桿。

然後**完全照下面格式**輸出結尾（固定文字，不要改）：

────────────

📍 5/28 晚 8 點｜線上直播｜90 分鐘｜免費

給「有東西要賣、想自動化、不想只靠自己時間」的人：

✓ 有專業要 scale — 顧問 / 教練 / 治療師 / 培訓師
✓ 賣高單價產品 — 保健品 / 美容 / 直銷 / 3C
✓ 走銷售講座 / 直播賣貨模式

你缺的不是一件事，是 3 件同時：
- 會自己跑的獲客銷售系統
- 可複製的交付（產品 / 課程 / 銷售腳本 / 講座框架）
- 陪你建這些的 AI 顧問

直播我拆 3 件事：

① 自動化獲客銷售系統的最小架構（廣告 → LP → LINE → AI → 成交）
② 把你的東西打包成可複製的銷售流程（不管你賣課 / 賣產品 / 辦講座）
③ 怎麼訓一個 AI 顧問陪你 24/7 建這些（Lumi 就是示範品）

你這份報告第 1 段說的那個類型，直播當場拆破法。

👉 加 LINE 預約：${LINE_ADD_URL}
（沒加的不會收到當天直播連結）

────────────

或者，繼續一個一個客戶接、一場一場辦講座。
你的系統，你不開始做，永遠不會出現。

— Lumi

=== 語氣規則（重要）===

- Bago 派：有觀點、敢斷言、不鄉愿。不要像 ChatGPT 那樣八面玲瓏。
- 鏡子而非評論家：不說教，但點出他沒看見的。
- 中文短句為主，長句會像翻譯腔。
- 禁止詞：「加油」「相信自己」「只要」「一定可以」「希望」「try your best」。
- 禁止「治療」「治好」「根治」這類醫療字眼。
- 禁止「不是推銷」「沒有壓力」這類暗示推銷的否定句。
- emoji 只用在段落標題（📋、1️⃣ 已在結構裡），段落內文不要放 emoji。
- 避免 markdown 粗體過度、不要用表格。

直接輸出報告，不要額外說明。`;

  // 用極簡 system，不帶 AVATAR_PROMPT（避免 lumi.md 舊報告模板壓過新結構）
  const messages = [
    { role: 'system', content: '你是 Lumi，Bago 老師的 AI 顧問分身。輸出報告時嚴格照用戶訊息裡指定的 5 段結構，不要使用任何其他報告模板或範本。' },
    { role: 'user', content: reportPrompt },
  ];
  const resp = await aiChatWithRetry(messages, { temperature: 0.6, max_tokens: 1500 });
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
