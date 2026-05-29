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

## 📋 TODO: 待完成 Phase 1 掃尾

### 高優先級（影響現有功能）

| # | 項目 | 影響 | 風險 |
|---|------|------|------|
| 1 | 首頁學科 card link 修復 | English/Science 無死link | 低 |
| 2 | DB migration：messages/classes 加 `subject` 欄位 | Chat history 無學科分類 | 中 |
| 3 | Backend subject router 串接 | 只有 Chinese 能正確回覆，其他科回通用回覆 | 中 |

### 中優先級（穩定性）

| # | 項目 | 影響 |
|---|------|------|
| 4 | Chinese/English/Science 各科獨立 system prompt | 各科學習風格更精準 |
| 5 | English/Science ChatWidget placeholder 改英文/中文 | 用戶體驗一致性 |

### 低優先級（可後期再做）

| # | 項目 |
|---|------|
| 6 | 各科學習流程（Math解題/Chinese認字/English詞彙/Science實驗） |
| 7 | 圖卡擴展（各科專用圖卡生成） |
| 8 | 語音輸入增强（英語發音評估） |

---

## 🛑 建議停手點

> 用戶偏好：「主要係可以行到program without bug」

**Phase 1 掃尾完成後，建議停手，等系統穩定。**

| 停手時機 | 理由 |
|---------|------|
| 完成 #1-#3 後 | 4科基本可用，無死link，Chat 已區分學科 |
| 之後再考慮 #4-#5 | 需要來回測試，影響現有流程 |

---

## 📅 長期方向（Phase 2-3）

Phase 2 和 Phase 3 涉及 AI 助教功能（圖卡、語音、自適應難度），需要重新評估：
- MiniMax 圖像生成 quota 消耗
- Speech API 準確度
- 學生實際使用反饋

**建議：等 Phase 1 穩定後，用實際學生使用數據再規劃 Phase 2。**