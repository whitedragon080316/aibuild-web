# LP 重寫 Spec｜2026-04-23 版本

對應今天定稿的品牌 + 商業模式更新。兩個檔要改：`views/lp.html`、`views/live.html`。

明天派 agent 執行前，先由 Bago review 這份 spec。

---

## 1. 核心 Positioning（兩檔共用）

- **品牌主 slogan**：「你的事業，始於自己，終於 AI」
- **核心定位**：AI 造局術 = **專業複製術**（外部也可說「AI 顧問建置方法論」）
- **TA**：所有「人即服務」的 1-on-1 專業 — 顧問 / 教練 / 治療師 / 培訓師 / 技術專家 / 運動教練 / 瑜伽 / 整復 / 營養師 / 物理治療 / 音樂 / 舞蹈 / 語言 / 家教 / 技師 / 心理諮商 / ICF 教練 + 自建品牌創業者
- **痛點**：我的專業 = 我的身體 + 我的時間（無法複製）

---

## 2. `/lp`（主 Builder LP）改動

### 2.1 Hero 區

**現況**：
```
AI 造局術
你的事業，始於自己，終於 AI  [剛加的]
h1: 你用的 AI 什麼都能答
h1 span: 但你不知道該問什麼
h2: 造局 AI 會問你
```

**改成**：
```
AI 造局術
你的事業，始於自己，終於 AI  [保留，金色 slogan line]

h1: 把你的專業，複製到 AI。
h1 span: 不用再親自上場，也能服務更多人。

h2 金句: 你的生意，不該是你的身體。

p: 你花 3-10 年累積的專業、判斷、服務客戶的方式 —
   教給 AI 讓它替你跑，你的時間只花在不可替代的事上。
```

### 2.2 TA Filter 區（新增 section）

**位置**：Hero 下第 1 個 section

**內容**：
```
適合誰：

✓ 顧問 / 教練 / 治療師 / 培訓師 / 技術專家
✓ 運動教練 / 瑜伽老師 / 武術教練 / 營養師 / 整復師 / 物理治療師
✓ 音樂 / 舞蹈 / 語言老師 / 家教
✓ 自建品牌的產品 / 服務 / 課程 creator
✓ 廣告代操 / 數位 agency / 諮詢工作者

只要你是「人即服務」— 靠你親自在場才能交付的專業，這套都適用。

不適合：快速致富追求者、沒有可交付專業的人、不打算動手做的人。
```

### 2.3 3 支柱（新增 section，取代原本分散的 feature 列表）

```
你缺的不是一件事，是 3 件同時：

① 自動化獲客銷售系統
   廣告 → LP → LINE → AI → 分流 → 成交，全自動跑

② 可複製的交付
   把你的專業打包成可複製的銷售流程（不管你賣課 / 賣產品 / 辦講座）

③ 陪你建這些的 AI 顧問
   不是你學做 funnel，是你跟 AI 一起造（Lumi 就是示範品）
```

### 2.4 Pricing 區（重寫，取代現有價格區）

**兩張卡片並排**，中間畫 → 箭頭（Builder 是 Agent 前置路徑）

**Builder 卡片**：
```
Builder｜NT$69,800（特價）
把你的專業變成線上課程

核心：1 次錄 → 賣 N 次

適合：想教人、知識變現、想靠課程被動收入

你會做到：
✓ 從專業提取教學架構
✓ 用 AI 設計課程大綱 + 銷售頁 + 廣告
✓ 建課程銷售 bot（LINE qualifier + 轉單）
✓ 課程平台 deploy
✓ 3 個月陪跑群組

成果：一套可以自動賣的線上課程

[按鈕] 5/28 直播當天開放報名
```

**Agent 卡片**：
```
Agent｜NT$99,800（特價）
建活的 AI 分身，多場景應用

核心：1 次訓 → 跟 N 個客戶同時互動

適合：不想教人，AI 直接替你做事

應用場景：
→ 專業服務者：AI 分身做前期諮詢 / qualify / FAQ
→ 廣告代操：AI 分身寫文案 / 跟客戶溝通
→ 企業顧問：AI 分身 embedded 到客戶端
→ agency：AI 分身服務 N 個 client

你會做到：
✓ 策展你 30-50 精華對話 → encode judgment 進 AI
✓ 建客戶筆記本系統（跨 session memory）
✓ 多 agent 協作架構
✓ 分身部署到 LINE / Web / Slack
✓ 1:1 Bago onboarding（90 min）
✓ 3 個月陪跑

成果：一個替你跑的 AI 分身

[按鈕] 5/28 直播當天開放報名
```

**卡片下方**：
```
3 種買法：
- 只買 Builder：想教人、想靠課程變現
- 只買 Agent：已有客戶、只缺時間
- 兩個都買：課程變現 + AI 替你跑服務（最完整）

Agent 包含 Builder 的方法論 —
因為你要把判斷 encode 進 AI，先必須能把判斷「寫出來」。
Builder 教的就是這個。
```

### 2.5 護城河區（保留但更新）

4 條：
1. 踩坑 60+ 案例庫
2. 跑通的活 case（Lumi / 知脊整復 / 學院）
3. 即時陪跑 presence
4. 學員擁有自己 infra，不是 SaaS 月費綁架

### 2.6 Manifesto / 宣言區（新增，接近文末）

