const jwt = require('jsonwebtoken');
const config = require('../../config');

const verifyToken = (req, res, next) => {
  // 以前端通常发送 'x-access-token' 或 Authorization Header 为例
  let token = req.headers['x-access-token'] || req.headers['authorization'];

  if (!token) {
    return res.status(403).send({ message: "未提供 Token!" });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "未授权!" });
    }
    req.user = decoded; // 将解码后的用户信息存入 req.user
    next();
  });
};

module.exports = verifyToken;