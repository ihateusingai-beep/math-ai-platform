# MathAI Platform — Project Workflow & Architecture

> **Phase 6 完成**（2026-05-29）| 4科擴展架構完成

---

## 一、邏輯流程圖（學生視角）

```
學生進入
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  index.html                                         │
│  主頁 — 4科卡片選擇                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │  🔢    │ │  📚    │ │  🔤    │ │  🔬    │       │
│  │ 數學   │ │ 中文   │ │ 英文   │ │ 常識   │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
└─────────────────────────────────────────────────────┘
    │
    │ (以中文為例：/chinese/index.html)
    ▼
┌─────────────────────────────────────────────────────┐
│  /chinese/index.html                                │
│  中文學習頁 — 班級選擇                              │
│  ┌────────┐ ┌────────┐ ┌────────┐                │
│  │  P1A   │ │  P2A   │ │  S1B   │                │
│  └────────┘ └────────┘ └────────┘                │
└─────────────────────────────────────────────────────┘
    │
    │ /chinese/class-select.html?class=P1A&subject=chinese
    ▼
┌─────────────────────────────────────────────────────┐
│  /chinese/class-select.html                         │
│  學生名單選擇（老師預設）                            │
│  [張鈞保] [陳大文] [李小红] [王小明] [陳志明]       │
│  ✅ 唔需要帳戶登入                                   │
└─────────────────────────────────────────────────────┘
    │
    │ /chinese/chat.html?student=p1a-01&class=P1A&subject=chinese
    ▼
┌─────────────────────────────────────────────────────┐
│  /chinese/chat.html                                 │
│  ChatWidget — 核心聊天介面                          │
│  ┌─────────────────────────────────────────┐       │
│  │ 🔢 中文小助手  張鈞保              [返回]│       │
│  ├─────────────────────────────────────────┤       │
│  │                                          │       │
│  │  👋 你好！我係中文小助手...             │       │
│  │                                          │       │
│  │  [User bubble]  [Bot bubble]            │       │
│  │                                          │       │
│  ├─────────────────────────────────────────┤       │
│  │ [🎤] [輸入中文問題...              ] [發送]│       │
│  └─────────────────────────────────────────┘       │
│                                                    │
│  [❓ 求助按鈕]  →  通知老師                         │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  LLM 路由（Phase 2 完成）                           │
│                                                     │
│  學生問題 ──→ 意圖分類                             │
│       │                                           │
│       ├─ Type A/B（簡單計算/概念）──→ Ollama 本地   │
│       │                           （streaming SSE）│
│       ├─ Type C/D（複雜應用/創意）──→ MiniMax 雲端 │
│       │                                           │
│       └─ Type E（求助/放棄）──────→ 本地鼓勵回覆    │
│                                                    │
│  API: POST /api/llm/stream                         │
└─────────────────────────────────────────────────────┘
```

---

## 二、系統架構圖

