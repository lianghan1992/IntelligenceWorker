# 爬虫服务 (Crawler Service)

## 1. 概述

`Crawler Service` 是情报平台的核心组件之一，负责从各种外部情报源（如新闻网站、社交媒体等）自动收集数据。它通过灵活的调度机制、可扩展的爬虫模块和统一的数据处理流程，确保平台能够持续获取最新、最相关的情报。收集到的文章数据会经过清洗、存储，并生成向量嵌入，以支持后续的语义搜索、推荐和分析功能。

## 2. 核心概念

### 2.1 情报类型 (Intelligence Type)

为了适应不同类型的情报源，系统引入了 `intelligence_type` 字段。它定义了情报的来源类别，例如：

-   `news_website`: 新闻网站或博客
-   `video`: 视频平台 (例如 Bilibili)
-   `social_media`: 社交媒体平台 (例如微博)
-   `wechat_official_account`: 微信公众号

这个字段使得系统能够针对不同类型的情报源采用不同的处理策略和数据模型。

### 2.2 情报点 (Intelligence Point) 与调度 (Crawler Schedule)

- `IntelligencePoint`：在同一情报源下的细分“情报点”，对应一个具体的 RSS 源或某一列表页/频道页。它保存 `source_name`、`point_name`、`point_url`、`cron_schedule`、`parser_module_path` 等信息。
- `CrawlerSchedule`：调度器扫描 `crawlers/` 目录得到的“爬虫入口”记录。每个记录指向一个爬虫模块的路径和该模块声明的初始 URL、类型与 CRON。运行时，爬虫模块可以在内部将多个子列表/分类视为多个 `IntelligencePoint`。

通过该模式，同一种解析逻辑只需一个爬虫模块，模块内部以“多情报点（参数化）”驱动，避免为每个页面/每个 RSS 再复制出多个模块，减少冗余。

### 2.3 文章存储与向量化 (Article Storage and Vectorization)

所有通过爬虫收集到的文章数据都将统一存储在 `CollectedArticle` 数据库表中。为了实现高级的语义搜索和分析，每篇文章的内容都会被自动分割成更小的文本块，并利用预训练的嵌入模型生成高维向量（即向量嵌入）。这些向量存储在 `ArticleVector` 表中，是实现内容理解和智能推荐的基础。

## 3. 架构设计

`Crawler Service` 的目录结构如下：

```
services/crawler/
├── __init__.py
├── config.py             # 爬虫服务的配置
├── crawlers/             # 存放具体的爬虫模块
│   ├── __init__.py
│   └── ...               # 各个情报源的爬虫目录和文件
├── manager.py            # 爬虫管理相关逻辑 (如果存在)
├── models.py             # SQLAlchemy ORM 模型定义 (IntelligenceSource, IntelligencePoint, CrawlerSchedule, CollectedArticle, ArticleVector)
├── router.py             # FastAPI 路由定义 (如果存在 API 接口)
├── services.py           # 核心服务逻辑，如文章存储与向量化、嵌入服务等
└── worker.py             # 爬虫调度器和执行器
```

### 3.1 `models.py`

定义了爬虫服务相关的 SQLAlchemy ORM 模型和 Pydantic 模型，包括：

-   `CrawlerSchedule`: 爬虫调度配置模型。
-   `CollectedArticle`: 收集到的文章数据模型，包含文章内容、元数据和 `intelligence_type` 字段。
-   `ArticleVector`: 文章内容块的向量嵌入模型。

### 3.2 `services.py`

包含了爬虫服务的核心业务逻辑，例如：

-   `EmbeddingService` 及其实现：负责生成文本的向量嵌入。
-   `store_and_vectorize_article()`: 负责将文章数据存储到数据库，并进行内容分割和向量化。

### 3.3 `worker.py`

包含了爬虫的调度和执行逻辑：

-   `discover_crawlers()`: 扫描 `crawlers/` 目录，动态发现并加载爬虫模块，同步 `CrawlerSchedule`。模块内部仍可派生多个 `IntelligencePoint`。
-   `run_scheduler()`: 负责根据 `CrawlerSchedule` 的配置，定时触发爬虫任务。
-   `run_executor()`: 负责执行具体的爬虫任务（通过调用 `run_crawler()`）。

