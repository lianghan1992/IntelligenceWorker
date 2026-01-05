# 用户服务 (User Service) API 文档

提供管理用户、认证、订阅计划和个性化设置（如情报源和关注点）的全部功能。所有接口均以 `/api/user` 为前缀。

## 1. 认证 (Authentication)

管理用户的注册、登录和会话。

### 1.1 用户注册

创建一个新用户账户。

-   **路径:** `/api/user/register`
-   **方法:** `POST`
-   **认证:** 无
-   **Content-Type:** `application/json`

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `username` | string | 是 | 用户的唯一名称 |
| `email` | string | 是 | 用户的唯一邮箱地址 |
| `password` | string | 是 | 用户密码 |
| `plan_name` | string | 否 | 初始订阅计划的名称 (如 `free`, `pro`)，默认为 `free` |

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/api/user/register \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser111",
  "email": "test111@example.com",
  "password": "securepassword123",
  "plan_name": "free"
}'
```

**返回示例 (201 Created)**

返回新创建的用户公开信息。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "testuser",
  "email": "test@example.com",
  "is_active": true,
  "created_at": "2025-11-11T10:00:00Z"
}
```

### 1.2 用户登录

验证用户凭据并返回一个JWT访问令牌。

-   **路径:** `/api/user/login`
-   **方法:** `POST`
-   **认证:** 无
-   **Content-Type:** `application/json`

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 用户的邮箱地址 |
| `password` | string | 是 | 用户密码 |

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/api/user/login \
-H "Content-Type: application/json" \
-d '{
  "email": "test111@example.com",
  "password": "securepassword123"
}'
```

**返回示例 (200 OK)**

```json
{
  "message": "登录成功",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "testuser",
    "email": "test@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 获取当前用户信息

获取当前已认证用户的信息。

-   **路径:** `/api/user/me`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/api/user/me \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "testuser",
  "email": "test@example.com",
  "is_active": true,
  "created_at": "2025-11-11T10:00:00Z"
}
```

## 2. 用户管理 (Admin)

供管理员使用的用户管理接口。

### 2.1 获取用户列表

获取系统中的用户列表，支持分页、筛选和搜索。

-   **路径:** `/api/user/users`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (且有管理员权限)

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 请求的页码 |
| `size` | integer | 20 | 每页返回的数量 |
| `plan_name` | string | (无) | 按订阅计划名称筛选 (如 `free`, `pro`) |
| `status` | string | (无) | 按用户状态筛选 (`active` 或 `disabled`) |
| `search_term` | string | (无) | 模糊搜索关键词 (匹配用户名或邮箱) |

**cURL请求示例**
```bash
# 获取第一页，每页10个，筛选pro计划的活跃用户
curl -X GET "http://127.0.0.1:7657/api/user/users?page=1&size=10&plan_name=pro&status=active" \
-H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

```json
{
  "total": 50,
  "page": 1,
  "size": 10,
  "total_pages": 5,
  "items": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "username": "pro_user",
      "email": "pro@example.com",
      "plan_name": "专业版",
      "source_subscription_count": 10,
      "poi_count": 5,
      "status": "active",
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### 2.2 获取单个用户信息

获取指定ID用户的详细信息。

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (且有管理员权限)

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/api/user/users/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
-H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "username": "pro_user",
  "email": "pro@example.com",
  "plan_name": "专业版",
  "source_subscription_count": 10,
  "poi_count": 5,
  "status": "active",
  "created_at": "2025-10-01T12:00:00Z"
}
```

### 2.3 更新用户信息

更新指定ID用户的信息。

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `PUT`
-   **认证:** 需要Bearer Token (且有管理员权限)
-   **Content-Type:** `application/json`

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `username` | string | 否 | 新的用户名 |
| `email` | string | 否 | 新的邮箱地址 |
| `plan_name` | string | 否 | 新的订阅计划名称 (如 `pro`) |
| `status` | string | 否 | 新的用户状态 (`active` 或 `disabled`) |

**cURL请求示例**
```bash
curl -X PUT http://127.0.0.1:7657/api/user/users/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
-H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "plan_name": "enterprise",
  "status": "active"
}'
```

