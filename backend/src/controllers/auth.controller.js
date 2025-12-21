const { db } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

exports.register = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send({ message: "Username and password are required." });
  }

  // 1. Check if user already exists
  const stmtCheck = db.prepare('SELECT id FROM Users WHERE username = ?');
  const existingUser = stmtCheck.get(username);

  if (existingUser) {
    return res.status(409).send({ message: "Username already exists." });
  }

  // 2. Hash the password
  const passwordHash = bcrypt.hashSync(password, 8);

  // 3. Insert new user
  const stmtInsert = db.prepare('INSERT INTO Users (username, password_hash) VALUES (?, ?)');
  try {
    const info = stmtInsert.run(username, passwordHash);
    console.log(`User ${username} registered with ID ${info.lastInsertRowid}`);
    res.status(201).send({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.login = (req, res) => {
  const { username, password } = req.body;

  // 1. Find user by username
  const stmt = db.prepare('SELECT * FROM Users WHERE username = ?');
  const user = stmt.get(username);

  if (!user) {
    return res.status(404).send({ message: "User not found." });
  }

  // 2. Compare password with the stored hash
  const passwordIsValid = bcrypt.compareSync(password, user.password_hash);

  if (!passwordIsValid) {
    return res.status(401).send({
      accessToken: null,
      message: "Invalid Password!"
    });
  }

  // 3. Generate a JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role }, // <-- 添加 user.role
    config.JWT_SECRET, 
    { expiresIn: 86400 } // 24 hours
  );

  res.status(200).send({
    id: user.id,
    username: user.username,
    role: user.role, // <-- 也返回给前端
    accessToken: token
  });
};