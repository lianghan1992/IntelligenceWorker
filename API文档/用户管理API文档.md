## 1. 用户服务 (User Service)

所有用户服务相关的接口都以 `/users` 为前缀。

### 1.1. 用户注册 (已更新)

创建一个新用户账户。管理员可在后台创建时直接指定订阅计划。

-   **路径:** `/users/register`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `username` | string | 是 | 用户的唯一名称 |
| `email` | string | 是 | 用户的唯一邮箱地址 |
| `password` | string | 是 | 用户密码 |
| `plan_name`| string | 否 | 订阅计划名称 (如 "free", "premium")。默认为 "free"。 |

**请求示例 (JSON)**
```json
{
  "username": "testuser_premium",
  "email": "premium_user@example.com",
  "password": "a_very_strong_password",
  "plan_name": "premium"
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/users/register \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser_premium",
  "email": "premium_user@example.com",
  "password": "a_very_strong_password",
  "plan_name": "premium"
}'
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 新用户的唯一ID |
| `username` | string | 用户的名称 |
| `email` | string | 用户的邮箱 |
| `is_active` | boolean | 账户是否激活 |
| `created_at` | string | 账户创建时间 (ISO 8601) |

**返回示例 (201 Created)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "username": "testuser_premium",
  "email": "premium_user@example.com",
  "is_active": true,
  "created_at": "2025-10-10T10:00:00.000Z"
}
```

### 1.2. 用户登录 (已更新)

通过邮箱和密码进行身份验证，成功后返回 JWT `accessToken`。

-   **路径:** `/users/login`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 注册时使用的邮箱地址 |
| `password` | string | 是 | 用户密码 |

**请求示例 (JSON)**
```json
{
  "email": "user@example.com",
  "password": "a_strong_password"
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/users/login \
-H "Content-Type: application/json" \
-d '{
  "email": "user@example.com",
  "password": "a_strong_password"
}'
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `message` | string | 登录结果信息 |
| `user` | object | 登录用户的基本信息 |
| `user.id` | string | 登录用户的ID |
| `user.username` | string | 登录用户的名称 |
| `user.email` | string | 登录用户的邮箱 |
| `accessToken` | string | 用于后续认证的 JWT 令牌 |

**返回说明**

返回任务列表数组，每个任务对象包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务唯一标识符 |
| `event_name` | string | 事件名称 |
| `task_type` | string | 任务类型（live/video/summit） |
| `status` | string | 任务状态（pending/processing/completed/failed/stopped） |
| `created_at` | string | 任务创建时间（ISO 8601格式） |
| `updated_at` | string | 任务最后更新时间（ISO 8601格式） |
| `source_url` | string | 源URL或文件路径 |
| `event_date` | string | 事件日期（YYYY-MM-DD格式） |
| `prompt_name` | string | 使用的提示词名称 |

**返回示例 (200 OK)**
```json
{
  "message": "登录成功",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "username": "testuser",
    "email": "user@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..." 
}
```

### 1.3. 验证Token并获取当前用户信息 (新!)

前端在每次加载页面时，会使用这个接口来验证本地存储的 `accessToken` 是否有效，并获取当前登录用户的信息。

-   **路径:** `/users/me`
-   **方法:** `GET`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**cURL请求示例**
```bash
# 请将 <accessToken> 替换为实际的 JWT 令牌
curl -X GET http://127.0.0.1:7657/users/me \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..."
```

**返回说明**

返回当前令牌对应的用户信息。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 用户的唯一ID |
| `username` | string | 用户名 |
| `email` | string | 用户的邮箱地址 |
| `is_active` | boolean | 账户是否激活 |
| `created_at` | string | 账户创建时间 (ISO 8601) |

**返回示例 (200 OK)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "username": "testuser",
  "email": "user@example.com",
  "is_active": true,
  "created_at": "2025-10-10T10:00:00.000Z"
}
```

**失败返回 (401 Unauthorized)**

当 `accessToken` 无效、被篡改或已过期时，返回 401 Unauthorized。

```json
{
  "detail": "无法验证凭据"
}
```

### 1.4. 获取用户列表 (新!)

获取系统中的用户列表，支持筛选、搜索和分页。

-   **路径:** `/users/`
-   **方法:** `GET`

**请求参数**