```
你的專業，不該只服務一個人一次。

你的生意，不該是你的身體。

你的判斷，值得被無限複製。

—— AI 造局術｜你的事業，始於自己，終於 AI
```

### 2.7 CTA 區（文末）

主 CTA：加 LINE 預約 5/28 直播（`{{LINE_ADD_URL}}`）
次 CTA：先試 10 分鐘 AI 造局診斷（`/lumi`）

---

## 3. `/live`（免費直播 LP）改動

### 3.1 Hero 區

**現況**：
```
8 天，用 AI 把公司自動化
從廣告到收款，全部交給它
你的事業，始於自己，終於 AI  [剛加的]
p: 你有專業，卡在「怎麼把線上課賣出去」？
   這 60 分鐘給你答案。
```

**改成**：
```
你的事業，始於自己，終於 AI  [保留金色 slogan line]

h1: 90 分鐘，拆給你看 ——
h1 span: 怎麼把你的專業複製給 AI

p: 顧問 / 教練 / 治療師 / 運動教練 / 老師 —
   所有「人即服務」的專業，都能用這套方法擴產能。
   5/28 晚 8 點，免費直播。
```

### 3.2 5/28 直播 Agenda（新增，明確告訴 TA 能得到什麼）

```
直播我拆 3 件事：

① 自動化獲客銷售系統的最小架構
   廣告 → LP → LINE → AI → 成交
   你用得上的具體骨架

② 把你的專業打包成可複製的銷售流程
   不管你賣課 / 賣產品 / 辦講座
   都是同一套方法論

③ 訓一個 AI 分身陪你 24/7 建這些
   （Lumi 就是示範品，你剛體驗的）

———

直播結束兩個禮物：
🎁 回「777」→ 送完整「蓋你自己 Lumi」private repo
   （prompt + templates + 60 踩坑案例）
📦 Builder + Agent 方案只開直播當天 48 小時
   Cohort 2 開始漲價
```

### 3.3 Story Section（保留 4 場 1 單 → 9 單 story）

保留現有 story，但結尾段接「這就是**專業複製術**的 MVP」連結到新 positioning。

### 3.4 TA Filter 區（新增）

同 `/lp` 的 TA filter，但簡化版（3-4 行）。

### 3.5 CTA 區（文末）

主 CTA：加 LINE 預約 5/28 直播（`{{LINE_ADD_URL}}`）
次 CTA：先試 10 分鐘 AI 造局診斷（`/lumi`）

---

## 4. 通用規則（兩檔都要遵守）

### 必保留
- `{{LINE_ADD_URL}}` / `{{LUMI_LIFF_URL}}` / `{{SEATS_REMAINING}}` / `{{LIVESTREAM_DATE}}` / `{{SESSION_TIME}}` template variables
- Meta Pixel `fbq('track','Lead')` 在 CTA onclick
- brand 主 slogan 「你的事業，始於自己，終於 AI」出現位置
- Hero `/lumi` 次要 CTA（訪客模式入口）
- footer 既有 structure

### 必修掉
- 舊 positioning 語言「造局 AI 會問你對問題」「AI 合夥人」「8 天自動化」
- 任何「24/7 自動成交」「被動收入」「月入 xxx」guru 用語
- 「不是推銷」「沒有壓力」這類否定句（破壞信任）
- 第三人稱 / 用戶名稱呼（全部用「你」）
- archetype 英文術語

### 語氣 rule
- Bago 派：敢斷言、不鄉愿、有觀點、不 ChatGPT 八面玲瓏
- 鏡子感：點出用戶沒看見的，不說教
- 中文短句優先
- 可使用金句 break out（manifesto 段）

---

## 5. Agent brief（明天執行時給 agent 的指示）

```
參考 ~/my-aibuild/web/docs/lp-rewrite-spec.md。
改 2 個檔案：web/views/lp.html + web/views/live.html

段落對應：
- lp.html：Hero / TA filter / 3 支柱 / Pricing 2 卡片 / 護城河 / Manifesto / CTA
- live.html：Hero / 直播 agenda / TA filter / Story / CTA

保留既有 template variables + Pixel tracking + /lumi 訪客入口。

完成後 commit push，但**不 deploy**。主線 review 後 deploy。
```

---

## 6. 風險 / Bago 需判斷的

1. **TA filter 要不要那麼長？**（spec 列了所有 vertical，可能太囉嗦。Bago 判斷要精簡到 3 行還是完整列 8 行）
2. **Agent 版 Builder 的前置路徑敘述**（可能讓想只買 Agent 的人猶豫「我要不要先買 Builder」，需要 Bago 判斷是 upsell 還是扣分）
3. **Manifesto 3 金句連發**（「你的專業不該只服務一個人一次 / 你的生意不該是你的身體 / 你的判斷值得被無限複製」是否太強）
4. **Story 段要不要改**（4 場 1 單 → 9 單 是現成的強 story，保留？還是重寫成「從諮詢 → 課程 → AI 分身」的進化 story）

---

## 7. Timeline

- 今晚（4/23）：Bago 直播學院後有空再 review 這份 spec
- 4/24 早上：若 Bago approve，派 agent 執行
- 4/24 下午：主線 deploy
- 4/25-5/27：FB 踩坑週報 series + ad campaign
- 5/28 晚 8 點：直播 + Builder/Agent 48h 開放

---

**Spec 產出時間**：2026-04-23 深夜
**狀態**：待 Bago review
