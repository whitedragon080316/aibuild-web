// Flex Message card builders for LINE Bot
// Template-friendly: change colors/text to match your brand

const BRAND = {
  primary: '#3B5BDB',
  accent: '#E8A838',
  dark: '#1E293B',
  green: '#22C55E',
  gray: '#94A3B8',
  white: '#FFFFFF'
};

// 歡迎訊息
function buildWelcomeMessage(brandName) {
  return {
    type: 'flex',
    altText: `歡迎加入 ${brandName}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: `歡迎加入 ${brandName}！`, weight: 'bold', size: 'lg', color: BRAND.dark },
          { type: 'text', text: '我們即將舉辦免費直播課，\n完整拆解如何用 AI 建立自動化事業。', size: 'sm', color: BRAND.gray, wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '👇 選擇你方便的場次報名', size: 'sm', color: BRAND.primary, margin: 'lg', weight: 'bold' }
        ]
      }
    }
  };
}

// 場次選擇輪播
function buildSessionCarousel(sessions) {
  const bubbles = sessions.map(s => ({
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box', layout: 'vertical', spacing: 'sm',
      contents: [
        { type: 'text', text: '📅 免費直播課', size: 'xs', color: BRAND.primary, weight: 'bold' },
        { type: 'text', text: s.label, size: 'lg', weight: 'bold', color: BRAND.dark, margin: 'sm' },
        { type: 'text', text: '80 分鐘完整拆解', size: 'xs', color: BRAND.gray, margin: 'sm' }
      ]
    },
    footer: {
      type: 'box', layout: 'vertical',
      contents: [{
        type: 'button', style: 'primary', color: BRAND.primary,
        action: { type: 'message', label: '我要報名', text: s.date },
        height: 'sm'
      }]
    }
  }));

  return {
    type: 'flex',
    altText: '選擇直播場次',
    contents: { type: 'carousel', contents: bubbles }
  };
}

// 報名確認卡片
function buildConfirmCard(session) {
  return {
    type: 'flex',
    altText: `報名成功！${session.label}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '✅ 報名成功！', weight: 'bold', size: 'lg', color: BRAND.green },
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'vertical', spacing: 'sm', margin: 'lg',
            contents: [
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '直播時間', size: 'sm', color: BRAND.gray, flex: 3 },
                { type: 'text', text: session.label, size: 'sm', color: BRAND.dark, weight: 'bold', flex: 5, align: 'end' }
              ]},
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '直播方式', size: 'sm', color: BRAND.gray, flex: 3 },
                { type: 'text', text: 'YouTube 直播', size: 'sm', color: BRAND.dark, flex: 5, align: 'end' }
              ]}
            ]
          },
          { type: 'text', text: '直播連結會在開始前發給你 👍', size: 'xs', color: BRAND.gray, margin: 'lg', wrap: true }
        ]
      }
    }
  };
}

// 提醒卡片
function buildReminderCard(countdown, session) {
  const messages = {
    '24h': { title: '⏰ 明天就是直播了！', desc: '記得空出時間，我們明天見' },
    '6h': { title: '📢 直播倒數 6 小時', desc: '今天的重頭戲，準備好了嗎？' },
    '2h': { title: '🔥 再 2 小時就開始！', desc: '找個安靜的地方，準備好筆記' },
    '10m': { title: '🚀 10 分鐘後開始！', desc: '直播連結在這裡，點進去等開場' }
  };

  const msg = messages[countdown] || messages['24h'];
  const contents = [
    { type: 'text', text: msg.title, weight: 'bold', size: 'lg', color: BRAND.dark },
    { type: 'text', text: msg.desc, size: 'sm', color: BRAND.gray, wrap: true, margin: 'md' },
    { type: 'separator', margin: 'lg' },
    { type: 'text', text: `📅 ${session.label}`, size: 'sm', color: BRAND.primary, margin: 'md', weight: 'bold' }
  ];

  // 10 分鐘和 2 小時提醒附帶連結
  if ((countdown === '10m' || countdown === '2h') && session.link) {
    contents.push({
      type: 'button', style: 'primary', color: BRAND.primary, margin: 'lg',
      action: { type: 'uri', label: '進入直播', uri: session.link },
      height: 'sm'
    });
  }

  return {
    type: 'flex',
    altText: msg.title,
    contents: {
      type: 'bubble',
      body: { type: 'box', layout: 'vertical', spacing: 'md', contents }
    }
  };
}

// 追單卡片（3 波）
function buildWaveMessage(waveKey, session, attended) {
  const waves = {
    wave1: attended
      ? { title: '感謝你來看直播 🙌', text: '今天的內容對你有幫助嗎？\n如果有任何問題，隨時問我！' }
      : { title: '昨天的直播你沒跟到 😢', text: '沒關係，重點精華整理給你：\n回覆「回放」取得直播回放連結' },
    wave2: attended
      ? { title: '你離自動化事業只差一步', text: '很多人看完直播都說「太厲害了」\n但最後沒有行動的人，什麼都不會改變。\n\n現在報名 AI 造局術，4 週後你也有一套自動化漏斗。' }
      : { title: '看完回放了嗎？', text: '如果你看完了，應該能感受到：\n這不是教你用工具，是幫你造一個系統。\n\n想了解更多，回覆「了解課程」' },
    wave3: attended
      ? { title: '最後提醒 ⏰', text: '早鳥優惠只到這週，之後就恢復原價。\n\n如果你確定想開始，現在是最好的時機。\n回覆「我要報名」，我幫你處理。' }
      : { title: '最後一次提醒', text: '下次直播還沒有確定時間。\n如果你對 AI 自動化有興趣，建議先看回放。\n\n回覆「回放」取得連結' }
  };

  const wave = waves[waveKey] || waves.wave1;

  return {
    type: 'flex',
    altText: wave.title,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: wave.title, weight: 'bold', size: 'md', color: BRAND.dark },
          { type: 'text', text: wave.text, size: 'sm', color: BRAND.gray, wrap: true, margin: 'md' }
        ]
      }
    }
  };
}

module.exports = {
  buildWelcomeMessage,
  buildSessionCarousel,
  buildConfirmCard,
  buildReminderCard,
  buildWaveMessage
};
