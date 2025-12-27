# Copilot Instructions — bettermihoyo/frontend

简短说明：本文件为 AI 编码代理提供能立即上手本仓库的关键上下文：架构、常用命令、约定、关键文件与示例。

## 一览（快速上手） ✅
- 技术栈：Vue 3 + TypeScript + Vite + Pinia + Element Plus
- 运行：`npm run dev`（vite）；构建：`npm run build`（包含 `vue-tsc -b` 类型检查）；预览：`npm run preview`
- 代码风格：全部用单文件组件（SFC）+ `<script setup lang="ts">`；使用 Composition API（`ref` / `computed` / 生命周期钩子）。
- 路径别名：`@` -> `src`（见 `vite.config.ts` / `tsconfig.json`）。

## 核心架构与边界 🔧
- 前端职责：管理 UI（账号列表、日历、管理员面板）、发起对后端的控制/管理请求（账号 CRUD、任务查询、远程控制、数据库 DDL）。
- 后端接口风格：统一前缀 `/api`，主要分区：
  - `POST /api/auth/*`（登录/注册）
  - `/api/accounts`（账号 CRUD）
  - `/api/tasks/*`（任务、日历）
  - `/api/admin/*`（系统控制、元数据、DDL）
- HTTP 客户端：`src/services/accountApi.ts` 导出一个 `axios` 实例 `apiClient`（`baseURL: '/api'`）并在 `request` 拦截器中自动注入 `x-access-token`（从 `src/stores/auth.ts` 的 token 中读取）。

## 重要约定 & 发现（必须知道） ⚠️
- Token header 使用 `x-access-token`（不是 `Authorization: Bearer`）。Agent 更改或新增端点时请遵循此约定，或明确同时更新拦截器。
- 登录流程直接使用 `axios.post('/api/auth/login')`（未使用 `accountApi`），返回期望结构含 `accessToken`、`id`、`username`、`role`（`authStore.setAuth` 会保存 `user` 对象与 `token` 到 `localStorage`）。
- 路由守卫（`src/router/index.ts`）使用 route meta 字段：`requiresAuth`, `guest`, `requiresAdmin`。管理员判断为 `authStore.user?.role === 'admin'`。
- UI 交互约定：使用 Element Plus 的 `ElMessage`（`success/error/info/warning`）和 `ElMessageBox.confirm` 做确认对话框；在出现高危操作（DDL、关机、强制重启）前必须弹确认框。
- 轮询模式：示例在 `src/views/AdminDashboardView.vue` 中每 5 秒轮询系统状态（`setInterval` + `onUnmounted` 清除）。添加轮询请复用此模式避免泄露。 

## 常见修改点（如何安全地改动） 🛠️
- 新增后端接口：
  1. 在 `src/services/accountApi.ts` 添加对应方法（使用 `apiClient`），例如：
     ```ts
     getFoo() { return apiClient.get('/admin/foo'); }
     ```
  2. 在需要的 `view` 中调用并统一使用 `ElMessage` 做用户提示、`ElMessageBox.confirm` 做危险操作确认。
- 新页面/路由：在 `src/router/index.ts` 新增路由并设置合适 `meta` 字段；如果需要鉴权，参照现有路由守卫。
- 全局状态：若需要全局共享数据，新增 Pinia store 在 `src/stores/`（使用 `defineStore` 的 setup 形式）。
- 添加字段/DDL 风险：`AdminDashboardView` 会调用 `POST /api/admin/schema/add-column`；前端要做字段名校验（仅允许 `A-Za-z0-9_`），并强制弹确认框。

## 开发环境注意事项 💡
- 当前 `vite.config.ts` 未配置 dev proxy：本地开发若需要避开 CORS，需手动在 `vite.config.ts` 中添加类似：
  ```ts
  server: { proxy: { '/api': 'http://localhost:8000' } }
  ```
  （将 `http://localhost:8000` 替换为后端地址）
- 构建前请运行 `npm run build` 以触发 `vue-tsc -b`，可捕获类型错误。

## 关键文件示例（快速跳转） 🔎
- `src/services/accountApi.ts` — axios 实例、拦截器、后端方法集合（首选在这里扩展 API）。
- `src/stores/auth.ts` — token / user 的持久化（`localStorage`），`setAuth` / `clearAuth`。
- `src/router/index.ts` — 路由与全局鉴权守卫。
- `src/views/LoginView.vue`、`src/views/RegisterView.vue` — 登录/注册示例（错误处理、消息提示）。
- `src/views/AdminDashboardView.vue` — 管理面板示例（轮询、确认、DDL、元数据管理）。
- `vite.config.ts`，`tsconfig.json` — 别名与构建相关设置。

