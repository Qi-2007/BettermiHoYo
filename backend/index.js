const express = require('express');
const cors = require('cors');
const { initDb } = require('./src/db/database');
const taskScheduler = require('./src/jobs/taskScheduler'); // 1. 引入我们的调度器

// --- Initialization ---
const app = express();
initDb();
taskScheduler.startScheduler(); // 2. 在这里启动调度器

// --- Middleware ---
app.use(cors()); // Allow requests from our Vue frontend
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BGI Control Panel Backend!' });
});

// 注册 Auth 路由
const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

// 注册 GameAccount 路由 (新增)
const gameAccountRoutes = require('./src/routes/gameAccount.routes');
app.use('/api/accounts', gameAccountRoutes);

// 新增 Task 路由
const taskRoutes = require('./src/routes/task.routes');
app.use('/api/tasks', taskRoutes);

// 新增 BGI 路由
const bgiRoutes = require('./src/routes/bgi.routes');
app.use('/api/bgi', bgiRoutes);

// 新增 Admin 路由
const adminRoutes = require('./src/routes/admin.routes');
app.use('/api/admin', adminRoutes);

// 新增用户管理路由
const userRoutes = require('./src/routes/user.routes');
app.use('/api/users', userRoutes);

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log(`Access it at http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
  // 如果错误是 SyntaxError 并且是 JSON 解析阶段出的错
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON 解析失败，收到非法数据:', err.message);
    // 返回 400 Bad Request，而不是让服务器崩溃
    return res.status(400).send({ message: "请求体 JSON 格式错误 (Invalid JSON)" });
  }
  next();
});