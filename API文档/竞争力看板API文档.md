# 竞争力分析服务 API 文档（全面版，含精确溯源映射）

本文面向前端开发者，完整解释本服务的业务逻辑、数据流、接口相互关系、字段含义、示例返回与 cURL 示例。阅读后应能独立完成从“文章→初筛→聚合→溯源”的端到端调用与展示。

## 概览
- 服务定位：统一抽取汽车技术相关信息，构建聚合知识库，支持从聚合点回溯至具体文章与初筛片段（技术来源）。
- 基础路径：`/competitiveness_analysis`；认证使用 Bearer Token。
- 数据来源：`crawler_collected_articles`（文章）→ LLM 多阶段分析 → `competitiveness_analysis_extracted_technologies`（初筛）→ LLM 合并 → `competitiveness_analysis_tech_knowledge_base`（聚合）。
- 可靠性语义：统一为 `1..4`（后附详细说明）。
- 溯源机制：每个聚合技术点（`consolidated_tech_details[]`）内嵌“精确映射”到来源初筛ID与文章ID，前端通过 `/knowledge_base/{kb_id}/traceability` 可一键回溯。

## 业务逻辑与数据流
1) 阶段1（文章初筛）
- LLM 三轮对话：识别品牌与维度 → 对文章片段进行技术细节抽取 → 生成结构化初筛记录。
- 校验：品牌/维度/子维度需在白名单；缺失 `tech_name` 的记录拒绝保存。
- 可靠性：保存时强制规范到 `1..4`；`publish_date` 统一转为 ISO 字符串。
- 写入：保存到 `competitiveness_analysis_extracted_technologies`；不保存原始片段文本，保留摘要与来源链接。

2) 阶段2（聚合合并）
- 聚合键：`unique_aggregation_key = sha256(car_brand + tech_dimension + sub_tech_dimension)`。
- 合并策略：两轮 LLM 对话决定动作（新增/替换/共存等），更新 `consolidated_tech_details` 与 `current_reliability_score`。
- 可靠性：返回后清洗到 `1..4`；若 LLM 未给出最大可靠性，自动以详情中最大值回退。
- 来源维护：
  - `TechKnowledgeBase.source_article_ids`：该聚合条目涉及的文章ID列表。
  - `consolidated_tech_details[]`：每个聚合技术点记录“精确映射”字段：
    - `source_stage1_ids`: 此技术点关联的全部初筛记录ID（列表）。
    - `source_article_ids`: 此技术点直接关联的文章ID（列表）。
  - 在合并时会继承旧映射，并为同名项追加本次记录的初筛/文章ID（去重）。

3) 溯源（Traceability）
- 精确映射优先：根据 `aggregated_tech[].source_stage1_ids / source_article_ids` 精确回查 Stage1 与文章。
- 模糊回退：若映射缺失则回退到品牌/维度/子维度 + `tech_name` 模糊匹配。
- 统一格式：所有返回的可靠性为 `1..4`，`publish_date` 标准化为 ISO 字符串。

## 可靠性语义（统一）
- 取值范围：`1..4`
  - `4`: 官方证实（Confirmed）
  - `3`: 可信度高（High Credibility）
  - `2`: 疑似传言（Rumor）
  - `1`: 已经辟谣（Debunked）
- 应用范围：
  - `ExtractedTechnology.reliability`（初筛保存时）
  - `TechKnowledgeBase.current_reliability_score`（聚合合并时）
  - `consolidated_tech_details[].reliability`（聚合详情清洗）
  - 所有 API 参数 `min_reliability` 自动限定到 `1..4`

## 数据模型与字段说明

1) 文章表 `crawler_collected_articles`
- `id`: 文章ID（字符串）
- `title`: 标题
- `original_url`: 原始链接
- `content`: 正文
- `publish_date`: 发布时间（字符串，返回时转 ISO）
- `created_at`: 入库时间（字符串）

