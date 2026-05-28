/**
 * MathAI — LLM Router Service
 * Phase 3: Ollama + MiniMax + DeepSeek + Qwen 完整路由
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE || 'http://localhost:11434';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_ENDPOINT = 'https://api.minimax.chat/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1';
const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

// ========================================
// 意圖分類 Prompt
// ========================================
const INTENT_PROMPT = `你係數學助手嘅路由器。分析用家問題，判斷類型。

類型：
A. SIMPLE_CALC — 基本計算（加、減、乘、除、簡單心算）
B. CONCEPT_ASK — 概念問題（咩係三角形、幾多條邊、係點嘅）
C. APPLICATION — 應用題（文字題、情境問題）
D. CREATIVE — 創意/開放問題（你想點做、有咩建議）
E. HELP — 求助（做唔到、唔識、好難）

只用一個詞回覆：A / B / C / D / E`;

// ========================================
// 簡單計算 Prompt (Ollama)
// ========================================
const SIMPLE_CALC_PROMPT = `你係小型數學助手，只答基本計算。

規則：
- 答覆要簡短（一句話）
- 可以加簡單解釋
- 廣東話回覆
- 例子：
  用家：2加3係幾多
  你：2 + 3 = 5 ✅

用家問題：`;

// ========================================
// 概念解釋 Prompt (Ollama)
// ========================================
const CONCEPT_PROMPT = `你係數學助手，用淺白廣東話解釋概念。

規則：
- 短句子，唔好太長
- 可以用emoji
- 例子：「三角形係有三條邊嘅形狀，你可以數下！」
- 適合 SEN 學生理解

用家問題：`;

// ========================================
// LLM Router 主類
// ========================================
class LLMRouter {
  constructor() {
    this.ollamaBase = OLLAMA_BASE_URL;
    this.ollamaModel = 'llama3.2';
    this.minimaxModel = 'MiniMax-Text-01';
    this.fallback = new QAFallback();
  }

  // ========================================
  // 統一入口
  // ========================================
  async route(userMessage, context = {}) {
    try {
      const intent = await this.classifyIntent(userMessage);
      console.log(`[Router] Intent: ${intent}`);

      switch (intent) {
        case 'A':
          return await this.handleSimpleCalc(userMessage);
        case 'B':
          return await this.handleConcept(userMessage);
        case 'C':
        case 'D':
          return await this.handleMiniMax(userMessage);
        case 'E':
          return this.handleHelp();
        default:
          return await this.handleMiniMax(userMessage);
      }
    } catch (err) {
      console.error('[Router] Error:', err.message);
      return this.fallback.getResponse(userMessage);
    }
  }

  // ========================================
  // 意圖分類 (Ollama)
  // ========================================
  async classifyIntent(message) {
    try {
      const response = await fetch(`${this.ollamaBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: `${INTENT_PROMPT}\n\n用家問題：${message}`,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 10
          }
        })
      });

      if (!response.ok) throw new Error('Ollama unavailable');

      const data = await response.json();
      const intent = data.response.trim().charAt(0).toUpperCase();

      if (['A', 'B', 'C', 'D', 'E'].includes(intent)) {
        return intent;
      }
      return 'C';
    } catch (err) {
      console.warn('[Router] Ollama classify failed, using heuristic');
      return this.heuristicIntent(message);
    }
  }

  // ========================================
  // 啟發式意圖分類
  // ========================================
  heuristicIntent(message) {
    const lower = message.toLowerCase();

    if (/^\d+[\+\-\*\/\÷×]\d+/.test(message)) return 'A';
    if (lower.includes('咩係') || lower.includes('係點') ||
        lower.includes('幾多條') || lower.includes('幾多個角') ||
        lower.includes('形狀') || lower.includes('圖形')) {
      return 'B';
    }
    if (lower.includes('做唔到') || lower.includes('唔識') ||
        lower.includes('好難') || lower.includes('幫我')) {
      return 'E';
    }
    return 'C';
  }

  // ========================================
  // 簡單計算 (Ollama)
  // ========================================
  async handleSimpleCalc(message) {
    try {
      const response = await fetch(`${this.ollamaBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: `${SIMPLE_CALC_PROMPT}${message}`,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 50
          }
        })
      });

      if (!response.ok) throw new Error('Ollama unavailable');

      const data = await response.json();
      return { text: data.response.trim(), source: 'ollama' };
    } catch (err) {
      return this.fallback.compute(message);
    }
  }

  // ========================================
  // 概念解釋 (Ollama)
  // ========================================
  async handleConcept(message) {
    try {
      const response = await fetch(`${this.ollamaBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: `${CONCEPT_PROMPT}${message}`,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 100
          }
        })
      });

      if (!response.ok) throw new Error('Ollama unavailable');

      const data = await response.json();
      return { text: data.response.trim(), source: 'ollama' };
    } catch (err) {
      return this.fallback.getConceptResponse(message);
    }
  }

  // ========================================
  // MiniMax 處理複雜題目
  // ========================================
  async handleMiniMax(message) {
    if (!MINIMAX_API_KEY) {
      return this.handleDeepSeek(message);
    }

    try {
      const response = await fetch(`${MINIMAX_ENDPOINT}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
        },
        body: JSON.stringify({
          model: this.minimaxModel,
          messages: [
            { role: 'system', content: '你係數學助手，用廣東話，句子要短，多鼓勵。' },
            { role: 'user', content: message }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error('MiniMax error');

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'sorry，我答唔到...';

      return { text: text.trim(), source: 'minimax' };
    } catch (err) {
      console.error('[Router] MiniMax failed:', err.message);
      return this.handleDeepSeek(message);
    }
  }

  // ========================================
  // DeepSeek 備用
  // ========================================
  async handleDeepSeek(message) {
    if (!DEEPSEEK_API_KEY) {
      return this.handleQwen(message);
    }

    try {
      const response = await fetch(`${DEEPSEEK_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你係數學助手，用廣東話，句子要短，多鼓勵。' },
            { role: 'user', content: message }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error('DeepSeek error');

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'sorry，我答唔到...';

      return { text: text.trim(), source: 'deepseek' };
    } catch (err) {
      console.error('[Router] DeepSeek failed:', err.message);
      return this.handleQwen(message);
    }
  }

  // ========================================
  // Qwen 最後備用
  // ========================================
  async handleQwen(message) {
    if (!QWEN_API_KEY) {
      return this.fallback.getResponse(message);
    }

    try {
      const response = await fetch(`${QWEN_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          messages: [
            { role: 'system', content: '你係數學助手，用廣東話，句子要短，多鼓勵。' },
            { role: 'user', content: message }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error('Qwen error');

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'sorry，我答唔到...';

      return { text: text.trim(), source: 'qwen' };
    } catch (err) {
      console.error('[Router] Qwen failed:', err.message);
      return this.fallback.getResponse(message);
    }
  }

  // ========================================
  // 求助回覆
  // ========================================
  handleHelp() {
    const helps = [
      '唔緊要！我哋慢慢試，你已經好勁喇 💪',
      '試多次一定得！我信你 ✨',
      '遇到困難好正常，我哋一齊諗辦法 🔍',
      '慢慢嚟，你可以嘅！🌟'
    ];
    return { text: helps[Math.floor(Math.random() * helps.length)], source: 'local' };
  }

  // ========================================
  // 生成圖卡（MiniMax）— Phase 4
  // ========================================
  async generateImageCard(prompt) {
    if (!MINIMAX_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(`${MINIMAX_ENDPOINT}/text2image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
        },
        body: JSON.stringify({
          model: 'image-01',
          prompt: prompt,
          aspect_ratio: '1:1'
        })
      });

      if (!response.ok) throw new Error('Image gen failed');

      const data = await response.json();
      return data.data?.[0]?.url || null;
    } catch (err) {
      console.error('[Router] Image gen failed:', err.message);
      return null;
    }
  }
}

// ========================================
// 本地 Q&A Fallback
// ========================================
class QAFallback {
  constructor() {
    this.qaList = [
      { q: '1加1', a: '1 + 1 = 2 ✅' },
      { q: '2加3', a: '2 + 3 = 5 ✅' },
      { q: '5加4', a: '5 + 4 = 9 ✅' },
      { q: '10加20', a: '10 + 20 = 30 ✅' },
      { q: '5減2', a: '5 - 2 = 3 ✅' },
      { q: '10減3', a: '10 - 3 = 7 ✅' },
      { q: '8減5', a: '8 - 5 = 3 ✅' },
      { q: '2乘3', a: '2 × 3 = 6 ✅' },
      { q: '5乘4', a: '5 × 4 = 20 ✅' },
      { q: '6除2', a: '6 ÷ 2 = 3 ✅' },
      { q: '10除5', a: '10 ÷ 5 = 2 ✅' },
      { q: '三角形有幾多條邊', a: '三角形有 3 條邊！你可以數下 ✅' },
      { q: '正方形有幾多個角', a: '正方形有 4 個角，全部都係一樣大 ✅' },
      { q: '圓形有角嗎', a: '圓形冇角㗎！佢係完全圓嘅形狀 🔵' },
      { q: '做唔到', a: '唔緊要！我哋慢慢試，你已經好勁喇 💪' },
      { q: '唔識', a: '唔緊要！我教你，一齊慢慢學 🌟' },
      { q: '好難', a: '難係正常㗎！但係你得嘅，我信你 ✨' },
      { q: '*', a: '我明你意思喇～可以試下問我啲數學題，例如「2加3係幾多」？ 📝' }
    ];
  }

  getResponse(input) {
    const lower = input.toLowerCase().replace(/\s+/g, '');

    for (const qa of this.qaList) {
      if (qa.q === '*') {
        return { text: qa.a, source: 'fallback' };
      }
      if (lower.includes(qa.q.replace(/\s+/g, ''))) {
        return { text: qa.a, source: 'fallback' };
      }
    }

return { text: '我答唔到你試下問數學題，例如「2加3係幾多」？ 🔢', source: 'fallback' };
  }
}

// ========================================
// Export
// ========================================
module.exports = { LLMRouter, QAFallback };
module.exports.llmRouter = new LLMRouter();