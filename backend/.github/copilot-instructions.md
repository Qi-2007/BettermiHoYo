# Copilot / Agent 使用说明

## 📌 一句话概述
这是一个基于 Express + SQLite 的后端服务（BGI 控制面板），包含：用户认证（JWT）、游戏账号管理、每日任务调度（node-cron）、机器/排插控制服务、以及由 BGI-Agent 上报的心跳接口。服务以同步的 `better-sqlite3` 为 DB 驱动，很多逻辑直接使用原生 SQL 和 DB 事务。

---

## 🚀 快速启动（开发/运行）
- 开发：`npm run dev`（使用 `nodemon`）
- 生产：`npm start`（`node index.js`）
- 默认端口：3000（可通过 env/进程管理器覆盖）
- DB 文件：项目根目录下生成 `bgi-panel.db`（由 `src/db/database.js` 创建）

---

## 🔧 关键组件 & 架构要点
- `index.js`：启动顺序 — 初始化 DB (`initDb()`)，启动调度器 (`taskScheduler.startScheduler()`)，然后挂载路由。
- `src/db/database.js`：使用 `better-sqlite3` 同步 API；模式（表）在启动时创建。
- 调度：`src/jobs/taskScheduler.js` 使用 `node-cron`，在每日上午 4:00（北京时间）生成 `DailyTasks`。
- 服务层：`src/services/*` 提供与外部设备交互（SmartPlug、WOL、SSH 命令等）。
- 控制器/路由：`src/controllers/*`, `src/routes/*`（例如 `/api/auth`, `/api/accounts`, `/api/admin`）。
- 身份验证：JWT (`src/middleware/authJwt.js`) + 管理员校验 `isAdmin.js`。BGI-Agent 使用 `src/middleware/authApiKey.js`（Bearer API Key）。

---

## ✅ 项目特有约定与实现细节（已扩展）
- 使用 `better-sqlite3` 的同步接口：`db.prepare(...).get()/all()/run()` 与 `db.transaction()`。所有跨多步 DB 操作应使用事务。
- 动态表单元数据：`FieldMetadata`（下拉选项）与 `FieldConfig`（字段显示配置）驱动前端 UI；`gameAccount.controller.js` 展示如何组合 `pragma('table_info')`、`FieldMetadata` 与 `FieldConfig` 来动态生成字段列表。
- Schema 管理：通过管理员接口 `POST /api/admin/schema/add-column` 添加列（实现了列名正则校验防注入）；添加列时请同时更新或创建 `FieldConfig` 以保持前端一致（控制器已有自动插入默认 `FieldConfig` 的逻辑）。
- 加密与密钥：`src/utils/crypto.js` 使用 AES-256-CBC，加密密钥由 `config.JWT_SECRET` 的 sha256 派生。**生产环境应使用独立的随机 DATA_KEY（环境变量）而非复用 JWT_SECRET。**
- 长耗时操作：设计为返回 202（Accepted）并在后台执行（示例：`admin.controller.forceRestart`）；避免阻塞请求线程。
- SmartPlug 与外设：`SmartPlugService` 使用内部 Promise 队列（`#queue`/`#enqueue`）序列化对设备的请求，避免并发冲突；其 IP/凭据当前硬编码在文件中，建议迁移到 `config.js` / 环境变量以便配置管理。
- Heartbeat：`HeartbeatService` 仅在内存保存状态（重启丢失），若需持久化请扩展 DB 或外部存储。

---

## 安全 & 配置注意事项（补充）
- 主配置：`config.js`（推荐通过 env 注入生产 secrets）。当前默认值仅用于本地开发，**务必在部署前替换**。
- BGI-Agent 调用：`Authorization: Bearer <BGI_API_KEY>` -> `POST /api/admin/heartbeat`。
- 管理员角色：注册不赋 admin 权限；使用 SQL 更新 `Users.role` 来提升用户权限（示例：`UPDATE Users SET role='admin' WHERE username='...'`）。

---

## 调试与常见操作（补充示例）
- 启动开发：`npm run dev`（观察 SQL 日志和调度器即时执行）
- 重置 DB：删除 `bgi-panel.db` 并重启服务（仅用于非生产环境）

BGI 心跳示例:
```
curl -X POST http://localhost:3000/api/admin/heartbeat \
  -H "Authorization: Bearer <BGI_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"status":"ok"}'
```

新增列示例:
```
curl -X POST http://localhost:3000/api/admin/schema/add-column \
  -H "Authorization: Bearer <JWT_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"column_name":"last_sync","data_type":"TEXT","default_value":""}'
```

---

## 重要文件索引（首选阅读顺序）
1. `index.js` — 启动顺序与路由挂载
2. `src/db/database.js` — DB 连接与模式初始化（`verbose: console.log`）
3. `src/jobs/taskScheduler.js` — 调度（Asia/Shanghai、启动时会立即运行一次）
4. `src/controllers/*` — 控制器实现（`admin`, `gameAccount`, `auth` 等）
5. `src/services/*` — 外设交互（`SmartPlugService`, `MachineControlService`, `HeartbeatService`）
6. `src/middleware/*` — 鉴权中间件（JWT / API Key / isAdmin）
7. `src/utils/crypto.js` — 数据加密/解密 示例

---

请确认是否要我：
- 将 `SmartPlugService` 的配置抽取到 `config.js`（并使用 env），
- 为 `HeartbeatService` 增加 DB 持久化或可选后端，或
- 将这些更改整理成 PR（包含简单测试与说明文档）。

---

如果你希望我把这一文件合并到现有的 agent 指南（如果将来加入），我可以按已存在内容智能合并；或者现在继续把它扩展为 README 的一部分。需要我把以上内容做成 PR 或者补充更多运维/安全细节吗？✅
