// AI chat helper — Gemini via OpenAI-compatible endpoint, with retry + fallback model
// Copied/adapted from bot/index.js aiChatWithRetry
const OpenAI = require('openai');

const aiClient = process.env.GEMINI_API_KEY ? new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
}) : process.env.AI_API_KEY ? new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_BASE_URL
    ? `https://${process.env.AI_API_BASE_URL}`
    : 'https://hnd1.aihub.zeabur.ai/v1',
}) : null;

function isEnabled() {
  return !!aiClient;
}

async function aiChatWithRetry(messages, options = {}) {
  if (!aiClient) throw new Error('AI client not configured (set GEMINI_API_KEY or AI_API_KEY)');

  const models = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];
  const maxAttempts = 3;
  const delays = [500, 1500, 3000];

  for (const model of models) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const resp = await aiClient.chat.completions.create({ model, messages, ...options });
        if (resp?.choices?.[0]?.message?.content) return resp;
        throw new Error('empty content');
      } catch (e) {
        const msg = String(e.message || e);
        const is429 = msg.includes('429');
        const is503 = msg.includes('503');
        const is5xx = /5\d\d/.test(msg);
        const shouldRetry = is429 || is503 || is5xx || msg.includes('empty content');
        if (!shouldRetry) throw e;
        console.log(`[ai-chat retry] model=${model} attempt=${attempt + 1} err=${msg.slice(0, 80)}`);
        if (attempt < maxAttempts - 1) await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
    console.log(`[ai-chat retry] switching to fallback model`);
  }
  throw new Error('all models exhausted');
}

// Streaming variant — yields content deltas via async iterator
async function aiChatStream(messages, options = {}) {
  if (!aiClient) throw new Error('AI client not configured');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return aiClient.chat.completions.create({
    model,
    messages,
    stream: true,
    ...options,
  });
}

module.exports = { aiChatWithRetry, aiChatStream, isEnabled };
