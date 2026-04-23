# RJPQ Collaboration Tool

這是一個提供多人即時協作的 Romeo and Juliet PQ 輔助工具。

專案採用前後端分離：

- 前端使用 `Next.js`
- 後端使用 `Node.js + WebSocket`
- 房間資料儲存在 `Redis`

使用者可以建立房間、加入房間、分享房號或邀請連結，並在同一個房間內同步操作關卡格子與玩家顏色。

## 專案結構

- `apps/web`：前端介面
- `apps/server`：即時同步後端

## 目前功能

- 建立房間
- 加入房間
- 可選擇是否設定房間密碼
- 透過房號或邀請連結進入房間
- 多人即時同步關卡格子狀態
- 玩家顏色選擇同步
- 房間棋盤重置
- 玩家離開房間後自動更新房間狀態

## 技術概要

### 前端

- `Next.js 15`
- `React 19`
- 使用自訂 hook 管理房間狀態與 WebSocket 互動

### 後端

- `Express`
- `ws`
- `Redis`
- 使用 WebSocket 廣播房間最新狀態給所有在線玩家

## 安裝相依套件

請先在專案根目錄安裝套件：

```bash
npm install
```

## 本機開發

### 1. 啟動後端

在專案根目錄執行：

```bash
npm run dev:server
```

這個指令會啟動 `apps/server` 的開發模式。

### 2. 啟動前端

另開一個終端機，在專案根目錄執行：

```bash
npm run dev:web
```

### 3. 開啟前端頁面

前端預設會在：

```text
http://localhost:3000
```

後端 WebSocket 預設使用：

```text
ws://localhost:8080
```

## 環境變數

### 前端

建立 `apps/web/.env.local`：

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

如果沒有設定 `NEXT_PUBLIC_WS_URL`，前端會使用目前頁面的 hostname，並預設連到 `8080` port。

### 後端

如需自訂後端設定，可建立 `apps/server/.env`：

```bash
PORT=8080
CLIENT_ORIGIN=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

其中：

- `PORT`：後端服務埠號
- `CLIENT_ORIGIN`：允許連線的前端來源
- `REDIS_URL`：Redis 連線位址

注意：目前後端啟動需要 `REDIS_URL`。

## 正式環境建置與啟動

在專案根目錄執行：

```bash
npm run build
```

接著分別啟動前後端：

```bash
npm run start:server
npm run start:web
```

## 正式環境建議設定

### 前端

```bash
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com
```

### 後端

```bash
PORT=8080
CLIENT_ORIGIN=https://your-frontend-domain.com
REDIS_URL=redis://default:<password>@<your-redis-host>:6379
```

## 房間與同步機制

這個專案的即時同步流程大致如下：

1. 前端建立 WebSocket 連線到後端
2. 使用者送出建立房間、加入房間、更新顏色、更新格子或重置棋盤等操作
3. 後端驗證資料後更新 Redis 中的房間狀態
4. 後端把最新房間狀態廣播給同房間所有玩家
5. 前端收到最新 `room_state` 後更新畫面

## 房間規則

- 單一房間最多 `4` 位玩家
- 房間支援密碼保護
- 房間若長時間只剩 `0` 或 `1` 位玩家，會自動清理
- 目前閒置房間清理時間為 `15` 分鐘

## 開發注意事項

- 不要把 `npm run dev:web` 或 `npm run dev:server` 直接暴露到公開網路
- 如果前端使用 `HTTPS`，WebSocket 通常也應改用 `wss://`
- 後端使用 Redis 作為房間狀態儲存，因此本機開發前請先確認 Redis 可用

## 後續可延伸方向

- 房主管理功能
- 更完整的操作權限控制
- Rate limiting
- 驗證與登入機制
- 監控與錯誤追蹤
- 更完整的產品規則與關卡配置
