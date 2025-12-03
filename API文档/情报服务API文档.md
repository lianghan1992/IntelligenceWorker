# 爬虫服务 API 文档（独立版）

说明：本文件位于 `services/crawler` 下，包含接口名称、功能、字段、返回示例。所有接口统一前缀为 `/api/crawler`，鉴权请在请求头添加 `Authorization: Bearer <accessToken>`（登录接口：`POST /api/user/login`）。

## 源与点管理

- 接口：`GET /api/crawler/sources`
  - 功能：获取顶层情报源列表
  - 字段：无
  - 返回字段：`id`（字符串）、`source_name`（字符串）、`subscription_count`（整数）
  - 返回示例：
    ```json
    [
      {"id":"e2a...","source_name":"盖世汽车","subscription_count":12},
      {"id":"b0f...","source_name":"36KR","subscription_count":8}
    ]
    ```

- 接口：`GET /api/crawler/sources/names`
  - 功能：获取情报源名称列表
  - 字段：无
  - 返回字段：`[]string`（源名称数组）
  - 返回示例：
    ```json
    ["盖世汽车","36KR","艾邦智造"]
    ```

- 接口：`GET /api/crawler/points?source_name=...`
  - 功能：按源名称获取该源的情报点列表
  - 字段：Query：`source_name`（字符串）
  - 返回字段：参见 `IntelligencePointPublic`（`id`、`source_id`、`source_name`、`point_name`、`point_url`、`cron_schedule`、`is_active`、`last_triggered_at`、`parser_module_path`、`created_at`、`updated_at`）
  - 返回示例：
    ```json
    [{
      "id":"19bf...",
      "source_id":"e2a...",
      "source_name":"盖世汽车",
      "point_name":"行业资讯",
      "point_url":"https://auto.gasgoo.com/Rss/...",
      "cron_schedule":"0 8 * * *",
      "is_active":true,
      "last_triggered_at":null,
      "parser_module_path":"services.crawler.crawlers.盖世汽车.crawler",
      "created_at":"2025-11-25T10:22:31+08:00",
      "updated_at":"2025-11-25T10:22:31+08:00"
    }]
    ```

- 接口：`GET /api/crawler/sources-and-points`
  - 功能：获取所有源与点，并区分类型（manual/generic/mixed）
  - 字段：Query（可选）：`source_name`、`point_id`
  - 返回字段：`source_id`、`source_name`、`source_type`、`created_at`、`updated_at`、`points[]`（每项包含 `id`、`point_name`、`url`、`cron_schedule`、`created_at`、`type`、`is_active`）
  - 返回示例：
    ```json
    [{
      "source_id":"e2a...",
      "source_name":"盖世汽车",
      "source_type":"manual",
      "created_at":"2025-11-25T10:00:00+08:00",
      "updated_at":"2025-11-26T10:00:00+08:00",
      "points":[{"id":"19bf...","point_name":"行业资讯","url":"https://...","cron_schedule":"0 8 * * *","created_at":"...","type":"manual","is_active":true}]
    }]
    ```

- 接口：`POST /api/crawler/points`
  - 功能：创建手动情报点
  - 字段：JSON：`source_name`、`point_name`、`point_url`、`cron_schedule`
  - 返回字段：`message`、`point_id`
  - 返回示例：
    ```json
    {"message":"Intelligence point created successfully","point_id":"19bfaa94-9c48-4ec0-ba1f-d211ae598f8a"}
    ```

- 接口：`POST /api/crawler/points/{point_id}/toggle`
  - 功能：启停单个子爬虫
  - 字段：JSON：`enable`（布尔）
  - 返回字段：`success`（布尔）、`message`（字符串）
  - 返回示例：
    ```json
    {"success":true,"message":"Crawler 行业资讯 has been enabled."}
    ```

- 接口：`GET /api/crawler/points/{point_id}/health`
  - 功能：检查子爬虫健康情况
  - 字段：Path：`point_id`
  - 返回字段：`status`（healthy/warning/unhealthy/error）、`message`（字符串）、`last_success_time`（可为空字符串）
  - 返回示例：
    ```json
    {"status":"healthy","message":"Crawler appears to be working correctly.","last_success_time":"2025-11-26T09:30:12+08:00"}
    ```