### 3.4 `crawlers/` 目录

该目录用于存放所有具体的爬虫实现。每个情报源通常会有一个独立的子目录，子目录下包含一个 `crawler.py` 文件，实现该情报源的爬取逻辑。

## 4. 爬虫模块开发指南（情报点映射模式）

为保证调度器正确发现并执行爬虫，请在每个爬虫目录下的 `crawler.py` 中遵循以下约定：

1) 必须定义以下常量，用于在数据库中同步调度信息：
   - `SOURCE_NAME`: 情报源的可读名称
   - `POINTS`: 情报点映射，键为点名，值为列表页/RSS URL
   - `CRON_SCHEDULE`: 定时表达式，例如 `"*/15 * * * *"`
   - `INITIAL_URL`: 初始入口地址或频道页（如是 RSS 可填分类页）
   - `INTELLIGENCE_TYPE`: 情报类型字符串，例如 `"news"`、`"report"`

2) 必须实现函数签名 `def run_crawler(db: Session) -> None`：
   - 调度器会在独立线程中调用该函数，并传入数据库会话 `db`
   - 遍历 `POINTS` 映射，以 `point_name/point_url` 维度解析并入库
   - 采集到的文章请调用 `services.store_and_vectorize_article(...)` 完成存储与向量化
   - 如果需要限速与去重，请使用模块 `services.crawler.config` 中的配置项与 `store_and_vectorize_article` 内置去重能力

3) 目录结构示例（简化为每源一个模块）：
```
crawlers/
  情报源A/
    crawler.py
```

4) 运行注意事项：
   - 新增或修改爬虫后，调度器会在下次扫描时自动同步到 `CrawlerSchedule` 表
   - 如需暂停某个爬虫，可将其文件从 `crawlers` 目录移除或在数据库中将 `is_active` 设为 0
   - 避免在 `run_crawler` 中长时间阻塞；如需网络等待，请设置合适的请求间隔

以上约定与当前 `worker.py` 的调度逻辑保持一致。调度以模块路径为唯一键，同一源的多个子点由 `POINTS` 映射驱动。

要开发一个新的爬虫模块，请遵循以下步骤和规范：

### 4.1 目录结构

在 `services/crawler/crawlers/` 目录下为你的情报源创建一个新的目录（例如 `my_source/`），在该目录下创建 `crawler.py` 文件。

```
services/crawler/crawlers/
└── my_source/
    └── crawler.py
```

### 4.2 `crawler.py` 文件规范（最小实现）

1) 在文件顶部定义常量：
- `SOURCE_NAME` (str): 如 `"我的新闻源"`
- `INTELLIGENCE_TYPE` (str): 如 `"news_website"`
- `CRON_SCHEDULE` (str): 如 `"0 */6 * * *"`
- `POINTS` (dict[str,str]): 如 `{ "行业": "https://.../rss?cid=108" }`

2) 实现入口函数：
- `def run_crawler(db: Session) -> None`：遍历 `POINTS`，每个键为 `point_name`，每个值为 `point_url`，解析文章并调用主服务入库接口。

3) 入库与增量（建议）：
- 使用 `get_last_crawled_article(db, source_name, point_name, point_url)` 控制增量、避免重复。
- 使用 `store_and_vectorize_article(article_data, db)` 存储并向量化，务必包含 `source_name`、`point_name`、`point_url`。

