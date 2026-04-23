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

**內容（精簡 3 行版）**：
```
適合誰：

✓ 所有「人即服務」的專業（顧問 / 教練 / 治療師 / 老師 / 技師...）
✓ 自建品牌的產品 / 服務 / 課程 creator
✓ 廣告代操 / 數位 agency / 諮詢工作者

只要你是靠「親自在場」才能交付的專業，這套都適用。

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

**卡片下方**（不提前置關係，兩個選項獨立並排）：
```
3 種買法：
- 只買 Builder：想教人、想靠課程變現
- 只買 Agent：已有客戶、只缺時間
- 兩個都買：課程變現 + AI 替你跑服務（最完整）
```

### 2.5 護城河區（保留但更新）

5 條（第 5 條是 2026-04-24 新增 — 最關鍵的一條）：

1. **踩坑 60+ 案例庫**
   真的跑通 + 踩過坑的具體紀錄，Google / ChatGPT 查不到

2. **跑通的活 case**
   Lumi / 知脊整復 / 知脊整聊學院 — 你正在用的 AI 顧問就是產品示範

3. **即時陪跑 presence**
   30 分鐘給方向 vs AI 廢話一天

4. **學員擁有自己 infra**
   不是 SaaS 月費綁架，code / data / agent 都是你的

5. **🔴 拿到 zip 也跑不動 — invisible scaffolding 才是真正 IP**
   ```
   GitHub 上一堆 multi-agent repo（10K stars 一週爆紅那種）你裝過對吧？
   為什麼裝完還是跑不動？

   差在 invisible 的那層 ——
   什麼任務派哪個 agent / agent 卡住怎麼救 / handoff 的時機 /
   哪些你自己留著做 / 失敗 100 次內化的 pattern

   這層無法 doc 化、無法 zip。只有跑過、踩過坑、有人接你才會。

   所以你買的不是「我給你一個 AI 顧問」—
   是「AI 顧問 + Bago 的判斷 encode 進去 + 卡住有人接 + 你跑 100 次內化」。

   file 我直接給你都沒差，scaffolding 才是付費理由。
   ```

### 2.6 Manifesto / 宣言區（Bago 決策：全砍）

**刪除** — 不要塞 3 金句在 LP，只保留主 slogan「你的事業，始於自己，終於 AI」在 Hero + footer。
金句留著當 FB 踩坑週報 / 廣告 hook 的素材，LP 保持乾淨不宣言化。

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

### 3.3 Story Section（✅ 決定：精簡版 C — A 當 hook + B 當解釋，合成一個敘事）

**架構**：
- **開場 hook**（A 簡化）：1 個具體事件 + 10 單 outcome 數字 → 抓眼球
- **主敘事**（B 進化路徑）：解釋「為什麼會這樣」+ 鋪陳 Builder/Agent 2 tier 邏輯
- **收束**：回到「專業複製術」+ 直播 hook

**完整文案**（投手照這個寫，不用再改結構，可微調語氣）：

```
[hook 區｜大字]
上週四直播 — 我 4 場成交 1 單。
教完這個學員之後，他自己一週成交 10 單。

[h2 過渡]
為什麼會這樣？因為我這一年走完了這條路 ——

[section 1｜Before（5 年諮詢）]
我做 1-on-1 諮詢做了 5 年。
1 小時 NT$3,000，一天最多 5 個人。
這是我收入的天花板，
也是我命運的天花板 ——
我能做的就是「再加班」。

[section 2｜First evolution：課程]
我想通：**我不是在賣時間，是在賣判斷。**

把判斷拆出來 → 做成線上課程 →
1 次錄、讓 500 個人學。

收入翻 10 倍。
但新問題來了：
課程賣完，客戶問題還是來找我。
我還在「親自回應」。

[section 3｜Second evolution：AI 分身]
2025 年我開始訓練 AI 分身。

不是把所有對話都丟給 AI ——
是策展我最常回答的 500 則對話裡，
挑出 30-50 則最精華的，
encode 進 AI 的判斷層。

現在：
- 客戶問「這個市場切得對嗎」→ AI 替我答
- 文案要客製 → AI 替我寫
- 新客戶 qualify → AI 替我跑 10 分鐘諮詢

我一天服務的人從 5 → 500 →
現在**理論上沒有上限**。

[section 4｜回扣 hook + 收束]
上週那個學員 10 單成交 —
就是這條路徑的縮影。
他不是學了「銷售技巧」，
是學了**怎麼把專業複製出去**。

這就是 **專業複製術**。

5/28 直播我拆整個進化路徑：
從 1-on-1 → 課程 → AI 分身，
你該在哪個階段動手。
```

**為什麼這版優於 A 或 B 單獨**：
- 保留 A 的 outcome 數字（10 單）→ 不弱化情緒衝擊
- 保留 B 的 positioning 軸 + tier 鋪陳 → 不弱化方法論深度
- 開場 hook + 收尾回扣 → 形成閉環敘事，不是兩個 section 拼接
- 字數控制 ~280 字（比原 B 少 20%，比 A+B 並列少 50%）

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

## 6. Bago 決策結果（2026-04-24 早上補完）

1. ✅ **TA filter 精簡 3 行**（選 B）
2. ✅ **Agent 卡片不提前置關係**（選 B，2 卡獨立並排）
3. ✅ **Manifesto 全砍**（選 C，只留主 slogan）
4. ✅ **Story 段選精簡版 C**（A 當 hook + B 當解釋，合成單一敘事，文案已寫死在 3.3）
5. ✅ **新增第 5 條護城河**「拿到 zip 也跑不動 — invisible scaffolding 才是 IP」（4/24 加，section 2.5）

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
