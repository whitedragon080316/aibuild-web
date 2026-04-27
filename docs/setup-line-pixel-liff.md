# LINE + Pixel + LIFF 一次設定教學

> 給 Bago 派學員：第一次摸 LINE Developers Console / Meta Pixel / Zeabur 部署也能跟著做完。
> 預估時間：30–45 分鐘（不含 Zeabur 帳號註冊）。

---

## 為什麼需要走完這份文件

你的 Bago 派漏斗模板長這樣：

- **LP / 直播頁** → 用戶按鈕進入
- **LIFF（LINE 內開網頁）** → 拿到用戶 LINE 身份（頭像、名字、userId）
- **LINE @ 推播** → 後續追單、提醒、轉化
- **Meta Pixel** → 把每個關鍵動作回拋給 Meta，讓廣告越投越準

只有這四個東西全部串起來，模板才會跑。任何一個沒設好，都會卡在某一段。

這份文件就是把這四件事 step-by-step 帶你做完。

---

## 0. 開始前的準備

請先準備好：

- 一個 **LINE 個人帳號**（用來建官方帳號 / Developer Console）
- 一個 **Meta（Facebook）個人帳號**（用來開企業管理平台）
- 一個 **Zeabur 帳號**（用來部署服務，後面會用到）
- 一個 **GitHub 帳號**（用來 Fork 模板 repo）

如果上面任一個還沒有，先去開好再回來。

---

## 1. LINE 官方帳號 + Messaging API 啟用

### 為什麼要做這步

一般 LINE 官方帳號預設只能在 LINE App 後台手動回訊息。

要讓你的模板能：
- 用程式自動 push 訊息給用戶
- 接收 webhook（用戶按按鈕、加好友等事件）
- 串接 LIFF（在 LINE 內開網頁並拿到用戶身份）

就**必須啟用 Messaging API**。沒啟用＝你的模板根本連不上 LINE。

### 操作步驟

#### 1.1 建立官方帳號

