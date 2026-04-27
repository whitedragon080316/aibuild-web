// 網站生成 helper — Bago 派 portal v1.5
// 收用戶 form 數據（niche / pains / solution / cta / style）
// 用 Gemini API 產出 self-contained HTML LP（hero / pain points / solution / CTA / footer + inline CSS）
//
// Pattern 抄 web/lib/lumi.js askLumi 那段：用 OpenAI SDK + Gemini OpenAI-compatible baseURL。
// 注意：5/28 直播 demo 用，minimum 版（不做 retry / fallback / streaming）。

const OpenAI = require('openai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  return new OpenAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
}

function buildPrompt(spec) {
  const niche = (spec.niche || '').trim();
  const pains = Array.isArray(spec.pains)
    ? spec.pains.filter(Boolean).map(p => String(p).trim()).slice(0, 3)
    : String(spec.pains || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
  const solution = (spec.solution || '').trim();
  const cta = (spec.cta || '').trim();
  const style = (spec.style || 'modern-blue').trim();

  const stylePalette = {
    'modern-blue':   { primary: '#2B44B0', accent: '#3B5BDB', bg: '#fafafa', mood: '專業、科技、信任' },
    'warm-orange':   { primary: '#D9722B', accent: '#F0A04B', bg: '#fff8f1', mood: '溫暖、人本、教練感' },
    'dark-luxury':   { primary: '#1a1a1a', accent: '#D4AF37', bg: '#0e0e0e', mood: '高端、奢華、神祕' },
    'fresh-green':   { primary: '#2E7D63', accent: '#5BB89A', bg: '#f4faf7', mood: '自然、療癒、永續' },
    'minimal-mono':  { primary: '#000000', accent: '#666666', bg: '#ffffff', mood: '極簡、編輯感、留白' },
  };
  const palette = stylePalette[style] || stylePalette['modern-blue'];

  return `你是一位資深 LP 文案 + 視覺設計師。任務：根據以下用戶資料，產出一份 self-contained 的 HTML 銷售落地頁（Landing Page）。

=== 用戶資料 ===
領域 / TA 描述：${niche || '（未填）'}
主要痛點（用戶面臨的）：
${pains.length ? pains.map((p, i) => `  ${i + 1}. ${p}`).join('\n') : '  （未填）'}
解方 / Unique value：${solution || '（未填）'}
主 CTA 文案：${cta || '立即了解'}
配色風格：${style}（主色 ${palette.primary} / 強調色 ${palette.accent} / 背景 ${palette.bg} / 氛圍：${palette.mood}）

=== 輸出規格（嚴格遵守）===

1. 輸出**完整 HTML 文件**（含 <!DOCTYPE html>、<html lang="zh-TW">、<head>、<body>），不要 markdown code fence、不要任何說明文字。
2. 必須是 self-contained：所有 CSS 寫 inline 在 <style> 裡，不引用外部 CSS / JS / 圖片資源。
3. 字型用 system font: -apple-system, "Noto Sans TC", sans-serif。
4. RWD：手機 / 桌機都能看，max-width 1100px 置中。
5. 使用上面指定的配色（主色 ${palette.primary}、強調色 ${palette.accent}、背景 ${palette.bg}）。

=== 頁面結構（5 段，依序）===

(1) Hero 區
   - 大標：根據用戶資料產出，戳 TA 痛點，1 句不超過 25 字。
   - 副標：1-2 句，講「給誰 + 解什麼」。
   - 主 CTA 按鈕：文案用「${cta || '立即了解'}」，連結 href="#cta"，視覺要明顯。

(2) 痛點區（Pain Points）
   - 標題：「你是不是也卡在這裡？」之類同義句。
   - 3 個痛點卡片（依用戶填的痛點，原文照搬不要改寫過頭），每個卡片有圖示（用 emoji 即可）+ 痛點標題 + 1-2 句延伸描述。

(3) 解方區（Solution / Unique value）
   - 標題：點出「我們怎麼幫你」之類。
   - 引用用戶填的 solution，展開成 2-3 段或 3 個 bullet 講具體價值。
   - 不要空話（不要「最佳化」「全方位」這類 buzzword），講具體做什麼、解什麼。

(4) CTA 區（id="cta"）
   - 強烈 call-to-action 區塊，背景用主色或強調色。
   - 1 句強力主標 + CTA 按鈕（同 hero CTA 文案）。

(5) Footer
   - 簡單版權字樣 + 「由 Bago 派 AI 造局術 portal 生成」一句小字。

=== 文案語氣 ===
- 繁體中文（台灣用詞），禁止簡體字。
- 短句為主，不囉嗦。
- 不用「治療」「治好」「根治」醫療字眼。
- 不用「不是推銷」「沒有壓力」這類否定句。
- 不過度使用粗體 / 驚嘆號。

直接輸出 HTML，不要任何前綴後綴說明。`;
}

async function generateLP(spec) {
  const client = getClient();
  const prompt = buildPrompt(spec);

  const resp = await client.chat.completions.create({
    model: GEMINI_MODEL,
    messages: [
      { role: 'system', content: '你是專業 LP 設計師，輸出 self-contained HTML，不要 markdown fence、不要解釋。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  let html = resp?.choices?.[0]?.message?.content?.trim() || '';

  // 容錯：如果 LLM 還是 wrap 了 ```html ... ```，剝掉
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();

  if (!html.toLowerCase().includes('<html')) {
    throw new Error('LLM 沒回完整 HTML，請重試');
  }

  return { html };
}

module.exports = { generateLP };