**返回示例 (200 OK)**

返回更新后的用户信息。

### 2.4 删除用户

删除指定ID的用户。

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token (且有管理员权限)

**cURL请求示例**
```bash
curl -X DELETE http://127.0.0.1:7657/api/user/users/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
-H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

**返回示例 (204 No Content)**

成功删除后，不返回任何内容。

## 3. 订阅计划 (Plans)

### 3.1 获取所有订阅计划

获取系统中所有可用的订阅计划及其配置。

-   **路径:** `/api/user/plans`
-   **方法:** `GET`
-   **认证:** 无

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/api/user/plans
```

**返回示例 (200 OK)**

```json
{
  "free": {
    "name": "免费版",
    "max_sources": 5,
    "max_pois": 3
  },
  "pro": {
    "name": "专业版",
    "max_sources": 50,
    "max_pois": 20
  },
  "enterprise": {
    "name": "企业版",
    "max_sources": -1,
    "max_pois": -1
  }
}
```

## 4. 用户个人资源管理

管理当前用户订阅的情报源和关注点。

### 4.1 获取我订阅的情报源

获取当前用户已订阅的所有情报源列表。

-   **路径:** `/api/user/me/sources`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/api/user/me/sources \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

```json
[
  {
    "id": "src-001",
    "source_name": "盖世汽车",
    "source_url": "https://auto.gasgoo.com/",
    "source_type": "official_site"
  },
  {
    "id": "src-002",
    "source_name": "佐思汽研",
    "source_url": "https://www.researchinchina.com/",
    "source_type": "research_institute"
  }
]
```

### 4.2 订阅新的情报源

为当前用户添加一个新的情报源订阅。

-   **路径:** `/api/user/me/sources/{source_id}`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/api/user/me/sources/src-003 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (201 Created)**

```json
{
  "message": "订阅成功"
}
```

### 4.3 取消情报源订阅

取消当前用户对某个情报源的订阅。

-   **路径:** `/api/user/me/sources/{source_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X DELETE http://127.0.0.1:7657/api/user/me/sources/src-003 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (204 No Content)**

成功取消后，不返回任何内容。

### 4.4 获取我的关注点

获取当前用户设置的所有关注点。

-   **路径:** `/api/user/me/pois`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/api/user/me/pois \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

```json
[
  {
    "id": "poi-001",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "content": "自动驾驶",
    "keywords": "L3,L4,毫米波雷达,激光雷达",
    "created_at": "2025-11-10T10:00:00Z"
  }
]
```

### 4.5 添加新的关注点

为当前用户创建一个新的关注点。

-   **路径:** `/api/user/me/pois`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `application/json`

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `content` | string | 是 | 关注点的主要内容/名称 |
| `keywords` | string | 是 | 相关的关键词，以逗号分隔 |

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/api/user/me/pois \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "content": "智能座舱",
  "keywords": "AR-HUD,OLED,高通8295"
}'
```

**返回示例 (201 Created)**

```json
{
  "id": "poi-002",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "content": "智能座舱",
  "keywords": "AR-HUD,OLED,高通8295",
  "created_at": "2025-11-11T11:00:00Z"
}
```

### 4.6 删除我的关注点

删除当前用户的某个关注点。

-   **路径:** `/api/user/me/pois/{poi_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X DELETE http://127.0.0.1:7657/api/user/me/pois/poi-002 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (204 No Content)**

成功删除后，不返回任何内容。

## 5. 用户详情 (Profile Details)

### 5.1 获取用户订阅与关注点详情

获取指定用户的订阅情报源和关注点列表的详细信息。

-   **路径:** `/api/user/users/{user_id}/profile/details`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/api/user/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890/profile/details \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "testuser",
  "intelligence_sources": {
    "count": 2,
    "items": [
      {
        "id": "src-001",
        "name": "盖世汽车"
      },
      {
        "id": "src-002",
        "name": "佐思汽研"
      }
    ]
  },
  "points_of_interest": {
    "count": 1,
    "items": [
      {
        "id": "poi-001",
        "content": "自动驾驶",
        "keywords": "L3,L4,毫米波雷达,激光雷达"
      }
    ]
  }
}
```
