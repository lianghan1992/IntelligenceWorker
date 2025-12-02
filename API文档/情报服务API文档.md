# 爬虫服务 API 文档

说明：本文件基于 `services/crawler/router.py` 的实际实现整理，供前后端及集成方使用。

## 基础信息
- 服务模块：`crawler`
- 认证：所有接口默认需要认证；使用项目统一的认证机制（Bearer Token）。
- 基础路径：`/api/crawler`

## 接口列表

### 1. Sources & Points

#### Create Point
- Path: `/api/crawler/points`
- Method: `POST`
- Description: Create a new intelligence point and generate its parser file.
- 请求体：
  ```json
  {
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "point_url": "https://example.com/news",
    "cron_schedule": "0 */2 * * *"
  }
  ```
- 响应：
  - `201`: `{"message": "Intelligence point created successfully", "point_id": "<uuid>"}`
  - `400`: 创建失败（如已存在）

#### List Points by Source
- Path: `/api/crawler/points`
- Method: `GET`
- Param: `source_name` (query, required)
- Response: `List[IntelligencePointPublic]`
  ```json
  [
    {
      "id": "<uuid>",
      "source_name": "盖世汽车",
      "point_name": "行业资讯",
      "point_url": "...",
      "cron_schedule": "...",
      "is_active": true,
      ...
    }
  ]
  ```

#### Delete Points (Batch)
- Path: `/api/crawler/points`
- Method: `DELETE`
- Body:
  ```json
  {
    "point_ids": ["<uuid1>", "<uuid2>"]
  }
  ```
- 响应：
  - `200`: `{"message": "Successfully deleted X intelligence point(s)."}`
  - `404`: 未找到匹配的情报点

#### List All Sources
- Path: `/api/crawler/sources`
- Method: `GET`
- Response:
  ```json
  [
    {
      "id": "<uuid>",
      "source_name": "盖世汽车",
      "subscription_count": 0
    }
  ]
  ```

#### List Source Names
- Path: `/api/crawler/sources/names`
- Method: `GET`
- Description: List all source names (excluding `通用子爬虫`)
- Response: `["盖世汽车", "艾邦智造", ...]`

#### Delete Source
- Path: `/api/crawler/sources/{source_name}`
- Method: `DELETE`
- Description: Delete a source and all associated points and data.
- Response:
  - `200`: `{"message": "Source '...' and its X associated points were deleted."}`

#### Check Crawler Health
- Path: `/api/crawler/points/{point_id}/health`
- Method: `GET`
- Description: Basic connectivity test to ensure parser and fetching are healthy.
- 响应：
  ```json
  {
    "status": "healthy",
    "message": "Crawler appears to be working correctly.",
    "last_success_time": "2024-11-26T12:00:00"
  }
  ```
  - `status` 可能值: `healthy`, `unhealthy`, `warning`, `error`

#### Toggle Crawler
- Path: `/api/crawler/points/{point_id}/toggle`
- Method: `POST`
- Description: Enable/disable a specific point, persisted to DB and scheduler.
- 请求体：
  ```json
  { "enable": true }
  ```
- 响应：
  - `200`: `{"success": true, "message": "Crawler ... has been enabled."}`
  - `404`: 情报点不存在

#### Toggle All Points for Source
- Path: `/api/crawler/sources/{source_name}/toggle`
- Method: `POST`
- Description: Enable/disable all points for a source and sync schedules.
- 请求体：
  ```json
  { "enable": false }
  ```
- 响应：`{"success": true, "message": "Source '盖世汽车' points disabled: 12"}`

---

### 2. 文章管理

#### 获取文章列表（分页/筛选）
- 路径：`/api/crawler/articles`
- 方法：`GET`
- 参数：
  - `source_name`: 按情报源名称过滤
  - `point_name`: 按情报点名称过滤
  - `point_ids`: 按情报点ID列表过滤 (List)
  - `publish_date_start`: 发布日期起始 (YYYY-MM-DD)
  - `publish_date_end`: 发布日期结束 (YYYY-MM-DD)
  - `page`: 页码 (默认1)
  - `limit`: 每页数量 (默认20)
- 响应：
  ```json
  {
    "total": 100,
    "page": 1,
    "limit": 20,
    "items": [CollectedArticlePublic]
  }
  ```

#### 批量删除文章
- 路径：`/api/crawler/articles`
- 方法：`DELETE`
- 描述：批量删除文章及其关联的向量分段、输出状态记录。
- 参数（Query）：
  - `article_ids`：可重复的查询参数，如 `?article_ids=id1&article_ids=id2`
  - 说明：为便于前端直接使用链接方式删除，现支持通过 Query 传递 ID 列表。
