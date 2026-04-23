// AI chat helper — multi-provider with retry + fallback
// Priority: Groq (14400 RPD free) → Gemini (250 RPD free) → legacy AI_API_KEY
const OpenAI = require('openai');

const providers = [];

if (process.env.GROQ_API_KEY) {
  providers.push({
    name: 'groq',
    client: new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
    models: [
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
  });
}

if (process.env.GEMINI_API_KEY) {
  providers.push({
    name: 'gemini',
    client: new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    }),
    models: [
      process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-2.0-flash',
    ],
  });
}

if (process.env.AI_API_KEY) {
  providers.push({
    name: 'aihub',
    client: new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_API_BASE_URL
        ? `https://${process.env.AI_API_BASE_URL}`
        : 'https://hnd1.aihub.zeabur.ai/v1',
    }),
    models: [process.env.AI_API_MODEL || 'gpt-4o-mini'],
  });
}

function isEnabled() {
  return providers.length > 0;
}

async function aiChatWithRetry(messages, options = {}) {
  if (providers.length === 0) {
    throw new Error('No AI provider configured (set GROQ_API_KEY or GEMINI_API_KEY)');
  }

  const maxAttempts = 2;
  const delays = [500, 1500];

  for (const provider of providers) {
    for (const model of provider.models) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const resp = await provider.client.chat.completions.create({ model, messages, ...options });
          if (resp?.choices?.[0]?.message?.content) return resp;
          throw new Error('empty content');
        } catch (e) {
          const msg = String(e.message || e);
          const is429 = msg.includes('429');
          const is5xx = /5\d\d/.test(msg);
          const shouldRetry = is429 || is5xx || msg.includes('empty content');
          if (!shouldRetry) throw e;
          console.log(`[ai-chat retry] provider=${provider.name} model=${model} attempt=${attempt + 1} err=${msg.slice(0, 80)}`);
          if (attempt < maxAttempts - 1) await new Promise(r => setTimeout(r, delays[attempt]));
        }
      }
      console.log(`[ai-chat] switching model within ${provider.name}`);
    }
    console.log(`[ai-chat] switching to next provider`);
  }
  throw new Error('all providers exhausted');
}

async function aiChatStream(messages, options = {}) {
  if (providers.length === 0) throw new Error('No AI provider configured');
  const p = providers[0];
  return p.client.chat.completions.create({
    model: p.models[0],
    messages,
    stream: true,
    ...options,
  });
}

module.exports = { aiChatWithRetry, aiChatStream, isEnabled };
