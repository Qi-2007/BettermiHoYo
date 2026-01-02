// 这是配置文件的示例。
// 请复制此文件为 `config.js` 并填入您的实际配置。

module.exports = {
  // 用于签发和验证 JSON Web Token (JWT) 的密钥。
  // 推荐使用一个长且随机的字符串。
  // 例如: require('crypto').randomBytes(64).toString('hex')
  secret: 'your-super-secret-and-long-string-for-jwt',

  // 数据库文件的路径。默认使用 SQLite。
  // 路径是相对于项目根目录的。
  database: './bgi-panel.db',

  // 用于验证 BGI-Agent 请求的 API Key。
  // BGI-Agent 在请求头中 x-api-key 字段需要提供此值。
  apiKey: 'your-secret-api-key-for-agent',

  // 智能插座 (Smart Plug) 服务配置
  // 如果您不使用此功能，可以忽略或删除此部分。
  smartPlug: {
    // 示例：定义一个名为 "pc" 的插座
    // pc: {
    //   host: '192.168.1.100', // 插座的 IP 地址
    //   protocol: 'udp',       // 协议类型
    // }
  },

  // 网络唤醒 (Wake-on-LAN) 配置
  // 如果您不使用此功能，可以忽略或删除此部分。
  wakeOnLan: {
    // 示例：定义一个名为 "main-pc" 的设备
    // 'main-pc': {
    //   mac: '00:11:22:33:44:55',   // 设备的 MAC 地址
    //   broadcast: '192.168.1.255' // 广播地址
    // }
  }
};
