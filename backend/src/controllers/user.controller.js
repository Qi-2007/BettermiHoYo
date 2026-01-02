const { db } = require('../db/database');
const bcrypt = require('bcryptjs');

// 获取所有用户列表
exports.getAllUsers = (req, res) => {
  // 不返回密码哈希，为了安全
  const stmt = db.prepare('SELECT id, username, role, created_at FROM Users ORDER BY id DESC');
  const users = stmt.all();
  res.json(users);
};

// 创建新用户
exports.createUser = (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).send({ message: "用户名和密码必填" });
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const userRole = role || 'user'; // 默认为普通用户

  try {
    const stmt = db.prepare('INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)');
    stmt.run(username, passwordHash, userRole);
    res.json({ message: "用户创建成功" });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).send({ message: "用户名已存在" });
    }
    res.status(500).send({ message: "创建失败" });
  }
};

// 删除用户
exports.deleteUser = (req, res) => {
  const id = req.params.id;
  const currentUserId = req.user.id;

  if (parseInt(id) === currentUserId) {
    return res.status(400).send({ message: "不能删除自己" });
  }

  const stmt = db.prepare('DELETE FROM Users WHERE id = ?');
  const info = stmt.run(id);

  if (info.changes === 0) return res.status(404).send({ message: "用户不存在" });
  res.json({ message: "用户已删除" });
};

// 重置用户密码
exports.resetUserPassword = (req, res) => {
  const id = req.params.id;
  const { password } = req.body;

  if (!password) return res.status(400).send({ message: "密码不能为空" });

  const passwordHash = bcrypt.hashSync(password, 8);
  const stmt = db.prepare('UPDATE Users SET password_hash = ? WHERE id = ?');
  stmt.run(passwordHash, id);

  res.json({ message: "密码已重置" });
};