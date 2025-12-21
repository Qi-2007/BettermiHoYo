const isAdmin = (req, res, next) => {
  // 这个中间件必须在 verifyToken 之后使用
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).send({ message: "Require Admin Role!" });
  }
};

module.exports = isAdmin;