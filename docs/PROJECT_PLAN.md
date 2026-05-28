# Math AI Platform — 項目計劃書

> **目標讀者**：老師、開發者
> **最後更新**：2026-05-28
> **Repo**：[ihateusingai-beep/math-ai-platform](https://github.com/ihateusingai-beep/math-ai-platform)
> **部署**：GitHub Pages (前端) + 自托管 Node.js (後端)

---

## 一、架構總覽

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (GitHub Pages)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │
│  │Dashboard│  │  Chat   │  │Class    │  │ Student     │   │
│  │教師監控 │  │聊天頁面 │  │Select   │  │Detail       │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘   │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │ ChatWidget  │ ← 獨立聊天元件           │
│                    │ (可嵌入任何頁面)                        │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP SSE
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    後端 (Express.js)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               LLM Router (智能路由)                    │   │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐   │   │
│  │  │ Ollama  │→│ MiniMax  │→│ DeepSeek│→│  Qwen  │   │   │
│  │  │ (本地)  │ │ (雲端)   │ │ (備用)  │ │(最後) │   │   │
│  │  └─────────┘ └──────────┘ └─────────┘ └────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  SQLite DB  │  │  Image Generator │  │   Session    │   │
│  │(better-    │  │  (MiniMax)        │  │  Tracking    │   │
│  │ sqlite3)   │  │                   │  │              │   │
│  └─────────────┘  └──────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 技術棧

| 層面 | 技術 | 備註 |
|------|------|------|
| 前端框架 | Vanilla JS (無框架) | 輕量、易部署 |
| UI 元件 | ChatWidget.js (獨立) | 可嵌入任何頁面 |
| 後端 | Express.js (Node.js) | 820行 server.js |
| 數據庫 | SQLite (better-sqlite3) | 本地單文件 |
| LLM 路由 | 自定義 Router | Ollama → MiniMax → DeepSeek → Qwen |
| 圖像生成 | MiniMax text2image | Phase 4 |
| 實時通訊 | SSE (Server-Sent Events) | streaming 回覆 |
| 部署 | GitHub Pages (前端) | 需 base tag 修正 |

### 數據庫 Schema

```
classes        — 班級 (id, name, description, invite_code)
students       — 學生 (id, name, class_id, ability, has_account, password_hash)
messages       — 訊息 (student_id, class_id, user_message, bot_response, is_help_request, is_intervention)
sessions       — 會話 (id, student_id, class_id, started_at, last_active, message_count)
```

### 學生身份模式（Hybrid）

```
高能力學生 (S1B-S6B)
  → 帳戶登入 (has_account=1, 密碼hash)
  → 訓練登入技能 + 長期學習追踪

中/輕度學生 (P1-P6)
  → 班級連結 + 邀請碼
  → 老師預設名單，學生點選名字
  → 無密碼
```

---

## 二、已完成功能清單

### ✅ Phase 1 — 基礎建設（已交付）

- [x] ChatWidget.js 獨立元件（可嵌入任何頁面）
- [x] 預設 Q&A 本地回覆庫（不經 LLM）
- [x] 語音輸入（Web Speech API，Hold-to-record）
- [x] 打字機效果 + 情緒反饋（✅正確/❌錯誤/⏳等待）
- [x] 學生名單頁面（class-select）
- [x] 教師 Dashboard（含 Mock 數據）
- [x] 學生詳情頁面（student-detail）
- [x] SQLite 數據庫初始化（4張表）
- [x] 班級 CRUD API

### ✅ Phase 2 — LLM 接入（已交付）

- [x] LLM Router Service（llmRouter.js）
- [x] 意圖分類（5類：A簡單計算/B概念/C應用/D創意/E求助）
- [x] Ollama 本地處理（意圖分類 + 簡單題）
- [x] MiniMax 雲端處理（複雜題）
- [x] ChatWidget 串接後端 API
- [x] Dashboard API 整合 + Polling（5秒刷新）

### ✅ Phase 3 — 實時串流 + 教師介入（已交付）

- [x] SSE Streaming 回覆（打字機效果）
- [x] Ollama streaming 支援
- [x] DeepSeek 備用（第一備用）
- [x] Qwen 備用（最後備用）
- [x] 老師直接回覆學生 API（`POST /api/intervention`）
- [x] 求助訊號系統（`POST /api/help`）
- [x] 待處理求助列表（`GET /api/help-requests`）

### ✅ Phase 4 — 圖像生成（已交付）

- [x] MiniMax text2image 服務（imageGenerator.js）
- [x] 9種預設數學圖卡模板（三角形、正方形、圓形、加減乘除、時鐘、金錢）
- [x] 自動根據回覆內容判斷是否附加圖卡
- [x] 圖卡緩存（in-memory Map）

### ✅ Phase 5 — 學生身份混合模式（已交付）

- [x] 帳戶登入（高能力學生）
- [x] 班級連結 + 邀請碼（中/輕度學生）
- [x] 老師批量新增學生 API（`POST /api/students/batch`）
- [x] Session tracking + heartbeat
- [x] 班級使用統計（`GET /api/classes/:id/stats`）
- [x] GitHub Pages base tag 修正（commit 4c995c9）

---

## 三、潛在問題 / Bugs

### 🔴 代碼層面（高優先）

| 問題 | 說明 | 風險 |
|------|------|------|
| **OLLAMA_BASE 重複宣告** | `server.js:252` 和 `llmRouter.js:6` 各宣告一次，llmRouter 的被 server.js 的覆蓋 | LLM Router 實例可能使用錯誤配置 |
| **SQL 注入漏洞** | `server.js` 多處直接用 `req.params.id` / `req.body` 拼接 SQL，未用 prepared statement 的參數化 | 用戶輸入可控時可執行任意 SQL |
| **Eval 使用** | `llmRouter.js:417` 用 `Function('"use strict"; return (...)')` 計算表達式 | 若輸入未清理可執行任意代碼 |
| **密碼 Hash 简单** | 只用 SHA-256，無鹽 | 密碼可被彩虹表破解 |
| **Session 無過期** | sessions 表無 TTL，閒置 sessions 永不过期 | 數據庫持續膨脹 |
| **No rate limiting** | API 無限流，Ollama/MiniMax 可被濫用 | 外部可用成本+資源耗盡 |

### 🟡 部署層面（中優先）

| 問題 | 說明 | 風險 |
|------|------|------|
| **SQLite 不適合生產** | SQLite 寫入阻塞，單寫多讀，無水平擴展 | 高並發時效能瓶頸 |
| **LLM API Key 明文** | API keys 在 code 中或 .env，未加密 | 泄漏後可被濫用 |
| **無備份機制** | SQLite 單文件，無自動備份 | 數據丢失風險 |
| **GitHub Pages SPA fallback** | 所有路徑 fallback 到 index.html，API routes 在後端 | 前端直接訪問 `/api/*` 會 404 |
| **In-memory 圖卡緩存** | 重啟後 cache 丢失，MiniMax API 負擔增加 | 每次重啟後首次請求都打 API |

### 🟠 UX 層面（低優先）

| 問題 | 說明 | 風險 |
|------|------|------|
| **Streaming 無取消** | 用戶不能中途取消正在生成的回覆 | 等待時間長時無解 |
| **錯誤訊息不友善** | LLM 失敗時只顯示「服務暫時不可用」 | 用戶不知道發生了什麼 |
| **語音輸入失敗無提示** | 語音辨識失敗只 console.error，無 UI 反饋 | SEN 學生可能以為按鈕壞了 |
| **長訊息無截斷** | 回覆過長時無滾動/截斷 | 手機上可能影響布局 |
| **登入失敗無重試引導** | 密碼錯誤只返回 401，無明確提示 | 用戶可能反覆嘗試 |

---

## 四、後續優化建議（優先次序）

### P0 — 安全性（立即修復）

1. **輸入參數化**
   - 所有 SQL 查詢改用 `?` placeholder
   - 範例：`db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)`

2. **Rate Limiting**
   - 安裝 `express-rate-limit`
   - 限制 `/api/llm/*` 每分鐘 30 請求

3. **密碼加鹽**
   - 改用 `bcrypt` 或 `argon2`
   - 現有密碼需重置

### P1 — 生產環境

4. **數據庫遷移**
   - SQLite → PostgreSQL（Railway/Render 可用免費 tier）
   - 考慮 Prisma 作 ORM

5. **LLM API Key 管理**
   - 移至環境變量，勿寫入 code
   - 考慮 Vault 或 AWS Secrets Manager

6. **Session TTL**
   - 添加 `last_active` 過期機制（>24h 自動清理）
   - 或遷移到 Redis 做 session store

### P2 — 穩定性

7. **Streaming 取消**
   - `AbortController` 支援中途取消
   - UI 添加「停止」按鈕

8. **Error Boundary**
   - ChatWidget 添加錯誤邊界
   - 每個 API call 加 try-catch + 友善錯誤訊息

9. **Image Cache 持久化**
   - 圖卡 URL 寫入 SQLite 而非 Map
   - 避免重啟後 cache miss

### P3 — UX 提升

10. **語音反饋增強**
    - 辨識失敗時顯示「請再試一次」
    - 添加成功/失敗音效

11. **長訊息處理**
    - 超過 500 字元截斷 + 「查看更多」
    - 消息區域自適應高度

12. **離線支援**
    - Service Worker 快取頁面
    - LLM 不可用時明確提示「現在係離線模式」

### P4 — 長期改進

13. **LLM Observability**
    - 每次 LLM 呼叫寫入日誌（延遲、token、成功率）
    - 加入 Prometheus metrics

14. **多語言支援**
    - 英文題目介面
    - 現有广东话 prompt 可抽出為 i18n 檔

15. **教師培訓材料**
    - 操作手冊（PDF）
    - 學生常見問題解答

---

## 五、當前環境變量配置

```
OLLAMA_BASE=http://localhost:11434
MINIMAX_API_KEY=<your_key>
DEEPSEEK_API_KEY=<your_key>
QWEN_API_KEY=<your_key>
PORT=3000
```

---

## 六、已知限制

- **MiniMax API**: 需要付費額度，image-01 模型費用較高
- **Ollama**: 需本地運行 `ollama serve`，無網絡時不可用
- **GitHub Pages**: 僅支援靜態文件，後端必須部署在其他平台
- **Sen學生適配**: 語音輸入依賴瀏覽器支援，不支援 IE/舊版 Safari

---

*本計劃書基於 commit `4c995c9`（2026-05-28）*