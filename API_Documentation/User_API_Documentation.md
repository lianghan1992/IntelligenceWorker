# 用户服务 (User Service) API 文档

提供管理用户、认证、订阅计划和个性化设置（如情报源）的全部功能。所有接口均以 `/api/user` 为前缀。

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
    "max_pois": 3
  },
  "pro": {
    "name": "专业版",
    "max_pois": 20
  },
  "enterprise": {
    "name": "企业版",
    "max_pois": -1
  }
}
```

## 6. 权益与钱包 (Quota & Wallet)

管理用户资源权益、使用量查询与钱包充值。

### 6.1 创建权益配置 (Admin)

配置特定套餐对特定资源的限制规则。

-   **路径:** `/api/user/quotas`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token (Admin)

**请求体 (JSON)**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `plan_type` | string | 套餐类型 (free, pro, enterprise) |
| `resource_key` | string | 资源标识 (ppt_pages, pdf_export) |
| `limit_value` | integer | 限制数量 (-1为无限) |
| `period` | string | 周期 (monthly, daily) |
| `allow_overage` | boolean | 是否允许超额付费 |
| `overage_unit_price` | number | 超额单价 (CNY) |
| `remark` | string | 备注 (可选) |

### 6.2 获取权益配置 (Admin)

获取所有权益配置规则。

-   **路径:** `/api/user/quotas`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (Admin)

### 6.3 获取我的权益使用情况

查询当前用户各项资源的已用量和剩余额度。

-   **路径:** `/api/user/usage/my`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
[
  {
    "resource_key": "ppt_pages",
    "usage_count": 5,
    "limit_value": 10,
    "period_end": "2025-12-01T10:00:00Z",
    "allow_overage": true
  }
]
```

### 6.4 获取钱包余额

-   **路径:** `/api/user/wallet/balance`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

### 6.5 充值

创建充值订单，并返回支付二维码或跳转链接。

-   **路径:** `/api/user/wallet/recharge`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**请求体 (JSON)**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `amount` | number | 充值金额 |
| `gateway` | string | 支付网关 (manual, alipay) |

**返回示例**

```json
{
  "order_no": "ORD-123456789ABC",
  "pay_url": "https://mock-payment-gateway.com/pay?order=...",
  "qr_code_url": "weixin://wxpay/bizpayurl?pr=...",
  "message": "Order created and payment QR code generated."
}
```

### 6.6 消耗权益 (Internal)

服务间调用的扣费接口。

-   **路径:** `/api/user/quota/consume`
-   **方法:** `POST`
-   **认证:** 建议使用服务间Token (目前开放)

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `user_id` | string | 是 | 用户ID |
| `resource_key` | string | 是 | 资源标识 |
| `count` | integer | 否 | 消耗数量 (默认1) |
| `billing_count` | number | 否 | 计费数量 (可选，用于混合计费模式) |
| `check_only` | boolean | 否 | 是否仅检查不扣费 (默认 false) |

### 6.7 支付回调 (Payment Callback)

接收第三方支付平台的异步通知。

-   **路径:** `/api/user/payment/callback`
-   **方法:** `POST`
-   **认证:** 无 (第三方调用)

**请求体 (JSON)**

参考第三方文档 `回调参数.md`。

**返回示例**

```json
{
  "isSuccess": true,
  "statusCode": 200
}
```

### 6.8 查询订单支付状态

查询本地订单支付状态，如果未支付则同步远程状态。