```
┌────────────────────────────────────────────────────────────────────┐
│                         GitHub Pages                               │
│                     (靜態前端，gh-pages branch)                    │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ index.html   │  │ /chinese/*   │  │ /english/* , /science/*│ │
│  │ (學科卡片)    │  │ /pages/*     │  │ /frontend/* , /docs/*  │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    /js/ChatWidget.js                        │ │
│  │  ✅ Subject-aware（Math/Chinese/English/Science）          │ │
│  │  ✅ 語音輸入（Web Speech API）                              │ │
│  │  ✅ Q&A fallback（Phase 1，無需後端）                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
         │                                ▲
         │ （需要後端功能時）              │ SSE / API
         │                                │
         ▼                                │
┌──────────────────────────────────────┐  │
│       Node.js Backend (localhost:3000) │  │
│         Railway/Render 部署            │  │
│                                        │  │
│  ┌──────────────────────────────────┐ │  │
│  │ Express API Server (server.js)   │ │  │
│  │                                    │ │  │
│  │  GET  /api/classes               │ │  │
│  │  GET  /api/classes/:id          │ │  │
│  │  GET  /api/classes/:id/students │ │  │
│  │  POST /api/students              │ │  │
│  │  GET  /api/students/:id         │ │  │
│  │  POST /api/messages             │ │  │
│  │  GET  /api/dashboard/stats      │ │  │
│  │  GET  /api/dashboard/recent     │ │  │
│  │  POST /api/llm/stream (SSE)     │ │  │
│  │  POST /api/intervention         │ │  │
│  └──────────────────────────────────┘ │  │
│                                        │  │
│  ┌──────────────────────────────────┐ │  │
│  │  SQLite 數據庫 (db/mathai.db)    │ │  │
│  │  tables: classes, students,      │ │  │
│  │           messages, sessions    │ │  │
│  └──────────────────────────────────┘ │  │
│                                        │  │
│  ┌──────────────────────────────────┐ │  │
│  │  LLM Router (services/llmRouter) │ │  │
│  │                                    │ │  │
│  │  Ollama（本地）→ 簡單計算/概念     │ │  │
│  │  MiniMax（雲端）→ 複雜題           │ │  │
│  │  DeepSeek / Qwen → backup        │ │  │
│  └──────────────────────────────────┘ │  │
│                                        │  │
│  ┌──────────────────────────────────┐ │  │
│  │  Image Generator (MiniMax)       │ │  │
│  │  圖卡自動生成 + 顯示              │ │  │
│  └──────────────────────────────────┘ │  │
└──────────────────────────────────────┘  │
                                           │
                ┌──────────────────────────┘
                ▼
┌──────────────────────────────────────┐
│      LLM Providers                   │
│                                      │
│  ┌─────────┐  ┌─────────────────┐   │
│  │ Ollama  │  │ MiniMax         │   │
│  │ (本地)  │  │ DeepSeek        │   │
│  │ port    │  │ Qwen            │   │
│  │ 11434   │  │ (雲端 API)      │   │
│  └─────────┘  └─────────────────┘   │
└──────────────────────────────────────┘
```

---

## 三、頁面結構 & URL 路由

### 當前存在的頁面（需整理）

```
math-ai-platform/
├── index.html                          # 主頁（學科卡片）✅
│                                      # URL: /math-ai-platform/
├── chinese/
│   ├── index.html                      # 中文學習頁 ✅
│   ├── class-select.html               # 中文班級選擇 ✅
│   └── chat.html                       # 中文 ChatWidget ✅
├── english/
│   └── index.html                      # 英文學習頁（空）
├── science/
│   └── index.html                      # 常識學習頁（空）
├── pages/                              # 數學科頁面（原有）
│   ├── class-select.html
│   ├── chat.html
│   └── dashboard.html
├── frontend/                           # 前端備份（重複）
│   └── pages/
├── docs/                               # 文件（重複）
│   └── pages/
├── js/
│   └── ChatWidget.js                   # 核心組件 ✅
├── css/
│   └── style.css
└── backend/
    ├── server.js                       # Express API ✅
    ├── services/
    │   ├── llmRouter.js                # LLM 路由 ✅
    │   ├── imageGenerator.js           # 圖卡生成 ✅
    │   └── subjectRouter.js            # 學科配置 ✅
    └── db/
        └── mathai.db                   # SQLite
```

### URL 映射（GitHub Pages）

| 頁面 | GitHub Pages URL |
|------|-----------------|
| 主頁 | `/math-ai-platform/` |
| 數學科 | `/math-ai-platform/pages/class-select.html` |
| 中文科 | `/math-ai-platform/chinese/index.html` |
| 英文科 | `/math-ai-platform/english/index.html` |
| 常識科 | `/math-ai-platform/science/index.html` |
| 老師Dashboard | `/math-ai-platform/pages/dashboard.html` |

---

## 四、GitHub Pages 部署流程

```bash
# 1. 確保 gh-pages branch 最新
git checkout gh-pages
git merge main
git push origin gh-pages

# 2. GitHub repo → Settings → Pages → Source: gh-pages branch

# 3. 訪問
# https://ihateusingai-beep.github.io/math-ai-platform/
```

---

## 五、Phase 完成狀態

