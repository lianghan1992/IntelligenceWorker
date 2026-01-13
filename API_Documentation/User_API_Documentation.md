# 用户服务 (User Service) API 文档

提供管理用户、认证、订阅计划和钱包支付的全部功能。所有接口均以 `/api/user` 为前缀。

## 1. 认证 (Authentication)

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
    "id": "poi-001",
    "user_id": "user-123",
    "content": "Electric Vehicle Battery Tech",
    "keywords": "EV, Battery, Lithium",
    "created_at": "2023-10-27T10:00:00Z"
  }
]
```

### 2.9 添加新的关注点

-   **路径:** `/api/user/me/pois`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `content` | string | 是 | 关注点描述 |
| `keywords` | string | 是 | 关键词 (逗号分隔) |

### 2.10 删除关注点

-   **路径:** `/api/user/me/pois/{poi_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

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

### 3.5 获取所有交易流水

获取系统内所有用户的钱包交易记录。

-   **路径:** `/api/user/admin/transactions`
-   **方法:** `GET`
-   **认证:** 需要管理员权限
-   **参数:**
    - `page`: 页码 (默认1)
    - `size`: 每页数量 (默认20)
    - `user_id`: (可选) 筛选特定用户

### 3.6 获取所有支付订单

获取系统内所有支付订单。

-   **路径:** `/api/user/admin/orders`
-   **方法:** `GET`
-   **认证:** 需要管理员权限
-   **参数:**
    - `page`: 页码 (默认1)
    - `size`: 每页数量 (默认20)
    - `status`: (可选) 筛选订单状态 (pending, paid, failed)
    - `user_id`: (可选) 筛选特定用户

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

获取当前用户的充值与消费记录。

-   **路径:** `/api/user/wallet/transactions`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
[
  {
    "id": "uuid...",
    "amount": -0.05,
    "balance_after": 0.95,
    "transaction_type": "ai_consumption",
    "description": "AI Usage: openrouter/gpt-4",
    "created_at": "2025-01-01T12:00:00Z",
    "meta_data": "{\"channel\": \"openrouter\", \"model\": \"gpt-4\", \"app_id\": \"chat-app\", \"input_tokens\": 100, \"output_tokens\": 50}"
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