示例（简化）：
```python
from typing import Dict, Any, List
from datetime import datetime
import logging, httpx
from sqlalchemy.orm import Session
from services.crawler.services import store_and_vectorize_article, get_last_crawled_article

logger = logging.getLogger(__name__)

SOURCE_NAME = "示例源"
INTELLIGENCE_TYPE = "news_website"
CRON_SCHEDULE = "0 8 * * *"
POINTS: Dict[str, str] = {"分类A": "https://example.com/rss/a.xml"}

def _parse_list(url: str) -> List[str]:
    r = httpx.get(url, timeout=15); r.raise_for_status(); return []

def _parse_detail(url: str) -> Dict[str, Any]:
    r = httpx.get(url, timeout=15); r.raise_for_status(); return {"title": "", "publish_date": datetime.utcnow(), "content": ""}

def run_crawler(db: Session):
    for point_name, point_url in POINTS.items():
        last = get_last_crawled_article(db, SOURCE_NAME, point_name, point_url)
        for article_url in _parse_list(point_url):
            if last and article_url == last.get("original_url"): break
            data = _parse_detail(article_url)
            if not data: continue
            data.update({
                "original_url": article_url,
                "source_name": SOURCE_NAME,
                "point_name": point_name,
                "intelligence_type": INTELLIGENCE_TYPE,
                "point_url": point_url,
                "cron_schedule": CRON_SCHEDULE,
                "parser_module_path": f"services.crawler.crawlers.{SOURCE_NAME}.crawler",
            })
            store_and_vectorize_article(data, db)
```

### 4.3 运行与接口
- 环境与启动：
  - 使用虚拟环境：`source venv/bin/activate`
  - 启动服务：`python -m uvicorn main:app --host 0.0.0.0 --port 7657 --reload`
  - 仅保留主服务 `.env` 必要项：`ZHIPUAI_API_KEY`、`ZHIPUAI_LLM_MODEL`、`ZHIPUAI_CONCURRENCY`、`EMBEDDING_PROVIDER`、`EMBEDDING_MODEL_NAME`、`CRAWLER_EARLIEST_DATE`、`CRAWLER_HTTP_PROXY`、`CRAWLER_SOCKS5_PROXY`
 - API 前缀：应用启用 `root_path=/api`，接口统一以 `/api` 开头。

### 4.4 开发建议
- 列表解析与详情解析分离，函数短小清晰。
- 用 `get_last_crawled_article` 做增量控制，减少重复与翻页。
- 每篇文章都传入 `source_name`、`point_name`、`point_url`，确保自动绑定情报点。
- 代码保持简洁可读，避免复杂嵌套；不编写独立测试文件。

## 5. 工作流程

1.  **服务启动**: 当 `IntelligencePlatform` 启动时，`services/crawler/worker.py` 中的 `discover_crawlers()` 函数会被调用。
2.  **爬虫发现与同步**: `discover_crawlers()` 会扫描 `services/crawler/crawlers/` 目录，动态加载所有 `crawler.py` 文件，提取其定义的常量，并与 `CrawlerSchedule` 数据库表进行同步。这包括添加新的爬虫配置、更新现有配置以及标记不再存在的爬虫为非活跃状态。
3.  **调度器启动**: `run_scheduler()` 函数启动，它会根据 `CrawlerSchedule` 表中每个爬虫的 `CRON_SCHEDULE` 配置，定时安排 `run_crawler()` 函数的执行。
4.  **爬虫执行**: 当到达预定的调度时间时，调度器会触发相应爬虫模块的 `run_crawler()` 函数。
5.  **数据处理**: `run_crawler()` 函数负责执行以下操作：
    - 对同源下的多个子点进行迭代（每个子点对应一个 `point_url`）。
    - 在子点维度进行增量判断（对比最近文章的 URL/日期）。
    - 解析详情、调用 `store_and_vectorize_article()` 入库与向量化，同时传入 `point_url`/`cron_schedule`/`parser_module_path`，使系统自动创建或绑定 `IntelligencePoint`。

## 6. 依赖管理

如果你的爬虫模块需要额外的 Python 库，请确保将其添加到项目的 `requirements.txt` 文件中，并使用 `pip install -r requirements.txt` 命令安装到虚拟环境中。

## 7. API 文档（Crawler Service）

所有接口前缀为 `/api/crawler`。鉴权：在请求头添加 `Authorization: Bearer <accessToken>`（登录接口：`POST /api/user/login`）。

### 源与点管理