| Phase | 內容 | 狀態 |
|-------|------|------|
| Phase 1 | ChatWidget 拆解 + Q&A fallback | ✅ 完成 |
| Phase 2 | LLM Router（Ollama + MiniMax）| ✅ 完成 |
| Phase 3 | SSE Streaming + Teacher Intervention | ✅ 完成 |
| Phase 4 | 圖卡自動生成（MiniMax）| ✅ 完成 |
| Phase 5 | Student Identity（Hybrid Mode）| ✅ 完成 |
| Phase 6 | 4科擴展（Math/Chinese/English/Science）| ✅ 完成 |

---

## 六、下一步行動方案（Priority Order）

### 🔴 高優先（直接影響學生使用）

**1. [CRITICAL] 整理重複頁面結構**
```
問題：pages/, frontend/, docs/, 根目錄 有大量重複頁面
行動：統一使用 /chinese/、/english/、/science/ + /pages/ 結構
      刪除 frontend/ 和 docs/ 的重複頁面
```

**2. [CRITICAL] 英文/常識科充實內容**
```
english/index.html、science/index.html 目前係空壳
行動：
  - 參考 chinese/index.html 建立英文版
  - 英文 Q&A 關鍵詞（cat, dog, hello, apple...）
  - 建立 english/class-select.html
  - 建立 english/chat.html（引用 ChatWidget，subject=english）
  - 常識科同理
```

**3. [HIGH] 後端部署到 Railway/Render**
```
問題：目前後端只在 localhost:3000，GitHub Pages 無法訪問
行動：
  - Railway 部署 backend/（需要 Dockerfile 或直接發布）
  - 環境變量：OLLAMA_BASE, MINIMAX_API_KEY, DEEPSEEK_API_KEY
  - 更新 ChatWidget.js API endpoint
```

### 🟡 中優先（改善體驗）

**4. [MEDIUM] 為每科擴充 Q&A 庫**
```
中文：日字、月字、火字、水字、山川江河...
英文：26字母、常見單字（顏色、水果、動作）
數學：已覆蓋基礎加減乘除形狀時間金錢
常識：日月星辰、植物動物、天氣四季
```

**5. [MEDIUM] ChatWidget 視覺優化**
```
當前：數學藍色主題（#4a90d9）
中文：紅色（#c0392b）✅ 已修復
英文：綠色（#27ae60）✅
常識：紫色（#9b59b6）✅
待做：voice button 保持紅色（緊急求助含義）
```

**6. [MEDIUM] 老師 Dashboard 完善**
```
- 顯示即時求助訊息
- 老師一鍵回覆學生
- 學生學習進度統計
```

### 🟢 低優先（長期優化）

**7. [LOW] 張鈞保語音優化**
```
問題：語音輸入按住制係咪最佳方案？
建議：加入「雙擊取消」功能，防止誤觸
```

**8. [LOW] 祝卓鋒 — 門興趣配合**
```
建議：建立「門形傳送關卡」遊戲化內容
```

---

## 七、短期行動清單（即刻做）

```markdown
## 即刻做（30分鐘內）
1. ✅ 修覆 ChatWidget 顏色跟 subject（已完成）
2. 🔲 建立 english/class-select.html + chat.html
3. 🔲 建立 science/class-select.html + chat.html
4. 🔲 清理重複頁面（frontend/, docs/）

## 本週內
5. 🔲 後端 Railway 部署
6. 🔲 英文 Q&A 庫充實
7. 🔲 常識 Q&A 庫充實
8. 🔲 老師 Dashboard 即時求助功能
```

---

## 八、技術债务

| 問題 | 嚴重性 | 建議 |
|------|--------|------|
| `pages/` vs `frontend/` vs `docs/` 重複 | 🔴 高 | 統一成一套 |
| 後端未部署，學生只能用到 Phase 1 fallback | 🔴 高 | Railway/Render |
| 英文/常識科頁面係空壳 | 🟡 中 | 盡快充實 |
| 學生名字可重複（無 unique constraint）| 🟡 中 | 加入 session_id |

---

Last updated: 2026-05-29