- 接口：`POST /api/crawler/sources/{source_name}/toggle`
  - 功能：启停整源所有情报点
  - 字段：Path：`source_name`；JSON：`enable`（布尔）
  - 返回字段：`success`（布尔）、`message`（字符串）或 `{ok: true, affected_points: 数量, enabled: 布尔}`
  - 返回示例：
    ```json
    {"ok":true,"affected_points":12,"enabled":false}
    ```

- 接口：`DELETE /api/crawler/points`
  - 功能：批量删除情报点
  - 字段：JSON：`point_ids`（字符串数组）
  - 返回字段：`message`
  - 返回示例：
    ```json
    {"message":"Successfully deleted 2 intelligence point(s)."}
    ```

- 接口：`DELETE /api/crawler/sources/{source_name}`
  - 功能：删除整源及其所有情报点
  - 字段：Path：`source_name`
  - 返回字段：`message`
  - 返回示例：
    ```json
    {"message":"Source '盖世汽车' and its 5 associated points were deleted."}
    ```

## 通用子爬虫（Generic）

- 接口：`POST /api/crawler/generic/points`
  - 功能：创建通用情报点
  - 字段：JSON：`source_name`、`point_name`、`point_url`、`cron_schedule`、可选 `list_hint`、可选 `list_filters[]`
  - 返回字段：`message`、`point_id`
  - 返回示例：
    ```json
    {"message":"Generic point created successfully","point_id":"c1d..."}
    ```

- 接口：`PUT /api/crawler/generic/points/{point_id}`
  - 功能：更新通用点（名称、URL、CRON、启停）
  - 字段：JSON（可选）：`source_name`、`point_name`、`point_url`、`cron_schedule`、`is_active`、`list_hint`、`list_filters[]`
  - 返回字段：同 `IntelligencePointPublic`
  - 返回示例：见上文 `GET /points` 的返回结构（字段一致）

- 接口：`DELETE /api/crawler/generic/points/{point_id}`
  - 功能：删除通用点
  - 字段：Path：`point_id`
  - 返回字段：`ok`
  - 返回示例：
    ```json
    {"ok":true}
    ```

- 接口：`POST /api/crawler/generic/points/{point_id}/toggle`
  - 功能：启停通用点
  - 字段：Path：`point_id`；JSON：`enable`（布尔）
  - 返回字段：`ok`、`enabled`
  - 返回示例：
    ```json
    {"ok":true,"enabled":true}
    ```

- 接口：`POST /api/crawler/generic/points/{point_id}/run-now`
  - 功能：立即执行单个通用点（后台线程触发）
  - 字段：Path：`point_id`
  - 返回字段：`message`、`point_id`
  - 返回示例：
    ```json
    {"message":"started","point_id":"19bfaa94-9c48-4ec0-ba1f-d211ae598f8a"}
    ```

- 接口：`GET /api/crawler/generic/sources`
  - 功能：列出通用源
  - 字段：无
  - 返回字段：数组，每项包含 `source_name`
  - 返回示例：
    ```json
    [{"source_name":"通用子爬虫"}]
    ```

- 接口：`GET /api/crawler/generic/points?source_name=...`
  - 功能：列出通用点（可按源过滤）
  - 字段：Query（可选）：`source_name`
  - 返回字段：同 `IntelligencePointPublic` 数组
  - 返回示例：见上文 `GET /points` 的返回结构

- 接口：`PUT /api/crawler/generic/sources/{source_name}`
  - 功能：编辑通用源（重命名、CRON、启停）
  - 字段：JSON（可选）：`new_name`、`cron_schedule`、`is_active`
  - 返回字段：`ok`、`source_name`、`cron_schedule`、`is_active`（按实现）
  - 返回示例：
    ```json
    {"ok":true,"source_name":"通用子爬虫","cron_schedule":"0 */2 * * *","is_active":true}
    ```

- 接口：`POST /api/crawler/generic/sources/{source_name}/toggle`
  - 功能：启停整源所有通用点
  - 字段：Path：`source_name`；JSON：`enable`（布尔）
  - 返回字段：`ok`、`affected_points`、`enabled`
  - 返回示例：
    ```json
    {"ok":true,"affected_points":12,"enabled":false}
    ```

