# 情报采集服务 API 文档（重构版）

## 认证
- 使用 `HTTPBearer`，在请求头携带 `Authorization: Bearer <access_token>`
- 测试账号：`用户名:test` `邮箱:test@intelligenceworker.com` `密码:test.0316!`

## 基础信息
- 服务前缀：`/intelligence_collection`
- 所有接口均需认证；返回错误时包含 `detail` 字段说明原因。

## 源管理
- 接口：`POST /intelligence_collection/sources`
- 描述：创建情报源（站点）
- 请求体：
```
{
  "name": "汽车之家",          // 必填，源名称，唯一
  "main_url": "https://www.autohome.com.cn" // 必填，源主页URL
}
```
- 返回示例：
```
{
  "id": "d5c...",
  "name": "汽车之家",
  "main_url": "https://www.autohome.com.cn",
  "points_count": 0,
  "articles_count": 0,
  "created_at": "2025-12-04T11:00:00+08:00"
}
```
- 字段说明：`points_count` 为情报点数量；`articles_count` 为入库文章数量。

- 接口：`GET /intelligence_collection/sources`
- 描述：列出所有情报源
- 返回：`SourcePublic[]`（同上结构）

- 接口：`DELETE /intelligence_collection/sources/{source_name}`
- 描述：删除指定情报源，级联删除该源情报点，并清空该源的任务
- 路径参数：`source_name` 必填
- 返回示例：
```
{
  "deleted_source": "汽车之家",
  "deleted_points": 3,
  "deleted_tasks": 24
}
```

## 情报点管理
- 接口：`POST /intelligence_collection/points`
- 描述：创建情报点（列表页入口）
- 请求体：
```
{
  "source_id": null,               // 可选，若不提供则按 source_name 自动创建/绑定
  "source_name": "汽车之家",      // 必填，所属源名称
  "name": "行业资讯",            // 必填，情报点名称
  "url": "https://www.autohome.com.cn/news/", // 必填，列表页URL，唯一
  "cron_schedule": "0 */2 * * *",            // 必填，定时表达式
  "mode": "markdown",            // 可选，默认 markdown
  "url_filters": ["https://www.autohome.com.cn/news/"], // 可选，允许的链接前缀
  "extra_hint": "列表抽取提示",  // 可选，传递给LLM的上下文提示
  "enable_pagination": false,     // 可选，是否启用翻页
  "initial_pages": 0,             // 可选，初始翻页数
  "pagination_type": "scroll",    // 可选，翻页类型：'scroll' (滚动) 或 'click' (点击)
  "pagination_selector": null     // 可选，当 type='click' 时必填，CSS 选择器
}
```
- 翻页配置说明：
  - `pagination_type`:
    - `scroll`: 模拟滚动到底部以加载更多内容。
    - `click`: 模拟点击“下一页”或“加载更多”按钮。
  - `pagination_selector`:
    - 当 `pagination_type` 为 `click` 时，**可选**。不传时系统将尝试自动识别“下一页/更多/Next”等按钮并点击。
    - 当 `pagination_type` 为 `scroll` 时，此字段可选，作为滚动后等待元素出现的条件（Wait For Selector）。
    - 示例：
      - 点击翻页（手动）：`"pagination_type": "click", "pagination_selector": ".next-page-btn"`
      - 点击翻页（自动）：`"pagination_type": "click"`（不传选择器）
      - 滚动加载：`"pagination_type": "scroll", "pagination_selector": ".loading-spinner"` (可选)
    - **如何获取？**
      - 详细教程请参考同目录下的 [Pagination_Guide.md](Pagination_Guide.md) 文档。该文档提供了使用 Chrome 浏览器开发者工具查找 CSS 选择器的图文步骤。
  - **校验规则**：
    - `pagination_type` 为 `click` 且未提供 `pagination_selector` 时，系统默认启用智能识别。若无法识别，仍会继续首次页抓取并记录错误日志，建议补充选择器。
      - 点击翻页：`"pagination_type": "click", "pagination_selector": ".next-page-btn"`
      - 滚动加载：`"pagination_type": "scroll", "pagination_selector": ".loading-spinner"` (可选)
    - **如何获取？**
      - 详细教程请参考同目录下的 [Pagination_Guide.md](Pagination_Guide.md) 文档。该文档提供了使用 Chrome 浏览器开发者工具查找 CSS 选择器的图文步骤。
  - **校验规则**：若 `pagination_type` 为 `click` 且 `pagination_selector` 为空，API 将返回 `400 Bad Request` 错误，提示 `pagination_selector is required when pagination_type is click`。

- 返回：`PointPublic`
- 字段说明：`is_active` 为是否启用；`last_crawl_time` 为上次创建任务时间。

- 接口：`GET /intelligence_collection/points?source_name=汽车之家`
- 描述：列出情报点，支持按源过滤
- 返回：`PointPublic[]`

- 接口：`POST /intelligence_collection/points/{point_id}/toggle`
- 描述：启停情报点
- 路径参数：`point_id` 必填
- 请求体：
```
{ "enable": true } // 必填，true 启用；false 停用
```
- 返回示例：`{ "ok": true, "enabled": true }`

- 接口：`DELETE /intelligence_collection/points`
- 描述：批量删除情报点
- 请求体：
```
["point_id1", "point_id2"] // 必填
```
- 返回示例：`{ "deleted": 2 }`

- 接口：`POST /intelligence_collection/sources/{source_name}/run-now`
- 描述：立即为该源所有启用的情报点创建“列表爬取”任务
- 路径参数：`source_name` 必填
- 返回示例：`{ "created_tasks": 3 }`

