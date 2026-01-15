# IntelSpider Service API 文档

IntelSpider 服务负责管理情报源、情报点、执行爬虫任务、以及提供文章数据访问接口。
本服务运行在端口：`7657`。
API 前缀：`/api/intelspider`。

---

## 代理池管理

### 获取代理列表
- 接口介绍：获取当前配置的所有代理及其启用状态。
- 接口方法：`GET /api/intelspider/proxies/`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/proxies/
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
- 接口方法：`POST /api/intelspider/proxies/`
- 字段说明：
  - `url`: 字符串，代理地址（如 `http://127.0.0.1:7890`），必填。
  - `enabled`: 布尔值，是否启用，默认为 `true`。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/proxies/ \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://192.168.1.100:8080"
  }'
```

### 更新代理
- 接口介绍：更新指定代理的配置。
- 接口方法：`PUT /api/intelspider/proxies/{proxy_url}`
- curl 示例：
```bash
curl -sS -X PUT http://127.0.0.1:7657/api/intelspider/proxies/http%3A%2F%2F192.168.1.100%3A8080 \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://192.168.1.100:8080",
    "enabled": false
  }'
```

### 删除代理
- 接口介绍：删除指定的代理。
- 接口方法：`DELETE /api/intelspider/proxies/{proxy_url}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/api/intelspider/proxies/http%3A%2F%2F192.168.1.100%3A8080
```

### 测试代理
- 接口介绍：测试指定代理是否可用（连接百度测试）。
- 接口方法：`POST /api/intelspider/proxies/test`
- 字段说明：
  - `url`: 字符串，待测试的代理地址。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/proxies/test \
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
- 接口方法：`GET /api/intelspider/stats/today_articles_count`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/stats/today_articles_count
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
- 接口方法：`GET /api/intelspider/sources/`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/sources/
```
- 返回示例：
```json
{
  "total": 1,
  "page": 1,
  "size": 50,
  "total_pages": 1,
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "盖世汽车",
      "main_url": "https://auto.gasgoo.com/",
      "total_points": 5,
      "total_articles": 120,
      "created_at": "2025-12-09T10:00:00"
    }
  ]
}
```

### 创建情报源
- 接口介绍：创建一个新的情报源（如“盖世汽车”）。创建成功后，系统会自动在 `services/intelspider/crawlers/` 目录下生成对应的目录结构。
- 接口方法：`POST /api/intelspider/sources/`
- 字段说明：
  - `name`：字符串，情报源名称，必填。
  - `main_url`：字符串，情报源主站 URL，必填。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/sources/ \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "盖世汽车",
    "main_url": "https://auto.gasgoo.com/"
  }'
```
- 返回示例：
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "盖世汽车",
  "main_url": "https://auto.gasgoo.com/",
  "total_points": 0,
  "total_articles": 0,
  "created_at": "2025-12-09T10:00:00"
}
```

### 删除情报源
- 接口介绍：软删除指定情报源及其所有关联的情报点。删除后，情报源和情报点将不再显示在列表中，且不再执行爬取任务，但已爬取的文章数据保留。
- 接口方法：`DELETE /api/intelspider/sources/{source_id}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/api/intelspider/sources/550e8400-e29b-41d4-a716-446655440000
```
- 返回示例：
```json
{
  "message": "Source 盖世汽车 and 5 points deleted successfully (soft delete)."
}
```

### 批量删除情报源
- 接口方法：`POST /api/intelspider/sources/batch-delete`
- 请求体：
```json
{
  "ids": ["id1", "id2"]
}
```

---

## 获取情报点列表
- 接口介绍：获取情报点列表，可按情报源筛选（已过滤删除的情报点）。
- 接口方法：`GET /api/intelspider/points/`
- 参数说明（Query Parameters）：
  - `source_id`：可选，筛选指定情报源下的情报点。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/api/intelspider/points/?source_id=550e8400-e29b-41d4-a716-446655440000"