- 接口：`DELETE /api/crawler/generic/sources/{source_name}`
  - 功能：删除仅含通用点的源
  - 字段：Path：`source_name`
  - 返回字段：`ok`
  - 返回示例：
    ```json
    {"ok":true}
    ```

- 接口：`GET /api/crawler/generic/tasks?page=1&limit=20`
  - 功能：通用爬虫任务懒加载分页
  - 字段：Query：`page`、`limit`、可选 `source_name`、`point_name`
  - 返回字段：`total`、`page`、`limit`、`items[]`（字段见 `GenericCrawlerTaskPublic`：`id`、`source_name`、`point_name`、`url`、`task_type`、`stage`、`detail_info`、`start_time`、`end_time`、`created_at`）
  - 返回示例：
    ```json
    {"total":2,"page":1,"limit":20,"items":[{"id":"t1","source_name":"通用子爬虫","point_name":"列表页","url":"https://...","task_type":"文章列表提取","stage":"AI识别","detail_info":"links=30","start_time":"...","end_time":"...","created_at":"..."}]}
    ```

- 接口：`GET /api/crawler/pending/articles?page=1&limit=20`
  - 功能：待确认文章分页
  - 字段：Query：`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`items[]`（见 `CrawlerPendingArticlePublic`：`id`、`source_name`、`point_name`、`point_url`、`original_url`、`title`、`publish_date`）
  - 返回示例：
    ```json
    {"total":20,"page":1,"limit":20,"items":[{"id":"a1","source_name":"通用子爬虫","point_name":"行业","point_url":"https://...","original_url":"https://...","title":"标题","publish_date":"2025-11-26"}]}
    ```

- 接口：`POST /api/crawler/pending/articles/confirm`
  - 功能：确认文章
  - 字段：JSON：`article_ids`（字符串数组）
  - 返回字段：`message`、`confirmed_count`
  - 返回示例：
    ```json
    {"message":"Successfully confirmed 2 pending article(s)","confirmed_count":2}
    ```

- 接口：`POST /api/crawler/pending/articles/delete`
  - 功能：删除待确认文章
  - 字段：JSON：`article_ids`（字符串数组）
  - 返回字段：`message`、`deleted_count`
  - 返回示例：
    ```json
    {"message":"Successfully deleted 2 pending article(s)","deleted_count":2}
    ```

## 文章与附件

- 接口：`GET /api/crawler/articles`
  - 功能：分页获取文章（支持源名、点名、点ID、日期范围筛选）
  - 字段：Query：`source_name`、`point_name`、`point_ids[]`、`publish_date_start`、`publish_date_end`、`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`items[]`（见 `CollectedArticlePublic`：`id`、`point_id`、`source_name`、`point_name`、`intelligence_type`、`title`、`original_url`、`publish_date`、`content`、`created_at`、`summary`、`keywords`、`influence_score`、`sentiment`、`entities`）
  - 返回示例：
    ```json
    {"total":1,"page":1,"limit":20,"items":[{"id":"art1","point_id":"19bf...","source_name":"盖世汽车","point_name":"行业资讯","intelligence_type":"news_website","title":"标题","original_url":"https://...","publish_date":"2025-11-26","content":"...","created_at":"...","summary":null,"keywords":null,"influence_score":null,"sentiment":null,"entities":null}]}
    ```

- 接口：`GET /api/crawler/articles/{article_id}`
  - 功能：获取文章详情
  - 字段：Path：`article_id`
  - 返回字段：`id`、`title`、`publish_date`、`content`、`original_url`
  - 返回示例：
    ```json
    {"id":"art1","title":"标题","publish_date":"2025-11-26","content":"...","original_url":"https://..."}
    ```

- 接口：`DELETE /api/crawler/articles`
  - 功能：批量删除文章（支持 Query 或 JSON 传 `article_ids`）
  - 字段：Query：`article_ids` 或 `article_ids[]`；或 JSON：`article_ids`（字符串数组）
  - 返回字段：`message`
  - 返回示例：
    ```json
    {"message":"Successfully deleted 2 article(s) and their associated vectors."}
    ```

