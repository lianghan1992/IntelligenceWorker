# User Service API Documentation

## 1. 概述

User Service 负责用户身份认证、账户管理、钱包与支付、订阅管理以及用户活动追踪。

### 1.1 基础URL
所有API的基础路径为 `/api/user`。

### 1.2 认证方式
大多数接口需要 Bearer Token 认证。在 Header 中添加：
`Authorization: Bearer <access_token>`

### 1.3 交易类型说明 (Transaction Types)

钱包流水中的 `transaction_type` 字段可能包含以下值：

| 类型代码 (transaction_type) | 说明 | 备注 |
| :--- | :--- | :--- |
| `ai_consumption` | AI 模型调用消耗 | 调用 StratifyAI 生成内容时的扣费 |
| `recharge` | 用户充值 | 用户通过支付网关充值 |
| `gift` | 系统赠送 | 注册奖励、活动赠送等 |
| `refund` | 退款 | 失败任务或其他原因的退款 |
| `pdf_download` | PDF 下载消耗 | 下载付费研报 PDF 时的扣费 |

## 2. 身份认证与账户 (Auth & Account)

管理用户的注册、登录和会话。

### 1.1 用户注册

创建一个新用户账户。注册成功后，用户将获得 **1.00 CNY** 的初始赠送余额。

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
| `plan_name` | string | 否 | 初始订阅计划的名称 (如 `free`), 默认为 `free` |

**返回示例**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "johndoe@example.com",
  "is_active": true,
  "created_at": "2023-10-27T10:00:00Z"
}
```

### 1.2 用户登录

验证用户凭据并返回一个JWT访问令牌。

-   **路径:** `/api/user/login`
-   **方法:** `POST`
-   **Content-Type:** `application/json`

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 用户邮箱 |
| `password` | string | 是 | 用户密码 |

**返回示例**

```json
{
  "message": "登录成功",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "johndoe@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 获取当前用户信息

获取当前已认证用户的信息。

-   **路径:** `/api/user/me`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "johndoe@example.com",
  "is_active": true,
  "created_at": "2023-10-27T10:00:00Z"
}
```

## 2. 个人资源管理 (Personal Resources)

管理当前用户的订阅和关注点。

### 2.1 获取我的 AI 使用记录

获取当前用户的 AI 消费历史记录。

-   **路径:** `/api/user/usage/my`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token
-   **参数:**
    - `limit`: 返回记录数量 (默认 50)

**返回示例**

```json
[
  {
    "id": "tx-123456",
    "amount": -0.05,
    "balance_after": 0.95,
    "transaction_type": "ai_consumption",
    "description": "AI Usage: openrouter/gpt-4",
    "meta_data": "{\"model\": \"gpt-4\", \"tokens\": 150}",
    "created_at": "2023-10-27T12:00:00Z"
  }
]
```

### 2.3 获取我的配额信息 (Quota)

获取当前用户的配额与余额信息。

-   **路径:** `/api/user/usage/quota`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "balance": 1.00,
  "plan_name": "free",
  "remaining_balance": 1.00
}
```

### 2.4 获取我的总消费统计

获取用户的总充值、总消费及Token消耗统计。

-   **路径:** `/api/user/usage/stats`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "total_recharge": 100.00,
  "total_consumption": 50.50,
  "total_consumption_tokens": 15000,
  "total_input_tokens": 10000,
  "total_output_tokens": 5000,
  "total_api_calls": 120
}
```

### 2.5 获取我订阅的情报源

-   **路径:** `/api/user/me/sources`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
[
  {
    "uuid": "src-001",
    "name": "Automotive News",
    "base_url": "https://example.com",
    "source_type": "news",
    "status": "active"
  }
]
```

### 2.3 获取我订阅的情报源