| 参数 | 类型 | 是否必须 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `page` | integer | 否 | 1 | 页码 |
| `limit` | integer | 否 | 20 | 每页返回数量 |
| `plan_name` | string | 否 | - | 按订阅计划名称筛选 (如 "free", "premium") |
| `status` | string | 否 | - | 按账户状态筛选 (可选值: `active`, `disabled`) |
| `search_term` | string | 否 | - | 用于模糊搜索 `username` 或 `email` 的关键词 |

**cURL请求示例**
```bash
# 获取高级版、已激活的用户，并搜索包含 "test" 的用户
curl -X GET "http://127.0.0.1:7657/users/?plan_name=premium&status=active&search_term=test"
```

**返回说明**

返回一个包含分页信息和用户列表的对象。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `total` | integer | 满足条件的总用户数 |
| `page` | integer | 当前页码 |
| `limit` | integer | 每页数量 |
| `totalPages` | integer | 总页数 |
| `items` | array | 用户对象列表 |

**`items` 数组中用户对象的字段说明:**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 用户的唯一ID |
| `username` | string | 用户名 |
| `email` | string | 用户的邮箱地址 |
| `plan_name` | string | 用户当前的订阅计划名称 (例如: "免费版", "高级版") |
| `source_subscription_count` | integer | 用户订阅的情报源数量 |
| `poi_count` | integer | 用户创建的关注点 (POI) 数量 |
| `status` | string | 账户状态 (`active` 或 `disabled`) |
| `created_at` | string | 账户创建时间的 ISO 8601 字符串 |

**返回示例 (200 OK)**
```json
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "username": "testuser",
      "email": "user@example.com",
      "plan_name": "高级版",
      "source_subscription_count": 10,
      "poi_count": 5,
      "status": "active",
      "created_at": "2025-10-10T10:00:00.000Z"
    }
  ]
}
```

### 1.4. 获取单个用户信息 (新!)

获取指定 ID 用户的详细信息。

-   **路径:** `/users/{user_id}`
-   **方法:** `GET`

**cURL请求示例**
```bash
# 请将 {user_id} 替换为实际的用户ID
curl -X GET http://127.0.0.1:7657/users/a1b2c3d4-e5f6-7890-1234-567890abcdef
```

**返回说明**

返回单个用户对象，结构与 `GET /users/` 接口中 `items` 数组内的对象一致。

**返回示例 (200 OK)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "username": "testuser",
  "email": "user@example.com",
  "plan_name": "高级版",
  "source_subscription_count": 10,
  "poi_count": 5,
  "status": "active",
  "created_at": "2025-10-10T10:00:00.000Z"
}
```

### 1.5. 更新用户信息 (新!)

更新指定用户的信息，如用户名、邮箱、订阅计划或账户状态。

-   **路径:** `/users/{user_id}`
-   **方法:** `PUT`

**请求说明**

所有字段均为可选，只传入需要修改的字段。

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `username` | string | 否 | 新的用户名 |
| `email` | string | 否 | 新的邮箱地址 |
| `plan_name` | string | 否 | 新的订阅计划名称 (如 "free", "premium") |
| `status` | string | 否 | 新的账户状态 (`active` 或 `disabled`) |

**请求示例 (JSON)**
```json
{
  "plan_name": "free",
  "status": "disabled"
}
```

**cURL请求示例**
```bash
# 请将 {user_id} 替换为实际的用户ID
curl -X PUT http://127.0.0.1:7657/users/a1b2c3d4-e5f6-7890-1234-567890abcdef \
-H "Content-Type: application/json" \
-d '{
  "plan_name": "free",
  "status": "disabled"
}'
```

**返回说明**

返回更新后的完整用户对象，结构与 `GET /users/{user_id}` 一致。

### 1.6. 删除用户 (新!)

从系统中永久删除一个用户及其所有关联数据。

-   **路径:** `/users/{user_id}`
-   **方法:** `DELETE`

**cURL请求示例**
```bash
# 请将 {user_id} 替换为实际的用户ID
curl -X DELETE http://127.0.0.1:7657/users/a1b2c3d4-e5f6-7890-1234-567890abcdef
```

**返回说明**

-   **204 No Content:** 操作成功，返回空的响应体。
-   **404 Not Found:** 当提供的 `user_id` 不存在时。

### 1.7. 获取订阅计划

获取系统中所有可用的订阅计划配置。

-   **路径:** `/users/plans`
-   **方法:** `GET`

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/users/plans
```

**返回说明**

返回一个包含不同计划详情的JSON对象。

**返回示例 (200 OK)**
```json
{
  "free": {
    "name": "免费版",
    "max_sources": 5,
    "max_pois": 3
  },
  "premium": {
    "name": "高级版",
    "max_sources": 50,
    "max_pois": 20
  }
}
```

