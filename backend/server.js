/**
 * MathAI Platform — Backend Server
 * Phase 1: 純靜態Mock數據，後期接入LLM Router
 * Phase 2: LLM Router Service
 * Phase 3: SSE Streaming + Teacher Intervention
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const { llmRouter } = require('./services/llmRouter');
const { imageGenerator } = require('./services/imageGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ========================================
// 數據庫初始化（SQLite）
// ========================================
const db = new Database(path.join(__dirname, 'db/mathai.db'));

// 初始化 tables
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    ability TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    is_help_request INTEGER DEFAULT 0,
    is_intervention INTEGER DEFAULT 0,
    resolved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );
`);

// ========================================
// Seed Mock 數據（Phase 1）
// ========================================
const seedData = () => {
  const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get();
  
  if (classCount.count === 0) {
    // Classes
    const insertClass = db.prepare('INSERT INTO classes (id, name, description) VALUES (?, ?, ?)');
    insertClass.run('P1A', 'P1A 數學班', '小一 A 班');
    insertClass.run('P2A', 'P2A 數學班', '小二 A 班');
    insertClass.run('S1B', 'S1B 數學班', '中一 B 班');

    // Students
    const insertStudent = db.prepare('INSERT INTO students (id, name, class_id, ability) VALUES (?, ?, ?, ?)');
    
    // P1A
    insertStudent.run('p1a-01', '張鈞保', 'P1A', 'high');
    insertStudent.run('p1a-02', '陳大文', 'P1A', 'medium');
    insertStudent.run('p1a-03', '李小红', 'P1A', 'medium');
    insertStudent.run('p1a-04', '王小明', 'P1A', 'low');
    insertStudent.run('p1a-05', '陳志明', 'P1A', 'medium');

    // P2A
    insertStudent.run('p2a-01', '周芷若', 'P2A', 'high');
    insertStudent.run('p2a-02', '吳俊傑', 'P2A', 'medium');
    insertStudent.run('p2a-03', '孫文斌', 'P2A', 'medium');
    insertStudent.run('p2a-04', '鄭凱文', 'P2A', 'low');
    insertStudent.run('p2a-05', '何美琪', 'P2A', 'medium');

    // S1B
    insertStudent.run('s1b-01', '祝卓鋒', 'S1B', 'high');
    insertStudent.run('s1b-02', '黃曉明', 'S1B', 'medium');
    insertStudent.run('s1b-03', '林志玲', 'S1B', 'medium');
    insertStudent.run('s1b-04', '張偉豪', 'S1B', 'low');
    insertStudent.run('s1b-05', '劉德華', 'S1B', 'medium');

    console.log('✅ Mock data seeded');
  }
};

seedData();

// ========================================
// API Routes
// ========================================

// --- Classes ---

// GET /api/classes — 列出所有班級
app.get('/api/classes', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes ORDER BY id').all();
  res.json({ success: true, data: classes });
});

// GET /api/classes/:id — 班級詳情
app.get('/api/classes/:id', (req, res) => {
  const classInfo = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!classInfo) {
    return res.status(404).json({ success: false, error: 'Class not found' });
  }

  const students = db.prepare('SELECT * FROM students WHERE class_id = ? ORDER BY name').all(req.params.id);
  
  res.json({ success: true, data: { ...classInfo, students } });
});

// --- Students ---

// GET /api/students/:id — 學生詳情
app.get('/api/students/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  const messages = db.prepare(
    'SELECT * FROM messages WHERE student_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.params.id);

  res.json({ success: true, data: { ...student, messages } });
});

// GET /api/classes/:id/students — 班級學生列表
app.get('/api/classes/:id/students', (req, res) => {
  const students = db.prepare(
    'SELECT * FROM students WHERE class_id = ? ORDER BY name'
  ).all(req.params.id);
  
  res.json({ success: true, data: students });
});

// POST /api/students — 新增學生
app.post('/api/students', (req, res) => {
  const { id, name, class_id, ability = 'medium' } = req.body;
  
  if (!id || !name || !class_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    db.prepare('INSERT INTO students (id, name, class_id, ability) VALUES (?, ?, ?, ?)')
      .run(id, name, class_id, ability);
    
    res.json({ success: true, data: { id, name, class_id, ability } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Messages ---

// POST /api/messages — 記錄訊息
app.post('/api/messages', (req, res) => {
  const { student_id, class_id, user_message, bot_response, is_help_request = 0 } = req.body;
  
  if (!student_id || !class_id || !user_message || !bot_response) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO messages (student_id, class_id, user_message, bot_response, is_help_request) VALUES (?, ?, ?, ?, ?)'
    ).run(student_id, class_id, user_message, bot_response, is_help_request ? 1 : 0);

    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/stats — Dashboard 統計
app.get('/api/dashboard/stats', (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const helpRequests = db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_help_request = 1').get().count;

  const today = new Date().toISOString().split('T')[0];
  const todayMessages = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE date(created_at) = ?"
  ).get(today).count;

  res.json({
    success: true,
    data: {
      totalStudents,
      totalMessages,
      todayMessages,
      helpRequests,
      activeClasses: 3
    }
  });
});

// GET /api/dashboard/recent — 最近活動
app.get('/api/dashboard/recent', (req, res) => {
  const recentMessages = db.prepare(`
    SELECT m.*, s.name as student_name, c.name as class_name
    FROM messages m
    JOIN students s ON m.student_id = s.id
    JOIN classes c ON m.class_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 10
  `).all();

  res.json({ success: true, data: recentMessages });
});

// ========================================
// Streaming LLM Chat (Phase 3)
// ========================================

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';

// POST /api/llm/stream — SSE streaming response
app.post('/api/llm/stream', async (req, res) => {
  const { message, student_id, class_id, context = {} } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Missing message' });
  }

  // 設置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.flushHeaders();

  try {
    // 意圖分類
    const intent = await llmRouter.classifyIntent(message);
    console.log(`[Stream] Intent: ${intent}`);

    let stream;
    let fullResponse = '';

    if (intent === 'A' || intent === 'B') {
      // 簡單計算/概念 → Ollama streaming
      const systemPrompt = intent === 'A' 
        ? '你係小型數學助手，只答基本計算。答覆要簡短（一句話），可以加簡單解釋，廣東話回覆。'
        : '你係數學助手，用淺白廣東話解釋概念。短句子，唔好太長，可以加emoji。';

      const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: llmRouter.ollamaModel,
          prompt: `${systemPrompt}\n\n用家問題：${message}`,
          stream: true,
          options: {
            temperature: intent === 'A' ? 0.1 : 0.3,
            num_predict: 150
          }
        })
      });

      if (!ollamaRes.ok) throw new Error('Ollama unavailable');
      stream = ollamaRes.body;

    } else if (intent === 'E') {
      // 求助 → 本地回覆
      const helps = [
        '唔緊要！我哋慢慢試，你已經好勁喇 💪',
        '試多次一定得！我信你 ✨',
        '遇到困難好正常，我哋一齊諗辦法 🔍',
        '慢慢嚟，你可以嘅！🌟'
      ];
      const response = helps[Math.floor(Math.random() * helps.length)];
      
      for (const char of response) {
        res.write(`data: ${JSON.stringify({ token: char, done: false })}\n\n`);
        await sleep(30);
      }
      res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
      res.end();
      return;

    } else {
      // 複雜題 → MiniMax/DeepSeek/Qwen（非streaming）
      const response = await llmRouter.route(message, context);
      fullResponse = response.text;
      
      for (const char of fullResponse) {
        res.write(`data: ${JSON.stringify({ token: char, done: false })}\n\n`);
        await sleep(20);
      }
      res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
      res.end();
      return;
    }

    // 處理 Ollama streaming
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const data = JSON.parse(line);
          const token = data.response || '';
          
          if (token) {
            fullResponse += token;
            res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          }
        } catch (e) {
          // 非JSON行，跳過
        }
      }
    }

    res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
    res.end();

    // 記錄到數據庫
    if (student_id && class_id) {
      db.prepare(
        'INSERT INTO messages (student_id, class_id, user_message, bot_response) VALUES (?, ?, ?, ?)'
      ).run(student_id, class_id, message, fullResponse || '[streaming]');
    }

  } catch (err) {
    console.error('[Stream] Error:', err);
    
    res.write(`data: ${JSON.stringify({ error: true, message: '服務暫時不可用，請稍後再試' })}\n\n`);
    res.end();
  }
});

// ========================================
// Teacher Intervention (Phase 3)
// ========================================

// POST /api/intervention — 老師直接回覆學生
app.post('/api/intervention', (req, res) => {
  const { student_id, class_id, teacher_message } = req.body;

  if (!student_id || !class_id || !teacher_message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO messages (student_id, class_id, user_message, bot_response, is_intervention) VALUES (?, ?, ?, ?, 1)'
    ).run(student_id, class_id, teacher_message, '[老師回覆]');

    res.json({ 
      success: true, 
      data: { 
        id: result.lastInsertRowid,
        message: '老師回覆已發送'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/interventions/:student_id — 獲取某學生的老師干預歷史
app.get('/api/interventions/:student_id', (req, res) => {
  try {
    const interventions = db.prepare(
      'SELECT * FROM messages WHERE student_id = ? AND is_intervention = 1 ORDER BY created_at DESC'
    ).all(req.params.student_id);

    res.json({ success: true, data: interventions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/help-requests — 獲取所有待處理求助
app.get('/api/help-requests', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT m.*, s.name as student_name, c.name as class_name
      FROM messages m
      JOIN students s ON m.student_id = s.id
      JOIN classes c ON m.class_id = c.id
      WHERE m.is_help_request = 1 AND m.resolved = 0
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all();

    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/help-requests/:id/resolve — 標記求助已處理
app.post('/api/help-requests/:id/resolve', (req, res) => {
  try {
    db.prepare(
      'UPDATE messages SET resolved = 1 WHERE id = ? AND is_help_request = 1'
    ).run(req.params.id);

    res.json({ success: true, message: '求助已標記為處理' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/help — 學生求助
app.post('/api/help', (req, res) => {
  const { student_id, class_id } = req.body;

  if (!student_id || !class_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    db.prepare(
      'INSERT INTO messages (student_id, class_id, user_message, bot_response, is_help_request) VALUES (?, ?, ?, ?, 1)'
    ).run(student_id, class_id, '🚨 求助信號', '老師已被通知');

    res.json({ success: true, message: 'Help request sent to teacher' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================
// Image Generation (Phase 4)
// ========================================

// POST /api/image/generate — 生成數學圖卡
app.post('/api/image/generate', async (req, res) => {
  const { type, custom_prompt, user_message } = req.body;

  try {
    let result;

    if (user_message && !type) {
      // 自動從用家消息判斷類型
      result = await imageGenerator.autoGenerate(user_message);
    } else {
      // 指定類型
      result = await imageGenerator.generateCard(type, custom_prompt);
    }

    if (result.url) {
      res.json({ success: true, data: { url: result.url, cached: result.cached } });
    } else {
      res.status(500).json({ success: false, error: 'Image generation failed' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/image/types — 獲取可用類型
app.get('/api/image/types', (req, res) => {
  const types = [
    { id: 'triangle', label: '三角形', desc: '認識三角形' },
    { id: 'square', label: '正方形', desc: '認識正方形' },
    { id: 'circle', label: '圓形', desc: '認識圓形' },
    { id: 'addition', label: '加法', desc: '加法圖解' },
    { id: 'subtraction', label: '減法', desc: '減法圖解' },
    { id: 'multiplication', label: '乘法', desc: '乘法圖解' },
    { id: 'division', label: '除法', desc: '除法圖解' },
    { id: 'clock', label: '時鐘', desc: '認識時間' },
    { id: 'money', label: '金錢', desc: '認識金錢' }
  ];

  res.json({ success: true, data: types });
});

// ========================================
// Health Check
// ========================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// SPA fallback
// ========================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================================
// 啟動
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 MathAI Backend running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/pages/dashboard.html`);
});