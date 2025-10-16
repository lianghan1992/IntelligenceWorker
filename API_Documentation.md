## 1. 目录
1.  [**用户服务 (User Service)**](#1-用户服务-user-service)
    *   [1.1. 用户注册 (已更新)](#11-用户注册-已更新)
    *   [1.2. 用户登录 (已更新)](#12-用户登录-已更新)
    *   [1.3. 验证Token并获取当前用户信息 (新!)](#13-验证token并获取当前用户信息-新)
    *   [1.4. 获取用户列表 (新!)](#14-获取用户列表-新)
    *   [1.5. 获取单个用户信息 (新!)](#15-获取单个用户信息-新)
    *   [1.6. 更新用户信息 (新!)](#16-更新用户信息-新)
    *   [1.7. 删除用户 (新!)](#17-删除用户-新)
    *   [1.8. 获取订阅计划](#18-获取订阅计划)
    *   [1.9. 获取用户订阅的情报源](#19-获取用户订阅的情报源)
    *   [1.10. 添加情报源订阅](#110-添加情报源订阅)
    *   [1.11. 取消情报源订阅](#111-取消情报源订阅)
    *   [1.12. 获取用户关注点](#112-获取用户关注点)
    *   [1.13. 添加用户关注点](#113-添加用户关注点)
    *   [1.14. 删除用户关注点](#114-删除用户关注点)
2.  [**情报服务 (Intelligence Service)**](#2-情报服务-intelligence-service)
    *   [2.1. 创建情报点 (已更新)](#21-创建情报点-已更新)
    *   [2.2. 获取情报点](#22-获取情报点)
    *   [2.3. 删除情报点 (已更新)](#23-删除情报点-已更新)
    *   [2.4. 获取所有情报源](#24-获取所有情报源)
    *   [2.5. 删除情报源](#25-删除情报源)
    *   [2.6. 查询处理任务](#26-查询处理任务)
    *   [2.7. 获取任务统计](#27-获取任务统计)
    *   [2.8. 查询已采集文章](#28-查询已采集文章)
    *   [2.9. 语义搜索文章](#29-语义搜索文章)
    *   [2.10. 组合筛选与语义搜索文章 (新!)](#210-组合筛选与语义搜索文章-新)
    *   [2.11. 获取情报信息流 (新!)](#211-获取情报信息流-新)
    *   [2.12. 提示词 (Prompts) 使用说明](#212-提示词-prompts-使用说明)
    *   [2.13. 获取所有提示词](#213-获取所有提示词)
    *   [2.14. 创建新提示词](#214-创建新提示词)
    *   [2.15. 更新提示词](#215-更新提示词)
    *   [2.16. 删除提示词](#216-删除提示词)
3.  [**直播分析服务 (Livestream Service) (新!)**](#3-直播分析服务-livestream-service-新)
    *   [3.1. 创建直播分析任务](#31-创建直播分析任务)
    *   [3.2. 创建视频分析任务](#32-创建视频分析任务)
    *   [3.3. 创建峰会图片集分析任务](#33-创建峰会图片集分析任务)
    *   [3.4. 获取任务列表](#34-获取任务列表)
    *   [3.5. 获取任务详情](#35-获取任务详情)
    *   [3.6. 获取任务结果文件](#36-获取任务结果文件)
    *   [3.7. 删除任务](#37-删除任务)
    *   [3.8. 启动任务](#38-启动任务)
    *   [3.9. 停止任务](#39-停止任务)
    *   [3.10. 获取Bililive服务信息](#310-获取bililive服务信息)
    *   [3.11. 获取Bililive服务状态](#311-获取bililive服务状态)

---

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

## 2. 情报服务 (Intelligence Service)

所有接口均以 `/intelligence` 为前缀。

### 2.1. 创建情报点 (需认证)

创建一个新的情报采集点。

-   **路径:** `/intelligence/points`
-   **方法:** `POST`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `source_name` | string | 是 | 情报源名称，如 "盖世汽车" |
| `point_name` | string | 是 | 具体情报点名称，如 "行业资讯" |
| `point_url` | string | 是 | 要采集的列表页URL |
| `cron_schedule` | string | 是 | CRON调度表达式，如 "0 */2 * * *" |
| `url_prompt_key` | string | 否 | URL提取提示词Key。默认 `default_list_parser` |
| `summary_prompt_key`| string | 否 | 内容总结提示词Key。默认 `default_summary` |

**请求示例 (JSON)**
```json
{
  "source_name": "盖世汽车",
  "point_name": "行业资讯",
  "point_url": "https://auto.gasgoo.com/news/C-101",
  "cron_schedule": "0 */2 * * *",
  "url_prompt_key": "news_site_style_a",
  "summary_prompt_key": "financial_report_summary"
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/intelligence/points \
-H "Content-Type: application/json" \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..." \
-d 
{
  "source_name": "盖世汽车",
  "point_name": "行业资讯",
  "point_url": "https://auto.gasgoo.com/news/C-101",
  "cron_schedule": "0 */2 * * *",
  "url_prompt_key": "news_site_style_a",
  "summary_prompt_key": "financial_report_summary"
}
```

**返回示例 (201 Created)**
```json
{
  "message": "Intelligence point created successfully",
  "point_id": "b1c2d3e4-f5g6-7890-1234-abcdef123456"
}
```

### 2.2. 获取情报点

根据情报源名称，获取其下的所有情报点。

-   **路径:** `/intelligence/points`
-   **方法:** `GET`

**请求参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `source_name` | string | 是 | 要查询的情报源名称 |

**cURL请求示例**
```bash
# 注意URL编码
curl -X GET "http://127.0.0.1:7657/intelligence/points?source_name=%E7%9B%96%E4%B8%96%E6%B1%BD%E8%BD%A6"
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 情报点ID |
| `source_id` | string | 所属情报源ID |
| `source_name` | string | 所属情报源名称 |
| `point_name` | string | 情报点名称 |
| `point_url` | string | 情报点URL |
| `cron_schedule` | string | CRON调度表达式 |
| `is_active` | boolean | 是否激活 |
| `last_triggered_at`| string / null | 上次触发时间 |
| `url_prompt_key` | string | URL提取提示词Key |
| `summary_prompt_key`| string | 内容总结提示词Key |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

**返回示例 (200 OK)**
```json
[
  {
    "id": "b1c2d3e4-f5g6-7890-1234-abcdef123456",
    "source_id": "c2d3e4f5-g6h7-8901-2345-bcdefa123456",
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "point_url": "https://auto.gasgoo.com/news/C-101",
    "cron_schedule": "0 */2 * * *",
    "is_active": 1,
    "last_triggered_at": null,
    "url_prompt_key": "news_site_style_a",
    "summary_prompt_key": "financial_report_summary",
    "created_at": "2025-10-10T11:00:00.000Z",
    "updated_at": "2025-10-10T11:00:00.000Z"
  }
]
```

### 2.3. 删除情报点 (需认证)

根据ID列表批量删除情报点。

-   **路径:** `/intelligence/points`
-   **方法:** `DELETE`

**请求头**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | string | 是 | `Bearer <accessToken>` 格式的 JWT 令牌 |

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `point_ids` | array[string] | 是 | 要删除的情报点ID列表 |

**请求示例 (JSON)**
```json
{
  "point_ids": [
    "b1c2d3e4-f5g6-7890-1234-abcdef123456"
  ]
}
```

**cURL请求示例**
```bash
curl -X DELETE http://127.0.0.1:7657/intelligence/points \
-H "Content-Type: application/json" \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTFiMm..." \
-d 
{
  "point_ids": [
    "b1c2d3e4-f5g6-7890-1234-abcdef123456"
  ]
}
```

**返回示例 (200 OK)**
```json
{
  "message": "Successfully deleted 1 intelligence point(s)."
}
```

### 2.4. 获取所有情报源

获取系统中的所有顶级情报源及其包含的情报点数量。

-   **路径:** `/intelligence/sources`
-   **方法:** `GET`

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/intelligence/sources
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 情报源ID |
| `source_name` | string | 情报源名称 |
| `points_count` | integer | 该情报源下的情报点数量 |

**返回示例 (200 OK)**
```json
[
  {
    "id": "c2d3e4f5-g6h7-8901-2345-bcdefa123456",
    "source_name": "盖世汽车",
    "points_count": 5
  }
]
```

### 2.5. 删除情报源

删除一个情报源及其下所有关联的情报点。

-   **路径:** `/intelligence/sources/{source_name}`
-   **方法:** `DELETE`

**cURL请求示例**
```bash
# 注意URL编码
curl -X DELETE "http://127.0.0.1:7657/intelligence/sources/%E7%9B%96%E4%B8%96%E6%B1%BD%E8%BD%A6"
```

**返回示例 (200 OK)**
```json
{
  "message": "Source '盖世汽车' and its 5 associated points were deleted."
}
```

### 2.6. 查询处理任务

获取处理任务列表，支持分页和过滤。

-   **路径:** `/intelligence/tasks`
-   **方法:** `GET`

**请求参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `source_name` | string | 否 | 按情报源名称过滤 |
| `point_name` | string | 否 | 按情报点名称过滤 |
| `status` | string | 否 | 按任务状态过滤 |
| `page` | integer | 否 | 页码，默认1 |
| `limit` | integer | 否 | 每页数量，默认20 |

**cURL请求示例**
```bash
curl -X GET "http://127.0.0.1:7657/intelligence/tasks?source_name=%E7%9B%96%E4%B8%96%E6%B1%BD%E8%BD%A6&status=completed&page=1&limit=5"
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `total` | integer | 任务总数 |
| `page` | integer | 当前页码 |
| `limit` | integer | 每页数量 |
| `items` | array | 任务对象列表 |

**返回示例 (200 OK)**
```json
{
  "total": 100,
  "page": 1,
  "limit": 5,
  "items": [
    {
      "id": "f6g7h8i9-j0k1-2345-6789-efabcd456789",
      "point_id": "b1c2d3e4-f5g6-7890-1234-abcdef123456",
      "source_name": "盖世汽车",
      "point_name": "行业资讯",
      "task_type": "scrape",
      "url": "https://auto.gasgoo.com/news/202510/10I70370370.shtml",
      "status": "completed",
      "payload": null,
      "created_at": "2025-10-10T13:05:00.000Z",
      "updated_at": "2025-10-10T13:06:00.000Z"
    }
  ]
}
```

### 2.7. 获取任务统计

获取采集任务队列中各种状态的任务数量统计。

-   **路径:** `/intelligence/tasks/stats`
-   **方法:** `GET`

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/intelligence/tasks/stats
```

**返回示例 (200 OK)**
```json
{
  "completed": 1342,
  "processing": 43,
  "failed": 12,
  "pending_jina": 10,
  "total": 1407
}
```

### 2.8. 查询已采集文章

获取已采集的文章列表，支持分页和过滤。

-   **路径:** `/intelligence/articles`
-   **方法:** `GET`

**请求参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `source_name` | string | 否 | 按情报源名称过滤 |
| `point_name` | string | 否 | 按情报点名称过滤 |
| `point_ids` | array[string] | 否 | 按一个或多个情报点ID过滤 |
| `publish_date_start` | string | 否 | 发布日期范围的起始点 (格式: YYYY-MM-DD) |
| `publish_date_end` | string | 否 | 发布日期范围的结束点 (格式: YYYY-MM-DD) |
| `page` | integer | 否 | 页码，默认1 |
| `limit` | integer | 否 | 每页数量，默认20 |

> **⚠️ 使用限制**
> 当使用 `point_ids` 参数进行筛选且ID数量过多（例如超过50个）时，可能会导致URL过长而请求失败。在这种情况下，强烈建议使用更强大和稳健的 `POST /intelligence/search/articles_filtered` 接口。

**cURL请求示例**
```bash
curl -X GET "http://127.0.0.1:7657/intelligence/articles?source_name=%E7%9B%96%E4%B8%96%E6%B1%BD%E8%BD%A6&page=1&limit=5"
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `total` | integer | 文章总数 |
| `page` | integer | 当前页码 |
| `limit` | integer | 每页数量 |
| `items` | array | 文章对象列表 |

**返回示例 (200 OK)**
```json
{
  "total": 50,
  "page": 1,
  "limit": 5,
  "items": [
    {
      "id": "e5f6g7h8-i9j0-1234-5678-defabc345678",
      "point_id": "b1c2d3e4-f5g6-7890-1234-abcdef123456",
      "source_name": "盖世汽车",
      "point_name": "行业资讯",
      "title": "比亚迪发布全新刀片电池，续航突破1000公里",
      "original_url": "https://auto.gasgoo.com/news/202510/10I70370370.shtml",
      "publish_date": "2025-10-10",
      "content": "文章内容...",
      "created_at": "2025-10-10T13:10:00.000Z",
      "summary": "本文介绍了比亚迪最新发布的刀片电池技术，该技术将电动汽车的续航里程提升至1000公里以上，对新能源汽车市场将产生重要影响。",
      "keywords": "比亚迪,刀片电池,新能源汽车,续航里程",
      "influence_score": 8,
      "sentiment": "positive",
      "entities": "[\"比亚迪\", \"刀片电池\"]"
    }
  ]
}
```

### 2.9. 语义搜索文章

在指定情报点的文章中执行简单的语义搜索。

-   **路径:** `/intelligence/search/articles`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `query_text` | string | 是 | 用于搜索的自然语言文本 |
| `point_ids` | array[string] | 是 | 限定搜索范围的情报点ID列表 |

**请求参数**

| 参数 | 类型 | 是否必须 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `top_k` | integer | 否 | 5 | 返回最相关的结果数量 |

**cURL请求示例**
```bash
curl -X POST "http://127.0.0.1:7657/intelligence/search/articles?top_k=3" \
-H "Content-Type: application/json" \
-d 
{
  "query_text": "比亚迪电池技术",
  "point_ids": ["b1c2d3e4-f5g6-7890-1234-abcdef123456"]
}
```

**返回示例 (200 OK)**
```json
[
  {
    "id": "e5f6g7h8-i9j0-1234-5678-defabc345678",
    "title": "比亚迪发布全新刀片电池，续航突破1000公里",
    "original_url": "https://auto.gasgoo.com/news/202510/10I70370370.shtml",
    "publish_date": "2025-10-10",
    "similarity_score": 0.912
  }
]
```

### 2.10. 组合筛选与语义搜索文章 (新!)

在一个请求中同时传入语义搜索查询和结构化筛选条件，实现复杂的组合查询，并返回分页结果。

-   **路径:** `/intelligence/search/articles_filtered`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `query_text` | string | 是 | - | **[验证规则]** 搜索关键词，不能为空字符串，至少需要一个字符。 |
| `similarity_threshold` | number | 否 | 0.5 | 相似度得分阈值 (0.0-1.0) |
| `point_ids` | array[string] | 否 | - | 按一个或多个情报点ID过滤 |
| `source_names` | array[string] | 否 | - | 按一个或多个情报源名称过滤 |
| `publish_date_start` | string | 否 | - | 发布日期范围的起始点 (格式: YYYY-MM-DD) |
| `publish_date_end` | string | 否 | - | 发布日期范围的结束点 (格式: YYYY-MM-DD) |
| `page` | integer | 否 | 1 | 页码 |
| `limit` | integer | 否 | 20 | 每页数量 |

**使用场景 1：关键词搜索与筛选**

**请求示例 (JSON)**
```json
{
  "query_text": "特斯拉最新技术动态",
  "similarity_threshold": 0.5,
  "source_names": ["盖世汽车"],
  "publish_date_start": "2023-10-01",
  "page": 1,
  "limit": 5
}
```

**使用场景 2：仅筛选，不进行语义搜索**

当您不需要进行关键词搜索，只想根据 `point_ids` 或其他条件筛选文章时（例如：获取用户订阅的所有情报点的最新文章），`query_text` 字段必须传递一个通配符，例如星号 `*`。

**请求示例 (JSON)**
```json
{
  "query_text": "*",
  "point_ids": ["b1c2d3e4-f5g6-7890-1234-abcdef123456", "another-point-id"],
  "page": 1,
  "limit": 20
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/intelligence/search/articles_filtered \
-H "Content-Type: application/json" \
-d 
{
  "query_text": "特斯拉最新技术动态",
  "similarity_threshold": 0.5,
  "source_names": ["盖世汽车"],
  "publish_date_start": "2023-10-01",
  "page": 1,
  "limit": 5
}
```

**返回说明**

返回结构与 `/intelligence/articles` 接口类似，但 `items` 列表中的每个文章对象都额外包含 `similarity_score` 字段。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `total` | integer | 满足所有条件的文章总数 |
| `page` | integer | 当前页码 |
| `limit` | integer | 每页数量 |
| `items` | array | 文章结果对象列表 |

**返回示例 (200 OK)**
```json
{
  "total": 15,
  "page": 1,
  "limit": 5,
  "items": [
    {
      "id": "g7h8i9j0-k1l2-3456-7890-fabcde567890",
      "point_id": "b1c2d3e4-f5g6-7890-1234-abcdef123456",
      "source_name": "盖世汽车",
      "point_name": "行业资讯",
      "title": "特斯拉FSD V12进入中国市场测试",
      "original_url": "https://auto.gasgoo.com/news/202310/08I70370350.shtml",
      "publish_date": "2023-10-08",
      "content": "文章内容...",
      "created_at": "2023-10-08T14:00:00.000Z",
      "similarity_score": 0.899
    }
  ]
}
```

### 2.11. 提示词 (Prompts) 使用说明

在情报服务中，**提示词 (Prompts)** 是预定义或用户自定义的指令模板，用于指导大型语言模型 (LLM) 执行特定的文本处理任务。它们是实现灵活和可配置情报采集与分析的关键。

主要有两种类型的提示词：

1.  **URL 提取提示词 (`url_extraction_prompts`)**:
    *   **用途**: 当系统从一个情报点 (例如一个新闻列表页) 抓取 HTML 内容后，需要从中识别并提取出具体的文章链接时使用。
    *   **工作原理**: 这些提示词会提供给 LLM，指导它如何解析 HTML 结构，找到并返回符合特定模式 (如新闻标题链接) 的 URL 列表。
    *   **示例**: `default_list_parser` 是一个通用的 URL 提取提示词，而您可以创建更具体的提示词来适应不同网站的 HTML 结构。

2.  **内容总结提示词 (`content_summary_prompts`)**:
    *   **用途**: 当系统成功采集到一篇文章的完整内容后，需要对文章进行摘要、提取关键信息或生成结构化数据时使用。
    *   **工作原理**: 这些提示词会提供给 LLM，指导它如何阅读文章内容，并根据预设的指令 (如“总结文章主旨”、“提取核心观点”) 生成简洁、准确的输出。
    *   **示例**: `default_summary` 是一个通用的文章摘要提示词，您也可以创建专门用于提取特定领域信息 (如财务报告关键数据) 的提示词。

前端开发者在创建或更新情报点时，可以通过 `url_prompt_key` 和 `summary_prompt_key` 字段指定要使用的提示词。这些 Key 对应着 `GET /intelligence/prompts` 接口返回的提示词配置中的键名。通过选择不同的提示词，可以灵活地调整情报采集和处理的行为，以适应不同的数据源和分析需求。

---

### 2.11. 获取所有提示词

返回 `prompts.json` 文件中的所有内容。

-   **路径:** `/intelligence/prompts`
-   **方法:** `GET`

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/intelligence/prompts
```

**返回示例 (200 OK)**
```json
{
  "url_extraction_prompts": {
    "default_list_parser": {
      "name": "默认列表解析器",
      "description": "一个通用的、稳健的URL列表提取器。",
      "prompt": "..."
    }
  },
  "content_summary_prompts": {
    "default_summary": {
      "name": "默认摘要生成器",
      "description": "一个通用的、稳健的文章摘要生成器。",
      "prompt": "..."
    }
  }
}
```

### 2.12. 创建新提示词

在指定的类型下创建一个新的提示词。

-   **路径:** `/intelligence/prompts/{prompt_type}/{prompt_key}`
-   **方法:** `POST`

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `prompt_type` | string | 必须是 `url_extraction_prompts` 或 `content_summary_prompts` |
| `prompt_key` | string | 新提示词的唯一标识符 |

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 提示词的显示名称 |
| `description`| string | 是 | 提示词功能的简短描述 |
| `prompt` | string | 是 | 完整的提示词内容 |

**请求示例 (JSON)**
```json
{
  "name": "财经新闻解析器",
  "description": "专门用于解析财经网站文章列表页。",
  "prompt": "请从以下HTML中提取所有新闻文章的URL..."
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/intelligence/prompts/url_extraction_prompts/custom_parser_1 \
-H "Content-Type: application/json" \
-d 
{
  "name": "财经新闻解析器",
  "description": "专门用于解析财经网站文章列表页。",
  "prompt": "请从以下HTML中提取所有新闻文章的URL..."
}
```

**返回示例 (201 Created)**
```json
{
  "message": "Prompt created successfully."
}
```

### 2.13. 更新提示词

更新一个现有提示词的名称、描述或内容。

-   **路径:** `/intelligence/prompts/{prompt_type}/{prompt_key}`
-   **方法:** `PUT`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 否 | 新的显示名称 |
| `description`| string | 否 | 新的描述 |
| `prompt` | string | 否 | 新的提示词内容 |

**请求示例 (JSON)**
```json
{
  "name": "更新-财经新闻解析器"
}
```

**cURL请求示例**
```bash
curl -X PUT http://127.0.0.1:7657/intelligence/prompts/url_extraction_prompts/custom_parser_1 \
-H "Content-Type: application/json" \
-d 
{
  "name": "更新-财经新闻解析器"
}
```

**返回示例 (200 OK)**
```json
{
  "message": "Prompt updated successfully."
}
```

### 2.16. 删除提示词

删除一个指定的提示词（默认提示词无法删除）。

-   **路径:** `/intelligence/prompts/{prompt_type}/{prompt_key}`
-   **方法:** `DELETE`

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `prompt_type` | string | 提示词类型 |
| `prompt_key` | string | 提示词键名 |

**返回示例 (200 OK)**
```json
{
  "message": "Prompt deleted successfully."
}
```

---

## 3. 直播分析服务 (Livestream Service) (新!)

直播分析服务提供对直播内容、视频文件和峰会图片集的智能分析功能。所有接口都以 `/livestream` 为前缀，需要用户认证。

### 3.1. 创建直播分析任务

创建一个新的直播分析任务，用于分析指定的直播流。任务创建后，后台会自动同步到 bililive 服务进行监控和录制。

-   **路径:** `/livestream/tasks/live`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
|------|------|----------|------|
| `url` | string | 是 | 直播间URL地址 |
| `event_name` | string | 是 | 事件名称 |
| `event_date` | string | 是 | 事件日期 (YYYY-MM-DD格式) |
| `prompt_file` | string | 否 | 分析提示词文件名 |

**请求示例**
```bash
curl -X POST "http://localhost:7657/livestream/tasks/live" \
-H "Authorization: Bearer YOUR_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "url": "https://live.bilibili.com/8178490",
  "event_name": "汽车发布会直播分析",
  "event_date": "2025-10-15",
  "prompt_file": "car_launch_event.md"
}'
```

**返回示例 (200 OK)**
```json
{
  "task_id": "task_123456",
  "message": "Live analysis task created successfully"
}
```

### 3.2. 创建视频分析任务

创建一个新的视频分析任务，用于分析服务器本地的视频文件。

-   **路径:** `/livestream/tasks/video`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
|------|------|----------|------|
| `video_path` | string | 是 | 服务器本地视频文件的绝对路径 |
| `event_name` | string | 是 | 事件名称 |
| `event_date` | string | 是 | 事件日期 (YYYY-MM-DD格式) |
| `prompt_file` | string | 否 | 分析提示词文件名 |

**请求示例**
```bash
curl -X POST "http://localhost:7657/livestream/tasks/video" \
-H "Authorization: Bearer YOUR_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "video_path": "/path/to/your/video.mp4",
  "event_name": "XX品牌2025秋季新品发布会",
  "event_date": "2025-10-20",
  "prompt_file": "car_launch_event.md"
}'
```

**返回示例 (200 OK)**
```json
{
  "task_id": "task_789012",
  "message": "Video analysis task created successfully"
}
```

### 3.3. 创建峰会图片集分析任务

创建一个新的峰会图片集分析任务，用于分析服务器本地文件夹中的图片集合。

-   **路径:** `/livestream/tasks/summit`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
|------|------|----------|------|
| `images_directory` | string | 是 | 服务器本地图片文件夹的绝对路径 |
| `event_name` | string | 是 | 事件名称 |
| `event_date` | string | 是 | 事件日期 (YYYY-MM-DD格式) |
| `prompt_file` | string | 否 | 分析提示词文件名 |

**请求示例**
```bash
curl -X POST "http://localhost:7657/livestream/tasks/summit" \
-H "Authorization: Bearer YOUR_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "images_directory": "/path/to/summit/images",
  "event_name": "2025汽车行业峰会",
  "event_date": "2025-11-15",
  "prompt_file": "summit_analysis.md"
}'
```

**返回示例 (200 OK)**
```json
{
  "task_id": "task_345678",
  "message": "Summit analysis task created successfully"
}
```

### 3.4. 获取任务列表

获取当前用户的所有分析任务列表。

-   **路径:** `/livestream/tasks`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**请求示例**
```bash
curl -X GET "http://localhost:7657/livestream/tasks" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
[
  {
    "task_id": "task_123456",
    "event_name": "汽车发布会直播分析",
    "task_type": "live",
    "status": "completed",
    "created_at": "2024-01-15T10:30:00Z",
    "started_at": "2024-01-15T10:35:00Z",
    "completed_at": "2024-01-15T11:45:00Z",
    "source_url": "https://live.bilibili.com/8178490",
    "event_date": "2025-10-15",
    "prompt_file_path": "car_launch_event.md",
    "output_directory": "/path/to/output",
    "discovered_host_name": "某汽车品牌官方",
    "discovered_room_name": "新车发布会直播间",
    "platform_name": "哔哩哔哩"
  },
  {
    "task_id": "task_789012",
    "event_name": "汽车测评视频分析",
    "task_type": "video",
    "status": "processing",
    "created_at": "2024-01-15T14:20:00Z",
    "started_at": "2024-01-15T14:25:00Z",
    "completed_at": null,
    "source_url": "/path/to/video.mp4",
    "event_date": "2025-10-20",
    "prompt_file_path": "car_review.md",
    "output_directory": "/path/to/output2"
  }
]
```

### 3.5. 获取任务详情

获取指定任务的详细信息。

-   **路径:** `/livestream/tasks/{task_id}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务ID |

**请求示例**
```bash
curl -X GET "http://localhost:7657/livestream/tasks/task_123456" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "task_id": "task_123456",
  "event_name": "汽车发布会直播分析",
  "task_type": "live",
  "status": "completed",
  "created_at": "2024-01-15T10:30:00Z",
  "started_at": "2024-01-15T10:35:00Z",
  "completed_at": "2024-01-15T11:45:00Z",
  "source_url": "https://live.bilibili.com/8178490",
  "event_date": "2025-10-15",
  "prompt_file_path": "car_launch_event.md",
  "output_directory": "/path/to/output",
  "discovered_host_name": "某汽车品牌官方",
  "discovered_room_name": "新车发布会直播间",
  "platform_name": "哔哩哔哩",
  "results": {
    "summary_available": true,
    "detailed_report_available": true,
    "pdf_available": true
  }
}
```

### 3.6. 获取任务结果文件

下载指定任务的结果文件。

-   **路径:** `/livestream/tasks/{task_id}/results/{file_type}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务ID |
| `file_type` | string | 文件类型：summary（摘要）、detailed（详细报告）、pdf（PDF报告） |

**请求示例**
```bash
curl -X GET "http://localhost:7657/livestream/tasks/task_123456/results/summary" \
-H "Authorization: Bearer YOUR_TOKEN" \
-o summary.txt
```

**返回说明**
- 成功时返回对应的文件内容
- 文件不存在时返回404错误

### 3.7. 删除任务

删除指定的分析任务及其相关文件。

-   **路径:** `/livestream/tasks/{task_id}/delete`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务ID |

**请求示例**
```bash
curl -X POST "http://localhost:7657/livestream/tasks/task_123456/delete" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "message": "Task deleted successfully"
}
```

### 3.8. 启动任务

启动指定的分析任务。

-   **路径:** `/livestream/tasks/{task_id}/start`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务ID |

**请求示例**
```bash
curl -X POST "http://localhost:7657/livestream/tasks/task_123456/start" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "message": "Task started successfully"
}
```

### 3.9. 停止任务

停止正在运行的分析任务。

-   **路径:** `/livestream/tasks/{task_id}/stop`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 任务ID |

**请求示例**
```bash
curl -X POST "http://localhost:7657/livestream/tasks/task_123456/stop" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "message": "Task stopped successfully"
}
```

### 3.10. 获取Bililive服务信息

获取Bililive服务的基本信息和配置。

-   **路径:** `/livestream/services/bililive/info`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**请求示例**
```bash
curl -X GET "http://localhost:7657/livestream/services/bililive/info" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "service_name": "Bililive Recording Service",
  "version": "1.0.0",
  "status": "running",
  "supported_platforms": ["bilibili"],
  "max_concurrent_streams": 5
}
```

### 3.11. 获取Bililive服务状态

获取Bililive服务的当前运行状态。

-   **路径:** `/livestream/services/bililive/status`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**请求示例**
```bash
curl -X GET "http://localhost:7657/livestream/services/bililive/status" \
-H "Authorization: Bearer YOUR_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "status": "running",
  "active_streams": 2,
  "total_recorded_duration": "4h 32m",
  "last_health_check": "2024-01-15T15:30:00Z",
  "disk_usage": {
    "used": "2.5GB",
    "available": "47.5GB"
  }
}
```

---

## 错误响应格式

所有API在出现错误时都会返回统一的错误格式：

```json
{
  "detail": "错误描述信息"
}
```

常见的HTTP状态码：
- `200`: 请求成功
- `400`: 请求参数错误
- `401`: 未认证或认证失败
- `403`: 权限不足
- `404`: 资源不存在
- `422`: 请求数据验证失败
- `500`: 服务器内部错误

**cURL请求示例**
```bash
curl -X DELETE http://127.0.0.1:7657/intelligence/prompts/url_extraction_prompts/custom_parser_1
```

**返回示例 (200 OK)**
```json
{
  "message": "Prompt deleted successfully."
}
```