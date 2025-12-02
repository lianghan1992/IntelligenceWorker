# Competitiveness Analysis Service API Documentation

## Overview
该服务负责对汽车行业情报文章进行竞争力分析，提取关键技术情报、车企信息、车型信息以及技术维度分类。

## API Endpoints

### 1. Control & Status

#### `POST /competitiveness/control`
启用或禁用竞争力分析服务。
- **Description**: 控制服务的全局开关。注意，此修改仅在当前运行实例中生效，重启后会恢复为环境变量配置。
- **Request Body**:
  ```json
  {
    "enabled": true
  }
  ```
- **Response**:
  ```json
  {
    "message": "Competitiveness service is now enabled",
    "enabled": true
  }
  ```

#### `GET /competitiveness/status`
获取服务当前状态。
- **Response**:
  ```json
  {
    "enabled": true,
    "worker_enabled": true,
    "llm_provider": "gemini_cookie",
    "cookie_health": "healthy"
  }
  ```

#### `GET /competitiveness/stats/overview`
统计总览。
- **Response**:
  ```json
  {
    "stage1_total": 1234,
    "stage2_items_total": 567,
    "stage2_processed_tasks": 890
  }
  ```

#### `GET /competitiveness/stats/by-brand`
按车企统计主表数量。
- **Response**:
  ```json
  [
    {"vehicle_brand": "小米汽车", "count": 40},
    {"vehicle_brand": "比亚迪", "count": 120}
  ]
  ```

#### `GET /competitiveness/stats/by-dimension`
按一级维度统计主表数量。
- **Response**:
  ```json
  [
    {"tech_dimension": "智能驾驶", "count": 100},
    {"tech_dimension": "智能座舱", "count": 60}
  ]
  ```

#### `GET /competitiveness/stats/reliability`
主表可信度分布。
- **Response**:
  ```json
  [
    {"reliability": 4, "count": 50},
    {"reliability": 3, "count": 30}
  ]
  ```

#### `GET /competitiveness/stats/recent`
近7天新增与更新数量。
- **Response**:
  ```json
  {
    "items_recent": 12,
    "tasks_recent": 34
  }
  ```

### 2. Cookie Management

#### `POST /competitiveness/cookie/refresh`
刷新 Google Cookie (仅当 `LLM_PROVIDER` 为 `gemini_cookie` 时有效)。
- **Description**: 验证新的 Cookie 是否有效。如果有效，会立即更新内存中的 Client 并持久化到 `.env` 文件，无需重启服务。
- **Request Body**:
  ```json
  {
    "secure_1psid": "Your __Secure-1PSID value...",
    "secure_1psidts": "Your __Secure-1PSIDTS value..."
  }
  ```
- **Response**:
  ```json
  {
    "message": "Cookie updated and persisted successfully.",
    "health": "healthy"
  }
  ```
- **Error Response (400)**:
  ```json
  {
    "detail": "Cookie update failed. Invalid cookies or connection error."
  }
  ```

### 3. Analysis

#### `POST /competitiveness/analyze/stage1`
触发单篇文章的一阶段分析。
- **Description**: 传入文章内容，调用 LLM 提取技术情报。
- **Request Body**:
  ```json
  {
    "article_id": "uuid-string",
    "title": "文章标题",
    "content": "文章正文内容..."
  }
  ```
- **Response**: List of Analysis Tasks
  ```json
  [
    {
      "id": "uuid-string",
      "article_id": "uuid-string",
      "vehicle_brand": "小米汽车",
      "vehicle_model": "SU7",
      "tech_dimension": "智能驾驶",
      "secondary_tech_dimension": "激光雷达",
      "tech_name": "一体式激光雷达",
      "tech_description": "...",
      "reliability": 4
    }
  ]
  ```

### 4. Data Management (Dimensions & Brands)

#### `GET /competitiveness/dimensions`
获取所有一级技术维度（及其二级子维度）。
- **Response**: List of TechDimension objects
  ```json
  [
    {
      "id": "uuid",
      "name": "智能驾驶",
      "sub_dimensions": ["激光雷达", "自动驾驶芯片"],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
  ```

#### `POST /competitiveness/dimensions`
创建新的一级技术维度（可同时指定二级子维度）。
- **Request Body**:
  ```json
  {
    "name": "飞行汽车",
    "sub_dimensions": ["垂直起降", "低空管制"]
  }
  ```
- **Response**: Created TechDimension object

