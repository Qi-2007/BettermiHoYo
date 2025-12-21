const crypto = require('crypto');
const config = require('../../config');

// 使用 config 中的密钥，如果不够长会自动截取或填充，这里简化处理
// 生产环境建议单独配置一个32字节的 hex 字符串作为 DATA_KEY
const ALGORITHM = 'aes-256-cbc';
// 我们简单地使用 JWT_SECRET 的哈希作为密钥，确保长度符合要求 (32 bytes)
const ENCRYPTION_KEY = crypto.createHash('sha256').update(config.JWT_SECRET).digest(); 
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // 返回格式: iv:encrypted_data (都是 hex 格式)
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

module.exports = { encrypt, decrypt };