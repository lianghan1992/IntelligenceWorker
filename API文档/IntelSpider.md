# IntelSpider Service API 文档

IntelSpider 服务负责管理情报源、情报点、执行爬虫任务、以及提供文章数据访问接口。
本服务运行在端口：`7657`。
API 前缀：`/intelspider`。

---

## 代理池管理

### 获取代理列表
- 接口介绍：获取当前配置的所有代理及其启用状态。
- 接口方法：`GET /intelspider/proxies/`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/proxies/
```
- 返回示例：
```json
[
  {
    "url": "http://127.0.0.1:7890",
    "enabled": true
  }
]
```

### 添加代理
- 接口介绍：添加一个新的代理服务器地址。
- 接口方法：`POST /intelspider/proxies/`
- 字段说明：
  - `url`: 字符串，代理地址（如 `http://127.0.0.1:7890`），必填。
  - `enabled`: 布尔值，是否启用，默认为 `true`。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/proxies/ \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://192.168.1.100:8080"
  }'
```

### 更新代理
- 接口介绍：更新指定代理的配置。
- 接口方法：`PUT /intelspider/proxies/{proxy_url}`
- curl 示例：
```bash
curl -sS -X PUT http://127.0.0.1:7657/intelspider/proxies/http%3A%2F%2F192.168.1.100%3A8080 \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://192.168.1.100:8080",
    "enabled": false
  }'
```

### 删除代理
- 接口介绍：删除指定的代理。
- 接口方法：`DELETE /intelspider/proxies/{proxy_url}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/proxies/http%3A%2F%2F192.168.1.100%3A8080
```

### 测试代理
- 接口介绍：测试指定代理是否可用（连接百度测试）。
- 接口方法：`POST /intelspider/proxies/test`
- 字段说明：
  - `url`: 字符串，待测试的代理地址。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/proxies/test \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://127.0.0.1:7890"
  }'
```
- 返回示例：
```json
{
  "url": "http://127.0.0.1:7890",
  "success": true,
  "latency_ms": 150.5
}
```

---

## 统计数据

### 获取今日新增文章数量
- 接口介绍：获取今日（00:00:00至今）新增的文章数量。
- 接口方法：`GET /intelspider/stats/today_articles_count`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/stats/today_articles_count
```
- 返回示例：
```json
{
  "count": 42,
  "date": "2025-12-12"
}
```

---

## 情报源与情报点管理

### 获取情报源列表
- 接口介绍：获取所有已注册的情报源信息（已过滤删除的情报源）。
- 接口方法：`GET /intelspider/sources/`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/sources/
```
- 返回示例：
```json
[
  {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "盖世汽车",
    "main_url": "https://auto.gasgoo.com/",
    "total_points": 5,
    "total_articles": 120,
    "created_at": "2025-12-09T10:00:00"
  }
]
```

### 创建情报源
- 接口介绍：创建一个新的情报源（如“盖世汽车”）。创建成功后，系统会自动在 `services/intelspider/crawlers/` 目录下生成对应的目录结构。
- 接口方法：`POST /intelspider/sources/`
- 字段说明：
  - `name`：字符串，情报源名称，必填。
  - `main_url`：字符串，情报源主站 URL，必填。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/sources/ \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "盖世汽车",
    "main_url": "https://auto.gasgoo.com/"
  }'
```
- 返回示例：
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "盖世汽车",
  "main_url": "https://auto.gasgoo.com/",
  "total_points": 0,
  "total_articles": 0,
  "created_at": "2025-12-09T10:00:00"
}
```

### 删除情报源
- 接口介绍：软删除指定情报源及其所有关联的情报点。删除后，情报源和情报点将不再显示在列表中，且不再执行爬取任务，但已爬取的文章数据保留。
- 接口方法：`DELETE /intelspider/sources/{source_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/sources/550e8400-e29b-41d4-a716-446655440000
```
- 返回示例：
```json
{
  "message": "Source 盖世汽车 and 5 points deleted successfully (soft delete)."
}
```

---

## 获取情报点列表
- 接口介绍：获取情报点列表，可按情报源筛选（已过滤删除的情报点）。
- 接口方法：`GET /intelspider/points/`
- 参数说明（Query Parameters）：
  - `source_uuid`：可选，筛选指定情报源下的情报点。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/points/?source_uuid=550e8400-e29b-41d4-a716-446655440000"