- cURL 示例：
  ```bash
  curl -X DELETE "http://127.0.0.1:7657/api/crawler/articles?article_ids=ID_1&article_ids=ID_2" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```
- 响应：
  - `200`: `{"message": "Successfully deleted X article(s) and their associated vectors."}`
  - `404`: 未找到匹配的文章

#### 获取文章详情（按ID）
- 路径：`/api/crawler/articles/{article_id}`
- 方法：`GET`
- 描述：传入文章ID，返回文章的标题、发布时间、文章内容、文章原始URL。
- 响应：
  ```json
  {
    "id": "<uuid>",
    "title": "文章标题",
    "publish_date": "2024-11-26",
    "content": "文章正文内容...",
    "original_url": "https://example.com/article"
  }
  ```
  - `404`: 未找到文章

---

### 3. Search & Feed

#### Get Intelligence Feed
- Path: `/api/crawler/feed`
- Method: `POST`
- Description: Fetch feed with filters and sort by publish date.
- 请求体：
  ```json
  {
    "point_ids": ["..."],
    "source_names": ["..."],
    "publish_date_start": "2024-01-01",
    "publish_date_end": "2024-12-31",
    "min_influence_score": 5,
    "sentiment": ["positive"],
    "page": 1,
    "limit": 20
  }
  ```
- 响应：`PaginatedFeedResponse`

#### Chunk Vector Search
- Path: `/api/crawler/search/chunks`
- Method: `POST`
- Description: Semantic search over chunk embeddings.
- 请求体：
  ```json
  {
    "query_text": "电池热管理",
    "point_ids": [],
    "source_names": [],
    "similarity_threshold": 0.5,
    "include_article_content": false,
    "top_k": 10
  }
  ```
- 响应：`ChunkSearchResponse`

#### Export Chunk Search Results
- Path: `/api/crawler/search/chunks/export`
- Method: `POST`
- Description: Export chunk search results for CSV.
- 响应：`ChunkExportResponse`

#### Articles Semantic Search
- Path: `/api/crawler/search/articles`
- Method: `POST`
- Description: Semantic search across selected points.
- 请求体：
  ```json
  {
    "query_text": "...",
    "point_ids": ["..."],
    "top_k": 5
  }
  ```
- 响应：`List[Dict]`

#### Filtered Semantic Search
- Path: `/api/crawler/search/articles_filtered`
- Method: `POST`
- Description: Combine filters with semantic search.
- 请求体：`FilteredSearchRequest`
- 响应：`PaginatedArticleSearchResponse`

#### Combined Search (Legacy)
- Path: `/api/crawler/search/combined`
- Method: `POST`
- Body: `CombinedSearchRequest`
- Response: `PaginatedArticleSearchResponse`

---

### 4. LLM Search Tasks

#### Start LLM Search Task
- Path: `/api/crawler/search/llm`
- Method: `POST`
- Description: Run prompt-driven relevance analysis and export CSV with progress.
- 请求体：
  ```json
  {
    "query_text": "查找关于固态电池的最新进展",
    "publish_date_start": "2024-01-01",
    "publish_date_end": "2024-06-01",
    "source_names": ["盖世汽车"]
  }
  ```
- 响应：`LLMSearchResponse` (包含 `task_id`)

#### List LLM Search Tasks
- Path: `/api/crawler/search/tasks`
- Method: `GET`
- Params: `page`, `limit`
- Response: `SearchTaskListResponse` (includes stats)

#### Get LLM Search Task Detail
- Path: `/api/crawler/search/tasks/{task_id}`
- Method: `GET`
- Response: task detail with progress stats

#### Download Task CSV
- Path: `/api/crawler/search/tasks/{task_id}/download`
- Method: `GET`
- Params:
  - `with_content`: bool (default True)
  - `both`: bool (default False, if True returns zip bundle)
- Response: file stream

---

### 5. 报告与工具

#### 获取任务统计信息
- 路径：`/api/crawler/tasks/stats`
- 方法：`GET`
- 响应：
  ```json
  {
    "sources": 10,
    "points": 20,
    "active_points": 18,
    "articles": 5000,
    "vectors": 15000,
    "schedules_active": 18
  }
  ```

#### 获取文章 HTML 报告
- 路径：`/api/crawler/articles/{article_id}/html`
- 方法：`GET`
- 响应：HTML 内容