- 接口：`DELETE /api/crawler/articles/{article_id}`
  - 功能：删除单篇文章
  - 字段：Path：`article_id`
  - 返回字段：`message`
  - 返回示例：
    ```json
    {"message":"Successfully deleted 1 article and its associated vectors."}
    ```

- 接口：`GET /api/crawler/articles/{article_id}/html`
  - 功能：获取文章报告 HTML
  - 字段：Path：`article_id`
  - 返回：HTML 文本（`text/html`）

- 接口：`GET /api/crawler/articles/{article_id}/pdf`
  - 功能：下载文章 PDF（如不存在自动转换）
  - 字段：Path：`article_id`
  - 返回：二进制文件（`application/pdf`）

- 接口：`POST /api/crawler/report/pdf/{article_id}`
  - 功能：按需生成 PDF 并标记状态
  - 字段：Path：`article_id`
  - 返回字段：`ok`、`pdf_generated`
  - 返回示例：
    ```json
    {"ok":true,"pdf_generated":true}
    ```

- 接口：`GET /api/crawler/tasks/stats`
  - 功能：获取采集任务统计
  - 字段：无
  - 返回字段：`sources`、`points`、`active_points`、`articles`、`vectors`、`schedules_active`
  - 返回示例：
    ```json
    {"sources":12,"points":36,"active_points":24,"articles":1024,"vectors":8192,"schedules_active":8}
    ```

## 统一语义检索

- 接口：`POST /api/crawler/search/chunks`
  - 功能：分段向量检索，支持过滤与返回摘要、关键词、实体
  - 字段：JSON：`query_text`、可选 `point_ids`、`source_names`、`publish_date_start`、`publish_date_end`、`similarity_threshold`、`include_article_content`、`chunk_size_filter`、`top_k`
  - 返回字段：`total_chunks`、`total_articles`、`results[]`（见 `ChunkSearchResult`：`article_id`、`chunk_index`、`chunk_text`、`chunk_size`、`similarity_score`、`article_title`、`article_url`、`article_publish_date`、`source_name`、`point_name`、`article_content?`、`article_summary`、`article_keywords`、`article_entities`）
  - 返回示例：
    ```json
    {"total_chunks":3,"total_articles":2,"results":[{"article_id":"art1","chunk_index":0,"chunk_text":"...","chunk_size":320,"similarity_score":0.78,"article_title":"标题","article_url":"https://...","article_publish_date":"2025-11-26","source_name":"盖世汽车","point_name":"行业资讯","article_summary":null,"article_keywords":null,"article_entities":null}]}
    ```

- 接口：`POST /api/crawler/search/chunks_paged`
  - 功能：分段向量检索分页懒加载
  - 字段：JSON：`query_text`、可选 `point_ids`、`source_names`、`publish_date_start`、`publish_date_end`、`similarity_threshold`、`include_article_content`、`chunk_size_filter`、`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`items[]`（同 `ChunkSearchResult`）
  - 返回示例：
    ```json
    {"total":42,"page":1,"limit":20,"items":[{"article_id":"art1","chunk_index":0,"chunk_text":"...","chunk_size":320,"similarity_score":0.78,"article_title":"标题","article_url":"https://...","article_publish_date":"2025-11-26","source_name":"盖世汽车","point_name":"行业资讯","article_summary":null,"article_keywords":null,"article_entities":null}]}
    ```

- 接口：`POST /api/crawler/search/chunks/export`
  - 功能：将检索结果按文章汇总导出结构化数据
  - 字段：JSON 同 `search/chunks`
  - 返回字段：`total_articles`、`export_data[]`（每项含 `article_title`、`article_publish_date`、`merged_content`、`article_url`、`similarity_scores[]`、`chunk_count`）
  - 返回示例：
    ```json
    {"total_articles":2,"export_data":[{"article_title":"标题A","article_publish_date":"2025-11-25","merged_content":"...","article_url":"https://...","similarity_scores":[0.71,0.64],"chunk_count":2}]}
    ```

- 接口：`POST /api/crawler/search/articles`
  - 功能：按点范围 Top-K 语义检索
  - 字段：JSON：`query_text`、`point_ids`（必填）、可选 `top_k`
  - 返回字段：数组项：`article_id`、`title`、`score`
  - 返回示例：
    ```json
    [{"article_id":"art1","title":"标题","score":0.83}]
    ```

- 接口：`POST /api/crawler/search/articles_filtered`
  - 功能：文章级检索（带过滤与分页）
  - 字段：JSON：`query_text`、可选 `similarity_threshold`、`point_ids`、`source_names`、`publish_date_start`、`publish_date_end`、`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`items[]`（每项含 `article_id`、`title`、`score`、必要的元信息）
  - 返回示例：
    ```json
    {"total":3,"page":1,"limit":20,"items":[{"article_id":"art1","title":"标题","score":0.82}]}
    ```