```
- 返回示例：
```json
{
  "total": 1,
  "page": 1,
  "size": 50,
  "total_pages": 1,
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "source_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "车企资讯",
      "url": "https://auto.gasgoo.com/industry/C-108",
      "cron_schedule": "30 13 */2 * *",
      "initial_pages": 100,
      "is_active": true,
      "last_crawled_at": "2025-12-09T12:00:00",
      "created_at": "2025-12-09T10:00:00",
      "total_articles": 150
    }
  ]
}
```

---

## 任务管理

### 获取抓取任务列表
- 接口介绍：分页获取抓取任务列表，支持按情报点和状态筛选。
- 接口方法：`GET /api/intelspider/tasks`
- 参数说明（Query Parameters）：
  - `page`：页码，默认 1。
  - `size`：每页数量，默认 20。
  - `point_id`：可选，筛选指定情报点的任务。
  - `status`：可选，筛选指定状态的任务（pending, running, completed, failed）。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/api/intelspider/tasks?page=1&size=10"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "size": 10,
  "total_pages": 10,
  "items": [
    {
      "id": "task-uuid-123",
      "source_name": "盖世汽车",
      "point_name": "车企资讯",
      "status": "completed",
      "task_type": "incremental",
      "start_time": "2025-12-30T10:00:00",
      "end_time": "2025-12-30T10:05:00",
      "articles_collected": 15,
      "error_message": null
    }
  ]
}
```

---

## 创建情报点
- 接口介绍：在指定的情报源下创建一个新的情报点（如“车企资讯”）。创建成功后，系统会自动在 `services/intelspider/crawlers/{source_id}/` 目录下生成开发指南。
- 接口方法：`POST /api/intelspider/points/`
- 字段说明：
  - `source_id`：字符串，所属情报源的 ID，必填。
  - `name`：字符串，情报点名称，必填。
  - `url`：字符串，情报点具体的 URL，必填。
  - `cron_schedule`：字符串，爬取周期的 Cron 表达式，必填。
  - `initial_pages`：整数，可选，首次爬取时的最大页数（默认 100）。
  - `is_active`：布尔，可选，是否激活（默认 true）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/points/ \
  -H 'Content-Type: application/json' \
  -d '{
    "source_id": "550e8400-e29b-41d4-a716-446655440000",
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
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
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
- 接口方法：`PATCH /api/intelspider/points/{point_id}`
- 字段说明：
  - `name`：字符串，可选，情报点名称。
  - `cron_schedule`：字符串，可选，爬取周期的 Cron 表达式。
  - `initial_pages`：整数，可选，首次爬取时的最大页数。
  - `is_active`：布尔，可选，是否激活。
- curl 示例：
```bash
curl -sS -X PATCH http://127.0.0.1:7657/api/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef \
  -H 'Content-Type: application/json' \
  -d '{
    "cron_schedule": "0 8 * * *",
    "initial_pages": 200
  }'
```
- 返回示例：
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
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
- 接口方法：`POST /api/intelspider/points/{point_id}/disable`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef/disable
```

### 启用情报点
- 接口介绍：重新启用已被禁用的情报点。
- 接口方法：`POST /api/intelspider/points/{point_id}/enable`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef/enable
```

### 删除情报点
- 接口介绍：软删除指定情报点。删除后，情报点将不再显示在列表中，且不再执行爬取任务，但已爬取的文章数据保留。
- 接口方法：`DELETE /api/intelspider/points/{point_id}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/api/intelspider/points/a1b2c3d4-e5f6-7890-1234-567890abcdef
```

### 批量删除情报点
- 接口方法：`POST /api/intelspider/points/batch-delete`
- 请求体：
```json
{
  "ids": ["id1", "id2"]
}
```

---