```
- 返回示例：
```json
[
  {
    "uuid": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "source_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "车企资讯",
    "url": "https://auto.gasgoo.com/industry/C-108",
    "cron_schedule": "30 13 */2 * *",
    "initial_pages": 100,
    "is_active": true,
    "last_crawled_at": "2025-12-09T12:00:00",
    "created_at": "2025-12-09T10:00:00"
  }
]
```

---

## 创建情报点
- 接口介绍：在指定的情报源下创建一个新的情报点（如“车企资讯”）。创建成功后，系统会自动在 `services/intelspider/crawlers/{source_uuid}/` 目录下生成开发指南。
- 接口方法：`POST /intelspider/points/`
- 字段说明：
  - `source_uuid`：字符串，所属情报源的 UUID，必填。
  - `name`：字符串，情报点名称，必填。
  - `url`：字符串，情报点具体的 URL，必填。
  - `cron_schedule`：字符串，爬取周期的 Cron 表达式，必填。
  - `initial_pages`：整数，可选，首次爬取时的最大页数（默认 100）。
  - `is_active`：布尔，可选，是否激活（默认 true）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/points/ \
  -H 'Content-Type: application/json' \
  -d '{
    "source_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "车企资讯",
    "url": "https://auto.gasgoo.com/industry/C-108",
    "cron_schedule": "30 13 */2 * *",
    "initial_pages": 50,
    "is_active": true
  }'
```
- 返回示例：
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "source_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "车企资讯",
    "url": "https://auto.gasgoo.com/industry/C-108",
    "cron_schedule": "30 13 */2 * *",
    "initial_pages": 50,
    "is_active": true,
    "last_crawled_at": null,
  "created_at": "2025-12-09T10:00:00"
}
```

### 更新情报点
- 接口介绍：更新指定情报点的配置信息（如爬取周期、初始页数、是否激活）。
- 接口方法：`PATCH /intelspider/points/{point_uuid}`
- 字段说明：
  - `name`：字符串，可选，情报点名称。
  - `cron_schedule`：字符串，可选，爬取周期的 Cron 表达式。
  - `initial_pages`：整数，可选，首次爬取时的最大页数。
  - `is_active`：布尔，可选，是否激活。
- curl 示例：
```bash
curl -sS -X PATCH http://127.0.0.1:7657/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef \
  -H 'Content-Type: application/json' \
  -d '{
    "cron_schedule": "0 8 * * *",
    "initial_pages": 200
  }'
```
- 返回示例：
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "source_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "车企资讯",
  "url": "https://auto.gasgoo.com/industry/C-108",
  "cron_schedule": "0 8 * * *",
  "initial_pages": 200,
  "is_active": true,
  "last_crawled_at": null,
  "created_at": "2025-12-09T10:00:00"
}
```

### 禁用情报点
- 接口介绍：禁用指定情报点，停止接收API接口的爬取任务或定时任务。
- 接口方法：`POST /intelspider/points/{point_uuid}/disable`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef/disable
```

### 启用情报点
- 接口介绍：重新启用已被禁用的情报点。
- 接口方法：`POST /intelspider/points/{point_uuid}/enable`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef/enable
```

### 删除情报点
- 接口介绍：软删除指定情报点。删除后，情报点将不再显示在列表中，且不再执行爬取任务，但已爬取的文章数据保留。
- 接口方法：`DELETE /intelspider/points/{point_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef
```

---

## 获取文章列表（分页）
- 接口介绍：获取已爬取的文章列表，支持分页和按情报点筛选。返回文章的基本信息（不包含正文）。
- 接口方法：`GET /intelspider/articles/`
- 参数说明（Query Parameters）：
  - `page`：整数，页码，默认 1。
  - `page_size`：整数，每页数量，默认 20。
  - `point_uuid`：可选，筛选指定情报点下的文章。
- 字段说明（Response）：
  - `is_atomized`：布尔值，表示该文章是否已原子化（依据：html_content 是否非空）。
  - `source_name`：字符串，情报源名称。
  - `point_name`：字符串，情报点名称。
  - `tags`：字符串（JSON格式），文章标签列表，用于对文章进行分类或标记关键信息（例如：'["新技术", "经济"]'）。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/articles/?page=1&page_size=10"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "page_size": 10,
  "items": [
    {
      "uuid": "article-uuid-1",
      "title": "小型车市场，又有新对手",
      "url": "https://auto.gasgoo.com/news/...",
      "publish_date": "2025-12-08T07:30:33",
      "created_at": "2025-12-09T10:05:00",
      "is_atomized": true,
      "source_name": "盖世汽车",
      "point_name": "车企资讯"
    }
  ]
}
```

## 按标签获取文章列表（分页）
- 接口介绍：根据标签筛选文章，支持查询包含指定所有标签的文章，支持分页。返回格式与获取文章列表一致。
- 接口方法：`GET /intelspider/articles/by_tags`
- 参数说明（Query Parameters）：
  - `tags`：字符串列表，必填，标签名称（例如：tags=新技术&tags=经济）。
  - `page`：整数，页码，默认 1。
  - `page_size`：整数，每页数量，默认 20。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/articles/by_tags?tags=新技术&tags=经济&page=1&page_size=10"
```
- 返回示例：
```json
{
  "total": 50,
  "page": 1,
  "page_size": 10,
  "items": [
    {
      "uuid": "article-uuid-2",
      "title": "新能源汽车技术新突破",
      "url": "https://...",
      "publish_date": "2025-12-08T08:00:00",
      "created_at": "2025-12-09T10:10:00",
      "is_atomized": true,
      "source_name": "盖世汽车",
      "point_name": "技术前沿"
    }
  ]
}
```