## 任务指示示例（供 Agent 使用） ✍️
- 新增 API："在 `accountApi.ts` 添加 `getFoo`，在 `AdminDashboardView` 新增一个按钮调用该接口并显示 `ElMessage` 提示"。
- 修复权限问题："确保保护 `/admin` 路由：在 `router/index.ts` 的 `beforeEach` 中，若 `requiresAdmin` 且 `authStore.user?.role !== 'admin'`，跳转到首页（当前已有实现，检查是否覆盖全部 admin 子路由）。"

---

## 额外注意（面向 AI 代理） 🧭
- **登录流程**：`src/views/LoginView.vue` 直接使用 `axios.post('/api/auth/login')`（*未通过* `accountApi`）。响应应包含 `accessToken`, `id`, `username`, `role`；`authStore.setAuth` 期望传入 `{ newToken, newUser }`，并会把 `token` 与 `user` 分别持久化到 `localStorage`（键名：`token` 与 `user`）。
- **请求头与鉴权**：所有普通 API（通过 `src/services/accountApi.ts` 的 `apiClient`）在请求拦截器内注入 `x-access-token`，所以 **不要** 仅在后端或其他文件里切换到 `Authorization: Bearer`，除非同时更新拦截器 + 登录逻辑。
- **路由守卫 & meta**：使用 `meta` 字段 `requiresAuth`, `guest`, `requiresAdmin`（`requiresAdmin` 的判断为 `authStore.user?.role === 'admin'`）。添加新路由时请设置合适的 `meta`。
- **高危操作必须确认**：出现 DDL（`/admin/schema/add-column`）、关机、强制重启、排插切换等操作时，UI 必须调用 `ElMessageBox.confirm` 并在用户确认后再调用 API（可参考 `AdminDashboardView.vue`）。
- **轮询模式**：若需要轮询请复用 `AdminDashboardView.vue` 的模式：在 `onMounted` 启动 `setInterval`，并在 `onUnmounted` 调用 `clearInterval` 避免内存泄露。
- **字段名校验**：在前端对新增数据库字段（DDL）做基本校验，仅允许 `[A-Za-z0-9_]`（见现有注释和提示）。
- **构建 & 类型检查**：`npm run build` 会执行 `vue-tsc -b` 然后 `vite build`，因此把构建作为类型检查的标准流程（在提交 PR 前运行以捕获类型错误）。
- **无测试/lint 脚本**：当前 `package.json` 没有测试或 lint 脚本；引入这些工具时请添加对应的 npm script 并在 CI 中运行。
- **路径别名**：`@` 映射到 `src`（检查 `vite.config.ts` / `tsconfig.json`）。

## 示例变更模板（常见任务） ✍️
- 新增后端接口：
  1. 在 `src/services/accountApi.ts` 添加方法，例如：
     ```ts
     getFoo() { return apiClient.get('/admin/foo'); }
     ```
  2. 在对应 `view` 中调用、使用 `ElMessage` 提示成功/失败，并在必要时用 `ElMessageBox.confirm` 做确认。
- 添加新受保护路由：在 `src/router/index.ts` 新增路由并设置 `meta.requiresAuth` 或 `meta.requiresAdmin`；在添加子路由时检查父路由的 `meta` 是否继承/覆盖。
- 增加高危按钮（DDL/关机/重启）：参考 `AdminDashboardView.vue` 的实现——**始终**弹确认框并在用户确认后执行 API 调用；对失败情况展示 `ElMessage.error`。

## 推荐供 Agent 使用的任务描述示例 ✅
- “在 `accountApi.ts` 添加 `getFoo()`，在 `AdminDashboardView.vue` 增加按钮调用该接口并显示 `ElMessage.success(response.data.message)` 或 `ElMessage.error(...)`。”
- “登录返回添加 `role` 字段：检查 `LoginView.vue` 是否将 `response.data.role` 一并存入 `authStore.setAuth`（若缺失则补上并同步类型定义）。”
- “为 `addDatabaseColumn` 增加前端字段名校验（仅允许 `[A-Za-z0-9_]`），并在 UI 中显示用户友好的错误提示，然后提交 DDL 请求。”

---

如果你愿意，我可以把这些补充直接写入 `README.md` 的“开发环境”部分，或把 `vite` proxy 示例自动应用到 `vite.config.ts`（可指定后端地址）。请告诉我你偏好哪一种，我会继续迭代。欢迎指出任何不完整或需要更多示例的地方。