2) 初筛表 `competitiveness_analysis_extracted_technologies`（Stage1）
- `id`: 初筛记录ID（UUID字符串）
- `article_id`: 文章ID（字符串）
- `article_url`: 文章原始链接
- `car_brand`: 品牌
- `car_model`: 车型
- `tech_dimension`: 技术一级维度
- `sub_tech_dimension`: 技术二级维度
- `tech_name`: 技术名称
- `tech_description`: 技术摘要/描述
- `reliability`: 可靠性分数（`1..4`）
- `info_source`: 信息来源/引用
- `publish_date`: 发布时间（ISO字符串）
- `created_at`: 创建时间
- `processed_at`: 处理完成时间
- `is_processed`: 是否已处理

3) 聚合表 `competitiveness_analysis_tech_knowledge_base`（Stage2）
- `id`: 聚合条目ID（自增整数）
- `car_brand`, `tech_dimension`, `sub_tech_dimension`: 聚合维度键
- `unique_aggregation_key`: 唯一聚合键（sha256）
- `current_reliability_score`: 当前最高可靠性分（`1..4`）
- `source_article_ids`: 来源文章ID列表（JSON字符串数组）
- `consolidated_tech_details`: 聚合详情（JSON字符串数组），每项包含：
  - `name`: 技术点名称
  - `description`: 技术点描述
  - `reliability`: 该技术点可靠性（`1..4`）
  - `publish_date`: 发布时间（ISO字符串或空）
  - `source_stage1_ids`: 精确映射的初筛ID列表（新增）
  - `source_article_ids`: 精确映射的文章ID列表（新增）
- `created_at`, `last_updated_at`: 创建/更新时间

## API 路由与用法

### 分析任务

- `POST /competitiveness_analysis/analyze/article`
  - 请求体：`{ "article_id": "<uuid>" }`
  - 行为：创建后台任务并立即返回任务信息；若文章未分析则异步执行阶段1+阶段2。
  - 返回（示例）：
    ```json
    { "task_id": "task_<article_id>_<timestamp>", "status": "queued|completed", "message": "..." }
    ```

- `POST /competitiveness_analysis/analyze/batch`
  - 请求体：`{ "article_ids": ["<uuid>", "<uuid>"] }`
  - 行为：逐篇创建后台任务，返回任务列表。

### 初筛结果

- `GET /competitiveness_analysis/results/{article_id}`
  - 返回：该文章的初筛记录列表（升序）。
  - 示例返回（截断）：
    ```json
    [
      {
        "id": "stg1-uuid",
        "article_id": "a-uuid",
        "article_url": "https://...",
        "car_brand": "比亚迪",
        "tech_dimension": "智能驾驶",
        "sub_tech_dimension": "感知与识别",
        "tech_name": "灯光拣选系统",
        "tech_description": "...",
        "reliability": 3,
        "info_source": "官方新闻稿",
        "publish_date": "2024-06-08",
        "created_at": "2024-06-09T08:00:00Z"
      }
    ]
    ```

### 知识库列表与详情

- `GET /competitiveness_analysis/knowledge_base`
  - 查询：`page, limit, sort_by, order, car_brand[], tech_dimension[], sub_tech_dimension[], min_reliability, search`
  - 返回：分页列表，含每条的 `consolidated_tech_preview` 与 `current_reliability_score`。

- `GET /competitiveness_analysis/knowledge_base/{kb_id}`
  - 返回：完整详情，含 `consolidated_tech_details[]` 与 `source_article_ids[]`。
  - 示例（含精确映射字段）：
    ```json
    {
      "id": 123,
      "car_brand": "比亚迪",
      "tech_dimension": "智能驾驶",
      "sub_tech_dimension": "感知与识别",
      "unique_aggregation_key": "sha256...",
      "current_reliability_score": 3,
      "source_article_ids": ["a-uuid-1", "a-uuid-2"],
      "consolidated_tech_details": [
        {
          "name": "灯光拣选系统",
          "description": "...",
          "reliability": 3,
          "publish_date": "2024-06-08",
          "source_stage1_ids": ["stg1-uuid-1", "stg1-uuid-9"],
          "source_article_ids": ["a-uuid-1", "a-uuid-2"]
        }
      ],
      "created_at": "2024-06-09T08:00:00Z",
      "last_updated_at": "2024-06-10T12:00:00Z"
    }
    ```

### 来源文章（可带初筛记录）

