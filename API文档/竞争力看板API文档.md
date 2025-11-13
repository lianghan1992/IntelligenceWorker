# 竞争力分析服务 API 文档

## 基础 URL

所有API端点的基础URL为 `/competitiveness_analysis`。

**重要**: 此服务的所有API端点都需要通过 `Bearer Token` 进行认证。请在所有请求的 `Authorization` 头中提供有效的Token。

---

## 1. 分析与提取 API

### 1.1 分析单篇文章

触发对单篇文章的竞争力分析。这是一个异步接口，会立即返回一个任务信息，并在后台执行实际的分析。

- **路径**: `/analyze/article`
- **方法**: `POST`
- **认证**: 需要Bearer Token

**请求体 (JSON)**
```json
{
  "article_id": "文章的UUID"
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/competitiveness_analysis/analyze/article \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-d '{
  "article_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}'
```

**返回示例 (200 OK)**
```json
{
  "task_id": "task_a1b2c3d4..._1678886400.0",
  "status": "pending",
  "message": "任务已创建。"
}
```

### 1.2 批量分析文章

触发对多篇文章的竞争力分析。

- **路径**: `/analyze/batch`
- **方法**: `POST`
- **认证**: 需要Bearer Token

**请求体 (JSON)**
```json
{
  "article_ids": ["文章UUID1", "文章UUID2"]
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/competitiveness_analysis/analyze/batch \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-d '{
  "article_ids": ["uuid1", "uuid2"]
}'
```

**返回示例 (200 OK)**
```json
[
  {
    "task_id": "task_uuid1_...",
    "status": "pending",
    "message": "任务已创建。"
  },
  {
    "task_id": "failed_uuid2",
    "status": "failed",
    "message": "Article with ID uuid2 not found."
  }
]
```

### 1.3 获取文章的初筛结果

获取指定文章在分析后产出的所有原始提取记录（Stage 1）。