---

## 获取单篇文章详情
- 接口介绍：获取指定文章的完整内容，包括正文。
- 接口方法：`GET /intelspider/articles/{article_uuid}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/articles/article-uuid-1
```
- 返回示例：
```json
{
  "uuid": "article-uuid-1",
  "title": "小型车市场，又有新对手",
  "url": "https://auto.gasgoo.com/news/...",
  "publish_date": "2025-12-08T07:30:33",
  "content": "文章正文内容...",
  "created_at": "2025-12-09T10:05:00"
}
```

---

## 删除单篇文章
- 接口介绍：删除指定文章及其关联的向量数据（级联删除）。
- 接口方法：`DELETE /intelspider/articles/{article_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/articles/article-uuid-1
```
- 返回示例：
```json
{
  "message": "Article deleted successfully"
}
```

---

## 任务管理

### 获取任务列表
- 接口介绍：获取爬虫任务执行记录。
- 接口方法：`GET /intelspider/tasks/`
- 参数说明（Query Parameters）：
  - `page`：整数，页码，默认 1。
  - `page_size`：整数，每页数量，默认 20。
  - `point_uuid`：字符串，可选，按情报点筛选。
  - `status`：字符串，可选，按状态筛选（pending/running/completed/failed）。
- 返回示例：
```json
{
  "total": 50,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "uuid": "task-uuid-1",
      "point_uuid": "point-uuid-1",
      "status": "completed",
      "task_type": "incremental",
      "start_time": "2025-12-09T10:00:00",
      "end_time": "2025-12-09T10:02:00",
      "articles_collected": 5,
      "error_message": null,
      "created_at": "2025-12-09T09:59:00",
      "point_name": "行业资讯",
      "source_name": "盖世汽车"
    }
  ]
}
```
- 字段说明：
  - `status`：任务状态。
    - `pending`: 等待执行。
    - `running`: 正在执行。
    - `completed`: 执行成功。
    - `failed`: 执行失败。
  - `task_type`：任务类型。
    - `initial`: 初始全量爬取（爬取历史数据）。
    - `incremental`: 增量爬取（只爬取最新数据）。
  - `articles_collected`：本次任务实际采集到的新文章数量。

### 触发爬取任务
- 接口介绍：手动立即触发一个情报点的爬取任务。
- 接口方法：`POST /intelspider/tasks/trigger/`
- 字段说明：
  - `point_uuid`：字符串，目标情报点的 UUID，必填。
  - `task_type`：字符串，可选，任务类型：`initial`（首次爬取）或 `incremental`（增量爬取）。默认 `incremental`。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/tasks/trigger/ \
  -H 'Content-Type: application/json' \
  -d '{
    "point_uuid": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "task_type": "initial"
  }'
```
- 返回示例：
```json
{
  "message": "Task triggered successfully",
  "task_uuid": "778899aa-bbcc-ddee-ff00-112233445566"
}
```

---

## HTML生成与管理

### 开启/停止 HTML生成功能
- 接口介绍：开启或停止 IntelSpider 的后台 HTML 生成功能。
- 接口方法：`POST /intelspider/html/generation/enable`
- 字段说明：
  - `enabled`: 布尔值，`true` 开启，`false` 停止。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/html/generation/enable \
  -H 'Content-Type: application/json' \
  -d '{"enabled": true}'
```
- 返回示例：
```json
{
  "message": "HTML generation enabled",
  "enabled": true
}
```

### 开启/停止 追溯生成
- 接口介绍：开启或停止对历史文章（已存在但无HTML）的后台生成，并可指定处理顺序。
- 接口方法：`POST /intelspider/html/retrospective/enable`
- 字段说明：
  - `enabled`: 布尔值，`true` 开启，`false` 停止。
  - `order_by`: 字符串，可选，处理顺序。`desc` (默认) 从新到旧，`asc` 从旧到新。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/html/retrospective/enable \
  -H 'Content-Type: application/json' \
  -d '{"enabled": true, "order_by": "desc"}'