1. 開 [LINE Official Account Manager](https://manager.line.biz/)
2. 用你的 LINE 個人帳號登入
3. 點「**建立帳號**」→ 填基本資料（帳號名稱、產業類別等）
4. 建立完成後進入該帳號的後台

> Hint：帳號名稱建議用品牌名（之後要做認證徽章 / 廣告會用到），不要用「測試 123」這種臨時名字。

#### 1.2 啟用 Messaging API

1. 在官方帳號後台，左下角 → **設定（齒輪圖示）**
2. 進到「**Messaging API**」分頁
3. 點「**啟用 Messaging API**」
4. 系統會問你要建立 Provider 還是用既有的：
   - **第一次用** → 選「**建立新的 Provider**」→ 取個名字（公司名 / 個人品牌名都可以，這個之後改不了）
   - **已經有** → 直接選既有 Provider
5. 同意條款 → 完成啟用

#### 1.3 拿到 Channel Access Token + Channel Secret

啟用後，同一個 Messaging API 頁面會看到：

- **Channel ID**（先記下）
- **Channel secret**（先記下，這是密碼等級）
- **Channel access token (long-lived)** → 點「**Issue**」產生一組 → **複製存好**

> Hint：這兩個值是你的模板連 LINE 的鑰匙。**不要 commit 進 GitHub、不要貼 chat、不要截圖**。後面會貼進 Zeabur 環境變數裡。

#### 1.4 關閉自動回應、開啟 Webhook

同一頁往下滾：

- **自動回應訊息**：**停用**（不然 Bot 會一直跳預設回覆，蓋掉你模板的訊息）
- **加入好友的歡迎訊息**：**停用**（之後由模板程式接手）
- **Webhook**：**啟用**（Webhook URL 等部署完 Zeabur 後再回來填）

---

## 2. LINE Login Channel 新增 LIFF App

### 為什麼要做這步

LIFF（LINE Front-end Framework）= 在 LINE App 內打開網頁，並且能拿到用戶的 LINE userId / 頭像 / 名字。

Bago 派模板用 LIFF 做：
- 報名表單（直接抓 LINE 身份，不用打字）
- 直播觀看頁（綁定身份 → 自動標記出席）
- 諮詢預約頁

沒有 LIFF，你的模板無法把 LP 訪客和 LINE 帳號對起來。

### 操作步驟

#### 2.1 進入 LINE Developers Console

1. 開 [LINE Developers Console](https://developers.line.biz/console/)
2. 用同一個 LINE 帳號登入
3. 你會看到 step 1 建好的 Provider，點進去

#### 2.2 找到 LINE Login Channel

啟用 Messaging API 時，LINE 會自動幫你建一個 Messaging API Channel。

但 LIFF **必須掛在 LINE Login Channel 上**，所以還要再建一個：

1. Provider 頁面 → 點「**Create a new channel**」
2. Channel type 選「**LINE Login**」
3. 填：
   - Channel name：`<品牌名> Login`
   - Channel description：隨便填
   - App types：**勾 Web app**（LIFF 是 web）
4. 同意條款 → 建立完成

#### 2.3 新增 LIFF App

1. 進入剛建立的 LINE Login Channel
2. 上方分頁切到「**LIFF**」
3. 點「**Add**」開始新增

填欄位：

| 欄位 | 填什麼 | 為什麼 |
|------|--------|--------|
| LIFF app name | 任意（例：`Bago 派漏斗`） | 之後改也可 |
| Size | **Full** | 全螢幕，諮詢/直播體驗最好 |
| Endpoint URL | 你部署到 Zeabur 的網址（例 `https://your-app.zeabur.app/liff`） | 這是 LIFF 打開時要載入的網頁 |
| Scope | **勾 `profile` + 勾 `openid`** | profile 拿頭像名字，openid 拿穩定 userId |
| Bot link feature | **On (Normal)** | 用戶第一次進入時會看到「加入官方帳號好友」選項，幫你抓名單 |
| Scan QR | 關閉（用不到） | |
| Module mode | 關閉（保持預設） | |

#### 2.4 拿到 LIFF ID

新增完成後，會看到 LIFF ID 格式像：

```
1234567890-abcdefgh
```

**複製存好**，後面要貼進 Zeabur 環境變數。

> Hint：Endpoint URL 部署前可以先填一個 placeholder（例：`https://example.com`），等 Zeabur 拿到正式網址再回來改。

---

## 3. Meta Pixel 追蹤事件設定

### 為什麼要做這步

Meta Pixel = 把用戶在你 LP / 直播頁上的關鍵動作（看了影片、報名、付款）回拋給 Meta。

有了 Pixel，Meta 演算法才能：
- 知道誰有興趣 → 找更多類似的人投廣告（Lookalike）
- 把預算花在「會買的人」而不是「只會看的人」
- 給你準確的 ROAS / CPA 數據

沒有 Pixel = 廣告投了像瞎子，演算法亂猜。

### 操作步驟

#### 3.1 建立 Pixel

1. 開 [Meta 企業管理平台](https://business.facebook.com/)
2. 左側選單 → **事件管理員**（Events Manager）
3. 點「**連結資料來源**」→ 選「**網站**」→ 取個名字
4. 選「**Meta Pixel**」→ 點「**建立 Pixel**」
5. 取 Pixel 名稱（例：`Bago 派漏斗 Pixel`）→ **建立**
6. 拿到 **Pixel ID**（一串純數字，例如 `1234567890123456`），**複製存好**

#### 3.2 5 個 Standard Event 觸發點建議

Bago 派模板會自動觸發以下 5 個 Meta 標準事件，你**不用寫 code**，但要理解每個事件代表什麼，廣告才會投對：

| 事件 | 觸發點 | 去重時間建議 |
|------|--------|-------------|
| **Lead** | 任何場次報名 / 7Q 完成 | 1 天 |
| **CompleteRegistration** | 旗艦場次報名 / 確認購買意願 | 1 天 |
| **Subscribe** | 進入歡迎序列 / 加 LINE @ 好友 | 30 天 |
| **ViewContent** | 觀看直播 / 影片進度 ≥ 50% | 1 天 |
| **Purchase** | 完成付款 / 自動流程最後一步 | 30 天 |

> Hint：**去重時間 = 同一個用戶在這段時間內重複觸發只算一次**。
> - **Lead / CompleteRegistration / ViewContent 用 1 天**：同一個人一天內報名兩次只算一個 lead，避免演算法以為某個人特別熱情。
> - **Subscribe / Purchase 用 30 天**：訂閱 / 購買是長尾事件，30 天內重複算同一筆比較合理。

#### 3.3 確認 Pixel 有在運作（部署完再做）

部署完之後：

1. 裝 Chrome 擴充套件 [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. 開你的 LP → 點擴充套件圖示
3. 應該看到 Pixel ID 對得上、並且有觸發 PageView

> Hint：**第一次部署完一定要驗 Pixel**。常見錯誤是 Pixel ID 環境變數打錯一個數字 → 整個漏斗數據都廢掉。

---

## 4. Zeabur 部署環境變數

### 為什麼要做這步

模板程式不會把 token 寫死在 code 裡（不然你 push GitHub 會直接外洩）。

所有敏感資訊（token、密碼、API key）都透過**環境變數**注入。Zeabur 的部署設定頁就是專門放這些的地方。

### 環境變數清單

部署 Bago 派模板時，到 Zeabur 服務的「**Variables**」分頁，把下面這些**全部**設好：

| 變數名 | 從哪裡拿 | 範例 |
|--------|---------|------|
| `LINE_CHANNEL_TOKEN` | Step 1.3 拿到的 Channel access token | `abc123...` |
| `LINE_CHANNEL_SECRET` | Step 1.3 拿到的 Channel secret | `xyz789...` |
| `LIFF_ID` | Step 2.4 拿到的 LIFF ID | `1234567890-abcdefgh` |
| `LINE_ADD_URL` | 你的 LINE @ 加好友連結 | `https://line.me/R/ti/p/@yourbot` |
| `META_PIXEL_ID` | Step 3.1 拿到的 Pixel ID | `1234567890123456` |
| `GEMINI_API_KEY` 或 `AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) 產一組 | `AIza...` |
| `MONGODB_URI` | Zeabur 內建 MongoDB service 部署後自動產生 | `mongodb://...` |
| `ADMIN_PASSWORD` | 自己想一組強密碼 | `(自訂)` |

> Hint：
> - `LINE_ADD_URL` 在 LINE Official Account Manager → 增加好友指南 → 複製連結。
> - `MONGODB_URI` 不用自己填，在 Zeabur 加一個 MongoDB service 之後，用 Zeabur 的「**Reference**」功能直接引用 → 變數會自動帶入。
> - `ADMIN_PASSWORD` 用 1Password / Bitwarden 產一組 16 字以上的強密碼，**不要重複用其他平台的密碼**。

### 設定畫面操作

1. Zeabur Dashboard → 你的服務 → 上方分頁「**Variables**」
2. 一條一條 `Add Variable` 加上去
3. 全部加完 → Zeabur 會自動 redeploy 一次（讓新變數生效）

> Hint：Zeabur Variable env 是**覆蓋模式**——如果你用「Variable env」那個批次貼上功能，必須**整包都貼完**，不然會清掉沒貼到的變數。建議第一次手動一條條加比較安全。

---

## 5. 部署到 Zeabur

### 5.1 Fork 模板 Repo

1. 開 Bago 派模板 repo（**GitHub link：TBD，等 Bago 提供**）
2. 右上角點「**Fork**」→ Fork 到你自己的 GitHub 帳號
3. （可選）改 repo 名字

> Hint：Fork 之後**不要直接改主 branch**。要改 LP / 文案 → 開新 branch → 改 → 合回來。這樣之後模板有更新，你能 pull 上游的更新。

### 5.2 連接 Zeabur 帳號

1. 開 [Zeabur Dashboard](https://dash.zeabur.com/)
2. 用 GitHub 帳號登入
3. 第一次登入會問要不要授權 Zeabur 讀取你的 repo → 同意
4. 建立新 Project（取個名字，例：`bago-funnel`）

### 5.3 部署服務

1. Project 內 → 點「**Add Service**」→ 選「**Git**」
2. 選你剛 Fork 的 repo
3. 選 branch（通常 `main`）
4. Zeabur 會自動偵測 Dockerfile / package.json → 開始 build
5. **Build 完之後不要急著測**，先去 Variables 把 step 4 的環境變數全加好
6. 加完之後手動 Redeploy 一次（或等它自動 redeploy）

### 5.4 加 MongoDB Service

1. 同 Project 內 → 再點一次「**Add Service**」→ 選「**Marketplace**」→ 找 `MongoDB`
2. 部署完成後，回到你的 web service → Variables → `MONGODB_URI` 用 Reference 引用 MongoDB service 的連線字串

### 5.5 拿到 Zeabur 提供的網址

1. 服務頁面 → 「**Networking**」分頁
2. 點「**Generate Domain**」→ 拿到一個 `xxx.zeabur.app` 的網址
3. 用這個網址回頭：
   - 填進 LIFF Endpoint URL（Step 2.3）
   - 填進 LINE Webhook URL（Step 1.4，URL 後面加 `/webhook`）
   - 填進 Meta Pixel 的網域驗證

### 5.6 綁定自訂 Domain（Optional）

如果你想用自己的網址（例：`funnel.yourbrand.com`）：

1. Networking → 「**Add Custom Domain**」
2. 輸入你的 domain
3. Zeabur 給你一筆 CNAME → 去你的 DNS 服務商（Cloudflare / GoDaddy）加上去
4. 等 5–30 分鐘 DNS 生效 → Zeabur 會自動發 SSL 憑證

> Hint：用自訂 domain 之後，**LIFF Endpoint URL / LINE Webhook URL / Meta Pixel 網域驗證**全部要更新成新網址，不然會壞掉。

---

## 完成檢查清單

部署完之後，逐項勾掉：

- [ ] LINE 官方帳號可以收到加好友通知
- [ ] LINE Webhook URL 已填寫並通過驗證（LINE Developers Console → Messaging API → Verify）
- [ ] LIFF Endpoint URL 已更新為正式網址
- [ ] 用手機開 LIFF 連結，能成功登入並看到自己的頭像/名字
- [ ] LP 開起來，Meta Pixel Helper 顯示 PageView 觸發
- [ ] 試走完一次報名流程 → Meta 事件管理員看到 Lead 事件
- [ ] Zeabur Logs 沒有紅字 error

全部勾完，就可以開始導流量進來了。

---

## 常見問題

### Q1: LIFF 開起來空白 / 一直 loading

- 檢查 `LIFF_ID` 環境變數有沒有打錯
- 檢查 LIFF Endpoint URL 是否為 https（LINE 不接受 http）
- 檢查 LIFF 的 Scope 有沒有勾 `profile` + `openid`

### Q2: Webhook 一直驗證失敗

- 檢查 `LINE_CHANNEL_SECRET` 是不是貼錯（少一個字元都不行）
- 檢查 Zeabur 服務有跑起來（Logs 沒 error）
- Webhook URL 結尾要正確（例：`https://xxx.zeabur.app/webhook` 不是 `/api/webhook`，看你的模板路由）

### Q3: Pixel 沒觸發任何事件

- Pixel ID 環境變數對嗎？（在瀏覽器 console 打 `fbq` 看載入了沒）
- Meta Pixel Helper 有沒有顯示紅字錯誤？
- 廣告封鎖外掛（uBlock / AdGuard）會擋 Pixel，測試時關掉

### Q4: 我改了環境變數但沒生效

- Zeabur 改完變數**會自動 redeploy**，但如果剛好卡在某個狀態 → 手動點 Redeploy
- 瀏覽器強制重新整理（Cmd+Shift+R）清快取

---

## 下一步

設定全部完成 → 接下來看 [`liff-setup.md`](./liff-setup.md) 學怎麼客製化 LIFF 內容，或看 [`lp-rewrite-spec.md`](./lp-rewrite-spec.md) 學怎麼改 LP 文案。

有卡關的步驟直接問 Bago 或 AI 助教。