- **路径**: `/results/{article_id}`
- **方法**: `GET`
- **认证**: 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/competitiveness_analysis/results/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
[
  {
    "id": "初筛记录的UUID",
    "article_id": "文章的UUID",
    "article_url": "http://example.com/news/123",
    "car_brand": "特斯拉",
    "car_model": "Model Y",
    "tech_dimension": "三电系统",
    "sub_tech_dimension": "动力电池",
    "tech_name": "4680电池",
    "tech_description": "...",
    "reliability": 80,
    "info_source": "发布会",
    "publish_date": "2023-10-01",
    "created_at": "...",
    "processed_at": null,
    "is_processed": false
  }
]
```

---

## 2. 知识库 API

### 2.1 获取知识库条目列表 (分页、筛选、排序)

获取系统中所有知识库条目的列表，支持分页、多值筛选、关键词搜索和排序。这是前端展示知识库表格的核心接口。

-   **路径:** `/knowledge_base`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 请求的页码 |
| `limit` | integer | 20 | 每页返回的数量 |
| `sort_by` | string | `last_updated_at` | 排序字段 (`last_updated_at`, `created_at`, `current_reliability_score`, `car_brand`) |
| `order` | string | `desc` | 排序方向 (`asc` 或 `desc`) |
| `car_brand` | string | (无) | 按汽车品牌筛选 (可多次提供, e.g., `?car_brand=特斯拉&car_brand=比亚迪`) |
| `tech_dimension` | string | (无) | 按技术一级维度筛选 (可多次提供) |
| `sub_tech_dimension` | string | (无) | 按技术二级维度筛选 (可多次提供) |
| `min_reliability` | integer | (无) | 按最低可靠性分数筛选 |
| `search` | string | (无) | 在聚合技术详情中进行模糊搜索 |

**cURL请求示例**
```bash
# 获取第一页，品牌为特斯拉，按可靠性降序排序
curl -X GET "http://127.0.0.1:7657/competitiveness_analysis/knowledge_base?page=1&limit=10&car_brand=特斯拉&sort_by=current_reliability_score&order=desc" \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiODA1YmQxN2QtYjAzMC00ZGUzLTk1NWItNDIwZGQxZWQzNGE4IiwidXNlcm5hbWUiOiJ0ZXN0dXNlcjExMSIsImVtYWlsIjoidGVzdDExMUBleGFtcGxlLmNvbSIsImV4cCI6MTc2Mjg1NjI5NCwic3ViIjoiYWNjZXNzIn0._2CiK0XGN4I3_xw6zwMtBE9q5f4pndqduKYjNTpx9jU"
```

**返回示例 (200 OK)**
```json
{
  "total": 58,
  "page": 1,
  "limit": 10,
  "items": [
    {
      "id": 101,
      "car_brand": "特斯拉",
      "tech_dimension": "智能座舱",
      "sub_tech_dimension": "车载信息娱乐系统",
      "current_reliability_score": 85,
      "source_article_count": 5,
      "last_updated_at": "2023-10-27T10:00:00Z",
      "consolidated_tech_preview": {
        "name": "MCU-Z芯片",
        "description": "性能强大的车载计算平台...",
        "reliability": 85,
        "publish_date": "2023-09-15"
      }
    }
    // ... 其他条目
  ]
}
```

### 2.2 获取单个知识库条目详情

获取指定ID的知识库条目的完整详细信息，包括所有聚合的技术详情和来源文章ID列表。

-   **路径:** `/knowledge_base/{kb_id}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/101 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "id": 101,
  "car_brand": "特斯拉",
  "tech_dimension": "智能座舱",
  "sub_tech_dimension": "车载信息娱乐系统",
  "unique_aggregation_key": "...",
  "consolidated_tech_details": [
    {
      "name": "MCU-Z芯片",
      "description": "性能强大的车载计算平台...",
      "reliability": 85,
      "publish_date": "2023-09-15"
    },
    {
      "name": "车载游戏功能",
      "description": "支持Steam平台游戏...",
      "reliability": 70,
      "publish_date": "2023-08-20"
    }
  ],
  "current_reliability_score": 85,
  "source_article_ids": ["uuid-123", "uuid-456"],
  "created_at": "2023-10-01T12:00:00Z",
  "last_updated_at": "2023-10-27T10:00:00Z"
}
```

### 2.3 获取知识库筛选器元数据

获取用于前端动态生成筛选器选项的元数据，包含所有唯一的品牌、技术维度及其对应的子维度。

-   **路径:** `/knowledge_base/meta`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/meta \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "car_brands": [
    "特斯拉",
    "比亚迪",
    "蔚来",
    "小鹏"
  ],
  "tech_dimensions": {
    "智能座舱": [
      "车载信息娱乐系统",
      "人机交互",
      "座舱SoC"
    ],
    "自动驾驶": [
      "感知硬件",
      "决策算法",
      "高精地图"
    ],
    "三电系统": [
      "动力电池",
      "驱动电机",
      "电控系统"
    ]
  }
}
```

### 2.4 导出知识库为CSV文件

根据指定的列名，将知识库数据导出为CSV文件。文件将以`utf-8-sig`编码，确保在Excel中能正确显示简体中文。

-   **路径:** `/knowledge_base/export`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `columns` | string | 是 | 要导出的列名列表。可多次提供, e.g., `?columns=id&columns=car_brand&columns=tech_dimension` |

**有效列名**: `id`, `car_brand`, `tech_dimension`, `sub_tech_dimension`, `unique_aggregation_key`, `consolidated_tech_details`, `current_reliability_score`, `source_article_ids`, `created_at`, `last_updated_at`

**cURL请求示例**
```bash
# 导出品牌、技术维度和可靠性分数
curl -X GET "http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/export?columns=car_brand&columns=tech_dimension&columns=current_reliability_score" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" -o export.csv
```

**返回**: 
一个CSV文件流，文件名类似于 `knowledge_base_export_20231028_153000.csv`。

---

### 2.5 溯源：获取知识库条目的来源文章列表（不含初筛记录）

