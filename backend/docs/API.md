# BetterMihoyo API 文档

本文档详细介绍了 BetterMihoyo 后端项目的所有 API 接口。

## 目录
- [认证](#认证)
  - [JWT (JSON Web Token)](#jwt-json-web-token)
  - [API Key](#api-key)
- [通用说明](#通用说明)
- [认证接口 (`/api/auth`)](#认证接口--api-auth)
- [用户管理接口 (`/api/user`)](#用户管理接口--api-user)
- [游戏账户接口 (`/api/gameAccount`)](#游戏账户接口--api-gameaccount)
- [任务接口 (`/api/task`)](#任务接口--api-task)
- [BGI 接口 (`/api/bgi`)](#bgi-接口--api-bgi)
- [管理员接口 (`/api/admin`)](#管理员接口--api-admin)

---

## 认证

本 API 使用两种认证方式：JWT 和 API Key。

### JWT (JSON Web Token)
用于保护面向用户的接口。用户通过登录 (`/api/auth/login`) 获取 Token。

**如何使用**:
在需要认证的请求中，将 Token 通过以下方式之一传递：
1.  **Authorization Header (推荐)**: `Authorization: Bearer <token>`
2.  **Custom Header**: `x-access-token: <token>`

### API Key
用于保护供机器或脚本 (如 BGI-Agent) 调用的内部接口。API Key 在系统配置中设置。

**如何使用**:
在需要认证的请求中，将 API Key 放入 `x-api-key` 头字段。
- `x-api-key: <your-api-key>`

---

## 通用说明

- **基础路径**: 所有 API 接口都以 `/api` 为前缀 (例如, `/api/auth/login`)。
- **响应格式**: 除非另有说明，所有响应均为 `application/json` 格式。
- **错误响应**: 发生错误时，响应体通常包含一个 `message` 字段，用以说明错误原因。
  ```json
  {
    "message": "错误信息描述"
  }
  ```

---

## 认证接口 (`/api/auth`)

这部分接口用于用户注册和登录，无需认证。

- **`POST /register`**
  - **描述**: 注册一个新用户。
  - **请求体**:
    ```json
    {
      "username": "someuser",
      "password": "somepassword"
    }
    ```
  - **成功响应 (200 OK)**:
    ```json
    {
      "message": "User was registered successfully!"
    }
    ```

- **`POST /login`**
  - **描述**: 用户登录以获取 JWT。
  - **请求体**:
    ```json
    {
      "username": "someuser",
      "password": "somepassword"
    }
    ```
  - **成功响应 (200 OK)**:
    ```json
    {
      "id": 1,
      "username": "someuser",
      "isAdmin": true,
      "accessToken": "ey..."
    }
    ```

---

## 用户管理接口 (`/api/user`)

**需要管理员权限 (JWT)**。

- **`GET /`**
  - **描述**: 获取所有用户列表。

- **`POST /`**
  - **描述**: 创建一个新用户。
  - **请求体**: (同注册)

- **`DELETE /:id`**
  - **描述**: 根据用户 ID 删除一个用户。

- **`PUT /:id/password`**
  - **描述**: 重置指定用户的密码。
  - **请求体**:
    ```json
    {
      "password": "newStrongPassword"
    }
    ```

---

## 游戏账户接口 (`/api/gameAccount`)

**需要登录认证 (JWT)**。

- **`GET /`**
  - **描述**: 获取当前登录用户的所有游戏账户。

- **`POST /`**
  - **描述**: 为当前用户添加一个新游戏账户。
  - **请求体**: 包含账户信息的 JSON 对象。

- **`GET /:id`**
  - **描述**: 获取指定 ID 的游戏账户详情。

- **`PUT /:id`**
  - **描述**: 更新游戏账户的基本信息。

- **`DELETE /:id`**
  - **描述**: 删除指定 ID 的游戏账户。

- **`PUT /:id/settings`**
  - **描述**: 更新游戏账户的详细设置 (例如，任务偏好)。

- **`PUT /:id/password`**
  - **描述**: 请求重置游戏账户的密码 (具体实现可能依赖于BGI)。

---

## 任务接口 (`/api/task`)

**需要登录认证 (JWT)**。

- **`GET /calendar`**
  - **描述**: 获取用于日历视图的任务聚合数据。

- **`GET /by-date`**
  - **描述**: 根据日期获取当天的任务列表。
  - **查询参数**: `date=YYYY-MM-DD`

- **`GET /account/:accountId`**
  - **描述**: 获取指定游戏账户的所有关联任务。

---

## BGI 接口 (`/api/bgi`)

**需要 API Key 认证**。这部分接口供 BGI-Agent 使用。

- **`GET /next-task`**
  - **描述**: BGI-Agent 调用此接口获取下一个待执行的任务。服务器会综合考虑任务状态 (PENDING, RUNNING 超时) 和重试次数，按优先级返回最合适的任务。
  - **查询参数**:
    - `type` (可选): 按 `game_type` 筛选任务 (例如, `gs`, `sr`)。
  - **成功响应 (200 OK)**: 返回任务详情，包含解密后的密码和所有账户设置。
    ```json
    {
      "taskId": 123,
      "gameType": "gs",
      "gameUsername": "testuser",
      "gamePassword": "plain_password",
      "settings": {
        "server_region": "cn_gf01",
        "custom_field": "value"
      }
    }
    ```
  - **无任务响应 (204 No Content)**: 如果当前没有可用任务，返回空响应，BGI-Agent 可以安全关机。

- **`POST /report`**
  - **描述**: BGI-Agent 上报任务执行的结果。支持成功和失败两种状态。失败时会自动处理重试逻辑。
  - **请求体**:
    ```json
    {
      "taskId": 123,
      "status": "SUCCESS", // 或 "FAILED"
      "logDetails": "任务执行日志...",
      "data": { // (可选) 顺便上报最新的游戏内数据
        "level": 60,
        "resin": 150
      }
    }
    ```

- **`POST /update-data`**
  - **描述**: BGI-Agent 主动推送更新的游戏内数据，独立于任务状态上报。
  - **请求体**: 必须提供 `gameUsername`/`gameType` 或 `taskId` 来定位账户。
    ```json
    {
      "gameUsername": "testuser",
      "gameType": "gs",
      "taskId": 123, // 可选
      "data": {
        "level": 60,
        "resin": 150
      }
    }
    ```

- **`GET /kv`**
  - **描述**: 读取指定任务关联的游戏账户的某个字段值 (Key-Value)。
  - **查询参数**:
    - `taskId`: 任务 ID
    - `key`: 要读取的字段名
  - **成功响应 (200 OK)**:
    ```json
    {
      "key": "some_field",
      "value": "some_value"
    }
    ```

- **`POST /kv`**
  - **描述**: 更新指定任务关联的游戏账户的某个字段值 (Key-Value)。目标字段必须已在数据库中存在。
  - **请求体**:
    ```json
    {
      "taskId": 123,
      "key": "some_field",
      "value": "new_value"
    }
    ```

- **`POST /log`**
  - **描述**: 实时追加日志到正在运行的任务中。
  - **请求体**:
    ```json
    {
      "taskId": 123,
      "logLine": "这是新的一行日志"
    }
    ```


---

## 管理员接口 (`/api/admin`)

这部分接口用于后台管理和系统控制。

### BGI-Agent 使用 (API Key 认证)

- **`POST /heartbeat`**
  - **描述**: BGI-Agent 发送心跳以表示其在线状态和当前状态。
  - **认证**: API Key
  - **请求体**:
    ```json
    {
      "machineId": "unique-machine-id",
      "status": "idle"
    }
    ```

### 前端管理面板使用 (管理员 JWT 认证)

- **`GET /status`**
  - **描述**: 获取系统状态，例如 BGI-Agent 的最后心跳和状态。

- **`POST /wakeup`**
  - **描述**: 发送网络唤醒 (Wake-on-LAN) 命令到预设的 MAC 地址。

- **`POST /shutdown`**
  - **描述**: 命令 BGI-Agent 所在的计算机执行关机。

- **`POST /force-restart`**
  - **描述**: 命令 BGI-Agent 服务进程强制重启。

- **`POST /plug/toggle`**
  - **描述**: 控制指定的智能插座开关。
  - **请求体**:
    ```json
    {
      "host": "192.168.1.100",
      "state": "on"
    }
    ```

#### 动态表单与数据库管理

- **`GET /metadata`**
  - **描述**: 获取用于动态表单的字段选项 (如下拉菜单的选项)。

- **`POST /metadata`**
  - **描述**: 添加一个新的字段选项。

- **`DELETE /metadata/:id`**
  - **描述**: 删除一个字段选项。

- **`GET /field-config`**
  - **描述**: 获取动态字段本身的配置 (如字段名、类型)。

- **`POST /field-config`**
  - **描述**: 保存或更新字段配置。

- **`DELETE /field-config/:id`**
  - **描述**: 删除一个字段配置。

- **`POST /schema/add-column`**
  - **描述**: 在数据库的指定表中动态添加一个新列。
  - **请求体**:
    ```json
    {
      "tableName": "game_accounts",
      "columnName": "new_custom_field",
      "columnType": "TEXT"
    }
    ```