```
- 返回示例：
```json
{
  "total_articles": 1000,
  "atomized_count": 500,
  "unatomized_count": 500,
  "retrospective_enabled": true,
  "retrospective_order": "desc",
  "unatomized_sample": [
    "Latest Article Title 1",
    "Latest Article Title 2"
  ]
}
```

### 获取 HTML 生成状态
- 接口介绍：获取当前 HTML 原子化生成的进度统计信息。
- 接口方法：`GET /intelspider/html/status`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/html/status
```
- 返回示例：
```json
{
  "total_articles": 1000,
  "atomized_count": 500,
  "unatomized_count": 500,
  "retrospective_enabled": true,
  "retrospective_order": "desc",
  "unatomized_sample": [
    "Latest Article Title 1",
    "Latest Article Title 2"
  ]
}
```
---

## 标签管理

### 重新分析所有文章标签
- 接口介绍：触发后台任务，对所有文章重新进行 LLM 标签分析。
- 接口方法：`POST /intelspider/tags/reanalyze`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/tags/reanalyze
```
- 返回示例：
```json
{
  "message": "Started re-analysis of tags for all articles."
}
```

### 追溯缺失标签
- 接口介绍：触发后台任务，仅对标签为空的文章进行 LLM 标签分析。
- 接口方法：`POST /intelspider/tags/backfill`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/tags/backfill
```
- 返回示例：
```json
{
  "message": "Started backfill of missing tags."
}
```

---

## 语义检索

### 语义检索返回分段内容
- 接口介绍：基于语义相似度检索文章分段内容。支持按情报源、情报点、时间范围筛选，并支持分页。
- 接口方法：`POST /intelspider/search/semantic`
- 字段说明（Query Parameters / Body）：
  - `query_text`: 字符串，必填，检索关键词或问题。
  - `source_uuid`: 字符串，可选，筛选指定情报源。
  - `point_uuid`: 字符串，可选，筛选指定情报点。
  - `start_date`: 字符串（ISO格式），可选，文章发布起始时间。
  - `end_date`: 字符串（ISO格式），可选，文章发布结束时间。
  - `max_segments`: 整数，可选，最大返回分段数（默认50，指基于相似度排序后的前N个结果池）。
  - `similarity_threshold`: 浮点数，可选，相似度阈值（默认0.7）。
  - `page`: 整数，可选，页码（默认1）。
  - `page_size`: 整数，可选，每页数量（默认20）。
- curl 示例：
```bash
curl -sS -X POST "http://127.0.0.1:7657/intelspider/search/semantic?query_text=自动驾驶&page=1&page_size=10" \
  -H 'Content-Type: application/json'
```
- 返回示例：
```json
{
  "total_segments": 45,
  "page": 1,
  "page_size": 10,
  "items": [
    {
      "article_id": "article-uuid-1",
      "similarity": 0.85,
      "title": "某车企发布最新自动驾驶技术",
      "publish_date": "2025-12-10T10:00:00",
      "source_name": "盖世汽车",
      "content": "该技术采用了最新的传感器融合方案..."
    }
  ]
}
```
- 字段说明：
  - `total_segments`: 符合阈值并经过截断后的总分段数（受 `max_segments` 限制）。
  - `page`: 当前页码。
  - `page_size`: 每页显示数量。
  - `items`: 当前页的分段列表。
    - `article_id`: 文章UUID。
    - `similarity`: 相似度得分。
    - `title`: 文章标题。
    - `publish_date`: 文章发布时间。
    - `source_name`: 情报源名称。
    - `content`: 匹配的分段内容。

### 检查 Gemini Cookie
- 接口介绍：检查当前 Gemini 渠道的 Cookie 是否有效。
- 接口方法：`GET /intelspider/gemini/cookies/check`

### 获取 Gemini 状态（别名）
- 接口介绍：同 `GET /intelspider/gemini/cookies/check`。
- 接口方法：`GET /intelspider/gemini/status`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/gemini/cookies/check
```
- 返回示例：
```json
{
  "valid": true,
  "message": "Cookies are valid"
}
```

### 更新 Gemini Cookie
- 接口介绍：更新并持久化 Gemini Cookie。
- 接口方法：`POST /intelspider/gemini/cookies/update`
- 字段说明：
  - `secure_1psid`: 字符串，必填。
  - `secure_1psidts`: 字符串，必填。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/gemini/cookies/update \
  -H 'Content-Type: application/json' \
  -d '{
    "secure_1psid": "your_secure_1psid",
    "secure_1psidts": "your_secure_1psidts"
  }'
```

