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

### 1.2 用户登录

验证用户凭据并返回一个JWT访问令牌。

-   **路径:** `/api/user/login`
-   **方法:** `POST`

### 1.3 获取当前用户信息

获取当前已认证用户的信息。

-   **路径:** `/api/user/me`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

## 2. 用户管理 (Admin)

供管理员使用的用户管理接口。

### 2.1 获取用户列表

-   **路径:** `/api/user/users`
-   **方法:** `GET`
-   **认证:** 需要管理员权限

### 2.2 获取单个用户信息

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `GET`

### 2.3 更新用户信息

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `PUT`

### 2.4 删除用户

-   **路径:** `/api/user/users/{user_id}`
-   **方法:** `DELETE`

## 3. 订阅计划 (Plans)

### 3.1 获取所有订阅计划

-   **路径:** `/api/user/plans`
-   **方法:** `GET`

## 4. 钱包与支付 (Wallet & Payment)

管理用户钱包余额、充值与流水查询。

### 4.1 获取钱包余额

-   **路径:** `/api/user/wallet/balance`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "balance": 1.00
}
```

### 4.2 获取钱包流水

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

### 4.3 充值

创建充值订单。

-   **路径:** `/api/user/wallet/recharge`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求体 (JSON)**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `amount` | number | 充值金额 |
| `gateway` | string | 支付网关 (默认 wechat) |

### 4.4 支付回调 (Payment Callback)

接收第三方支付平台的异步通知。

-   **路径:** `/api/user/payment/callback`
-   **方法:** `POST`
-   **认证:** 无 (第三方调用)

### 4.5 查询订单支付状态

-   **路径:** `/api/user/payment/status/{order_no}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token