获取某知识库条目的来源文章基本信息列表，用于前端展示“该技术点来源于哪些文章”。

-   **路径:** `/knowledge_base/{kb_id}/articles`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/101/articles \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
[
  {
    "id": "uuid-123",
    "original_url": "http://example.com/news/123",
    "publish_date": "2023-09-10",
    "created_at": "2023-09-11 10:00:00"
  },
  {
    "id": "uuid-456",
    "original_url": "http://example.com/news/456",
    "publish_date": "2023-09-12",
    "created_at": "2023-09-13 11:30:00"
  }
]
```

### 2.6 溯源：获取知识库条目的来源文章（可附带初筛记录）

返回来源文章列表，并可选择附带属于该知识库维度的初筛记录，用于深入溯源（例如在前端展开查看该文章下的具体提取点）。

-   **路径:** `/knowledge_base/{kb_id}/sources`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `with_records` | boolean | `false` | 是否返回该维度下的初筛记录 |
| `min_reliability` | integer | (无) | 仅返回可靠性分数不低于该阈值的初筛记录 |
| `article_id` | string | (无) | 仅返回指定文章的溯源信息 |
| `include_content` | boolean | `true` | 是否在返回中包含文章正文内容 |
| `tech_name` | string | (无) | 仅返回包含该技术名称（模糊匹配）的文章与片段 |

**cURL请求示例**
```bash
# 返回来源文章并附带初筛记录，可靠性≥70
curl -X GET "http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/101/sources?with_records=true&min_reliability=70" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 指定技术名称进行溯源（如：灯光拣选系统），并返回正文
curl -X GET "http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/101/sources?with_records=true&min_reliability=70&tech_name=%E7%81%AF%E5%85%89%E6%8B%A4%E9%80%89%E7%B3%BB%E7%BB%9F&include_content=true" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
[
  {
    "id": "uuid-123",
    "title": "比亚迪发布会：智慧内饰灯光拣选系统详解",
    "original_url": "http://example.com/news/123",
    "publish_date": "2023-09-10",
    "created_at": "2023-09-11 10:00:00",
    "content": "......全文内容......",
    "stage1_records": [
      {
        "id": "et-1",
        "article_id": "uuid-123",
        "article_url": "http://example.com/news/123",
        "car_brand": "特斯拉",
        "car_model": "Model Y",
        "tech_dimension": "智能座舱",
        "sub_tech_dimension": "车载信息娱乐系统",
        "tech_name": "MCU-Z芯片",
        "tech_description": "性能强大的车载计算平台...",
        "reliability": 85,
        "info_source": "发布会",
        "publish_date": "2023-09-10",
        "created_at": "2023-09-11 10:02:00",
        "processed_at": "2023-09-12T09:00:00Z",
        "is_processed": true
      }
    ]
  }
]
```

---

## 3. 其他

### 3.1 获取服务配置信息

获取当前服务的配置信息（出于安全考虑，会隐藏敏感信息）。

- **路径**: `/settings`
- **方法**: `GET`
- **认证**: 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/competitiveness_analysis/settings \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**:
```json
{
  "llm_provider": "zhipu",
  "llm_model": "glm-4.5-flash",
  "log_level": "INFO"
}
```

---

## 4. 进一步改进建议（已支持/可选）

- 溯源预览增强：在`/knowledge_base`列表返回中增加每条的`source_article_count`（已支持），前端可加“查看来源”按钮跳至`/knowledge_base/{kb_id}/articles`或`/sources`。
- 可靠性阈值：在`/knowledge_base`列表筛选参数中已支持`min_reliability`，与溯源接口的`min_reliability`参数保持一致的语义。
- 关键词溯源：前端根据`search`参数命中条目后，调用`sources?with_records=true`即可查看命中详情对应的文章与片段。
- CSV导出扩展：当前导出支持自定义列。若需包含`source_article_ids`，可在导出列中加入该字段；或前端在导出后根据`kb_id`调用`sources`补充溯源信息。