- 接口：`POST /intelligence_collection/points/{point_id}/run-now`
- 描述：立即为该情报点创建“列表爬取”任务
- 路径参数：`point_id` 必填
- 返回示例：`{ "created_tasks": 1, "point_id": "..." }`

## 任务与待审
- 接口：`GET /intelligence_collection/tasks?status_filter=等待中&page=1&limit=20`
- 描述：分页查看任务
- 查询参数：`status_filter` 可选（等待中/执行中/已完成/已失败）；`page`、`limit` 必填范围
- 返回：`TaskPublic[]`

- 接口：`GET /intelligence_collection/pending?page=1&limit=20`
- 描述：分页查看待审文章
- 返回：`PendingArticlePublic[]`

- 接口：`PUT /intelligence_collection/pending/{pending_id}`
- 描述：更新待审文章的标题/日期/正文
- 路径参数：`pending_id` 必填
- 请求体：
```
{
  "title": "新标题",                // 可选
  "publish_date": "2025-12-01",    // 可选，建议 YYYY-MM-DD
  "content": "更新后的Markdown"     // 可选
}
```
- 返回：`PendingArticlePublic`

- 接口：`POST /intelligence_collection/pending/update`
- 描述：按ID更新待审文章（备选接口，POST形式）
- 请求体：
```
{
  "id": "pending_id",      // 必填
  "title": "...",          // 可选
  "publish_date": "...",   // 可选
  "content": "..."         // 可选
}
```
- 返回：`PendingArticlePublic`

- 接口：`POST /intelligence_collection/pending/confirm`
- 描述：确认待审文章并入库（分段向量化，支持生成HTML）
- 请求体：
```
{ "ids": ["pending_id1", "pending_id2"] } // 必填
```
- 返回示例：`{ "confirmed": 2 }`

- 接口：`POST /intelligence_collection/pending/reject`
- 描述：排除待审文章
- 请求体：
```
{ "ids": ["pending_id1"] } // 必填
```
- 返回示例：`{ "rejected": 1 }`

## 文章管理
- 接口：`GET /intelligence_collection/articles?source_name=汽车之家&point_name=行业资讯&page=1&limit=20`
- 描述：分页列出文章，支持按源名与点名过滤
- 返回：`ArticlePublic[]`

- 接口：`GET /intelligence_collection/articles/{article_id}`
- 描述：获取文章详情
- 路径参数：`article_id` 必填
- 返回：`ArticlePublic`

- 接口：`POST /intelligence_collection/articles/delete`
- 描述：批量删除文章并同步删除向量
- 请求体：
```
{ "ids": ["a1", "a2"] } // 必填
```
- 返回示例：`{ "deleted_articles": 2, "deleted_vectors": 12 }`

- 接口：`GET /intelligence_collection/articles/{article_id}/html`
- 描述：预览已生成的HTML
- 路径参数：`article_id` 必填
- 返回：HTML 文本

- 接口：`GET /intelligence_collection/articles/{article_id}/html/download`
- 描述：下载已生成的HTML文件
- 路径参数：`article_id` 必填
- 返回：文件下载

## 向量库检索
- 接口：`POST /intelligence_collection/search/chunks`
- 描述：对已入库文章的分段向量进行语义检索
- 请求体：
```
{
  "query_text": "汽车SOA软件供应链", // 必填
  "point_ids": ["..."],            // 可选，按点ID过滤
  "source_names": ["汽车之家"],     // 可选，按源名过滤
  "publish_date_start": "2025-01-01", // 可选
  "publish_date_end": "2025-12-31",   // 可选
  "similarity_threshold": 0.6,      // 可选，默认 0.5
  "include_article_content": false, // 可选，是否返回文章全文
  "top_k": 10                       // 可选，默认 10
}
```
- 返回示例：
```
{
  "total_chunks": 2,
  "total_articles": 2,
  "results": [
    {
      "article_id": "...",
      "chunk_index": 0,
      "chunk_text": "...",
      "chunk_size": 534,
      "similarity_score": 0.78,
      "article_title": "...",
      "article_url": "https://...",
      "article_publish_date": "2025-11-12",
      "source_name": "汽车之家",
      "point_name": "行业资讯",
      "article_content": null
    }
  ]
}
```
- 字段说明：`similarity_score` 为余弦相似度；`chunk_size` 为分段长度；`article_content` 在 `include_article_content=true` 时返回。

## Gemini Cookie 配置
- 接口：`POST /intelligence_collection/gemini/cookies`
- 描述：更新 Gemini Cookie 并落盘缓存
- 请求体：
```
{
  "SECURE_1PSID": "...",     // 必填
  "SECURE_1PSIDTS": "...",   // 必填
  "http_proxy": "http://127.0.0.1:20171" // 可选
}
```
- 返回示例：`{ "message": "Gemini cookies updated", "initialized": true }`

- 接口：`GET /intelligence_collection/gemini/cookies/check`
- 描述：检查 Cookie 可用性
- 返回示例：`{ "has_cookie": true, "valid": true, "cooldown_until": 0.0, "fail_count": 0 }`

## 去重策略
- 任务级：在创建 `文章爬取` 任务前，按 `url` 查重，避免重复任务（`services/intelligence_collection/worker.py:181-187`）
- 入库级：写入 `intelligence_collection_articles` 前按 `original_url` 唯一避免重复（`services/intelligence_collection/services.py:377-385`）

## 错误示例
- 认证失败：
```
{
  "detail": "无法验证凭据"
}
```
- 资源未找到：
```
{
  "detail": "文章不存在"
}
```
- 参数校验错误（Pagination Selector）：
```
{
  "detail": "pagination_selector is required when pagination_type is click"
}
```