## 获取文章列表（分页）
- 接口介绍：获取已爬取的文章列表，支持分页和多维度筛选。返回文章的基本信息（不包含正文）。
- 接口方法：`GET /api/intelspider/articles/`
- 参数说明（Query Parameters）：
  - `page`：整数，页码，默认 1。
  - `size`：整数，每页数量，默认 20。
  - `source_id`：可选，筛选指定情报源下的文章。
  - `point_id`：可选，筛选指定情报点下的文章。
  - `is_atomized`：可选，布尔值。`true` 筛选已原子化（html_content非空）的文章，`false` 筛选未原子化的文章。默认全部。
  - `start_date`：可选，字符串（YYYY-MM-DD），筛选发布日期在此日期之后（包含）的文章。
  - `end_date`：可选，字符串（YYYY-MM-DD），筛选发布日期在此日期之前（包含）的文章。
- 字段说明（Response）：
  - `is_atomized`：布尔值，表示该文章是否已原子化（依据：html_content 是否非空）。
  - `source_name`：字符串，情报源名称。
  - `point_name`：字符串，情报点名称。
  - `tags`：字符串（JSON格式），文章标签列表，用于对文章进行分类或标记关键信息（例如：'["新技术", "经济"]'）。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/api/intelspider/articles/?page=1&size=10&is_atomized=true&start_date=2025-01-01"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "size": 10,
  "total_pages": 10,
  "items": [
    {
      "id": "article-uuid-1",
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

## 导出文章列表（CSV）
- 接口介绍：导出符合筛选条件的文章列表为 CSV 文件。支持中文显示（带 BOM 的 UTF-8）。支持基于 LLM 的智能压缩功能，可指定导出的总 Token 数量上限。
- 接口方法：`GET /api/intelspider/articles/export`
- 参数说明（Query Parameters）：
  - `source_id`：可选，筛选指定情报源。
  - `point_id`：可选，筛选指定情报点。
  - `is_atomized`：可选，布尔值。筛选是否已原子化。
  - `start_date`：可选，起始发布日期（YYYY-MM-DD）。
  - `end_date`：可选，结束发布日期（YYYY-MM-DD）。
  - `compress_to_tokens`：可选，整数。期望将导出内容压缩到的总 Token 数量（例如 800000）。如果不填或为 0，则不进行压缩。压缩逻辑为智能摘要，优先保留短文章原文，对长文章进行摘要。
- 返回：CSV 文件流，文件名为 `articles_export_YYYYMMDDHHMMSS.csv`。
- CSV 字段：文章标题、文章情报源名称、文章发布时间、文章内容、URL。
- curl 示例：
```bash
# 基础导出
curl -sS -o articles.csv "http://127.0.0.1:7657/api/intelspider/articles/export?source_id=...&start_date=2025-01-01"

# 智能压缩导出（限制为 80万 Token）
curl -sS -o compressed_report.csv "http://127.0.0.1:7657/api/intelspider/articles/export?start_date=2025-01-01&compress_to_tokens=800000"
```

## 批量高级检索导出（CSV）
- 接口介绍：支持一次性传入多个检索条件，后端基于“数据库筛选+向量检索（可选）”混合模式进行精准匹配，并将结果合并导出为一个 CSV 文件。文件支持中文（BOM UTF-8），不同检索任务的结果在 CSV 中以空行分隔。
- 接口方法：`POST /api/intelspider/articles/export/batch_search`
- 请求体说明（Body）：
  - `queries`: 列表，包含多个检索任务对象。每个对象包含：
    - `name`: 检索任务名称（如“小米汽车竞品分析”）。
    - `keywords`: 检索关键词（支持空格表示 AND，竖线 `|` 表示 OR，例如 `小米|理想`）。
    - `start_date`: 可选，起始日期 (YYYY-MM-DD)。
    - `end_date`: 可选，结束日期 (YYYY-MM-DD)。
    - `source_id`: 可选，指定情报源 ID。
    - `point_id`: 可选，指定情报点 ID。
    - `use_vector_search`: 可选，布尔值，是否启用向量检索（默认 true）。启用后会先用数据库筛选缩小范围，再计算向量相似度。
    - `similarity_threshold`: 可选，浮点数，向量相似度阈值（默认 0.6）。
    - `limit`: 可选，整数，每个检索任务最大返回条数（默认 100）。
- 返回：CSV 文件流，文件名为 `batch_search_export_YYYYMMDDHHMMSS.csv`。
- CSV 结构：每个检索任务有独立的表头，包含任务名称。正文字段：文章标题、文章情报源名称、文章发布时间、文章内容、URL。
- curl 示例：
```bash
curl -sS -X POST "http://127.0.0.1:7657/api/intelspider/articles/export/batch_search" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {
        "name": "小米动态",
        "keywords": "小米 汽车",
        "start_date": "2025-01-01"
      },
      {
        "name": "理想竞品",
        "keywords": "理想|问界",
        "limit": 50
      }
    ]
  }' > batch_export.csv
```

## 按标签获取文章列表（分页）
- 接口介绍：根据标签筛选文章，支持查询包含指定所有标签的文章，支持分页。返回格式与获取文章列表一致。
- 接口方法：`GET /api/intelspider/articles/by_tags`
- 参数说明（Query Parameters）：
  - `tags`：字符串列表，必填，标签名称（例如：tags=新技术&tags=经济）。
  - `page`：整数，页码，默认 1。
  - `size`：整数，每页数量，默认 20。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/api/intelspider/articles/by_tags?tags=新技术&tags=经济&page=1&size=10"
```
- 返回示例：
```json
{
  "total": 50,
  "page": 1,
  "size": 10,
  "total_pages": 5,
  "items": [
    {
      "id": "article-uuid-2",
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
- 接口方法：`GET /api/intelspider/articles/{article_id}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/articles/article-uuid-1
```
- 返回示例：
```json
{
  "id": "article-uuid-1",
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
- 接口方法：`DELETE /api/intelspider/articles/{article_id}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/api/intelspider/articles/article-uuid-1
```
- 返回示例：
```json
{
  "message": "Article deleted successfully"
}
```

### 批量删除文章
- 接口方法：`POST /api/intelspider/articles/batch-delete`
- 请求体：
```json
{
  "ids": ["id1", "id2"]
}
```

---

## 触发爬取任务
- 接口介绍：手动立即触发一个情报点的爬取任务。
- 接口方法：`POST /api/intelspider/tasks/trigger/`
- 字段说明：
  - `point_id`：字符串，目标情报点的 ID，必填。
  - `task_type`：字符串，可选，任务类型：`initial`（首次爬取）或 `incremental`（增量爬取）。默认 `incremental`。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/tasks/trigger/ \
  -H 'Content-Type: application/json' \
  -d '{
    "point_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "task_type": "initial"
  }'
```
- 返回示例：
```json
{
  "message": "Task triggered successfully",
  "id": "778899aa-bbcc-ddee-ff00-112233445566"
}
```

---

## HTML生成与管理

### 开启/停止 HTML生成功能
- 接口介绍：开启或停止 IntelSpider 的后台 HTML 生成功能。
- 接口方法：`POST /api/intelspider/html/generation/enable`
- 字段说明：
  - `enabled`: 布尔值，`true` 开启，`false` 停止。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/html/generation/enable \
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
- 接口方法：`POST /api/intelspider/html/retrospective/enable`
- 字段说明：
  - `enabled`: 布尔值，`true` 开启，`false` 停止。
  - `order_by`: 字符串，可选，处理顺序。`desc` (默认) 从新到旧，`asc` 从旧到新。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/html/retrospective/enable \
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
- 接口方法：`GET /api/intelspider/html/status`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/html/status
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
- 接口方法：`POST /api/intelspider/tags/reanalyze`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/tags/reanalyze
```
- 返回示例：
```json
{
  "message": "Started backfill of missing tags."
}
```

---

## 语义检索

### 语义搜索
- 接口介绍：基于向量相似度的语义搜索，查找相关文章片段。
- 接口方法：`POST /api/intelspider/search/semantic`
- 请求体说明：
  - `query_text`: 字符串，必填，搜索文本。
  - `source_id`: 字符串，可选，筛选情报源。
  - `point_id`: 字符串，可选，筛选情报点。
  - `start_date`: 字符串 (YYYY-MM-DD)，可选。
  - `end_date`: 字符串 (YYYY-MM-DD)，可选。
  - `max_segments`: 整数，默认 50，最大返回片段数。
  - `similarity_threshold`: 浮点数，默认 0.7。
  - `page`: 整数，默认 1。
  - `size`: 整数，默认 20。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/search/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "新能源电池技术",
    "similarity_threshold": 0.6
  }'
```
- 返回示例：
```json
{
  "total_segments": 5,
  "page": 1,
  "size": 20,
  "items": [
    {
      "id": "article-uuid-1",
      "similarity": 0.85,
      "title": "电池技术新突破",
      "publish_date": "2025-01-01T10:00:00",
      "source_name": "盖世汽车",
      "content": "..."
    }
  ]
}
```

### 语义搜索（按文章聚合）
- 接口介绍：基于向量相似度的语义搜索，返回结果按文章进行聚合。适用于智能体上下文补充，提供更完整的文章信息及命中片段。
- 接口方法：`POST /api/intelspider/search/semantic/grouped`
- 请求体说明（与普通语义搜索一致）：
  - `query_text`: 字符串，必填，搜索文本。
  - `source_id`: 字符串，可选，筛选情报源。
  - `point_id`: 字符串，可选，筛选情报点。
  - `start_date`: 字符串 (YYYY-MM-DD)，可选。
  - `end_date`: 字符串 (YYYY-MM-DD)，可选。
  - `similarity_threshold`: 浮点数，默认 0.7。
  - `page`: 整数，默认 1。
  - `size`: 整数，默认 20（返回的文章数量）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/search/semantic/grouped \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "新能源电池技术",
    "similarity_threshold": 0.6
  }'
```
- 返回示例：
```json
{
  "total_articles": 2,
  "page": 1,
  "size": 20,
  "items": [
    {
      "article_id": "article-uuid-1",
      "title": "电池技术新突破",
      "publish_date": "2025-01-01T10:00:00",
      "source_name": "盖世汽车",
      "url": "https://...",
      "segments": [
        {
          "content": "片段1内容...",
          "similarity": 0.85
        },
        {
          "content": "片段2内容...",
          "similarity": 0.75
        }
      ]
    }
  ]
}
```

---

## 高级文档生成

### 单篇文章生成 HTML
- 接口介绍：手动触发单篇文章的 HTML 原子化生成。
- 接口方法：`POST /api/intelspider/articles/{article_id}/generate_html`
- 参数说明（Query Parameters）：
  - `provider`: 字符串，可选。指定用于生成 HTML 的模型提供商（例如 `gemini`, `zhipuai`, `deepseek`）。如果不指定，将使用系统配置的默认提供商。
- curl 示例：
```bash
# 使用默认 Provider
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/articles/article-uuid-1/generate_html

# 强制指定 ZhipuAI
curl -sS -X POST "http://127.0.0.1:7657/api/intelspider/articles/article-uuid-1/generate_html?provider=zhipuai"
```
- 返回示例：
```json
{
  "message": "HTML generated successfully",
  "id": "article-uuid-1"
}
```

### 批量后台生成 HTML
- 接口介绍：触发后台任务，批量为没有 HTML 的文章生成 HTML。
- 接口方法：`POST /api/intelspider/html/batch/generate`
- 请求体说明：
  - `point_id`: 字符串，可选，限制特定情报点。
  - `force_regenerate`: 布尔值，默认 false。如果为 true，则即使已有 HTML 也会重新生成。
  - `limit`: 整数，默认 10，本次批量处理的最大文章数。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/html/batch/generate \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50,
    "force_regenerate": false
  }'
```
- 返回示例：
```json
{
  "message": "Batch generation started in background"
}
```

### 生成文章 PDF
- 接口介绍：将文章的 HTML 内容转换为 PDF 并下载。如果 HTML 不存在，会尝试实时生成。允许通过参数自定义生成尺寸。
- 接口方法：`POST /api/intelspider/articles/{article_id}/pdf`
- 参数说明（Query Parameters）：
  - `width`: 整数，可选。指定浏览器视窗宽度及 PDF 宽度 (单位: px)。若不传，则自动适应内容宽度。
  - `height`: 整数，可选。指定浏览器视窗高度及 PDF 高度 (单位: px)。若不传，则自动适应内容高度。
- curl 示例：
```bash
# 默认自适应模式
curl -sS -X POST -o article.pdf http://127.0.0.1:7657/api/intelspider/articles/article-uuid-1/pdf

# 指定尺寸模式 (例如指定 1920x1080)
curl -sS -X POST -o article_fixed.pdf "http://127.0.0.1:7657/api/intelspider/articles/article-uuid-1/pdf?width=1920&height=1080"
```
- 返回：二进制 PDF 文件流。

---

## 上传文档管理 (Uploaded Docs)

### 获取上传文档列表
- 接口介绍：获取已上传的文档列表，支持分页和筛选。
- 接口方法：`GET /api/intelspider/uploaded-docs`
- 参数说明（Query Parameters）：
  - `page`: 整数，默认 1。
  - `size`: 整数，默认 20。
  - `source_id`: 可选，筛选情报源。
  - `point_id`: 可选，筛选情报点。
  - `status`: 可选，筛选处理状态 (e.g., 'completed', 'processing', 'failed')。
  - `keyword`: 可选，搜索标题或文件名。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/api/intelspider/uploaded-docs?page=1&size=10"
```
- 返回示例：
```json
{
  "total": 5,
  "page": 1,
  "size": 10,
  "total_pages": 1,
  "items": [
    {
      "id": "doc-uuid-1",
      "article_id": "article-uuid-1",
      "original_filename": "report.pdf",
      "status": "completed",
      "summary": "文档摘要...",
      "cover_image": "2025/01/01/doc-uuid-1_cover.png",
      "page_count": 10,
      "view_count": 5
    }
  ]
}
```

### 上传文档
- 接口介绍：上传新的 PDF/Word/PPT 文档进行处理。
- 接口方法：`POST /api/intelspider/uploaded-docs/upload`
- 表单参数（Multipart Form）：
  - `files`: 文件列表。
  - `point_id`: 字符串，关联的情报点 ID。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/uploaded-docs/upload \
  -F "point_id=point-uuid" \
  -F "files=@/path/to/report.pdf"
```

### 获取单文档详情
- 接口介绍：获取单个上传文档的详细信息，包含封面图片链接和摘要。
- 接口方法：`GET /api/intelspider/uploaded-docs/{doc_id}`
- 返回示例：
```json
{
  "id": "doc-uuid-1",
  "original_filename": "report.pdf",
  "status": "completed",
  "summary": "This is a summary...",
  "cover_image": "2025/01/01/doc-uuid-1_cover.png",
  "process_stage": "finished",
  "process_progress": 100
}
```

### 获取文档封面
- 接口介绍：获取文档的封面图片。如果封面图片存在（本地或远程），直接返回图片；如果不存在，自动降级为返回 PDF 的第一页预览图。
- 接口方法：`GET /api/intelspider/uploaded-docs/{doc_id}/cover`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/uploaded-docs/doc-uuid-1/cover -o cover.png
```
- 返回：图片二进制流 (image/png)。

### 预览 PDF 页面
- 接口介绍：获取 PDF 文档特定页面的预览图（PNG格式）。
- 接口方法：`GET /api/intelspider/uploaded-docs/{doc_id}/preview/{page_num}`
- 参数说明：
  - `doc_id`: 文档 UUID。
  - `page_num`: 页码（从 1 开始）。
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/uploaded-docs/doc-uuid-1/preview/1 -o page1.png
```
- 返回：图片二进制流 (image/png)。

### 重新生成封面图片
- 接口介绍：触发后台任务，根据文档摘要重新生成封面图片。
- 接口方法：`POST /api/intelspider/uploaded-docs/{doc_id}/regenerate-cover`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/uploaded-docs/doc-uuid-1/regenerate-cover
```
- 返回示例：
```json
{
  "message": "Cover image regeneration started"
}
```

### 重新生成摘要
- 接口介绍：触发后台任务，重新生成文档摘要。
- 接口方法：`POST /api/intelspider/uploaded-docs/{doc_id}/regenerate-summary`
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/uploaded-docs/doc-uuid-1/regenerate-summary
```
- 返回示例：
```json
{
  "message": "Summary regeneration started"
}
```

### 删除文档
- 接口介绍：删除上传的文档及其关联的文章数据。
- 接口方法：`DELETE /api/intelspider/uploaded-docs/{doc_id}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/api/intelspider/uploaded-docs/doc-uuid-1
```

---

## LLM 分析任务管理

### 创建分析任务
- 接口介绍：创建一个新的 LLM 分析任务，后台将异步执行分析。
- 接口方法：`POST /api/intelspider/llm/tasks`
- 字段说明（Body）：
  - `user_id`: 字符串，用户 ID，必填。
  - `description`: 字符串，任务描述，必填。
  - `time_range`: 字符串，可选，时间范围（如 "2023-01,2023-12"）。
  - `source_ids`: 字符串列表，可选，情报源 ID 列表。
  - `need_summary`: 布尔值，可选，是否生成摘要（默认 false）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/llm/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user123",
    "description": "分析新能源趋势",
    "time_range": "2024-01,2024-06",
    "need_summary": true
  }'
```
- 返回示例：
```json
{
  "id": "task-uuid-1",
  "user_id": "user123",
  "description": "分析新能源趋势",
  "status": "analyzing",
  "progress": 0,
  "created_at": "2024-01-01T10:00:00"
}
```

### 获取分析任务列表
- 接口介绍：分页获取 LLM 分析任务列表。
- 接口方法：`GET /api/intelspider/llm/tasks`
- 参数说明（Query Parameters）：
  - `page`: 页码，默认 1。
  - `size`: 每页数量，默认 50。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/api/intelspider/llm/tasks?page=1&size=10"
```
- 返回示例：
```json
{
  "total": 5,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": "task-uuid-1",
      "user_id": "user123",
      "description": "分析新能源趋势",
      "status": "completed",
      "progress": 100,
      "csv_path": "reports/report.csv",
      "created_at": "2024-01-01T10:00:00",
      "completed_at": "2024-01-01T10:05:00"
    }
  ]
}
```

### 获取单任务详情
- 接口介绍：获取指定任务的状态和详情。
- 接口方法：`GET /api/intelspider/llm/tasks/{task_id}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/api/intelspider/llm/tasks/task-uuid-1
```
- 返回示例：同创建任务返回结构。

### 下载任务报告
- 接口介绍：下载已完成任务的 CSV 报告。
- 接口方法：`GET /api/intelspider/llm/tasks/{task_id}/download`
- curl 示例：
```bash
curl -sS -O http://127.0.0.1:7657/api/intelspider/llm/tasks/task-uuid-1/download
```
- 返回：CSV 文件流。

---

## Gemini Cookie 聊天接口

### Chat Completions
- 接口介绍：基于 Gemini Cookie 封装的 OpenAI 兼容对话接口。
- 接口方法：`POST /api/intelspider/gemini/chat/completions`
- 字段说明（Body）：
  - `model`: 字符串，模型名称（如 "gemini-2.5-flash"）。
  - `messages`: 列表，对话历史，包含 `role` 和 `content`。
  - `stream`: 布尔值，是否流式输出（当前仅支持非流式，stream=true 也会返回一次性结果）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/gemini/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```
- 返回示例：
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gemini-2.5-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```


