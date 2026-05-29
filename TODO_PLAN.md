# 晨暉學習平台 — TODO List & Plan

## ✅ Option A 完成（2026-05-29）

| 頁面 | 狀態 |
|------|------|
| `/english/index.html` | ✅ 綠色主題英文首頁 |
| `/english/class-select.html` | ✅ 班級選擇 |
| `/english/chat.html` | ✅ ChatWidget（subject=english） |
| `/science/index.html` | ✅ 紫色主題常識首頁 |
| `/science/class-select.html` | ✅ 班級選擇 |
| `/science/chat.html` | ✅ ChatWidget（subject=science） |

---

## ✅ Phase 1 掃尾完成（2026-05-29晚）

| # | 項目 | 狀態 |
|---|------|------|
| #1 | 首頁 link 修復 | ✅ Math/English/Science 全部正常 |
| #2 | DB migration：`subject` 欄位 | ✅ messages 表已加，API 已支援 |
| #3 | Backend subject router 串接 | ✅ `/api/llm/stream` + `/api/messages` 全部支援 `subject` 參數 |

---

## 🖼️ Wish List：圖卡生成（已建立框架）

### On/Off 開關
```
backend/.env
  MINIMAX_IMAGE_API_KEY=    ← 留空停用，填key啟用
```

### 已建立架構
- `backend/services/imageGenerator.js` — Subject-aware + on/off toggle ✅
- 各科 template：Math/Chinese/English/Science ✅

### 待啟用
```javascript
// 啟用方式：
// 1. 取得 MiniMax Image API key: https://platform.minimax.chat/
// 2. 在 .env 加入：MINIMAX_IMAGE_API_KEY=你的key
// 3. 重啟 server.js
// 4. Chat 回覆會自動帶圖卡（如適用）
```

### 各科圖卡類型
| 學科 | 圖卡 |
|------|------|
| Math | triangle/square/circle/addition/subtraction/multiplication/division/clock/money |
| Chinese | character_learning/vocabulary/reading/stroke_order |
| English | alphabet/vocabulary/conversation/phonics |
| Science | nature/body/experiment/environment |

---

## 🛑 建議停手點

Phase 1 核心完成。Wish list 框架已建立，等學生實際使用數據再啟用圖卡功能。

---

## 📅 長期方向（Phase 2-3）

Phase 2 和 Phase 3 涉及 AI 助教功能（圖卡、語音、自適應難度），需要重新評估：
- MiniMax 圖像生成 quota 消耗
- Speech API 準確度
- 學生實際使用反饋

**建議：等 Phase 1 穩定後，用實際學生使用數據再規劃 Phase 2。**