-   **路径:** `/api/user/me/sources`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
[
  {
    "uuid": "src-001",
    "name": "Automotive News",
    "base_url": "https://example.com",
    "source_type": "news",
    "status": "active"
  }
]
```

### 2.6 订阅新的情报源

-   **路径:** `/api/user/me/sources/{source_id}`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

### 2.7 取消情报源订阅

-   **路径:** `/api/user/me/sources/{source_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

### 2.8 获取我的关注点 (POIs)

-   **路径:** `/api/user/me/pois`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
[
  {
    "id": "uuid-poi-001",
    "user_id": "uuid-user-123",
    "content": "关注电动汽车电池技术的发展趋势",
    "keywords": "EV, Battery, Lithium",
    "created_at": "2023-10-27T10:00:00Z"
  },
  {
    "id": "uuid-poi-002",
    "user_id": "uuid-user-123",
    "content": "自动驾驶政策法规",
    "keywords": "Autonomous Driving, Policy, Regulation",
    "created_at": "2023-10-28T14:30:00Z"
  }
]
```

**返回字段说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 关注点唯一ID |
| `user_id` | string | 用户ID |
| `content` | string | 关注的具体内容描述 |
| `keywords` | string | 提取的关键词 (通常为逗号分隔) |
| `created_at` | string | 创建时间 (ISO 8601) |

### 2.9 添加新的关注点

-   **路径:** `/api/user/me/pois`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `content` | string | 是 | 关注点描述，例如"新能源汽车销量分析" |
| `keywords` | string | 是 | 关键词 (逗号分隔)，例如"NEV, Sales, Analysis" |

**请求示例**

```json
{
  "content": "关注特斯拉在中国市场的定价策略",
  "keywords": "Tesla, China, Pricing, Strategy"
}
```

**返回示例**

```json
{
  "id": "uuid-new-poi",
  "user_id": "uuid-user-123",
  "content": "关注特斯拉在中国市场的定价策略",
  "keywords": "Tesla, China, Pricing, Strategy",
  "created_at": "2023-11-01T09:00:00Z"
}
```

### 2.10 删除关注点

-   **路径:** `/api/user/me/pois/{poi_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

**参数说明**

| 参数名 | 位置 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `poi_id` | Path | string | 要删除的关注点ID |

**返回**

-   `204 No Content`: 删除成功
-   `404 Not Found`: 关注点不存在或无权删除

## 3. 用户管理 (Admin)

供管理员使用的用户管理接口。

### 3.1 获取用户列表

-   **路径:** `/api/user/users`
-   **方法:** `GET`
-   **认证:** 需要管理员权限
-   **参数:**
    - `page`: 页码 (默认1)
    - `size`: 每页数量 (默认20)
    - `plan_name`: (可选) 筛选订阅计划
    - `status`: (可选) 筛选状态 (active/disabled)
    - `search_term`: (可选) 搜索用户名或邮箱

**返回示例**

```json
{
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "items": [
    {
      "id": "user-123",
      "username": "alice",
      "email": "alice@example.com",
      "plan_name": "Pro Plan",
      "source_subscription_count": 5,
      "poi_count": 2,
      "status": "active",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### 3.2 获取单个用户信息

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `GET`

### 3.3 更新用户信息

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `PUT`
-   **请求体 (JSON):** 包含 `username`, `email`, `plan_name`, `status` 等可选字段。

### 3.4 删除用户

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `DELETE`
-   **说明:** 删除用户及其所有关联数据 (订阅、关注点、交易记录、订单等)。

### 3.4 获取所有交易流水 (管理)

管理员获取所有用户的钱包交易流水。支持分页与筛选。

-   **路径:** `/api/user/admin/transactions`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (需管理员权限)

**查询参数 (Query Parameters)**

| 参数名 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 否 | 页码 (默认 1) |
| `size` | integer | 否 | 每页数量 (默认 20) |
| `user_id` | string | 否 | 筛选特定用户ID |

**返回示例**

```json
{
  "total": 1024,
  "page": 1,
  "limit": 20,
  "totalPages": 52,
  "items": [
    {
      "id": "uuid-tx-001",
      "user_id": "uuid-user-123",
      "amount": -0.50,
      "balance_after": 99.50,
      "transaction_type": "ai_consumption",
      "description": "AI Usage: openrouter/gpt-4",
      "created_at": "2023-11-01T10:00:00Z",
      "meta_data": "{\"channel\": \"openrouter\", \"model\": \"gpt-4\", \"app_id\": \"研报生成助手\", \"input_tokens\": 500, \"output_tokens\": 200}"
    }
  ]
}
```

### 3.5 获取所有支付订单 (管理)

管理员获取所有支付订单记录。

-   **路径:** `/api/user/admin/orders`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (需管理员权限)

**查询参数 (Query Parameters)**

| 参数名 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 否 | 页码 (默认 1) |
| `size` | integer | 否 | 每页数量 (默认 20) |
| `status` | string | 否 | 订单状态 (pending, paid, failed, cancelled) |
| `user_id` | string | 否 | 筛选特定用户ID |

**返回示例**

```json
{
  "total": 500,
  "page": 1,
  "limit": 20,
  "totalPages": 25,
  "items": [
    {
      "order_no": "ORD202311010001",
      "amount": 100.00,
      "gateway": "wechat",
      "status": "paid",
      "external_order_no": "wx_20231101...",
      "qr_code_url": "weixin://...",
      "created_at": "2023-11-01T09:00:00Z",
      "paid_at": "2023-11-01T09:05:00Z"
    }
  ]
}
```

## 4. 订阅计划 (Plans)

### 4.1 获取所有订阅计划

-   **路径:** `/api/user/plans`
-   **方法:** `GET`

**返回示例**

```json
{
  "free": {
    "name": "免费版",
    "price": 0,
    "features": ["Basic Access"]
  },
  "pro": {
    "name": "专业版",
    "price": 99,
    "features": ["Advanced Access", "Priority Support"]
  }
}
```

## 5. 钱包与支付 (Wallet & Payment)

管理用户钱包余额、充值与流水查询。

### 5.1 获取钱包余额

-   **路径:** `/api/user/wallet/balance`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "balance": 1.00
}
```

### 5.2 获取钱包流水

获取当前用户的充值与消费记录。支持分页与筛选。

-   **路径:** `/api/user/wallet/transactions`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数 (Query Parameters)**

| 参数名 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 否 | 页码 (默认 1) |
| `limit` | integer | 否 | 每页数量 (默认 20) |
| `app_id` | string | 否 | 根据 App ID (Scenario ID) 筛选 |
| `start_date` | string | 否 | 开始日期 (YYYY-MM-DD) |
| `end_date` | string | 否 | 结束日期 (YYYY-MM-DD) |

**返回示例**

```json
{
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "items": [
    {
      "id": "uuid...",
      "amount": -0.05,
      "balance_after": 0.95,
      "transaction_type": "ai_consumption",
      "description": "AI Usage: openrouter/gpt-4",
      "created_at": "2025-01-01T12:00:00Z",
      "meta_data": "{\"channel\": \"openrouter\", \"model\": \"gpt-4\", \"app_id\": \"研报生成助手\", \"input_tokens\": 100, \"output_tokens\": 50}"
    },
    {
      "id": "uuid...",
      "amount": 1.00,
      "balance_after": 1.00,
      "transaction_type": "gift",
      "description": "New user registration gift",
      "created_at": "2025-01-01T10:00:00Z",
      "meta_data": null
    }
  ]
}
```

### 5.3 充值

创建充值订单。

-   **路径:** `/api/user/wallet/recharge`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求体 (JSON)**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `amount` | number | 充值金额 |
| `gateway` | string | 支付网关 (默认 wechat) |

**返回示例**

```json
{
  "order_no": "ORD20231027123456",
  "pay_url": "weixin://wxpay/bizpayurl?pr=...",
  "qr_code_url": "https://api.example.com/qr/...",
  "message": "Order created"
}
```

### 5.4 支付回调 (Payment Callback)

接收第三方支付平台的异步通知。

-   **路径:** `/api/user/payment/callback`
-   **方法:** `POST`
-   **认证:** 无 (第三方调用)

### 5.5 查询订单支付状态

-   **路径:** `/api/user/payment/status/{order_no}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "status": "paid",
  "remote_status": "SUCCESS",
  "order": {
    "order_no": "ORD...",
    "amount": 100.00,
    "status": "paid",
    "paid_at": "2023-10-27T12:05:00Z"
  }
}
```
