/**
 * MathAI Platform — Backend Server
 * Phase 1: 純靜態Mock數據，後期接入LLM Router
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

  // 獲取最近消息
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

  // 計算今日統計
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

// --- Help Request ---

// POST /api/help — 學生求助
app.post('/api/help', (req, res) => {
  const { student_id, class_id } = req.body;
  
  if (!student_id || !class_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // 記錄為一條特殊訊息
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