# AI驱动的汽车行业情报平台 - API文档

**版本:** 2.2.0
**基础URL:** `http://127.0.0.1:7657`

本文档为调用后端服务提供了全面的技术指南。所有API请求和响应均使用JSON格式。

---

## 目录
1.  [**用户服务 (User Service)**](#1-用户服务-user-service)
    *   [1.1. 用户注册](#11-用户注册)
    *   [1.2. 用户登录](#12-用户登录)
    *   [1.3. 获取订阅计划](#13-获取订阅计划)
    *   [1.4. 获取用户订阅的情报源](#14-获取用户订阅的情报源)
    *   [1.5. 添加情报源订阅](#15-添加情报源订阅)
    *   [1.6. 取消情报源订阅](#16-取消情报源订阅)
    *   [1.7. 获取用户关注点](#17-获取用户关注点)
    *   [1.8. 添加用户关注点](#18-添加用户关注点)
    *   [1.9. 删除用户关注点](#19-删除用户关注点)
2.  [**情报服务 (Intelligence Service)**](#2-情报服务-intelligence-service)
    *   [2.1. 创建情报点](#21-创建情报点)
    *   [2.2. 获取情报点](#22-获取情报点)
    *   [2.3. 删除情报点](#23-删除情报点)
    *   [2.4. 获取所有情报源](#24-获取所有情报源)
    *   [2.5. 删除情报源](#25-删除情报源)
    *   [2.6. 查询处理任务](#26-查询处理任务)
    *   [2.7. 获取任务统计](#27-获取任务统计)
    *   [2.8. 查询已采集文章](#28-查询已采集文章)
    *   [2.9. 语义搜索文章](#29-语义搜索文章)
    *   [2.10. 组合筛选与语义搜索文章 (新!)](#210-组合筛选与语义搜索文章-新)
    *   [2.11. 获取所有提示词](#211-获取所有提示词)
    *   [2.12. 创建新提示词](#212-创建新提示词)
    *   [2.13. 更新提示词](#213-更新提示词)
    *   [2.14. 删除提示词](#214-删除提示词)

---

## 1. 用户服务 (User Service)

### 1.1. 用户注册

创建一个新用户账户。

-   **路径:** `/register`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `username` | string | 是 | 用户的唯一名称 |
| `email` | string | 是 | 用户的唯一邮箱地址 |
| `password` | string | 是 | 用户密码 |

**请求示例**
```json
{
  "username": "testuser",
  "email": "user@example.com",
  "password": "a_strong_password"
}
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
  "username": "testuser",
  "email": "user@example.com",
  "is_active": true,
  "created_at": "2025-10-10T10:00:00.000Z"
}
```

### 1.2. 用户登录

通过邮箱和密码进行身份验证。

-   **路径:** `/login`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | string | 是 | 注册时使用的邮箱地址 |
| `password` | string | 是 | 用户密码 |

**请求示例**
```json
{
  "email": "user@example.com",
  "password": "a_strong_password"
}
```

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `message` | string | 登录结果信息 |
| `user_id` | string | 登录用户的ID |
| `username` | string | 登录用户的名称 |

**返回示例 (200 OK)**
```json
{
  "message": "登录成功",
  "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "username": "testuser"
}
```

### 1.3. 获取订阅计划

获取系统中所有可用的订阅计划配置。

-   **路径:** `/plans`
-   **方法:** `GET`

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

### 1.4. 获取用户订阅的情报源

获取指定用户已订阅的所有情报源列表。

-   **路径:** `/{user_id}/sources`
-   **方法:** `GET`

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

### 1.5. 添加情报源订阅

为指定用户订阅一个情报源。

-   **路径:** `/{user_id}/sources/{source_id}`
-   **方法:** `POST`

**返回示例 (200 OK)**
```json
{
  "message": "订阅成功"
}
```

### 1.6. 取消情报源订阅

取消用户对某个情报源的订阅。

-   **路径:** `/{user_id}/sources/{source_id}`
-   **方法:** `DELETE`

**返回示例 (200 OK)**
```json
{
  "message": "取消订阅成功"
}
```

### 1.7. 获取用户关注点

获取指定用户的所有关注点。

-   **路径:** `/{user_id}/pois`
-   **方法:** `GET`

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
    "id": "d4e5f6g7-h8i9-0123-4567-cdefab234567",
    "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "content": "自动驾驶",
    "keywords": "L3, Waymo, 特斯拉 FSD",
    "created_at": "2025-10-09T14:30:00.000Z"
  }
]
```

### 1.8. 添加用户关注点

为指定用户创建一个新的关注点。

-   **路径:** `/{user_id}/pois`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `content` | string | 是 | 关注点内容 |
| `keywords` | string | 是 | 相关关键词 |

**请求示例**
```json
{
  "content": "新能源电池",
  "keywords": "固态电池, 宁德时代, 续航"
}
```

**返回示例 (201 Created)**
```json
{
  "id": "e5f6g7h8-i9j0-1234-5678-defabc345678",
  "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "content": "新能源电池",
  "keywords": "固态电池, 宁德时代, 续航",
  "created_at": "2025-10-10T13:00:00.000Z"
}
```

### 1.9. 删除用户关注点

删除一个用户的指定关注点。

-   **路径:** `/{user_id}/pois/{poi_id}`
-   **方法:** `DELETE`

**返回示例 (200 OK)**
```json
{
  "message": "关注点删除成功"
}
```

---

## 2. 情报服务 (Intelligence Service)

所有接口均以 `/intelligence` 为前缀。

### 2.1. 创建情报点

创建一个新的情报采集点。

-   **路径:** `/intelligence/points`
-   **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `source_name` | string | 是 | 情报源名称，如 "盖世汽车" |
| `point_name` | string | 是 | 具体情报点名称，如 "行业资讯" |
| `point_url` | string | 是 | 要采集的列表页URL |
| `cron_schedule` | string | 是 | CRON调度表达式，如 "0 */2 * * *" |
| `url_prompt_key` | string | 否 | URL提取提示词Key。默认 `default_list_parser` |
| `summary_prompt_key`| string | 否 | 内容总结提示词Key。默认 `default_summary` |

**请求示例**
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

**返回说明**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 情报点ID |
| `source_id` | string | 所属情报源ID |
| `source_name` | string | 所属情报源名称 |
| `point_name` | string | 情报点名称 |
| `point_url` | string | 情报点URL |
| `cron_schedule` | string | CRON调度表达式 |
| `is_active` | integer | 是否激活 |
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
    "is_active": true,
    "last_triggered_at": null,
    "url_prompt_key": "news_site_style_a",
    "summary_prompt_key": "financial_report_summary",
    "created_at": "2025-10-10T11:00:00.000Z",
    "updated_at": "2025-10-10T11:00:00.000Z"
  }
]
```

### 2.3. 删除情报点

根据ID列表批量删除情报点。

-   **路径:** `/intelligence/points`
-   **方法:** `DELETE`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `point_ids` | array[string] | 是 | 要删除的情报点ID列表 |

**请求示例**
```json
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
  "limit": 20,
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
  "limit": 20,
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
      "created_at": "2025-10-10T13:10:00.000Z"
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
| `query_text` | string | 是 | - | 用于语义搜索的自然语言文本 |
| `similarity_threshold` | number | 否 | 0.5 | 相似度得分阈值 (0.0-1.0) |
| `point_ids` | array[string] | 否 | - | 按一个或多个情报点ID过滤 |
| `source_names` | array[string] | 否 | - | 按一个或多个情报源名称过滤 |
| `publish_date_start` | string | 否 | - | 发布日期范围的起始点 (格式: YYYY-MM-DD) |
| `publish_date_end` | string | 否 | - | 发布日期范围的结束点 (格式: YYYY-MM-DD) |
| `page` | integer | 否 | 1 | 页码 |
| `limit` | integer | 否 | 20 | 每页数量 |

**请求示例**
```json
{
  "query_text": "特斯拉最新技术动态",
  "similarity_threshold": 0.5,
  "point_ids": ["b1c2d3e4-f5g6-7890-1234-abcdef123456"],
  "source_names": ["盖世汽车"],
  "publish_date_start": "2023-10-01",
  "publish_date_end": "2023-10-09",
  "page": 1,
  "limit": 20
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
  "limit": 20,
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

### 2.11. 获取所有提示词

返回 `prompts.json` 文件中的所有内容。

-   **路径:** `/intelligence/prompts`
-   **方法:** `GET`

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

**请求示例**
```json
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

**请求示例**
```json
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

### 2.14. 删除提示词

删除一个指定的提示词（默认提示词无法删除）。

-   **路径:** `/intelligence/prompts/{prompt_type}/{prompt_key}`
-   **方法:** `DELETE`

**返回示例 (200 OK)**
```json
{
  "message": "Prompt deleted successfully."
}
```