### 获取文章 HTML
- 接口介绍：获取指定文章的 HTML 内容。
- 接口方法：`GET /intelspider/articles/{article_uuid}/html`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/articles/article-uuid-1/html
```
- 返回示例：
```json
{
  "uuid": "article-uuid-1",
  "html_content": "<!DOCTYPE html>..."
}
```

### 触发单篇文章生成 HTML
- 接口介绍：手动触发单篇文章的 HTML 生成（即使后台服务关闭也可以调用）。
- 接口方法：`POST /intelspider/articles/{article_uuid}/generate_html`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/articles/article-uuid-1/generate_html
```

### 触发批量生成 HTML
- 接口介绍：在后台触发批量 HTML 生成任务。
- 接口方法：`POST /intelspider/html/batch/generate`
- 字段说明：
  - `point_uuid`: 可选，按情报点筛选。
  - `force_regenerate`: 可选，是否强制重新生成（覆盖已有）。
  - `limit`: 可选，生成数量限制（默认10）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/html/batch/generate \
  -H 'Content-Type: application/json' \
  -d '{"limit": 5}'
```

---

## LLM 智能分析

### 创建 LLM 分析任务
- 接口介绍：创建一个基于 LLM 的文章分析任务，后台自动调用 LLM 进行分拣和整理。
- 接口方法：`POST /intelspider/llm/tasks`
- 字段说明：
  - `user_uuid`: 字符串，当前用户的 ID，必填。
  - `description`: 字符串，用户输入的一句话检索意向（如“关于问界汽车的新技术情况”），必填。
  - `time_range`: 字符串，可选，时间范围（如 "2024-01,2024-03" 或 "2024-01"），对应 `publish_date`。
  - `source_uuids`: 字符串列表，可选，指定情报源 UUID 列表。
  - `need_summary`: 布尔值，可选，是否让 LLM 对符合描述的文章进行整理（默认 false）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/llm/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "user_uuid": "user-123",
    "description": "关注特斯拉的新车型发布",
    "time_range": "2024-01",
    "need_summary": true
  }'
```
- 返回示例：
```json
{
  "uuid": "task-uuid-1",
  "user_uuid": "user-123",
  "description": "关注特斯拉的新车型发布",
  "status": "analyzing",
  "progress": 0,
  "created_at": "2025-12-11T10:00:00"
}
```

### 获取 LLM 任务详情
- 接口介绍：查询指定 LLM 分析任务的状态和进度。
- 接口方法：`GET /intelspider/llm/tasks/{task_uuid}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/llm/tasks/task-uuid-1
```
- 返回示例：
```json
{
  "uuid": "task-uuid-1",
  "status": "completed",
  "progress": 100,
  "csv_path": "llm_reports/task-uuid-1.csv",
  "completed_at": "2025-12-11T10:05:00"
}
```

### 下载 LLM 任务报告
- 接口介绍：下载任务生成的 CSV 报告文件。
- 接口方法：`GET /intelspider/llm/tasks/{task_uuid}/download`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/llm/tasks/task-uuid-1/download --output report.csv
```
- 返回示例：返回 CSV 文件流。

### 生成文章 PDF
- 接口介绍：将文章的 HTML 内容转换为 PDF 文件并直接返回二进制流（application/pdf）。如果文章尚未生成 HTML 内容，系统将自动尝试生成 HTML，然后再转换为 PDF。
- 接口方法：`POST /intelspider/articles/{article_uuid}/pdf`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/articles/article-uuid-1/pdf --output article.pdf
```
- 返回示例：
  - 成功：返回二进制 PDF 文件流。
  - 失败：返回 JSON 格式的错误信息。

---

## 健康检查
- 接口介绍：检查 IntelSpider 服务是否正常运行。
- 接口方法：`GET /intelspider/health`
- 字段说明：无请求体。
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/health
```
- 返回示例：
```json
{
  "status": "ok"
}
```

---

## 通用分析任务管理 (Generic Analysis)

本模块支持对爬取的文章进行动态、通用的分析任务（如技术识别、舆情分析等）。
任务基于“模版”定义，每个模版包含触发规则、Prompt模版和输出格式定义。
分析任务使用独立的 GLM-4.5-flash 模型资源，不占用基础分类任务的配额。

### 创建分析模版
- 接口介绍：创建一个新的通用分析模版。
- 接口方法：`POST /intelspider/analysis/templates`
- 字段说明：
  - `user_uuid`: 字符串，创建者的用户ID，必填。
  - `name`: 字符串，模版名称，必填。
  - `prompt_template`: 字符串，Prompt模版，支持变量 `{{title}}`, `{{content}}`, `{{url}}`, `{{source_name}}`。
  - `output_schema`: JSON对象，期望的输出JSON Schema结构。
  - `target_model`: 字符串，指定模型，默认为系统配置的 `glm-4.5-flash`。
  - `is_active`: 布尔值，是否激活，默认为 `true`。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/analysis/templates \
  -H 'Content-Type: application/json' \
  -d '{
    "user_uuid": "user_123",
    "name": "新能源技术识别",
    "prompt_template": "请分析以下文章是否涉及新能源电池技术：\n标题：{{title}}\n链接：{{url}}\n内容：{{content}}",
    "output_schema": {"type": "object", "properties": {"is_tech": {"type": "boolean"}, "tech_name": {"type": "string"}}},
    "is_active": true
  }'
```

