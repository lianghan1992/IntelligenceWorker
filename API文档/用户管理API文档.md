# 用户服务 (User Service) API 文档

本服务负责处理所有与用户、认证、订阅和个人资源相关的操作。所有API均以 `/api/user` 为前缀。

## 1. 认证 (Authentication)

### 1.1. 用户注册

- **路径:** `/api/user/register`
- **方法:** `POST`
- **功能:** 创建一个新用户，并可以指定初始订阅计划。
- **请求体 (JSON):**
  ```json
  {
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "a_strong_password",
    "plan_name": "free" 
  }
  ```
- **成功响应 (201 Created):** 返回创建的用户公共信息。

### 1.2. 用户登录

- **路径:** `/api/user/login`
- **方法:** `POST`
- **功能:** 验证用户凭据，成功后返回JWT访问令牌，并记录登录活动。
- **请求体 (JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "a_strong_password"
  }
  ```
- **成功响应 (200 OK):**
  ```json
  {
    "message": "登录成功",
    "user": {
      "id": "user-uuid-123",
      "username": "some_user",
      "email": "user@example.com"
    },
    "accessToken": "your_jwt_token_here"
  }
  ```

### 1.3. 获取当前用户信息

- **路径:** `/api/user/me`
- **方法:** `GET`
- **认证:** 需要Bearer Token
- **功能:** 验证令牌并返回当前登录用户的信息。
- **成功响应 (200 OK):** 返回用户公共信息。

## 2. 用户管理 (Admin)

### 2.1. 获取用户列表

- **路径:** `/api/user/`
- **方法:** `GET`
- **认证:** 需要Bearer Token
- **功能:** 获取系统中的用户列表，支持分页、筛选和搜索。
- **查询参数:** `page`, `limit`, `plan_name`, `status`, `search_term`
- **成功响应 (200 OK):** 返回分页的用户列表。

### 2.2. 获取单个用户信息

- **路径:** `/api/user/{user_id}`
- **方法:** `GET`
- **认证:** 需要Bearer Token
- **功能:** 获取指定ID用户的详细信息。
- **成功响应 (200 OK):** 返回用户的详细响应模型。

### 2.3. 更新用户信息

- **路径:** `/api/user/{user_id}`
- **方法:** `PUT`
- **认证:** 需要Bearer Token
- **功能:** 更新指定用户的用户名、邮箱、状态或订阅计划。
- **请求体 (JSON):** `UserUpdateRequest` 模型
- **成功响应 (200 OK):** 返回更新后的用户详细信息。

### 2.4. 删除用户

- **路径:** `/api/user/{user_id}`
- **方法:** `DELETE`
- **认证:** 需要Bearer Token
- **功能:** 从系统中永久删除一个用户。
- **成功响应 (204 No Content):** 无返回内容。

## 3. 订阅计划 (Plans)

### 3.1. 获取所有订阅计划

- **路径:** `/api/user/plans`
- **方法:** `GET`
- **功能:** 获取系统中所有可用的订阅计划及其配置。
- **成功响应 (200 OK):** 返回一个包含所有计划详情的JSON对象。

## 4. 用户个人资源管理

### 4.1. 获取我订阅的情报源

- **路径:** `/api/user/me/sources`
- **方法:** `GET`
- **认证:** 需要Bearer Token
- **功能:** 获取当前登录用户订阅的所有情报源列表。

### 4.2. 订阅新的情报源

- **路径:** `/api/user/me/sources/{source_id}`
- **方法:** `POST`
- **认证:** 需要Bearer Token
- **功能:** 为当前用户添加一个新的情报源订阅，会检查套餐配额。

### 4.3. 取消情报源订阅

- **路径:** `/api/user/me/sources/{source_id}`
- **方法:** `DELETE`
- **认证:** 需要Bearer Token
- **功能:** 取消当前用户对指定情报源的订阅。

### 4.4. 获取我的关注点

- **路径:** `/api/user/me/pois`
- **方法:** `GET`
- **认证:** 需要Bearer Token
- **功能:** 获取当前用户创建的所有关注点。

### 4.5. 添加新的关注点

- **路径:** `/api/user/me/pois`
- **方法:** `POST`
- **认证:** 需要Bearer Token
- **功能:** 为当前用户创建一个新的关注点，会检查套餐配额。
- **请求体 (JSON):** `PointOfInterestCreate` 模型

### 4.6. 删除我的关注点

- **路径:** `/api/user/me/pois/{poi_id}`
- **方法:** `DELETE`
- **认证:** 需要Bearer Token
- **功能:** 删除当前用户的指定关注点。

## 5. 用户行为与资料 (新增)

### 5.1. 记录用户行为事件

- **路径:** `/api/user/activity/record`
- **方法:** `POST`
- **认证:** 需要Bearer Token (内部服务间调用)
- **功能:** 记录一个通用的用户行为事件，如查看报告、点击模块等。
- **请求体 (JSON):**
  ```json
  {
    "event_type": "VIEW_LIVESTREAM_REPORT",
    "event_details": {
      "report_id": "report-uuid-456",
      "report_type": "detail"
    }
  }
  ```
- **成功响应 (201 Created):**
  ```json
  {
    "message": "活动已记录"
  }
  ```

### 5.2. 获取用户订阅与关注点详情

- **路径:** `/api/user/{user_id}/profile/details`
- **方法:** `GET`
- **认证:** 需要Bearer Token
- **功能:** 一次性获取指定用户订阅的所有情报源和关注点的详细列表。
- **成功响应 (200 OK):**
  ```json
  {
    "user_id": "user-uuid-123",
    "username": "some_user",
    "intelligence_sources": {
      "count": 1,
      "items": [
        { "id": "source-uuid-abc", "name": "懂车帝" }
      ]
    },
    "points_of_interest": {
      "count": 2,
      "items": [
        { "id": "poi-uuid-xyz", "content": "自动驾驶", "keywords": "L3, FSD" },
        { "id": "poi-uuid-123", "content": "智能座舱", "keywords": "HUD, NOMI" }
      ]
    }
  }
  ```