- `GET /api/crawler/sources`：获取顶层情报源列表。
- `GET /api/crawler/sources/names`：仅获取源名称列表。
- `GET /api/crawler/points?source_name=...`：按源获取该源的情报点。
- `GET /api/crawler/sources-and-points`：获取所有源与点并区分类型（`manual`/`generic`/`mixed`）。
- `POST /api/crawler/points`：创建手动情报点（`source_name`、`point_name`、`point_url`、`cron_schedule`）。
- `POST /api/crawler/points/{point_id}/toggle`：启停单个子爬虫。
- `GET /api/crawler/points/{point_id}/health`：检查子爬虫健康。
- `POST /api/crawler/sources/{source_name}/toggle`：启停整源下所有点。
- `DELETE /api/crawler/points`：按 `point_ids` 批量删除情报点。
- `DELETE /api/crawler/sources/{source_name}`：删除整源（及其所有点）。

### 通用子爬虫（Generic）

- `POST /api/crawler/generic/points`：创建通用点。
- `PUT /api/crawler/generic/points/{point_id}`：更新通用点（名称、URL、CRON、启停）。
- `DELETE /api/crawler/generic/points/{point_id}`：删除通用点。
- `POST /api/crawler/generic/points/{point_id}/toggle`：启停通用点。
- `POST /api/crawler/generic/points/{point_id}/run-now`：立即执行单个通用点。
- `GET /api/crawler/generic/points?source_name=...`：列出通用点（可按源过滤）。
- `GET /api/crawler/generic/sources`：列出通用源。
- `PUT /api/crawler/generic/sources/{source_name}`：编辑通用源（重命名、CRON、启停）。
- `POST /api/crawler/generic/sources/{source_name}/toggle`：启停整源所有通用点。
- `DELETE /api/crawler/generic/sources/{source_name}`：删除仅含通用点的源。
- `GET /api/crawler/generic/tasks?page=1&limit=20`：通用爬虫任务分页懒加载。
- `GET /api/crawler/pending/articles?page=1&limit=20`：待确认文章分页。
- `POST /api/crawler/pending/articles/confirm`：确认文章（`article_ids`）。
- `POST /api/crawler/pending/articles/delete`：删除待确认文章（`article_ids`）。

### 文章与附件

- `GET /api/crawler/articles`：分页获取文章（支持源名、点名、点ID、日期范围筛选）。
- `GET /api/crawler/articles/{article_id}`：获取文章详情。
- `DELETE /api/crawler/articles`：批量删除文章（支持 Query 或 JSON 传 `article_ids`）。
- `DELETE /api/crawler/articles/{article_id}`：删除单篇文章。
- `GET /api/crawler/articles/{article_id}/html`：获取文章报告 HTML。
- `GET /api/crawler/articles/{article_id}/pdf`：下载文章 PDF（如不存在自动转换）。
- `POST /api/crawler/report/pdf/{article_id}`：按需生成 PDF 并标记状态。
- `GET /api/crawler/tasks/stats`：获取采集任务统计。

### 统一语义检索

- `POST /api/crawler/search/chunks`：分段向量检索，支持过滤与返回摘要、关键词、实体。
- `POST /api/crawler/search/chunks_paged`：分段向量检索分页懒加载。
  - 请求体：`query_text`、可选 `point_ids`、`source_names`、`publish_date_start`、`publish_date_end`、`similarity_threshold`、`include_article_content`、`chunk_size_filter`、`page`、`limit`
  - 返回：`{ total, page, limit, items: [ { article_id, chunk_index, chunk_text, chunk_size, similarity_score, article_title, article_url, article_publish_date, source_name, point_name, article_summary, article_keywords, article_entities, article_content? } ] }`
- `POST /api/crawler/search/chunks/export`：将检索结果按文章汇总导出结构化数据。
- `POST /api/crawler/search/articles`：按点范围 Top-K 语义检索。
- `POST /api/crawler/search/articles_filtered`：带过滤与分页的文章级检索。
- `POST /api/crawler/search/combined`：兼容旧接口的组合检索（filters+query）。
- `POST /api/crawler/feed`：信息流（影响力、情感、时间等过滤）。