### 获取分析模版
- 接口介绍：获取所有分析模版，支持按用户过滤。
- 接口方法：`GET /intelspider/analysis/templates`
- 参数：
  - `user_uuid`: 可选，按用户ID过滤。
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/analysis/templates?user_uuid=user_123
```

### 获取单个分析模版
- 接口介绍：获取指定UUID的分析模版详情。
- 接口方法：`GET /intelspider/analysis/templates/{uuid}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/analysis/templates/template-uuid-1
```

### 更新分析模版
- 接口介绍：更新指定模版的配置。
- 接口方法：`PUT /intelspider/analysis/templates/{uuid}`
- curl 示例：
```bash
curl -sS -X PUT http://127.0.0.1:7657/intelspider/analysis/templates/{uuid} \
  -H 'Content-Type: application/json' \
  -d '{
    "is_active": false
  }'
```

### 删除分析模版
- 接口介绍：删除指定的分析模版。
- 接口方法：`DELETE /intelspider/analysis/templates/{uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/analysis/templates/{uuid}
```

### 获取分析结果
- 接口介绍：获取文章的分析结果（分页）。
- 接口方法：`GET /intelspider/analysis/results`
- 参数：
  - `article_uuid`: 可选，按文章ID过滤。
  - `template_uuid`: 可选，按模版ID过滤。
  - `user_uuid`: 可选，按用户ID过滤。
  - `page`: 页码，默认1。
  - `page_size`: 每页数量，默认50。
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/analysis/results?user_uuid=user_123
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "page_size": 50,
  "items": [
    {
      "uuid": "analysis-uuid-1",
      "user_uuid": "user_123",
      "article_uuid": "article-uuid-1",
      "template_uuid": "template-uuid-1",
      "result": {"some_key": "some_value"},
      "status": "completed",
      "created_at": "2025-12-12T10:00:00",
      "completed_at": "2025-12-12T10:01:00",
      "error_message": null
    }
  ]
}
```

### 手动触发分析
- 接口介绍：手动触发对指定文章的分析任务（通常用于测试或补跑）。
- 接口方法：`POST /intelspider/analysis/trigger/{article_uuid}`
- 字段说明（Path Parameter）：
  - `article_uuid`: 字符串，目标文章的 UUID，必填。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/analysis/trigger/{article_uuid}
```
- 返回示例：
```json
{
  "message": "Analysis triggered"
}
```

### 获取分析统计信息
- 接口介绍：获取通用分析的统计数据（模版总数、活跃数、分析任务总数等）。
- 接口方法：`GET /intelspider/analysis/stats`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/analysis/stats
```
- 返回示例：
```json
{
  "total_templates": 5,
  "active_templates": 3,
  "total_analysis_tasks": 1024,
  "completed_tasks": 980
}
```

### 获取分析任务列表
- 接口介绍：获取所有分析任务（结果）的列表，支持分页。
- 接口方法：`GET /intelspider/analysis/tasks`
- 参数说明：
  - `page`: 页码，默认 1。
  - `page_size`: 每页数量，默认 50。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/analysis/tasks?page=1"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "page_size": 50,
  "items": [
    {
      "uuid": "analysis-uuid-1",
      "article_uuid": "article-uuid-1",
      "status": "completed",
      "result": {...},
      "created_at": "2024-01-01T10:00:00"
    }
  ]
}
```

---

## 文档上传与管理

### 文档标签管理

#### 获取标签列表
- 接口介绍：获取所有属于“深度洞察报告”的分类标签（情报点）。
- 接口方法：`GET /intelspider/uploaded-docs/tags`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/tags
```
- 返回示例：
```json
[
  {
    "uuid": "tag-uuid-1",
    "name": "市场分析",
    "created_at": "2024-01-01T10:00:00",
    "doc_count": 10
  }
]
```

