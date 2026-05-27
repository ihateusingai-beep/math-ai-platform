# Math AI Assistant Platform — Spec

> Phase 1 完成（v1.0）| Phase 2 進行中（v2.0）

## 定位
老師監控下的智能數學助教系統，Phase 1 專注「地基」——ChatWidget 拆解。

---

## 一、架構總覽

```
學生/client
    │
    ▼
┌─────────────────────────────────────┐
│        LLM Router (意圖分類)          │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Ollama  │  │ MiniMax/DeepSeek │  │
│  │ (本地)  │  │ (雲端)            │  │
│  └─────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│        ChatWidget (核心組件)          │
│  - 訊息輸入（文字 + 語音）             │
│  - 訊息輸出（文字 + 圖示/字卡）         │
│  - SEN友好 互動反饋                    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│        Teacher Dashboard            │
│  - 即時監控 | 名單管理 | 進度追踪      │
└─────────────────────────────────────┘
```

---

## 二、Phase 1.1 — ChatWidget 拆解

### 定位
可嵌入任何頁面的獨立聊天元件，後期再接入 LLM Router。

### 功能 Spec

**輸入模式**
- 文字輸入（主）
- 語音輸入（按鈕 Hold-to-record，張鈞保適用）

**輸出模式**
- 純文字回覆
- 圖示/字卡（圖文並茂，SEN 友好）

**互動反饋**
- 答啱 → ✅ 音效 + 綠色閃爍
- 答錯 → 🔄 提示音效 + 溫和提示（「再試多次？」）
- 等待 → ⏳ loading 動畫（避免死機感）

**訊息格式**
```
User: [學生訊息]
Bot:  [回覆文字]
      [可選：圖卡/提示]
```

### 技術要求
- Web Component / React Component（框架 agnostic）
- ≥48px 點擊目標
- 響應式（平板/電腦）
- 離線fallback：本地預設問答庫（Phase 1 先做這個，不走LLM）

### 交付
- `ChatWidget.js` 獨立元件
- 預設Q&A庫（20條起步，數學基礎題）
- Phase 1 Demo 頁面

---

## 三、Phase 1.2 — Teacher Dashboard（後端支撐）

### 教師視角功能

**班級管理**
- 老師新建班級（如 P1A、S1B）
- 為班級上傳學生名單（CSV 或手動輸入）
- 學生分組（能力分組：高能力/中度/輕度）

**即時監控（概念驗證）**
- Dashboard 看到有學生打開了 ChatWidget
- 看到學生正在問什麼問題
- 看到學生的最近回答記錄

**學生檔案**
- 姓名、班級、能力組別
- 學習記錄（問題數、正確率）
- 張鈞保語音偏好標記 ✅

### 技術要求
- 前端：Dashboard 頁面（假資料/mock data 先行）
- 後端：基本 API — 班級 CRUD、學生記錄寫入
- 不需要即時 WebSocket（Phase 1 用 polling 5秒刷新）

### 交付
- `/dashboard` 頁面
- 班級名單管理介面
- Mock 學生數據（5個mock學生）

---

## 四、Phase 1.3 — 無登入學生 Flow

### 學生進入流程

```
1. 老師分享連結 → 例：https://school.app/class/P1A
2. 學生打開連結 → 顯示班級歡迎頁
3. 學生從名單點選自己名字（老師預設名單）
4. 進入 ChatWidget 頁面
5. 開始使用
```

### 頁面層級

**Level 0 — Splash/選擇頁**
- 顯示班級名稱（例：P1A 數學班）
- 顯示學生名單（按順序排列，唔需要打字）
- 大按鈕（≥80px），高對比度
- 張鈞保語音提示：「請選擇你的名字」

**Level 1 — ChatWidget 頁**
- 頂部：學生名字 + 班級標籤
- 主體：ChatWidget
- 底部：求助按鈕（叫老師）
- 可選：返回選擇頁

### 技術要求
- URL routing：`/class/{classId}` → 名單頁
- Session storage：記住學生身份（單次session）
- 唔需要帳戶密碼