### LLM 相关检索任务

- `POST /api/crawler/search/llm`：按提示词执行相关性判断与总结，生成任务目录与 CSV。
- `GET /api/crawler/search/tasks`：分页列出检索任务（含统计）。
- `GET /api/crawler/search/tasks/{task_id}`：查看任务详情。
- `GET /api/crawler/search/tasks/{task_id}/download?with_content=true&both=false`：下载 CSV 或 ZIP。

### Cookie 与生成

- `POST /api/crawler/gemini/cookies`：刷新 Gemini Cookie（表单：`secure_1psid`、`secure_1psidts`、可选 `http_proxy`）。
- `GET /api/crawler/gemini/cookies/check`：检查 Cookie 健康。
- `POST /api/crawler/html-generation/toggle`：切换 HTML 生成开关。

### 运行控制

- `POST /api/crawler/crawlers/{source_name}/run-now`：立即执行指定源爬虫。

## 8. 场景示例（前端调用）

### 场景A：源/点管理页

- 加载源与点：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/sources-and-points" -H "Authorization: Bearer $TOKEN"
```
- 启停整源：
```bash
curl -s -X POST "http://127.0.0.1:7657/api/crawler/sources/盖世汽车/toggle" \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"enable": false}'
```
- 启停单点：
```bash
curl -s -X POST "http://127.0.0.1:7657/api/crawler/points/<point_id>/toggle" \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"enable": true}'
```

### 场景B：通用子爬虫配置页

- 列出通用源与点：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/generic/sources" -H "Authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:7657/api/crawler/generic/points?source_name=通用子爬虫" -H "Authorization: Bearer $TOKEN"
```
- 编辑通用源：
```bash
curl -s -X PUT "http://127.0.0.1:7657/api/crawler/generic/sources/通用子爬虫" \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"new_name":"通用子爬虫","cron_schedule":"0 */2 * * *","is_active":true}'
```
- 立即执行单点：
```bash
curl -s -X POST "http://127.0.0.1:7657/api/crawler/generic/points/<point_id>/run-now" -H "Authorization: Bearer $TOKEN"
```

### 场景C：语义检索页（分页懒加载）

- 第1页：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/search/chunks_paged" \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{
  "query_text": "智能座舱",
  "source_names": ["盖世汽车","36KR"],
  "similarity_threshold": 0.55,
  "page": 1,
  "limit": 20
}'
```
- 第2页：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/search/chunks_paged" \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{
  "query_text": "智能座舱",
  "source_names": ["盖世汽车","36KR"],
  "similarity_threshold": 0.55,
  "page": 2,
  "limit": 20
}'
```

### 场景D：文章详情与附件

- 加载详情：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/articles/<article_id>" -H "Authorization: Bearer $TOKEN"
```
- 打开 HTML 报告：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/articles/<article_id>/html" -H "Authorization: Bearer $TOKEN"
```
- 下载 PDF：
```bash
curl -L "http://127.0.0.1:7657/api/crawler/articles/<article_id>/pdf" -H "Authorization: Bearer $TOKEN"
```

### 场景E：LLM 检索任务与结果下载

- 创建任务：
```bash
curl -s -X POST "http://127.0.0.1:7657/api/crawler/search/llm" \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"query_text":"新能源汽车电池安全"}'
```
- 轮询任务列表与详情：
```bash
curl -s "http://127.0.0.1:7657/api/crawler/search/tasks" -H "Authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:7657/api/crawler/search/tasks/<task_id>" -H "Authorization: Bearer $TOKEN"
```
- 下载结果：
```bash
curl -L "http://127.0.0.1:7657/api/crawler/search/tasks/<task_id>/download?with_content=true" -H "Authorization: Bearer $TOKEN"
```

### 场景F：立即运行爬虫源

```bash
curl -s -X POST "http://127.0.0.1:7657/api/crawler/crawlers/盖世汽车/run-now" -H "Authorization: Bearer $TOKEN"
```

提示：端口默认 `7657`；如你的环境占用该端口，请替换为实际端口。
