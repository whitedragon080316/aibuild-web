# AI 造局術課程平台

## 快速開始

```bash
# 1. 部署到 Zeabur
npx zeabur@latest deploy

# 2. 設定環境變數（參考 .env.example）

# 3. 綁定網域
# 在 Zeabur Dashboard 綁定自訂域名

# 4. 編輯課程內容
# 修改 course.json 的標題、價格、影片連結
```

## 專案結構

```
server.js          — 主伺服器（所有路由）
course.json        — 課程內容定義（階段、單元、影片）
views/
  lp.html          — 銷售頁（首頁）
  live.html        — 免費直播 LP（廣告導流）
  checkout.html    — 結帳頁（TapPay 3D Secure）
  success.html     — 付款成功頁
  course.html      — 課程觀看頁
models/
  User.js          — 用戶資料
  Payment.js       — 付款紀錄
  Registration.js  — 直播報名
  Remarketing.js   — 追單紀錄
lib/
  line-bot.js      — LINE Bot 邏輯
  flex-cards.js    — LINE 卡片模板
```

## 常用操作

### 換影片
跟 Claude Code 說：「把第 1-1 影片換成 https://www.youtube.com/embed/xxx」

### 改價格
修改 course.json 的 `price` 和 `priceV2`

### 改品牌
修改環境變數 `SITE_NAME` 和 `BRAND_NAME`

### 加直播場次
在 Zeabur 環境變數新增：`SESSION_1=0415_4/15 下午2點_https://youtube.com/live/xxx`

### 看數據
打開 `https://你的網域/dashboard`，輸入密碼

## 金流

使用 TapPay（支援 3D Secure）。串接方式請用 `/tappay` skill。

測試卡號：`4242 4242 4242 4242`，到期日任意，CVV `123`

## 注意事項

- 部署前確認 service ID 正確
- LINE 推播不可撤回，先 preview
- TapPay production 需要在 Portal 綁定 IP
- `PUBLIC_BASE_URL` 必須是 https，3D Secure 需要

## ⚠️ Git 結構提醒

`web/` 是**獨立 git repo**（不在 my-aibuild 主 repo 裡，root `.gitignore` 有 `web/`）。
改 code 後的 commit / push 要在 `web/` 目錄裡單獨做：

```
cd ~/my-aibuild/web
git add -A
git commit -m "feat: ..."
git push
```

不要期待 my-aibuild root git 會帶上 web/ 變更 — 它只 track `bot/` + root files。