- 接口：`POST /api/crawler/search/combined`
  - 功能：兼容旧接口的组合检索（filters+query）
  - 字段：JSON：`filters`、`query_text` 或 `query`、`point_ids`、`source_names`、`publish_date_start`、`publish_date_end`、`top_k`、`min_score`、`similarity_threshold`、`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`items[]`（同 `articles_filtered`）
  - 返回示例：
    ```json
    {"total":3,"page":1,"limit":20,"items":[{"article_id":"art1","title":"标题","score":0.82}]}
    ```

- 接口：`POST /api/crawler/feed`
  - 功能：信息流（影响力、情感、时间等过滤）
  - 字段：JSON：`point_ids`、`source_names`、`publish_date_start`、`publish_date_end`、`min_influence_score`、`sentiment`、`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`items[]`（见 `CollectedArticlePublic`）
  - 返回示例：
    ```json
    {"total":20,"page":1,"limit":20,"items":[{"id":"art1","source_name":"盖世汽车","title":"标题"}]}
    ```

## LLM 相关任务

- 接口：`POST /api/crawler/search/llm`
  - 功能：按提示词执行相关性判断与总结，生成任务目录与 CSV
  - 字段：JSON：`query_text`、可选 `publish_date_start`、`publish_date_end`、`source_names`
  - 返回字段：`task_id`、`total_articles`、`processed_count`、`matched_count`、`unrelated_count`、`task_dir`
  - 返回示例：
    ```json
    {"task_id":"70b9...","total_articles":1087,"processed_count":434,"matched_count":251,"unrelated_count":183,"task_dir":"services/crawler/search_tasks/70b9..."}
    ```

- 接口：`GET /api/crawler/search/tasks`
  - 功能：分页列出检索任务（含统计）
  - 字段：Query：`page`、`limit`
  - 返回字段：`total`、`page`、`limit`、`stats`（聚合计数）、`items[]`（见 `SearchTaskItem`：`id`、`prompt_text`、`total_articles`、`processed_count`、`matched_count`、`unrelated_count`、`task_dir`、`created_at`、`finished_at`）
  - 返回示例：
    ```json
    {"total":2,"page":1,"limit":20,"stats":{"total_articles":200,"processed_count":100,"matched_count":40,"unrelated_count":60},"items":[{"id":"70b9...","prompt_text":"...","total_articles":1087,"processed_count":434,"matched_count":251,"unrelated_count":183,"task_dir":"...","created_at":"...","finished_at":null}]]}
    ```

- 接口：`GET /api/crawler/search/tasks/{task_id}`
  - 功能：查看任务详情
  - 字段：Path：`task_id`
  - 返回字段：任务基本信息与文件路径（按实现）
  - 返回示例：
    ```json
    {"id":"70b9...","prompt_text":"...","task_dir":"...","total_articles":1087,"processed_count":434,"matched_count":251,"unrelated_count":183}
    ```

- 接口：`GET /api/crawler/search/tasks/{task_id}/download?with_content=true&both=false`
  - 功能：下载 CSV 或 ZIP
  - 字段：Query：`with_content`、`both`
  - 返回：CSV 或 ZIP 文件

## Cookie 与生成