#### 创建标签
- 接口介绍：创建一个新的分类标签。
- 接口方法：`POST /intelspider/uploaded-docs/tags`
- 字段说明：
  - `name`: 字符串，标签名称，必填。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/tags \
  -H 'Content-Type: application/json' \
  -d '{"name": "竞品分析"}'
```

#### 重命名标签
- 接口介绍：修改标签名称。
- 接口方法：`PUT /intelspider/uploaded-docs/tags/{tag_uuid}`
- 字段说明：
  - `name`: 字符串，新的标签名称，必填。
- curl 示例：
```bash
curl -sS -X PUT http://127.0.0.1:7657/intelspider/uploaded-docs/tags/tag-uuid-1 \
  -H 'Content-Type: application/json' \
  -d '{"name": "竞品深度分析"}'
```

#### 删除标签
- 接口介绍：删除指定标签。**注意：只有该标签下没有关联文档时才允许删除。**
- 接口方法：`DELETE /intelspider/uploaded-docs/tags/{tag_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/uploaded-docs/tags/tag-uuid-1
```
- 返回示例：
```json
{
  "message": "Tag deleted successfully"
}
```

#### 搜索标签
- 接口介绍：根据名称搜索标签（情报点）。
- 接口方法：`POST /intelspider/search/tags`
- 字段说明：
  - `query`: 字符串，可选。搜索关键词。如果不填则返回所有。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/search/tags \
  -H 'Content-Type: application/json' \
  -d '{"query": "分析"}'
```
- 返回示例：
```json
[
  {
    "uuid": "tag-uuid-1",
    "name": "市场分析",
    "created_at": "2024-01-01T10:00:00",
    "doc_count": 10
  }
]
```

#### 获取标签列表（别名）
- 接口介绍：同 `GET /intelspider/uploaded-docs/tags`，用于获取所有属于“深度洞察报告”的分类标签。
- 接口方法：`GET /intelspider/doc-tags`

#### 获取标签下的已发布文档列表
- 接口介绍：获取所有标签下的已发布文档（状态为 completed，排除上传中/处理中的文档）。支持按标签筛选、分页。
- 接口方法：`GET /intelspider/doc-tags/docs`
- 参数说明（Query Parameters）：
  - `page`: 整数，页码，默认 1。
  - `page_size`: 整数，每页数量，默认 20。
  - `point_uuid`: 字符串，可选。指定标签（情报点）UUID。如果不填，则返回所有标签下的已发布文档。
  - `keyword`: 字符串，可选。文件名模糊搜索。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/doc-tags/docs?page=1&point_uuid=tag-uuid-1"
```
- 返回示例：
```json
{
  "total": 50,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "uuid": "doc-uuid-1",
      "original_filename": "行业报告.pdf",
      "file_size": 2048,
      "page_count": 25,
      "publish_date": "2024-03-01T10:00:00",
      "point_name": "市场分析",
      "status": "completed",
      "process_stage": "finished",
      "process_progress": 100
    }
  ]
}
```

### 上传文档
- 接口介绍：上传一个或多个文档（PDF/Word/PPT）到指定的情报点（标签）。支持文档去重、元数据提取。**注意：文档上传后会立即返回，后台进行异步处理（OCR、向量化）。可通过返回的 status 和 process_progress 字段查看进度。**
- 接口方法：`POST /intelspider/uploaded-docs/upload`
- 字段说明（Form Data）：
  - `files`: 文件列表，必填。支持 .pdf, .docx, .pptx, .doc, .ppt 格式。
  - `point_uuid`: 字符串，必填。文档所属的情报点 UUID。
  - `publish_date`: 字符串（ISO格式），可选。文档发布时间。
    - **优先级说明**：
      1. 若用户传入此字段，则使用此时间。
      2. 若用户未传，则尝试从文档元数据（Creation Date）中提取。
      3. 若提取失败，则默认为服务器当前时间（北京时间）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/upload \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/path/to/report.pdf" \
  -F "point_uuid=point-uuid-123" \
  -F "publish_date=2024-01-01T10:00:00"
```
- 返回示例：
```json
[
  {
    "uuid": "doc-uuid-1",
    "article_uuid": "article-uuid-1",
    "original_filename": "report.pdf",
    "file_size": 1024,
    "file_hash": "sha256...",
    "mime_type": "application/pdf",
    "page_count": 0,
    "download_count": 0,
    "view_count": 0,
    "publish_date": "2024-01-01T10:00:00",
    "created_at": "2024-01-02T12:00:00",
    "point_name": "深度分析",
    "source_name": "用户上传",
    "title": "report",
    "status": "pending",
    "process_stage": "queued",
    "process_progress": 0,
    "error_message": null
  }
]
```

