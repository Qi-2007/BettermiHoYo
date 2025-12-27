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

## 项目特有约定与实现细节
- 使用 `better-sqlite3` 的同步接口：`db.prepare(...).get()/all()/run()` 与 `db.transaction()`。请保留事务模式来保证一致性。
- 动态表单元数据：表 `FieldMetadata`（下拉选项）与 `FieldConfig`（字段显示配置）用于前端动态生成字段；`src/controllers/gameAccount.controller.js` 与 `admin.controller.js` 有示例。
- Schema 扩展：通过管理员接口 (`POST /api/admin/schema/add-column`) 添加列（控制器做了列名正则校验以避免注入）。添加列后建议同时在 `FieldConfig` 中创建默认记录。
- 加密：账号明文密码加密使用 `src/utils/crypto.js`（AES-256，密钥基于 `config.JWT_SECRET` 的哈希）。生产环境应使用独立、足够随机的密钥并避免将 secrets 写入源代码。
- 长耗时任务：按设计应立即返回 202 并在后台执行（参见 `admin.controller.forceRestart`）。

---

## 安全 & 配置注意事项
- 全局配置集中在 `config.js`（`JWT_SECRET`, `BGI_API_KEY`, WOL / plug 配置）。**切勿**在生产环境使用默认 `JWT_SECRET` / `BGI_API_KEY`。
- BGI-Agent 与前端：
  - BGI-Agent 使用 `Authorization: Bearer <BGI_API_KEY>` POST `/api/admin/heartbeat`。
  - 前端使用 `Authorization: Bearer <JWT>` 或 `x-access-token` 访问受保护接口。
- 创建管理员：注册接口不会赋予 `role='admin'`，需要手动在 DB 中更新 `Users.role`（例如：`UPDATE Users SET role='admin' WHERE username='...'`）。

---

## 常见操作示例
- 注册 / 登录：
  - POST `/api/auth/register` { username, password }
  - POST `/api/auth/login` { username, password } -> 返回 `accessToken` 与 `role`
- 使用 token：`Authorization: Bearer <accessToken>` 或 `x-access-token: <token>`
- BGI Agent 心跳：
  - POST `/api/admin/heartbeat` with `Authorization: Bearer <BGI_API_KEY>` (body = JSON heartbeat)
- 添加数据库列（管理员）：
  - POST `/api/admin/schema/add-column` { column_name, data_type, default_value }

---

## 调试与测试建议
- 使用 `npm run dev` 可观察更多实时日志（`better-sqlite3` 被启用 verbose 输出）。
- 调度器在启动时会立即运行一次 `generateDailyTasks()`（方便测试）。
- 若需重置 DB，可删除 `bgi-panel.db`（下次启动会重建表）。
- 与智能硬件交互（SmartPlug/SSH/WOL）通常需要在同一内网并配置正确的 IP/MAC/凭据。

---

## 重要文件索引（首选阅读顺序）
1. `index.js` - 启动与路由
2. `src/db/database.js` - 模式初始化、DB 接口
3. `src/jobs/taskScheduler.js` - 每日 task 生成逻辑
4. `src/controllers/*` - 主要 HTTP 逻辑（`auth`, `admin`, `gameAccount`, `task`, `bgi`）
5. `src/services/*` - 外设交互（SmartPlug, MachineControl, Heartbeat）
6. `src/middleware/*` - 验证与授权策略
7. `config.js` & `package.json` - 配置与启动脚本

---

如果你希望我把这一文件合并到现有的 agent 指南（如果将来加入），我可以按已存在内容智能合并；或者现在继续把它扩展为 README 的一部分。需要我把以上内容做成 PR 或者补充更多运维/安全细节吗？✅
