# BetterMihoyo 前端

欢迎使用 BetterMihoyo！这是一个旨在提供更好米哈游（HoYoverse）游戏账号管理体验的 Web 应用前端。本项目基于 Vue 3, Vite 和 TypeScript 构建，致力于为玩家提供一个现代化、功能丰富的游戏账号管理工具。

## ✨ 功能特性

*   **用户认证**：支持安全的登录与注册功能。
*   **账号详情**：清晰地查看和管理绑定的游戏账号信息。
*   **日历集成**：集成了活动日历，方便追踪游戏内活动与每日奖励。
*   **现代化界面**：采用 Element Plus 组件库，提供美观且响应式的用户界面。

## 🚀 环境准备

在开始之前，请确保您的开发环境中已安装以下软件：

*   [Node.js](https://nodejs.org/) (推荐 `20.x` 或更高版本)
*   [pnpm](https://pnpm.io/installation) (当然，您也可以使用 `npm` 或 `yarn`)

## 📦 安装与启动

1.  **克隆代码仓库:**
    ```bash
    git clone <repository-url>
    cd frontend
    ```

2.  **安装项目依赖:**
    ```bash
    pnpm install
    # 或者
    # npm install
    # 或者
    # yarn install
    ```

## 💻 运行开发服务器

执行以下命令来启动本地开发服务器。成功启动后，您可以通过 `http://localhost:5173` 访问项目。

```bash
pnpm dev
```

该命令会以开发模式运行应用，并提供热模块重载（HMR）等功能，以提升开发效率。

## 🏗️ 构建生产版本

当您准备好将应用部署到生产环境时，可以运行以下命令进行构建：

```bash
pnpm build
```

此命令会对代码进行类型检查、打包和压缩优化。所有构建产物将被输出到 `dist/` 目录下。

您可以使用 `pnpm preview` 命令在本地预览生产环境的构建版本。

## 🛠️ 技术栈

本项目采用了当前前端领域流行且高效的技术栈：

*   **核心框架:** [Vue 3](https://cn.vuejs.org/)
*   **构建工具:** [Vite](https://cn.vitejs.dev/)
*   **开发语言:** [TypeScript](https://www.typescriptlang.org/)
*   **路由管理:** [Vue Router](https://router.vuejs.org/zh/)
*   **状态管理:** [Pinia](https://pinia.vuejs.org/zh/)
*   **UI 组件库:** [Element Plus](https://element-plus.org/zh-CN/)
*   **HTTP 请求:** [Axios](https://axios-http.com/)
*   **日历组件:** [V-Calendar](https://vcalendar.io/)