### 获取上传文档列表（含进度状态）
- 接口介绍：获取上传的文档列表，支持分页和筛选。**返回结果包含文档的处理状态和进度。**
- 接口方法：`GET /intelspider/uploaded-docs/`
- 参数说明（Query Parameters）：
  - `page`: 整数，页码，默认 1。
  - `page_size`: 整数，每页数量，默认 20。
  - `point_uuid`: 字符串，可选。按情报点筛选。
  - `start_date`: 字符串，可选。发布时间范围起始。
  - `end_date`: 字符串，可选。发布时间范围结束。
  - `search`: 字符串，可选。文件名模糊搜索。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/uploaded-docs/?page=1&point_uuid=point-uuid-123"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "uuid": "doc-uuid-1",
      "original_filename": "深度洞察报告.pdf",
      "file_size": 1024,
      "mime_type": "application/pdf",
      "page_count": 15,
      "download_count": 5,
      "view_count": 20,
      "publish_date": "2024-01-01T10:00:00",
      "created_at": "2024-01-02T12:00:00",
      "point_name": "深度分析",
      "status": "completed",
      "process_stage": "finished",
      "process_progress": 100,
      "error_message": null
    }
  ]
}
```

### 获取上传文档详情（含进度状态）
- 接口介绍：获取单个上传文档的详细信息，包含处理状态和进度。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1
```
- 返回示例：
```json
{
  "uuid": "doc-uuid-1",
  "original_filename": "深度洞察报告.pdf",
  "file_size": 1024,
  "mime_type": "application/pdf",
  "page_count": 15,
  "download_count": 5,
  "view_count": 20,
  "publish_date": "2024-01-01T10:00:00",
  "created_at": "2024-01-02T12:00:00",
  "point_name": "深度分析",
  "source_name": "用户上传",
  "title": "深度洞察报告",
  "status": "processing",
  "process_stage": "ocr",
  "process_progress": 45,
  "error_message": null,
  "summary": "这是一个关于2024年汽车行业市场分析的文档...",
  "cover_image": "https://zhipu-ai-generated-image-url..."
}
```

### 重新生成文档摘要
- 接口介绍：手动触发重新生成文档的摘要（使用 glm-4-flashx-250414）。后台异步执行。
- 接口方法：`POST /intelspider/uploaded-docs/{doc_uuid}/regenerate-summary`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/regenerate-summary
```
- 返回示例：
```json
{
  "message": "Summary regeneration started"
}
```

### 重新生成文档封面
- 接口介绍：手动触发重新生成文档的封面图片（使用 cogview-3-flash）。后台异步执行。**依赖于文档摘要，如果摘要不存在会尝试先生成摘要。**
- 接口方法：`POST /intelspider/uploaded-docs/{doc_uuid}/regenerate-cover`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/regenerate-cover
```
- 返回示例：
```json
{
  "message": "Cover image regeneration started"
}
```

### 删除文档
- 接口介绍：删除指定的文档。**同步删除文件系统中的文件、数据库记录（文档记录、关联文章记录、向量数据）。**
- 接口方法：`DELETE /intelspider/uploaded-docs/{doc_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1
```
- 返回示例：
```json
{
  "message": "Document doc-uuid-1 deleted successfully"
}
```

### 批量更新文档所属情报点
- 接口介绍：批量将文档从一个情报点移动到另一个情报点。用于在删除情报点前迁移文档，或重新组织文档。
- 接口方法：`POST /intelspider/uploaded-docs/batch-update-point`
- 字段说明：
  - `old_point_uuid`: 字符串，必填。原情报点 UUID。
  - `new_point_uuid`: 字符串，必填。目标情报点 UUID。
  - `doc_uuids`: 字符串列表，可选。指定要移动的文档 UUID 列表。如果不填或为空，则移动原情报点下的**所有**文档。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/batch-update-point \
  -H 'Content-Type: application/json' \
  -d '{
    "old_point_uuid": "old-point-uuid",
    "new_point_uuid": "new-point-uuid"
  }'
```
- 返回示例：
```json
{
  "message": "Successfully moved 5 documents to point 新情报点名称"
}
```

### 下载文档
- 接口介绍：下载原始文档文件。返回文件流。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}/download`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/download --output report.pdf
```

### 预览文档（PDF页）
- 接口介绍：获取 PDF 文档指定页的图片流（PNG格式）。用于前端安全预览，避免直接暴露原始 PDF 文件。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}/preview/{page_num}`
- 参数说明：
  - `page_num`: 整数，必填。页码，从 1 开始。
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/preview/1 --output page1.png
```