#### `PUT /competitiveness/dimensions/{name}`
更新一级技术维度（主要用于更新二级子维度列表）。
- **Description**: 将覆盖原有的 `sub_dimensions` 列表。
- **Request Body**:
  ```json
  {
    "sub_dimensions": ["激光雷达", "自动驾驶芯片", "端到端大模型"]
  }
  ```
- **Response**: Updated TechDimension object

#### `DELETE /competitiveness/dimensions/{name}`
删除一级技术维度。
- **Response**: 204 No Content

#### `GET /competitiveness/brands`
获取所有车企/品牌。
- **Response**: `["比亚迪", "特斯拉", ...]`

#### `POST /competitiveness/brands`
创建新的车企/品牌。
- **Request Body**:
  ```json
  {
    "name": "新车企名称"
  }
  ```
- **Response**: Created VehicleBrand object

#### `POST /competitiveness/secondary-dimensions/batch-update`
批量更新二级子维度名称（数据清洗）。
- **Request Body**:
  ```json
  {
    "old_name": "激光雷达",
    "new_name": "LiDAR",
    "tech_dimension": "智能驾驶"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Update successful",
    "updated_count": 5
  }
  ```

### 5. Technical Intelligence (Stage 2 Results)

#### `GET /competitiveness/tech-items`
获取技术情报主表列表 (Stage 2 结果)。
- **Description**: 查询经过二阶段合并去重后的"Golden Record"技术情报。
- **Query Parameters**:
  - `vehicle_brand` (optional): 按车企过滤
  - `tech_dimension` (optional): 按一级技术维度过滤
  - `skip`: 分页偏移 (default: 0)
  - `limit`: 分页大小 (default: 50)
- **Response**: List of TechItem objects
  ```json
  [
    {
      "id": "uuid",
      "vehicle_brand": "小米汽车",
      "vehicle_model": "SU7",
      "tech_dimension": "智能驾驶",
      "secondary_tech_dimension": "激光雷达",
      "name": "一体式激光雷达",
      "description": "...",
      "reliability": 4,
      "latest_article_id": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
  ```

#### `GET /competitiveness/tech-items/{item_id}`
获取单条技术情报详情 (包含完整历史变更记录)。
- **Description**: 查看某项技术情报的演变历史（新增、更新、佐证）。
- **Response**: TechItem object with History
  ```json
  {
    "id": "uuid",
    "name": "一体式激光雷达",
    "vehicle_brand": "小米汽车",
    "latest_article_url": "https://example.com/original-article",
    "history": [
      {
        "id": "history-uuid",
        "change_type": "Create",
        "reliability_snapshot": 3,
        "description_snapshot": "...",
        "event_time": "...",
        "article_id": "..."
      }
    ]
  }
  ```
## 审核流程

为提升数据质量，新增人工审核步骤：二阶段写入的 `competitiveness_tech_items` 默认 `is_reviewed=false`，需人工审核通过后方可在查询接口默认返回。若审核不通过，支持批量删除该技术项以及其关联的一阶段原始记录与历史记录。

### 新增字段

- `TechItem.is_reviewed`：boolean，默认 `false`。已存在数据在迁移后默认视为 `false`，需人工逐步审核。

### 接口

- `GET /competitiveness/reviews/pending`
  - 用途：分页懒加载待审核项
  - 参数：`vehicle_brand?`、`tech_dimension?`、`skip=0`、`limit=50`
  - 返回：`{ items: TechItemResponse[], total: number }`

- `POST /competitiveness/reviews/{item_id}/approve`
  - 用途：审核通过，标记 `is_reviewed=true`
  - 返回：`TechItemResponse`

- `DELETE /competitiveness/reviews/items`
  - 用途：批量删除未通过项
  - 请求体：`{ item_ids: string[] }`
  - 逻辑：删除 `competitiveness_tech_items` 以及其关联的 `competitiveness_tech_history`；同时删除历史中关联的 `raw_extraction_id` 对应的一阶段 `competitiveness_analysis_tasks` 记录；不影响其它无关数据。

### 查询行为调整

- `GET /competitiveness/tech-items` 增加 `only_reviewed` 参数，默认为 `true`。前端默认只显示已审核的技术项；若需要查看全部或配合审核界面，可传 `only_reviewed=false`。

### 兼容性与迁移说明

- 迁移会为 `competitiveness_tech_items` 增加 `is_reviewed` 字段，默认 `false`，不影响现有查询但默认查询接口只返回已审核项；如需保留原行为可传 `only_reviewed=false`。
