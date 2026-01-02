# API 文档

本文档详细介绍了 BetterMihoyo 后端项目的所有 API 接口。

## 认证

本 API 使用两种认证方式：

1.  **JWT (JSON Web Token)**: 用于保护面向用户的接口。用户通过登录获取 Token，并在后续请求的 `Authorization` 头中携带 (`Bearer <token>`) 或通过 `x-access-token` 头字段传递。
2.  **API Key**: 用于保护供机器/脚本 (如 BGI-Agent) 调用的内部接口。API Key 需要在请求的 `x-api-key` 头中提供。

---

## 认证接口 (`/api/auth`)

这部分接口用于用户注册和登录。

- **`POST /api/auth/register`**
  - **描述**: 注册一个新用户。
  - **认证**: 无。
  - **请求体**: `application/json`
    ```json
    {
      "username": "someuser",
      "password": "somepassword"
    }
    ```
  - **响应**: 成功或失败的消息。

- **`POST /api/auth/login`**
  - **描述**: 用户登录以获取 JWT。
  - **认证**: 无。
  - **请求体**: `application/json`
    ```json
    {
      "username": "someuser",
      "password": "somepassword"
    }
    ```
  - **响应**:
    ```json
    {
      "id": 1,
      "username": "someuser",
      "accessToken": "ey..."
    }
    ```

---

## 用户管理接口 (`/api/user`)

这部分接口用于管理用户，**需要管理员权限**。

- **`GET /api/user/`**
  - **描述**: 获取所有用户列表。
  - **认证**: JWT (管理员)。

- **`POST /api/user/`**
  - **描述**: 创建一个新用户。
  - **认证**: JWT (管理员)。
  - **请求体**: `application/json` (同注册)。

- **`DELETE /api/user/:id`**
  - **描述**: 根据 ID 删除一个用户。
  - **认证**: JWT (管理员)。

- **`PUT /api/user/:id/password`**
  - **描述**: 重置指定用户的密码。
  - **认证**: JWT (管理员)。
  - **请求体**: `application/json`
    ```json
    {
      "password": "newpassword"
    }
    ```

---

## 游戏账户接口 (`/api/gameAccount`)

这部分接口用于管理当前登录用户的游戏账户，**需要登录**。

- **`GET /api/gameAccount/`**
  - **描述**: 获取当前用户的所有游戏账户。
  - **认证**: JWT。

- **`POST /api/gameAccount/`**
  - **描述**: 为当前用户添加一个新游戏账户。
  - **认证**: JWT。
  - **请求体**: 包含账户信息的 `application/json`。

- **`DELETE /api/gameAccount/:id`**
  - **描述**: 删除一个游戏账户。
  - **认证**: JWT。

- **`PUT /api/gameAccount/:id`**
  - **描述**: 更新一个游戏账户的基本信息。
  - **认证**: JWT。

- **`GET /api/gameAccount/:id`**
  - **描述**: 获取单个游戏账户的详细信息。
  - **认证**: JWT。

- **`PUT /api/gameAccount/:id/settings`**
  - **描述**: 更新游戏账户的详细设置。
  - **认证**: JWT。

- **`PUT /api/gameAccount/:id/password`**
  - **描述**: 重置游戏账户的密码。
  - **认证**: JWT。

---

## 任务接口 (`/api/task`)

这部分接口用于获取任务相关的数据，**需要登录**。

- **`GET /api/task/calendar`**
  - **描述**: 获取用于日历展示的任务数据。
  - **认证**: JWT。

- **`GET /api/task/by-date`**
  - **描述**: 根据日期获取任务列表。
  - **认证**: JWT。
  - **查询参数**: `date=YYYY-MM-DD`

- **`GET /api/task/account/:accountId`**
  - **描述**: 根据游戏账户 ID 获取其关联的任务。
  - **认证**: JWT。

---

## BGI 接口 (`/api/bgi`)

这部分接口供 BGI-Agent 使用，**需要 API Key 认证**。

- **`GET /api/bgi/next-task`**
  - **描述**: BGI-Agent 获取下一个要执行的任务。
  - **认证**: API Key。

- **`POST /api/bgi/report`**
  - **描述**: BGI-Agent 上报任务执行结果。
  - **认证**: API Key。
  - **请求体**: 包含任务结果的 `application/json`。

- **`POST /api/bgi/update-data`**
  - **描述**: BGI-Agent 更新游戏数据。
  - **认证**: API Key。
  - **请求体**: 包含新游戏数据的 `application/json`。

---

## 管理员接口 (`/api/admin`)

这部分接口用于后台管理和系统控制。

### BGI-Agent 使用

- **`POST /api/admin/heartbeat`**
  - **描述**: BGI-Agent 发送心跳以表示其在线状态。
  - **认证**: API Key。
  - **请求体**: `application/json`
    ```json
    {
      "machineId": "unique-machine-id",
      "status": "idle"
    }
    ```

### 前端管理面板使用

**以下接口需要 JWT (管理员) 认证。**

- **`GET /api/admin/status`**
  - **描述**: 获取系统状态，例如 BGI-Agent 的在线情况。

- **`POST /api/admin/wakeup`**
  - **描述**: 发送网络唤醒 (Wake-on-LAN) 命令到指定设备。

- **`POST /api/admin/shutdown`**
  - **描述**: 命令远程计算机执行关机。

- **`POST /api/admin/force-restart`**
  - **描述**: 强制重启 BGI-Agent 服务。

- **`POST /api/admin/plug/toggle`**
  - **描述**: 控制智能插座的开关状态。
  - **请求体**: `application/json`
    ```json
    {
      "host": "192.168.1.100",
      "state": "on" // or "off"
    }
    ```
- **`GET /api/admin/metadata`**
  - **描述**: 获取用于动态表单的字段选项 (例如下拉菜单内容)。

- **`POST /api/admin/metadata`**
  - **描述**: 添加一个新的字段选项。

- **`DELETE /api/admin/metadata/:id`**
  - **描述**: 删除一个字段选项。

- **`GET /api/admin/field-config`**
  - **描述**: 获取动态字段本身的配置 (如字段名、类型)。

- **`POST /api/admin/field-config`**
  - **描述**: 保存字段配置。

- **`DELETE /api/admin/field-config/:id`**
  - **描述**: 删除一个字段配置。

- **`POST /api/admin/schema/add-column`**
  - **描述**: 在数据库表中动态添加一个新的列。
  - **请求体**: `application/json`
    ```json
    {
      "tableName": "some_table",
      "columnName": "new_column",
      "columnType": "TEXT" // e.g., TEXT, INTEGER, etc.
    }
    ```