### 1.9. 获取用户订阅的情报源 (需认证)

获取当前登录用户已订阅的所有情报源列表。

-   **路径:** `/users/me/sources`
-   **方法:** `GET`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**cURL请求示例**
```bash
# 请将 <accessToken> 替换为实际的 JWT 令牌
curl -X GET http://127.0.0.1:7657/users/me/sources \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..."
```

**返回说明**

返回一个情报源对象列表。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 情报源ID |
| `source_name` | string | 情报源名称 |
| `subscription_count` | integer | 此情报源的总订阅数 |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

**返回示例 (200 OK)**
```json
[
  {
    "id": "c2d3e4f5-g6h7-8901-2345-bcdefa123456",
    "source_name": "盖世汽车",
    "subscription_count": 15,
    "created_at": "2025-10-09T08:00:00.000Z",
    "updated_at": "2025-10-10T12:00:00.000Z"
  }
]
```

### 1.10. 添加情报源订阅 (需认证)

为当前登录用户订阅一个新的情报源。

-   **路径:** `/users/me/sources/{source_id}`
-   **方法:** `POST`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**cURL请求示例**
```bash
# 请将 {source_id} 替换为实际的ID，<accessToken> 替换为实际的 JWT 令牌
curl -X POST http://127.0.0.1:7657/users/me/sources/c2d3e4f5-g6h7-8901-2345-bcdefa123456 \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..."
```

**返回示例 (201 Created)**
```json
{
  "message": "Subscription added successfully."
}
```

### 1.11. 取消情报源订阅 (需认证)

取消当前登录用户对某个情报源的订阅。

-   **路径:** `/users/me/sources/{source_id}`
-   **方法:** `DELETE`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**cURL请求示例**
```bash
# 请将 {source_id} 替换为实际的ID，<accessToken> 替换为实际的 JWT 令牌
curl -X DELETE http://127.0.0.1:7657/users/me/sources/c2d3e4f5-g6h7-8901-2345-bcdefa123456 \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..."
```

**返回说明**

-   **204 No Content:** 操作成功，返回空的响应体。

### 1.12. 获取用户关注点 (需认证)

获取当前登录用户创建的所有自定义关注点。

-   **路径:** `/users/me/pois`
-   **方法:** `GET`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**cURL请求示例**
```bash
# 请将 <accessToken> 替换为实际的 JWT 令牌
curl -X GET http://127.0.0.1:7657/users/me/pois \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..."
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 关注点ID |
| `user_id` | string | 用户ID |
| `content` | string | 关注点内容，如“自动驾驶” |
| `keywords` | string | 相关的关键词，逗号分隔 |
| `created_at` | string | 创建时间 |

**返回示例 (200 OK)**
```json
[
  {
    "id": "poi-a1b2c3d4",
    "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "content": "800V高压平台技术与应用",
    "keywords": "800V, 高压快充, 碳化硅, SiC",
    "created_at": "2025-10-11T09:00:00.000Z"
  }
]
```

### 1.13. 添加用户关注点 (需认证)

为当前登录用户创建一个新的关注点。

-   **路径:** `/users/me/pois`
-   **方法:** `POST`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `content` | string | 是 | 关注点内容 |
| `keywords` | string | 是 | 相关关键词 |

**请求示例 (JSON)**
```json
{
  "content": "800V高压平台技术与应用",
  "keywords": "800V, 高压快充, 碳化硅, SiC"
}
```

**cURL请求示例**
```bash
# 请将 <accessToken> 替换为实际的 JWT 令牌
curl -X POST http://127.0.0.1:7657/users/me/pois \
-H "Content-Type: application/json" \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..." \
-d '{
  "content": "800V高压平台技术与应用",
  "keywords": "800V, 高压快充, 碳化硅, SiC"
}'
```

**返回说明**

返回新创建的POI对象，结构与 `GET /{user_id}/pois` 一致。

### 1.14. 删除用户关注点 (需认证)

删除当前登录用户的一个关注点。

-   **路径:** `/users/me/pois/{poi_id}`
-   **方法:** `DELETE`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**cURL请求示例**
```bash
# 请将 {poi_id} 替换为实际的ID，<accessToken> 替换为实际的 JWT 令牌
curl -X DELETE http://127.0.0.1:7657/users/me/pois/poi-a1b2c3d4 \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..."
```

**返回说明**

-   **204 No Content:** 操作成功，返回空的响应体。

---