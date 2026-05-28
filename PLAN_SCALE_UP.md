# MathAI Platform → Subject Platform 扩展计划

## 現況分析

### 現有架構（強項）
```
LLM Router ──→ Ollama / MiniMax / DeepSeek / Qwen
     │
     ├── 數學科專用 system prompt（已建立）
     ├── SSE streaming ✅
     ├── 圖卡生成（imageGenerator.js）✅
     └── Phase 1-5 完成 ✅
```

### 擴展瓶頸
1. **system prompt 寫死** — 只有數學科教學風格
2. **前端首頁只有 Math** — subject card 沒有擴展接口
3. **DB schema 以數學為中心** — messages table 有 math-specific fields

---

## 擴展架構：Subject Router

```
用戶選擇學科
     │
     ▼
Subject Router（新增中介層）
     │
     ├── Math    → math_system_prompt + math_image_prompt
     ├── Chinese → chinese_system_prompt + image prompt
     ├── English → english_system_prompt + image prompt
     └── Science → science_system_prompt + image prompt
     │
     ▼
LLM Router（不改動）
     │
     ▼
相應 LLM API
```

---

## Phase 1：多學科擴展（3日）

### 1.1 Subject Router（Backend）
- 新增 `backend/services/subjectRouter.js`
- 4個學科：Math / Chinese / English / Science
- 每科獨立 system prompt、temperature、image prompt
- 向後兼容現有 `/api/llm/chat` 接口

### 1.2 首頁學科卡片（Frontend）
- 首頁增設 `學科選擇` 區域（横排4格 card）
- 每 card 圖標 + 名稱 + 描述
- CSS Grid responsive layout
- 點擊進入該學科登入頁

### 1.3 學科獨立頁面
- 每學科有獨立 folder：`/chinese/`, `/english/`, `/science/`
- 共享同一 ChatWidget，subject 參數不同
- 老師 Dashboard 增加學科切換 Tab

### 1.4 數據庫 migration
- messages table 增加 `subject` 欄位（default: 'math'）
- classes table 增加 `subject` 欄位

---

## Phase 2：AI 助教功能（7日）

### 2.1 圖卡擴展
- Math：數學圖形、應用題插圖、數線圖
- Chinese：漢字筆順圖、成語插圖、詞卡
- English：單字卡、情境圖、 Grammar diagram
- Science：實驗插圖、自然現象、圖表

### 2.2 各科學習流程
- **Math**：步驟解題、引導式思考、計算過程
- **Chinese**：認字、詞義、句子構成、閱讀理解
- **English**：對話練習、發音提示、圖字配對
- **Science**：觀察、預測、解釋、日常例子

### 2.3 語音輸入增强
- 英語發音評估（Speech API）
- 中文朗讀辨識

---

## Phase 3：進階功能（14日）

### 3.1 進度追踪升級
- 每科學習記錄分開
- 能力雷達圖（4科能力一目了然）
- 老師家課指派（指定科目題目）

### 3.2 自適應難度
- 答題正確率 → 自動調整題目難度
- 錯題自動收錄 → 薄弱點强化

### 3.3 多人對戰模式
- 同科搶答
- 排行榜

---

## 技術決策

| 決策 | 選擇 |
|-----|------|
| 架構 | 擴展現有 Subject Router，不另起爐灶 |
| 學科越多越好 | 4科先行，架構預留擴展 |
| 前端 | Vanilla JS，HTML pages |
| 後端 | Express + SQLite（已有），不加重量級framework |
| GitHub Pages | 每科獨立 folder |
| 本地運行 | `nodemon server.js` 單端口 |

---

## 優先行動（Autonomous Execution Order）

```
1. [FIX] 修復所有 trailing slash links ✅ (done)
2. [ADD] Subject Router（backend/services/subjectRouter.js）
3. [ADD] 4科學 system prompt 配置
4. [MOD] 首頁增加學科選擇 cards
5. [MOD] 數據庫 migration（messages + classes 加 subject）
6. [MOD] server.js 串接 Subject Router
7. [ADD] 各學科 HTML pages（chinese/index.html 等）
8. [TEST] 本地運行完整流程
9. [PUSH] GitHub Pages
```

---

Last updated: 2026-05-29