#### 下载文章 PDF
- 路径：`/api/crawler/articles/{article_id}/pdf`
- 方法：`GET`
- 描述：如果 PDF 不存在，会尝试调用 Playwright 生成。
- 响应：PDF 文件流

#### 手动触发 PDF 生成
- 路径：`/api/crawler/report/pdf/{article_id}`
- 方法：`POST`
- 响应：`{"ok": true, "pdf_generated": true}`

#### 开关 HTML 生成功能
- 路径：`/api/crawler/html-generation/toggle`
- 方法：`POST`
- 参数：`enable` (query, bool)
- 响应：`{"ok": true, "enabled": true}`

#### 检查 Gemini Cookie
- 路径：`/api/crawler/gemini/cookies/check`
- 方法：`GET`
- 响应：`{"has_cookie": true, "valid": true}`

#### 更新 Gemini Cookie（仅支持表单）
- 路径：`/api/crawler/gemini/cookies`
- 方法：`POST`
- 认证：需要Bearer Token
- 请求类型：`multipart/form-data` 或 `application/x-www-form-urlencoded`
- 请求字段：
  - `secure_1psid` (必填)
  - `secure_1psidts` (必填)
  - `http_proxy` (可选)
- cURL 示例：
  ```bash
  curl -X POST "http://127.0.0.1:7657/api/crawler/gemini/cookies" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -F "secure_1psid=<值>" -F "secure_1psidts=<值>" -F "http_proxy=http://127.0.0.1:20171"
  ```

---

### 6. 立即执行子爬虫

#### 立即触发执行（按情报源）
- 路径：`/api/crawler/crawlers/{source_name}/run-now`
- 方法：`POST`
- 认证：需要Bearer Token
- 描述：根据 `services/crawler/crawlers/{source_name}/crawler.py` 自动加载并在后台线程中立即执行该爬虫的 `run_crawler(db: Session)`。此接口不阻塞请求，返回启动状态。
- 路径参数：
  - `source_name`: 情报源目录名或该爬虫在代码中声明的 `SOURCE_NAME`
