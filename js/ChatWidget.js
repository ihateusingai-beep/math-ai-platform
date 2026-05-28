/**
 * MathAI ChatWidget v1.0
 * 可嵌入任何頁面的獨立聊天元件
 * Phase 1: 預設Q&A fallback，唔走LLM
 */

(function(global) {
  'use strict';

  const MathAI = global.MathAI || {};

  // ========================================
  // 預設Q&A庫（Phase 1 使用）
  // ========================================
  const QA_FALLBACK = [
    // 加減法基礎
    {
      keywords: ['加', '加埋', '相加', '+'],
      patterns: [
        { q: '1加1', a: '1 + 1 = 2', type: 'text' },
        { q: '2加3', a: '2 + 3 = 5', type: 'text' },
        { q: '5加4', a: '5 + 4 = 9', type: 'text' },
        { q: '10加20', a: '10 + 20 = 30', type: 'text' }
      ],
      response: '加法係把數合埋一齊，數下有幾多個'
    },
    {
      keywords: ['減', '減去', '減走', '-'],
      patterns: [
        { q: '5減2', a: '5 - 2 = 3', type: 'text' },
        { q: '10減3', a: '10 - 3 = 7', type: 'text' },
        { q: '8減5', a: '8 - 5 = 3', type: 'text' }
      ],
      response: '減法係拿走一啲，數下還剩幾多'
    },
    // 乘法基礎
    {
      keywords: ['乘', '乘以', 'x'],
      patterns: [
        { q: '2乘3', a: '2 × 3 = 6', type: 'text' },
        { q: '5乘4', a: '5 × 4 = 20', type: 'text' },
        { q: '3乘7', a: '3 × 7 = 21', type: 'text' }
      ],
      response: '乘法係數有多少組，係加法嘅快方法'
    },
    // 除法基礎
    {
      keywords: ['除', '除以', '÷'],
      patterns: [
        { q: '6除2', a: '6 ÷ 2 = 3', type: 'text' },
        { q: '10除5', a: '10 ÷ 5 = 2', type: 'text' },
        { q: '9除3', a: '9 ÷ 3 = 3', type: 'text' }
      ],
      response: '除法係分均幾多，每份有幾多'
    },
    // 形狀
    {
      keywords: ['三角形', '三角'],
      patterns: [],
      response: '三角形有三條邊，三個角。你見過幾多種三角形？試下數下有几隻角？'
    },
    {
      keywords: ['正方形', '方形'],
      patterns: [],
      response: '正方形有4條一樣長嘅邊，4個一樣大嘅角。試下畫一個！'
    },
    {
      keywords: ['圓形', '圈'],
      patterns: [],
      response: '圓形冇角，係完全圓嘅。你可以搵到幾多個圓形嘢？'
    },
    // 數數
    {
      keywords: ['幾多', '多少', '數'],
      patterns: [],
      response: '我哋慢慢數！試下由1數到10，或者由10倒數到1'
    },
    // 時間
    {
      keywords: ['時間', '點鐘', '時鐘'],
      patterns: [],
      response: '時鐘有長針同短針，短針係鐘，長針係分。你家下係幾點？'
    },
    // 金錢
    {
      keywords: ['錢', '蚊', '元', '毫'],
      patterns: [],
      response: '金錢係我哋買嘢用嘅！你有冇儲蓄罐？試下數下有几多錢'
    },
    // 鼓勵
    {
      keywords: ['做唔到', '唔識', '好難'],
      patterns: [],
      response: '唔緊要！我哋慢慢試。你已經好勁喇，試多次一定得！💪'
    },
    {
      keywords: ['多謝', '唔該'],
      patterns: [],
      response: '唔使客氣！有問題隨時問我，我會幫你既～😊'
    },
    // 默認
    {
      keywords: [],
      patterns: [],
      response: 'DEFAULT_SUBJECT_RESPONSE'
    }
  ];

  // Subject-specific default responses (used by _getResponse)
  const DEFAULT_RESPONSES = {
    math: '我明你意思喇，不過我仲學緊中。你可以試下問我啲數學問題，例如：「2加3係幾多」或者「三角形有幾多條邊」？',
    chinese: '我明你意思喇，不過我仲學緊中。你可以試下問我啲中文問題，例如：「日字點讀」或者「蘋果係咩字」？',
    english: 'I don\'t quite understand yet! Try asking me English words, like "what is cat?" or "how do you say apple?"',
    science: '我明你意思喇，不過我仲學緊中。你可以試下問我啲常识問題，例如：「水係咩形狀」或者「太陽係咩顏色」？'
  };

  // ========================================
  // ChatWidget 類
  // ========================================
  class ChatWidget {
    constructor(options = {}) {
      this.options = {
        container: null,
        studentName: null,
        classId: null,
        subject: 'math',
        onMessage: null,
        voiceEnabled: true,
        ...options
      };

      this.messages = [];
      this.isListening = false;
      this.recognition = null;

      this._init();
    }

    _init() {
      this._initSubjectColors();
      this._setupHTML();
      this._setupStyles();
      this._setupVoice();
      this._bindEvents();
    }

    _getSubjectIcon() {
      const icons = { math: '🔢', chinese: '📚', english: '🔤', science: '🔬' };
      return icons[this.options.subject] || '🔢';
    }

    _getSubjectTitle() {
      const titles = { math: '數學小助手', chinese: '中文小助手', english: '英文小助手', science: '常識小助手' };
      return titles[this.options.subject] || '數學小助手';
    }

    _initSubjectColors() {
      const colors = {
        math: { primary: '#4a90d9', gradient: 'linear-gradient(135deg, #4a90d9, #67b26f)' },
        chinese: { primary: '#c0392b', gradient: 'linear-gradient(135deg, #c0392b, #e74c3c)' },
        english: { primary: '#27ae60', gradient: 'linear-gradient(135deg, #27ae60, #2ecc71)' },
        science: { primary: '#9b59b6', gradient: 'linear-gradient(135deg, #9b59b6, #a569bd)' }
      };
      this._subjectColors = colors[this.options.subject] || colors.math;
    }

    _getSubjectExamples() {
      const map = { math: '數學問題', chinese: '中文問題', english: '英文問題', science: '常識問題' };
      return map[this.options.subject] || '數學問題';
    }

    _getSubjectExampleItems() {
      const examples = {
        math: ['「2加3係幾多？」', '「三角形有幾多條邊？」', '「10減5係幾多？」'],
        chinese: ['「日字點讀？」', '「蘋果係咩字？」', '「一係咩字？」'],
        english: ['「cat係咩？」', '「hello係咩？」', '「apple係咩？」'],
        science: ['「水係咩形狀？」', '「太陽係咩顏色？」', '「植物需要咩？」']
      };
      const items = examples[this.options.subject] || examples.math;
      return items.map(item => `<li>${item}</li>`).join('');
    }

    _getInputPlaceholder() {
      const map = {
        math: '輸入數學問題...',
        chinese: '輸入中文問題...',
        english: '輸入英文問題...',
        science: '輸入常識問題...'
      };
      return map[this.options.subject] || '輸入數學問題...';
    }

    _setupHTML() {
      const container = this.options.container;
      if (!container) return;

      container.innerHTML = `
        <div class="mathai-widget" data-subject="${this.options.subject}">
          <div class="mathai-header">
            <span class="mathai-avatar">${this._getSubjectIcon()}</span>
            <span class="mathai-title">${this._getSubjectTitle()}</span>
            ${this.options.studentName ? `<span class="mathai-student">${this.options.studentName}</span>` : ''}
          </div>

          <div class="mathai-messages" id="mathai-messages">
            <div class="mathai-welcome">
              <p>👋 你好！我係${this._getSubjectTitle()}</p>
              <p>你可以問我${this._getSubjectExamples()}，例如：</p>
              <ul>
                ${this._getSubjectExampleItems()}
              </ul>
            </div>
          </div>

          <div class="mathai-input-area">
            <button class="mathai-voice-btn" id="mathai-voice-btn" title="按住講嘢" ${!this.options.voiceEnabled ? 'disabled' : ''}>
              🎤
            </button>
            <input type="text" class="mathai-input" id="mathai-input" placeholder="${this._getInputPlaceholder()}" autocomplete="off" />
            <button class="mathai-send-btn" id="mathai-send-btn">發送</button>
          </div>

          <div class="mathai-feedback" id="mathai-feedback"></div>
        </div>
      `;
    }

    _setupStyles() {
      if (document.getElementById('mathai-widget-styles')) return;

      const style = document.createElement('style');
      style.id = 'mathai-widget-styles';
      style.textContent = `
        .mathai-widget {
          font-family: 'Microsoft YaHei', 'PingFang HK', sans-serif;
          max-width: 600px;
          margin: 0 auto;
          border: 2px solid ${this._subjectColors.primary};
          border-radius: 16px;
          overflow: hidden;
          background: #fafafa;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .mathai-header {
          background: ${this._subjectColors.gradient};
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mathai-avatar {
          font-size: 24px;
        }

        .mathai-title {
          font-size: 18px;
          font-weight: bold;
        }

        .mathai-student {
          margin-left: auto;
          background: rgba(255,255,255,0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
        }

        .mathai-messages {
          height: 400px;
          overflow-y: auto;
          padding: 16px;
          background: white;
        }

        .mathai-welcome {
          text-align: center;
          color: #666;
          padding: 20px;
        }

        .mathai-welcome ul {
          text-align: left;
          display: inline-block;
          margin-top: 10px;
        }

        .mathai-message {
          margin-bottom: 12px;
          animation: mathai-fade-in 0.3s ease;
        }

        @keyframes mathai-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mathai-message.user {
          text-align: right;
        }

        .mathai-message.bot {
          text-align: left;
        }

        .mathai-bubble {
          display: inline-block;
          padding: 10px 16px;
          border-radius: 16px;
          max-width: 80%;
          line-height: 1.5;
        }

        .mathai-message.user .mathai-bubble {
          background: ${this._subjectColors.primary};
          color: white;
          border-bottom-right-radius: 4px;
        }

        .mathai-message.bot .mathai-bubble {
          background: #e8e8e8;
          color: #333;
          border-bottom-left-radius: 4px;
        }

        .mathai-input-area {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: #f5f5f5;
          border-top: 1px solid #ddd;
        }

        .mathai-voice-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #ff6b6b;
          color: white;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mathai-voice-btn:hover {
          background: #ff5252;
          transform: scale(1.05);
        }

        .mathai-voice-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .mathai-voice-btn.listening {
          background: #ff5252;
          animation: mathai-pulse 1s infinite;
        }

        @keyframes mathai-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .mathai-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #ddd;
          border-radius: 24px;
          font-size: 16px;
          outline: none;
          min-height: 48px;
        }

        .mathai-input:focus {
          border-color: ${this._subjectColors.primary};
        }

        .mathai-send-btn {
          padding: 12px 20px;
          border: none;
          background: ${this._subjectColors.primary};
          color: white;
          border-radius: 24px;
          font-size: 16px;
          cursor: pointer;
          min-height: 48px;
          font-weight: bold;
        }

        .mathai-send-btn:hover {
          background: #3a7bc8;
        }

        .mathai-feedback {
          display: none;
          padding: 8px 16px;
          text-align: center;
          font-size: 14px;
        }

        .mathai-feedback.show {
          display: block;
        }

        .mathai-feedback.correct {
          background: #d4edda;
          color: #155724;
        }

        .mathai-feedback.incorrect {
          background: #fff3cd;
          color: #856404;
        }

        .mathai-feedback.waiting {
          background: #cce5ff;
          color: #004085;
        }
      `;
      document.head.appendChild(style);
    }

    _setupVoice() {
      if (!this.options.voiceEnabled) return;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported');
        this.options.voiceEnabled = false;
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-HK';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('mathai-input').value = transcript;
        this._handleSend();
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this._stopListening();
      };

      this.recognition.onend = () => {
        this._stopListening();
      };
    }

    _bindEvents() {
      const container = this.options.container;
      if (!container) return;

      const input = container.querySelector('#mathai-input');
      const sendBtn = container.querySelector('#mathai-send-btn');
      const voiceBtn = container.querySelector('#mathai-voice-btn');

      // 文字發送
      sendBtn.addEventListener('click', () => this._handleSend());

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this._handleSend();
      });

      // 語音按住
      if (voiceBtn && this.options.voiceEnabled) {
        voiceBtn.addEventListener('mousedown', () => this._startListening());
        voiceBtn.addEventListener('mouseup', () => this._stopListening());
        voiceBtn.addEventListener('mouseleave', () => this._stopListening());

        // 觸控支援
        voiceBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this._startListening();
        });
        voiceBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this._stopListening();
        });
      }
    }

    _startListening() {
      if (!this.recognition || this.isListening) return;

      this.isListening = true;
      const voiceBtn = this.options.container.querySelector('#mathai-voice-btn');
      if (voiceBtn) voiceBtn.classList.add('listening');

      try {
        this.recognition.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }

    _stopListening() {
      if (!this.recognition || !this.isListening) return;

      this.isListening = false;
      const voiceBtn = this.options.container.querySelector('#mathai-voice-btn');
      if (voiceBtn) voiceBtn.classList.remove('listening');

      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Recognition stop error:', e);
      }
    }

    _handleSend() {
      const input = this.options.container.querySelector('#mathai-input');
      const text = input.value.trim();

      if (!text) return;

      this.addMessage(text, 'user');
      input.value = '';

      // 顯示 loading
      this._showFeedback('waiting', '諗緊...');

      // 延遲回覆（模拟思考）
      setTimeout(() => {
        const response = this._getResponse(text);
        this.addMessage(response, 'bot');
        this._hideFeedback();

        // 回呼
        if (this.options.onMessage) {
          this.options.onMessage(text, response);
        }
      }, 800);
    }

    _getResponse(input) {
      const lower = input.toLowerCase().replace(/\s+/g, '');

      // 遍歷QA庫
      for (const qa of QA_FALLBACK) {
        // 檢查關鍵詞
        const hasKeyword = qa.keywords.some(kw => lower.includes(kw));
        if (!hasKeyword && qa.keywords.length > 0) continue;

        // 檢查精確匹配
        for (const pattern of qa.patterns) {
          const patternLower = pattern.q.replace(/\s+/g, '');
          if (lower === patternLower || lower.includes(patternLower)) {
            return pattern.a;
          }
        }

        // 關鍵詞匹配但冇精確pattern
        if (hasKeyword) {
          return qa.response;
        }
      }

      // 預設回覆（subject-specific）
      const lastRes = QA_FALLBACK[QA_FALLBACK.length - 1].response;
      if (lastRes === 'DEFAULT_SUBJECT_RESPONSE') {
        return DEFAULT_RESPONSES[this.options.subject] || DEFAULT_RESPONSES.math;
      }
      return lastRes;
    }

    addMessage(text, type = 'bot') {
      this.messages.push({ text, type, timestamp: Date.now() });

      const messagesDiv = this.options.container.querySelector('#mathai-messages');
      const msgDiv = document.createElement('div');
      msgDiv.className = `mathai-message ${type}`;
      msgDiv.innerHTML = `<div class="mathai-bubble">${text}</div>`;
      messagesDiv.appendChild(msgDiv);

      // 滾到底
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    _showFeedback(type, message) {
      const feedback = this.options.container.querySelector('#mathai-feedback');
      if (!feedback) return;

      feedback.className = `mathai-feedback show ${type}`;
      feedback.textContent = message;
    }

    _hideFeedback() {
      const feedback = this.options.container.querySelector('#mathai-feedback');
      if (feedback) {
        feedback.className = 'mathai-feedback';
      }
    }

    // 公開方法
    destroy() {
      if (this.recognition) {
        this.recognition.stop();
      }
      this.messages = [];
    }

    enableVoice() {
      this.options.voiceEnabled = true;
      this._setupVoice();
    }

    disableVoice() {
      this.options.voiceEnabled = false;
      if (this.recognition) {
        this.recognition.stop();
      }
    }
  }

  // 註冊
  MathAI.ChatWidget = ChatWidget;
  global.MathAI = MathAI;

})(window);