- 接口：`POST /api/crawler/gemini/cookies`
  - 功能：刷新 Gemini Cookie
  - 字段：Form：`secure_1psid`、`secure_1psidts`、可选 `http_proxy`
  - 返回字段：`message`、`initialized`
  - 返回示例：
    ```json
    {"message":"Gemini cookies updated","initialized":true}
    ```

- 接口：`GET /api/crawler/gemini/cookies/check`
  - 功能：检查 Cookie 健康
  - 字段：无
  - 返回字段：`has_cookie`、`valid`
  - 返回示例：
    ```json
    {"has_cookie":true,"valid":true}
    ```

- 接口：`POST /api/crawler/html-generation/toggle`
  - 功能：切换 HTML 生成开关
  - 字段：JSON：`enable`（布尔）
  - 返回字段：`ok`、`enabled`
  - 返回示例：
    ```json
    {"ok":true,"enabled":true}
    ```

## 运行控制

- 接口：`POST /api/crawler/crawlers/{source_name}/run-now`
  - 功能：立即执行指定源爬虫（后台线程触发）
  - 字段：Path：`source_name`
  - 返回字段：`message`、`source_name`、`module_path`
  - 返回示例：
    ```json
    {"message":"started","source_name":"盖世汽车","module_path":"services.crawler.crawlers.盖世汽车.crawler"}
    ```

## 前端场景示例

- 场景：源与点管理页
  - 展示列表：`GET /api/crawler/sources-and-points`
  - 切换点：`POST /api/crawler/points/{point_id}/toggle`，传 `{"enable":true|false}`
  - 切换整源：`POST /api/crawler/sources/{source_name}/toggle`，传 `{"enable":true|false}`
  - 删除点：`DELETE /api/crawler/points`，传 `{"point_ids":["..."]}`
  - 删除源：`DELETE /api/crawler/sources/{source_name}`

- 场景：配置与运行通用子爬虫
  - 新建点：`POST /api/crawler/generic/points`
  - 列出源：`GET /api/crawler/generic/sources`；列出点：`GET /api/crawler/generic/points?source_name=...`
  - 编辑源：`PUT /api/crawler/generic/sources/{source_name}`（支持 `new_name/cron_schedule/is_active`）
  - 启停整源：`POST /api/crawler/generic/sources/{source_name}/toggle`
  - 删除整源：`DELETE /api/crawler/generic/sources/{source_name}`（仅含通用点）
  - 运行单点：`POST /api/crawler/generic/points/{point_id}/run-now`
  - 查看任务：`GET /api/crawler/generic/tasks?page=1&limit=20`

- 场景：待确认文章流
  - 列表页：`GET /api/crawler/pending/articles?page=1&limit=20`
  - 批量确认：`POST /api/crawler/pending/articles/confirm`，传 `{"article_ids":["..."]}`
  - 批量删除：`POST /api/crawler/pending/articles/delete`，传同上

- 场景：统一语义检索（懒加载）
  - 检索：`POST /api/crawler/search/chunks_paged`，传入 `query_text`，可选筛选与 `page/limit`
  - 字段展示：使用 `items[]` 中 `chunk_text/similarity_score/article_title/source_name/point_name/...`
  - 需要原文时：设置 `include_article_content=true`

- 场景：文章详情与附件
  - 列表：`GET /api/crawler/articles`
  - 详情：`GET /api/crawler/articles/{article_id}`
  - HTML 报告：`GET /api/crawler/articles/{article_id}/html`
  - PDF 下载：`GET /api/crawler/articles/{article_id}/pdf`；按需生成：`POST /api/crawler/report/pdf/{article_id}`

提示：端口默认 `7657`；如你的环境占用该端口，请替换为实际端口。
- 接口：`GET /api/crawler/pending/articles/{article_id}`
  - 功能：获取待确认文章详情
  - 字段：Path：`article_id`
  - 返回字段：见 `CrawlerPendingArticlePublic`
  - 返回示例：
    ```json
    {"id":"a1","source_name":"通用子爬虫","point_name":"行业","point_url":"https://...","original_url":"https://...","title":"标题","publish_date":"2025-11-26","content":"...","crawl_metadata":{"jina_response_length":1234},"status":"pending","created_at":"2025-11-26T10:00:00+08:00"}
    ```
