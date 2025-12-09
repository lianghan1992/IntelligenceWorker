# 情报采集服务 (IntelSpider) API 文档

本文档详细说明了情报采集服务（IntelSpider）的 API 接口。该服务允许用户管理情报源、情报点，并调度爬虫任务。

## 1. 基本信息

- **服务名称**: IntelSpider
- **基础 URL**: `/` (具体取决于部署配置，通常为 `http://localhost:8000`)
- **版本**: 1.0.0

## 2. 核心流程

1. **创建情报源 (Source)**: 定义要爬取的目标网站（如“盖世汽车”）。
2. **创建情报点 (Point)**: 定义网站下的具体板块或频道（如“车企资讯”），并配置爬取周期。
   - 创建情报点后，系统会在 `crawlers/{source_uuid}` 目录下生成一个 README 指南，开发者需在该目录下实现 `crawler.py`。
3. **任务调度**:
   - **自动调度**: 系统根据 `cron_schedule` 自动触发增量爬取任务。
   - **手动触发**: 用户可以通过 API 手动触发“首次爬取”或“增量爬取”任务。
4. **数据存储**:
   - 爬取的文章存储在 `intelspider_articles` 表中。
   - 文章内容会自动分段并向量化，存储在 `intelspider_article_vectors` 表中。

## 3. API 接口详情

### 3.1 创建情报源

创建一个新的情报源记录。

- **URL**: `/sources/`
- **Method**: `POST`
- **Content-Type**: `application/json`

**请求参数 (Body)**:

| 字段名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | 是 | 情报源名称 | `盖世汽车` |
| `main_url` | string | 是 | 情报源主站 URL | `https://auto.gasgoo.com/` |

**请求示例**:

```json
{
  "name": "盖世汽车",
  "main_url": "https://auto.gasgoo.com/"
}
```

**响应参数**:

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `uuid` | string | 情报源 UUID |
| `name` | string | 情报源名称 |
| `main_url` | string | 情报源主站 URL |
| `total_points` | integer | 当前拥有的情报点总数 |
| `total_articles` | integer | 已爬取文章总数 |

---

### 3.2 创建情报点

在指定的情报源下创建一个新的情报点。创建成功后，请在生成的 `crawlers/{source_uuid}/` 目录下查阅开发指南。

- **URL**: `/points/`
- **Method**: `POST`
- **Content-Type**: `application/json`

**请求参数 (Body)**:

| 字段名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `source_uuid` | string | 是 | 所属情报源的 UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `name` | string | 是 | 情报点名称 | `车企资讯` |
| `url` | string | 是 | 情报点具体的 URL | `https://auto.gasgoo.com/industry/C-108` |
| `cron_schedule` | string | 是 | 爬取周期的 Cron 表达式 | `30 13 */2 * *` |
| `initial_pages` | integer | 否 | 首次爬取时的最大页数 (默认 100) | `100` |
| `is_active` | boolean | 否 | 是否激活 (默认 true) | `true` |

**请求示例**:

```json
{
  "source_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "车企资讯",
  "url": "https://auto.gasgoo.com/industry/C-108",
  "cron_schedule": "30 13 */2 * *",
  "initial_pages": 50,
  "is_active": true
}
```

**响应参数**:

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `uuid` | string | 情报点 UUID |
| `source_uuid` | string | 所属情报源 UUID |
| `name` | string | 情报点名称 |
| `url` | string | 情报点 URL |
| `cron_schedule` | string | Cron 表达式 |
| `is_active` | boolean | 是否激活 |
| `last_crawled_at` | string | 上次爬取时间 (ISO 8601)，无记录则为 null |

---

### 3.3 手动触发爬取任务

手动立即触发一个情报点的爬取任务。

- **URL**: `/tasks/trigger/`
- **Method**: `POST`
- **Content-Type**: `application/json`

**请求参数 (Body)**:

| 字段名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `point_uuid` | string | 是 | 目标情报点的 UUID | `a1b2c3d4-e5f6-7890-1234-567890abcdef` |
| `task_type` | string | 否 | 任务类型：`initial` (首次爬取) 或 `incremental` (增量爬取)。默认 `incremental` | `incremental` |

**请求示例**:

```json
{
  "point_uuid": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "task_type": "initial"
}
```

**响应参数**:

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `message` | string | 操作结果消息 |
| `task_uuid` | string | 创建的任务 UUID |

---

### 3.4 健康检查

检查服务运行状态。

- **URL**: `/health`
- **Method**: `GET`

**响应示例**:

```json
{
  "status": "ok"
}
```

## 4. 爬虫开发指南

当您创建情报点后，需要在 `services/intelspider/crawlers/{source_uuid}/` 目录下编写 `crawler.py`。

**代码模板**:

```python
from typing import Optional
from datetime import datetime
from ...crawler_interface import BaseCrawler

class Crawler(BaseCrawler):
    def run(self, mode: str = 'incremental', initial_pages: int = 100):
        # 实现您的爬虫逻辑
        # 使用 self.add_article(...) 保存数据
        pass
```

**BaseCrawler 提供的核心方法**:

- `self.check_article_exists(original_url)`: 检查 URL 是否已存在。
- `self.add_article(title, original_url, publish_time, content)`: 保存文章并自动向量化。
