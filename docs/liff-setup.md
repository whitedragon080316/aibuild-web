# LIFF 設定（Lumi 7 題 coaching）

把 `https://liff.line.me/<LIFF_ID>` 放到 FB 廣告 → 用戶在 LINE app 內建瀏覽器打開 /lumi → LIFF SDK 自動拿 `lineUserId`（無縫登入），Q7 答完 bot 會推報告。

---

## 一、前置條件

- 已有 LINE 官方帳號（Provider 下的 Messaging API channel）
- Web 服務部署好，有公開 https URL（例：`https://aibuild.zeabur.app`）

## 二、建 LIFF app

1. 進 [LINE Developers Console](https://developers.line.biz/console)
2. 選你的 Provider → 點 **Messaging API channel**（注意：LIFF 必須建在 Messaging API channel 底下，不是 LINE Login channel，才能自動帶 userId）
3. 左側切到 **LIFF** tab → 點 **Add**
4. 填表：
   - **LIFF app name**：`Lumi 顧問`
   - **Size**：`Full`（全螢幕聊天 UI 體驗最好）
   - **Endpoint URL**：`https://<你的 web domain>/lumi`（例：`https://aibuild.zeabur.app/lumi`）
   - **Scope**：勾 `profile` 和 `openid`
   - **Bot link feature**：選 `On (Aggressive)`（LIFF 開啟時自動加你的官方帳號好友）
   - **Scan QR**：`Off`
   - **Module mode**：`Off`
5. 儲存 → 複製 **LIFF ID**（格式 `1234567890-AbCdEfGh`）

## 三、設定環境變數

把 LIFF_ID 填到 web 服務的環境變數（Zeabur Dashboard → web service → Variables）：

```
LIFF_ID=1234567890-AbCdEfGh
GEMINI_API_KEY=xxx                 # Google AI Studio 拿
BOT_INTERNAL_URL=https://<bot domain>
LUMI_SHARED_SECRET=<隨便生一串長字串>
LIVESTREAM_URL=https://...         # 報告 CTA 用
BETA_SIGNUP_URL=https://...
```

Bot 服務也要設 `LUMI_SHARED_SECRET`（必須跟 web 一樣的值）。

產 secret：
```bash
openssl rand -hex 32
```

## 四、測試

- 直接貼 `https://liff.line.me/<LIFF_ID>` 到 LINE 聊天室，點開 → 應該在 LINE 內建瀏覽器開 `/lumi`，自動帶 userId 進入對話
- Q1-Q6 正常問答，Q7 答完後：
  - 頁面顯示「報告已生成，也會傳到你的 LINE」
  - LINE 收到 bot 推「報告生成好了，點連結看 → `/lumi/report/<sessionId>`」

## 五、廣告投放

FB 廣告的 CTA 連結貼 `https://liff.line.me/<LIFF_ID>`（不是直接貼 /lumi URL）。這樣用戶點了會在 LINE app 打開，自動登入。

## 六、Dev 測試（沒 LIFF 也能測）

進 `https://<你的 domain>/lumi` 如果 LIFF init 失敗（例如不是從 LINE 開），會出現 fallback 表單讓你手貼 LINE User ID 測試，不會卡住開發。
