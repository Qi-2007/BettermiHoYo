# BetterMihoyo 后端服务

这是 BetterMihoyo 项目的后端服务器。

## 功能

- 用户认证 (登录/注册)
- 游戏账户管理
- 任务调度与执行
- BGI 面板数据接口
- 远程设备控制 (智能插座、电脑唤醒等)

## 安装

1.  克隆此仓库到本地。
2.  安装项目依赖：
    ```bash
    npm install
    ```

## 配置

在项目根目录下，您需要创建一个 `config.js` 文件来配置应用程序。您可以参考 `config.example.js` (如果存在) 或根据需要进行以下配置：

```javascript
module.exports = {
  // 用于签发 JWT 的密钥
  secret: 'your-super-secret-key',

  // 数据库文件路径
  database: './bgi-panel.db',

  // 其他服务配置...
};
```
**注意:** `config.js` 文件未被版本控制，请确保其安全性，尤其是敏感信息。

## 运行

- **开发模式** (使用 `nodemon` 自动重载):
  ```bash
  npm run dev
  ```

- **生产模式**:
  ```bash
  npm run start
  ```

## API 文档

详细的 API 接口说明，请参见 [API 文档](./docs/API.md)。

## 项目结构

```
backend/
├── src/
│   ├── controllers/  # 请求处理与核心业务逻辑
│   ├── db/           # 数据库连接与初始化
│   ├── jobs/         # 定时任务
│   ├── middleware/   # Express 中间件 (如: JWT认证)
│   ├── routes/       # API 路由定义
│   ├── services/     # 外部服务 (如: 智能插座, WOL)
│   └── utils/        # 工具函数 (如: 加密)
├── config.js         # 配置文件 (需自行创建)
├── index.js          # 应用主入口
├── package.json      # 项目依赖与脚本
└── README.md         # 项目说明
```

## 许可证

本项目基于 ISC 许可证。
