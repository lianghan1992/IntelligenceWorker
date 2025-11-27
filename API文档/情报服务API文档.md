# 爬虫服务 API 文档

说明：本文件基于 `services/crawler/router.py` 的实际实现整理，供前后端及集成方使用。

## 基础信息
- 服务模块：`crawler`
- 认证：所有接口默认需要认证；使用项目统一的认证机制（Bearer Token）。
- 基础路径：`/api/crawler`

## 接口列表

### 1. 情报源与情报点管理

#### 创建情报点
- 路径：`/api/crawler/points`
- 方法：`POST`
- 描述：创建新的情报点，并自动生成对应的解析器文件。
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

#### 获取指定情报源下的情报点
- 路径：`/api/api/crawler/points`
- 方法：`GET`
- 参数：`source_name` (query, required)
- 响应：`List[IntelligencePointPublic]`
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

#### 批量删除情报点
- 路径：`/api/api/crawler/points`
- 方法：`DELETE`
- 请求体：
  ```json
  {
    "point_ids": ["<uuid1>", "<uuid2>"]
  }
  ```
- 响应：
  - `200`: `{"message": "Successfully deleted X intelligence point(s)."}`
  - `404`: 未找到匹配的情报点

#### 获取所有情报源
- 路径：`/api/crawler/sources`
- 方法：`GET`
- 响应：
  ```json
  [
    {
      "id": "<uuid>",
      "source_name": "盖世汽车",
      "subscription_count": 0
    }
  ]
  ```

#### 获取所有情报源名称列表
- 路径：`/api/crawler/sources/names`
- 方法：`GET`
- 响应：`["盖世汽车", "艾邦智造", ...]`

#### 删除情报源
- 路径：`/api/crawler/sources/{source_name}`
- 方法：`DELETE`
- 描述：删除一个情报源及其下的所有情报点和数据。
- 响应：
  - `200`: `{"message": "Source '...' and its X associated points were deleted."}`

#### 检测爬虫健康度
- 路径：`/api/crawler/points/{point_id}/health`
- 方法：`GET`
- 描述：自行判断当前爬虫是否还可以正常爬取数据解析，而没有被反爬虫或其他。会尝试导入解析器并进行简单的连通性测试。
- 响应：
  ```json
  {
    "status": "healthy",
    "message": "Crawler appears to be working correctly.",
    "last_success_time": "2024-11-26T12:00:00"
  }
  ```
  - `status` 可能值: `healthy`, `unhealthy`, `warning`, `error`

#### 启用/禁用爬虫
- 路径：`/api/crawler/points/{point_id}/toggle`
- 方法：`POST`
- 描述：启用或禁用某个具体情报点，并持久化到数据库与调度器（入口调度项将同步更新）。
- 请求体：
  ```json
  { "enable": true }
  ```
- 响应：
  - `200`: `{"success": true, "message": "Crawler ... has been enabled."}`
  - `404`: 情报点不存在

#### 批量启用/禁用某情报源下所有情报点
- 路径：`/api/crawler/sources/{source_name}/toggle`
- 方法：`POST`
- 描述：对某个情报源的所有情报点执行启用/禁用，并同步调度表 `CrawlerSchedule` 的入口项。
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

---

### 3. 搜索与信息流

#### 获取情报信息流 (Feed)
- 路径：`/api/crawler/feed`
- 方法：`POST`
- 描述：获取情报信息流，支持多种筛选条件，并按发布日期排序。
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

#### 分段向量检索 (Chunks Search)
- 路径：`/api/crawler/search/chunks`
- 方法：`POST`
- 描述：基于分段向量进行语义检索。
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

#### 导出分段检索结果
- 路径：`/api/crawler/search/chunks/export`
- 方法：`POST`
- 描述：导出分段向量检索结果，通常用于生成CSV。
- 响应：`ChunkExportResponse`

#### 文章语义搜索 (Articles Semantic Search)
- 路径：`/api/crawler/search/articles`
- 方法：`POST`
- 描述：根据自然语言文本，在指定情报点范围内进行语义搜索，返回相关文章。
- 请求体：
  ```json
  {
    "query_text": "...",
    "point_ids": ["..."],
    "top_k": 5
  }
  ```
- 响应：`List[Dict]`

#### 组合筛选与语义搜索
- 路径：`/api/crawler/search/articles_filtered`
- 方法：`POST`
- 描述：结合结构化筛选和语义搜索。
- 请求体：`FilteredSearchRequest`
- 响应：`PaginatedArticleSearchResponse`

#### 组合搜索 (兼容旧版)
- 路径：`/api/crawler/search/combined`
- 方法：`POST`
- 请求体：`CombinedSearchRequest`
- 响应：`PaginatedArticleSearchResponse`

---

### 4. LLM 检索任务

#### 发起 LLM 检索任务
- 路径：`/api/crawler/search/llm`
- 方法：`POST`
- 描述：基于提示词的LLM相关性检索并导出CSV（含进度）。
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

#### 获取 LLM 检索任务列表
- 路径：`/api/crawler/search/tasks`
- 方法：`GET`
- 参数：`page`, `limit`
- 响应：`SearchTaskListResponse` (包含任务统计信息)

#### 获取单个 LLM 检索任务详情
- 路径：`/api/crawler/search/tasks/{task_id}`
- 方法：`GET`
- 响应：任务详情字典（包含进度统计）

#### 下载任务结果 CSV
- 路径：`/api/crawler/search/tasks/{task_id}/download`
- 方法：`GET`
- 参数：
  - `with_content`: bool (默认 True)
  - `both`: bool (默认 False, 若为 True 则下载 zip 包)
- 响应：文件流

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