-   **路径:** `/api/user/payment/status/{order_no}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**返回示例**

```json
{
  "status": "paid",
  "remote_status": "success",
  "order": {
    "order_no": "ORD-123456789ABC",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "amount": 100.00,
    "status": "paid",
    "gateway": "manual",
    "external_order_no": "3A1EBD47C526F256A2939B49D6F7E1CC",
    "qr_code_url": "weixin://wxpay/bizpayurl?pr=...",
    "created_at": "2025-12-01T10:00:00Z",
    "paid_at": "2025-12-01T10:01:00Z"
  }
}
```

### 6.9 获取我的账单

获取当前用户的完整交易账单（充值、超额扣费等），支持按维度筛选与分页。

-   **路径:** `/api/user/bills/my`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 页码 |
| `size` | integer | 20 | 每页数量 |
| `bill_type` | string | (无) | 类型 (recharge, consumption, subscription, refund) |
| `status` | string | (无) | 状态 (pending, paid, failed, cancelled, refunded) |
| `channel` | string | (无) | 渠道 (payapi, balance, manual) |
| `start_at` | string | (无) | 开始时间 (ISO8601) |
| `end_at` | string | (无) | 结束时间 (ISO8601) |

**返回示例**

```json
{
  "total": 2,
  "page": 1,
  "size": 20,
  "total_pages": 1,
  "items": [
    {
      "id": "b0c8d6d0-1a2b-3c4d-5e6f-1234567890ab",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "bill_type": "recharge",
      "channel": "payapi",
      "gateway": "manual",
      "amount": 100.0,
      "currency": "CNY",
      "status": "paid",
      "order_no": "ORD-123456789ABC",
      "external_order_no": "3A1EBD47C526F256A2939B49D6F7E1CC",
      "description": "Wallet recharge",
      "created_at": "2025-12-01T10:00:00Z",
      "paid_at": "2025-12-01T10:01:00Z"
    }
  ]
}
```

### 6.10 获取我的账单统计

按类型/状态/渠道/日期聚合统计当前用户账单，便于前端做图表与分析。

-   **路径:** `/api/user/bills/my/stats`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `start_at` | string | (无) | 开始时间 (ISO8601) |
| `end_at` | string | (无) | 结束时间 (ISO8601) |

**返回示例**

```json
{
  "by_type": [
    { "key": "recharge", "count": 3, "amount": 300.0 },
    { "key": "consumption", "count": 5, "amount": 12.5 }
  ],
  "by_status": [
    { "key": "paid", "count": 8, "amount": 312.5 }
  ],
  "by_channel": [
    { "key": "payapi", "count": 3, "amount": 300.0 },
    { "key": "balance", "count": 5, "amount": 12.5 }
  ],
  "by_day": [
    { "day": "2025-12-01", "count": 2, "amount": 102.5 }
  ]
}
```

### 6.11 获取账单列表 (Admin)

获取全量账单列表，支持按多维度筛选与分页，供运营查看所有用户的充值、扣费等记录。建议前端采用懒加载方式分页加载。

-   **路径:** `/api/user/admin/bills`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (Admin)

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 页码 |
| `size` | integer | 20 | 每页数量 |
| `user_id` | string | (无) | 指定用户ID（可选） |
| `bill_type` | string | (无) | 类型 (recharge, consumption, subscription, refund) |
| `status` | string | (无) | 状态 (pending, paid, failed, cancelled, refunded) |
| `channel` | string | (无) | 渠道 (payapi, balance, manual) |
| `gateway` | string | (无) | 支付网关 (manual, alipay, wechat, balance) |
| `start_at` | string | (无) | 开始时间 (ISO8601) |
| `end_at` | string | (无) | 结束时间 (ISO8601) |
| `keyword` | string | (无) | 关键字（匹配订单号、外部单号、描述、用户名、邮箱） |

**返回示例**

```json
{
  "total": 120,
  "page": 1,
  "size": 20,
  "total_pages": 6,
  "items": [
    {
      "id": "b0c8d6d0-1a2b-3c4d-5e6f-1234567890ab",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "bill_type": "recharge",
      "channel": "payapi",
      "gateway": "manual",
      "amount": 100.0,
      "currency": "CNY",
      "status": "paid",
      "order_no": "ORD-123456789ABC",
      "external_order_no": "3A1EBD47C526F256A2939B49D6F7E1CC",
      "description": "Wallet recharge",
      "created_at": "2025-12-01T10:00:00Z",
      "paid_at": "2025-12-01T10:01:00Z",
      "username": "test",
      "email": "test@intelligenceworker.com"
    }
  ]
}
```

### 6.12 获取指定用户账单 (Admin)

获取某个指定用户的账单列表，支持分页与筛选。可用于在用户详情页里“懒加载”查看账单。

-   **路径:** `/api/user/admin/users/{user_id}/bills`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (Admin)

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `user_id` | string | 用户ID |

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 页码 |
| `size` | integer | 20 | 每页数量 |
| `bill_type` | string | (无) | 类型 (recharge, consumption, subscription, refund) |
| `status` | string | (无) | 状态 (pending, paid, failed, cancelled, refunded) |
| `channel` | string | (无) | 渠道 (payapi, balance, manual) |
| `gateway` | string | (无) | 支付网关 (manual, alipay, wechat, balance) |
| `start_at` | string | (无) | 开始时间 (ISO8601) |
| `end_at` | string | (无) | 结束时间 (ISO8601) |
| `keyword` | string | (无) | 关键字（匹配订单号、外部单号、描述） |

**返回示例**

返回结构与 `GET /api/user/admin/bills` 相同。

### 6.13 获取账单统计 (Admin)

按类型/状态/渠道/日期聚合统计账单，供运营查看整体收入与支出情况。注意该接口不返回具体明细，仅返回聚合结果。

-   **路径:** `/api/user/admin/bills/stats`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (Admin)

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `start_at` | string | (无) | 开始时间 (ISO8601) |
| `end_at` | string | (无) | 结束时间 (ISO8601) |
| `user_id` | string | (无) | 用户ID（可选，为空则统计全量） |
| `bill_type` | string | (无) | 类型 (recharge, consumption, subscription, refund) |
| `status` | string | (无) | 状态 (pending, paid, failed, cancelled, refunded) |
| `channel` | string | (无) | 渠道 (payapi, balance, manual) |
| `gateway` | string | (无) | 支付网关 (manual, alipay, wechat, balance) |

**返回示例**

```json
{
  "total_count": 120,
  "total_amount": 312.5,
  "by_type": [
    { "key": "recharge", "count": 80, "amount": 300.0 },
    { "key": "consumption", "count": 40, "amount": 12.5 }
  ],
  "by_status": [
    { "key": "paid", "count": 110, "amount": 310.0 },
    { "key": "failed", "count": 10, "amount": 2.5 }
  ],
  "by_channel": [
    { "key": "payapi", "count": 80, "amount": 300.0 },
    { "key": "balance", "count": 40, "amount": 12.5 }
  ],
  "by_day": [
    { "day": "2025-12-01", "count": 20, "amount": 102.5 }
  ]
}
```

### 6.14 获取用户账单汇总 (Admin)

按用户维度聚合统计账单，用于运营后台查看“哪个用户充了/花了多少钱”。结果支持分页。

-   **路径:** `/api/user/admin/bills/users/summary`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token (Admin)

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 页码 |
| `size` | integer | 20 | 每页数量 |
| `start_at` | string | (无) | 开始时间 (ISO8601) |
| `end_at` | string | (无) | 结束时间 (ISO8601) |

**返回示例**

```json
{
  "total": 2,
  "page": 1,
  "size": 20,
  "total_pages": 1,
  "items": [
    {
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "test",
      "email": "test@intelligenceworker.com",
      "bills_count": 10,
      "total_amount": 120.0,
      "recharge_amount": 100.0,
      "consumption_amount": 15.0,
      "subscription_amount": 5.0,
      "refund_amount": 0.0,
      "last_bill_at": "2025-12-01T10:01:00Z"
    }
  ]
}
```