---

## 五、Phase 1 技術決策

| 決策 | 選擇 |
|------|------|
| 前端框架 | Vanilla JS（ChatWidget）+ 簡單HTML（Dashboard）|
| 後端 | Node.js + Express（輕量） |
| 數據庫 | SQLite（本地，後期可遷移） |
| LLM | Phase 1 唔接，純本地 Q&A fallback |
| 實時 | Polling（5s），唔做 WebSocket |
| 部署 | GitHub Pages (前端) + Railway/Render (後端) |

---

## 六、Phase 1 成功標準

✅ ChatWidget 可嵌入任何頁面  
✅ 學生打開 `/class/P1A` 可見名單、點選名字進入  
✅ 教師 Dashboard 可見 5 個 mock 學生資料  
✅ 學生問基礎問題（20條預設題）有回覆  
✅ 張鈞保語音輸入按鈕有效  

---

## 七、依賴關係

```
Phase 1.1 ChatWidget ──┐
                       ├──→ Phase 1.3 可接入 ChatWidget
Phase 1.2 Dashboard ───┘
```

---

## 八、決策記錄

### Q1：學生身份追踪 → Hybrid Mode
- 高能力輕度（S1B-S6B）：帳戶制 → 訓練登入技能 + 安全追踪
- 中度/輕度Stage 1（P1-P6）：班級專用連結 + 老師預設名單，學生點選

### Q2：LLM → 混合 + 多元API
- Ollama（本地）+ MiniMax（雲端主力）+ DeepSeek/Qwen as backup
- 意圖分類 → 簡單數學步驟題 → Ollama；複雜應用題/創意題 → MiniMax

### Q3：Phase 1 優先序 → 1→2→3
- 1 → ChatWidget 拆解（地基）
- 2 → 教師 Dashboard（老師急切）
- 3 → 無登入學生 Flow（學生受益）

---

## 九、學生身份追踪實作細節

### Hybrid Mode 具體流程

**P1A-S6B 班級連結**
- 每個班級有獨立 URL：`/class/P1A`，`/class/S1B`
- 老師預設班級學生名單（CSV 上傳或手動輸入）
- 學生打開連結 → 見到班級名單 → 點選自己名字 → 進入 ChatWidget

**高能力學生（S1B-S6B 可選帳戶）**
- 可選：老師開通帳戶，讓學生登入
- 訓練登入平台技能
- 老師可追踪長期學習記錄

### 能力分組標記
- 🟢 高能力（可選帳戶）
- 🟡 中度
- 🔵 輕度 Stage 1

---

Last updated: 2026-05-27

---

## Phase 2 — LLM Router 接入（v2.0）

### 狀態：進行中 ✅

### LLM Router Service (`backend/services/llmRouter.js`)

**路由邏輯**
- 意圖分類（Ollama）→ 判斷問題類型
- 簡單計算（A型）→ Ollama 本地處理
- 概念問題（B型）→ Ollama 本地處理
- 複雜應用/創意題（C/D型）→ MiniMax 雲端處理
- 求助（E型）→ 本地鼓勵回覆

**環境變量**
```
OLLAMA_BASE=http://localhost:11434
MINIMAX_API_KEY=你的key
```

**API Endpoint**
- `POST /api/llm/chat` — 接收 message，返回 { text, source }

### ChatWidget 升級
- 從 Phase 1 的純本地 Q&A → 接入後端 LLM Router
- API 不可用時自動 fallback 到本地 Q&A
- student_id / class_id 傳入後端記錄

### 待完成
- [x] LLM Router Service ✅
- [x] ChatWidget API integration ✅
- [x] Dashboard API integration + polling ✅
- [x] Student detail page ✅
- [x] Ollama SSE streaming (typing effect) ✅
- [x] DeepSeek + Qwen backup ✅
- [x] Teacher Intervention API ✅
- [x] MiniMax 圖像生成 (imageGenerator.js) ✅
- [ ] 圖卡顯示優化（ChatWidget 顯示圖像）