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