- cURL 示例：
```bash
curl -X POST "http://127.0.0.1:7657/api/crawler/crawlers/盖世汽车/run-now" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
- 返回示例 (200 OK)：
```json
{
  "message": "started",
  "source_name": "盖世汽车",
  "module_path": "services.crawler.crawlers.盖世汽车.crawler"
}
```
- 说明：
- 若 `source_name` 不存在或无法加载，返回 `404`。
- 新增任何爬虫目录（包含 `crawler.py` 并定义 `SOURCE_NAME`、`CRON_SCHEDULE`、`INTELLIGENCE_TYPE`、`INITIAL_URL`、`POINTS`/`POINTS_DEFAULT`、以及 `run_crawler(db)`）均可自动被此接口发现并触发。

---

### 7. 通用子爬虫（Jina + 智谱，串行）

#### 创建通用情报点
- 路径：`/api/crawler/generic/points`
- 方法：`POST`
- 认证：需要Bearer Token
- 请求体：
  ```json
  {
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "point_url": "https://example.com/list",
    "cron_schedule": "0 */6 * * *"
  }
  ```
- 响应：`{"message": "Generic point created successfully", "point_id": "<uuid>"}`

#### 编辑通用情报点
- 路径：`/api/crawler/generic/points/{point_id}`
- 方法：`PUT`
- 认证：需要Bearer Token
- 请求体支持字段：`source_name`, `point_name`, `point_url`, `cron_schedule`, `is_active`
- 响应：`IntelligencePointPublic`

#### 获取通用情报源
- 路径：`/api/crawler/generic/sources`
- 方法：`GET`
- 响应：`[{"source_name": "盖世汽车"}, ...]`

#### 获取通用情报点
- 路径：`/api/crawler/generic/points` 或 `?source_name=...`
- 方法：`GET`
- 响应：`List[IntelligencePointPublic]`
  - 若未提供 `source_name`，返回所有通用情报点

#### 查询通用爬虫任务（懒加载）
- 路径：`/api/crawler/generic/tasks`
- 方法：`GET`
- 参数：`page`, `limit`, `source_name`(可选), `point_name`(可选)
- 响应：
  ```json
  {
    "total": 123,
    "page": 1,
    "limit": 20,
    "items": [
      {
        "id": "<uuid>",
        "source_name": "盖世汽车",
        "point_name": "行业资讯",
        "url": "https://example.com/list",
        "task_type": "文章列表提取",
        "stage": "AI识别",
        "detail_info": "links=42",
        "start_time": "2025-12-01T10:00:00+08:00",
        "end_time": "2025-12-01T10:02:00+08:00",
        "created_at": "2025-12-01T10:02:00+08:00"
      }
    ]
  }
  ```

#### 配置说明
- 目录：`services/crawler/crawlers/通用子爬虫`
- `.env` 支持：`ZHIPU_API_KEYS`, `ZHIPU_LLM_MODEL`, `JINA_API_KEYS`（可为空）、`PROMPT_LIST_EXTRACT`, `PROMPT_DETAIL_PARSE`, `CRON_SCHEDULE` 等。
- 提示词：`prompts/list_extract.json`、`prompts/detail_parse.json`
- Jina默认无需密钥；若配置 `JINA_API_KEYS` 使用第一个密钥。

### 8. 未确认文章管理

#### 查询未确认文章（懒加载）
- 路径：`/api/crawler/pending/articles`
- 方法：`GET`
- 认证：需要Bearer Token
- 参数：`page`, `limit`, `source_name`(可选), `point_name`(可选)
- 响应：
  ```json
  {
    "total": 123,
    "page": 1,
    "limit": 20,
    "items": [
      {
        "id": "<uuid>",
        "source_name": "盖世汽车",
        "point_name": "行业资讯",
        "point_url": "https://example.com/list",
        "original_url": "https://example.com/article",
        "title": "文章标题",
        "publish_date": "2025-12-01T10:00:00+08:00",
        "content": "文章内容",
        "crawl_metadata": {"jina_response_length": 1000, "glm_parsed": true, "crawl_time": "2025-12-01T10:00:00+08:00"},
        "status": "pending",
        "created_at": "2025-12-01T10:00:00+08:00"
      }
    ]
  }
  ```

#### 确认未确认文章入库
- 路径：`/api/crawler/pending/articles/confirm`
- 方法：`POST`
- 认证：需要Bearer Token
- 请求体：
  ```json
  {
    "article_ids": ["<uuid1>", "<uuid2>"]
  }
  ```
- 响应：`{"message": "Successfully confirmed 2 pending article(s)", "confirmed_count": 2}`

#### 删除未确认文章
- 路径：`/api/crawler/pending/articles/delete`
- 方法：`POST`
- 认证：需要Bearer Token
- 请求体：
  ```json
  {
    "article_ids": ["<uuid1>", "<uuid2>"]
  }
  ```
- 响应：`{"message": "Successfully deleted 2 pending article(s)", "deleted_count": 2}`
### 9. Generic Sub-Crawler Logging (.env)
- Path: `services/crawler/crawlers/通用子爬虫/.env`
- Settings:
  - `LOG_SAVE_ENABLED`: `true/false` — save raw Jina output and structured LLM results
  - `LOG_SAVE_DIR`: target directory for logs (defaults to crawler folder)
- File naming examples:
  - `YYYYMMDD_HHMMSS_<source>_<point>_list_jina.md`
  - `YYYYMMDD_HHMMSS_<source>_<point>_list_ai.json`
  - `YYYYMMDD_HHMMSS_<source>_<point>_detail_<hash>_jina.md`
-  `YYYYMMDD_HHMMSS_<source>_<point>_detail_<hash>_ai.json`

### 10. 前端使用指南（操作流程）

本节从前端视角提供可直接落地的流程指导，包含通用爬虫管理、未确认文章处理、分段向量检索与导出、LLM 指令检索、HTML 生成配置与状态监测。所有接口均在 `crawler` 服务下，基础路径为 `/api/crawler`。

#### 10.1 通用爬虫管理：新增、编辑、删除、启用/停止、立即开始

- 新增通用情报点
  - 路径：`POST /api/crawler/generic/points`
  - 请求体示例：
    ```json
    {
      "source_name": "盖世汽车",
      "point_name": "行业资讯",
      "point_url": "https://example.com/list",
      "cron_schedule": "0 */6 * * *"
    }
    ```
- 编辑通用情报点
  - 路径：`PUT /api/crawler/generic/points/{point_id}`
  - 支持字段：`source_name`, `point_name`, `point_url`, `cron_schedule`, `is_active`
- 删除通用情报点
  - 路径：`DELETE /api/crawler/generic/points/{point_id}`
- 启用/停止单个通用情报点
  - 路径：`POST /api/crawler/generic/points/{point_id}/toggle`
  - 请求体：`{"enable": true}` 或 `{"enable": false}`
- 批量启用/停止（按情报源，仅作用于通用子爬虫）
  - 路径：`POST /api/crawler/generic/sources/{source_name}/toggle`
  - 请求体：`{"enable": true|false}`
- 立即开始执行（全部通用情报点）
  - 路径：`POST /api/crawler/crawlers/通用子爬虫/run-now`
  - 说明：触发 `通用子爬虫` 模块的后台执行；将处理当前处于启用状态的所有通用情报点。
- 立即开始执行（仅某一个通用情报点）
  - 推荐流程：
    1) `GET /api/crawler/generic/points?source_name=...` 列出该源下的点
    2) 对非目标点调用 `POST /api/crawler/generic/points/{id}/toggle` 设为禁用
    3) 确保目标点已启用（`enable=true`）
    4) 调用 `POST /api/crawler/crawlers/通用子爬虫/run-now`
    5) 可选：任务完成后恢复其他点的启用状态

> 提示：如需一次性对某个源下所有点（不限爬虫类型）启停，可使用 `POST /api/crawler/sources/{source_name}/toggle`。

#### 10.2 未确认文章：通过与拒绝（懒加载）

- 列表查询（懒加载）
  - 路径：`GET /api/crawler/pending/articles`
  - 参数：`page`, `limit`, `source_name`(可选), `point_name`(可选)
  - 前端建议：以滚动或“加载更多”方式递增 `page` 实现懒加载。
- 通过（入库）
  - 路径：`POST /api/crawler/pending/articles/confirm`
  - 请求体示例：
    ```json
    { "article_ids": ["<uuid1>", "<uuid2>"] }
    ```
- 拒绝（删除）
  - 路径：`POST /api/crawler/pending/articles/delete`
  - 请求体示例：
    ```json
    { "article_ids": ["<uuid1>", "<uuid2>"] }
    ```

#### 10.3 分段向量检索与导出（关键词、TopK、相似度、源、时间段；含懒加载思路）

- 分段向量检索
  - 路径：`POST /api/crawler/search/chunks`
  - 请求体示例：
    ```json
    {
      "query_text": "电池热管理",
      "source_names": ["盖世汽车"],
      "publish_date_start": "2025-11-01",
      "publish_date_end": "2025-11-30",
      "similarity_threshold": 0.55,
      "top_k": 20,
      "include_article_content": false,
      "chunk_size_filter": "medium"
    }
    ```
  - 懒加载建议：
    - 该接口按 `top_k` 返回前 K 个最相关分段；前端可通过逐步增大 `top_k`（如 20→40→60）实现“加载更多”。
    - 返回包含 `total_chunks`/`total_articles`，可用于展示剩余可加载数量。
- 检索结果导出（CSV）
  - 路径：`POST /api/crawler/search/chunks/export`
  - 说明：与检索同参；后端将按文章维度合并命中的分段，并返回导出数据。

#### 10.4 LLM 指令检索（任务式、可下载 CSV）

- 启动检索任务
  - 路径：`POST /api/crawler/search/llm`
  - 请求体示例：
    ```json
    {
      "query_text": "查找固态电池的最新进展",
      "publish_date_start": "2025-10-01",
      "publish_date_end": "2025-11-30",
      "source_names": ["盖世汽车"]
    }
    ```
- 任务列表与统计（分页）
  - 路径：`GET /api/crawler/search/tasks`
  - 参数：`page`, `limit`
- 任务详情与进度
  - 路径：`GET /api/crawler/search/tasks/{task_id}`
- 导出 CSV
  - 路径：`GET /api/crawler/search/tasks/{task_id}/download`
  - 参数：`with_content`（是否包含原文）、`both`（为 true 时打包双版本 ZIP）

#### 10.5 HTML 生成配置：启停、Gemini Cookie、状态监测

- 开启/关闭 HTML 生成
  - 路径：`POST /api/crawler/html-generation/toggle?enable=true|false`
  - 响应：`{"ok": true, "enabled": true|false}`
- 配置 Gemini Cookie（表单）
  - 路径：`POST /api/crawler/gemini/cookies`
  - 字段：`secure_1psid`, `secure_1psidts`, `http_proxy`(可选，建议中国大陆网络配置)
  - 示例：
    ```bash
    curl -X POST "http://127.0.0.1:7657/api/crawler/gemini/cookies" \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -F "secure_1psid=<值>" -F "secure_1psidts=<值>" -F "http_proxy=http://127.0.0.1:20171"
    ```
- 监测 Cookie 状态
  - 路径：`GET /api/crawler/gemini/cookies/check`
  - 响应：`{"has_cookie": true|false, "valid": true|false}`
- 生成结果校验
  - 路径：`GET /api/crawler/articles/{article_id}/html`（存在则返回 HTML，404 表示未生成）
