const config = require('../../config');

const verifyApiKey = (req, res, next) => {
  // 我们约定 BGI 客户端通过 'Authorization' header 发送密钥
  // 格式为: Bearer <your-api-key>
  let token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send({ message: "No API Key provided!" });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  if (token !== config.BGI_API_KEY) {
    return res.status(401).send({ message: "Unauthorized! Invalid API Key." });
  }

  // 验证通过，继续处理请求
  next();
};

module.exports = verifyApiKey;