- `GET /competitiveness_analysis/knowledge_base/{kb_id}/sources`
  - 查询：`with_records, min_reliability, article_id, include_content, tech_name`
  - 返回：文章列表，`with_records=true` 时携带该维度下的初筛记录。
  - cURL 示例：
    ```bash
    curl -X GET \
      "http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/123/sources?with_records=true&min_reliability=2&include_content=false" \
      -H "Authorization: Bearer <token>"
    ```

### 完整溯源（聚合技术点 → 精确映射）

- `GET /competitiveness_analysis/knowledge_base/{kb_id}/traceability`
  - 查询：`tech_name`（必填），`include_content`（可选），`min_reliability`（可选）
  - 逻辑：
    1. 在 `consolidated_tech_details[]` 中按 `name` 精确匹配目标项；
    2. 读取并使用 `source_stage1_ids` 与 `source_article_ids` 精确回查 Stage1 与文章；
    3. 若映射缺失，回退到品牌/维度/子维度 + 名称模糊匹配；
    4. 返回统一格式的聚合项、初筛记录与文章列表。
  - 返回示例（截断）：
    ```json
    {
      "kb_id": 123,
      "car_brand": "比亚迪",
      "tech_dimension": "智能驾驶",
      "sub_tech_dimension": "感知与识别",
      "unique_aggregation_key": "sha256...",
      "current_reliability_score": 3,
      "aggregated_tech": [
        {
          "name": "灯光拣选系统",
          "description": "...",
          "reliability": 3,
          "publish_date": "2024-06-08",
          "source_stage1_ids": ["stg1-uuid-1", "stg1-uuid-9"],
          "source_article_ids": ["a-uuid-1", "a-uuid-2"]
        }
      ],
      "stage1_records": [
        { "id": "stg1-uuid-1", "article_id": "a-uuid-1", "tech_name": "灯光拣选系统", "reliability": 3 },
        { "id": "stg1-uuid-9", "article_id": "a-uuid-2", "tech_name": "灯光拣选系统", "reliability": 2 }
      ],
      "source_articles": [
        { "id": "a-uuid-1", "title": "...", "original_url": "https://...", "publish_date": "2024-06-08" },
        { "id": "a-uuid-2", "title": "...", "original_url": "https://...", "publish_date": "2024-06-07" }
      ]
    }
    ```
  - cURL 示例：
    ```bash
    curl -X GET \
      "http://127.0.0.1:7657/competitiveness_analysis/knowledge_base/123/traceability?tech_name=%E7%81%AF%E5%85%89%E6%8B%A3%E9%80%89%E7%B3%BB%E7%BB%9F&min_reliability=2&include_content=false" \
      -H "Authorization: Bearer <token>"
    ```

## 相互关系与前端调用建议
- 列表页：`GET /knowledge_base` → 展示聚合条目，用户选择进入详情。
- 详情页：`GET /knowledge_base/{kb_id}` → 展示 `consolidated_tech_details[]`，对每个 `name` 提供“完整溯源”。
- 完整溯源：`GET /knowledge_base/{kb_id}/traceability?tech_name=...` → 使用精确映射回查。
- 关键词溯源（文章维度）：`GET /knowledge_base/{kb_id}/sources?with_records=true&tech_name=...` → 定位包含关键词的文章及片段。
- 可靠性筛选：所有 `min_reliability` 参数统一为 `1..4`；建议在 UI 上出具统一的颜色/标签。

## 错误与边界
- 404：目标文章/知识条目/聚合技术点不存在。
- 401：认证失败（Bearer Token）。
- 空结果：正常返回空数组/空对象，不抛错。
- 可靠性与日期：后端已统一处理，不需要前端额外转换。

## 启动与依赖（本地调试）
```bash
cd /srv/application/AI驱动的汽车行业情报平台/IntelligencePlatform
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 7657 --reload
```
- 依赖安装：将依赖写入 `requirements.txt`，在虚拟环境中执行 `pip install -r requirements.txt`。如需国内镜像可配置代理 `127.0.0.1:20170/20171`。

## 备注
- 数据库使用 PostgreSQL；如需连接测试，请读取主项目 `.env` 中的 `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`。
- 禁止删除任何表或数据；所有溯源与聚合均依赖历史记录。