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
    "llm_provider": "gemini_cookie"
  }
  ```

### 2. Analysis

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

### 3. Data Management (Dimensions & Brands)

#### `GET /competitiveness/dimensions`
获取所有一级技术维度。
- **Response**: `["智能驾驶", "智能座舱", ...]`

#### `POST /competitiveness/dimensions`
创建新的一级技术维度。
- **Request Body**:
  ```json
  {
    "name": "新维度名称"
  }
  ```

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

#### `POST /competitiveness/secondary-dimensions/batch-update`
批量更新二级子维度名称（数据清洗）。
- **Request Body**:
  ```json
  {
    "old_name": "激光雷达",
    "new_name": "LiDAR",
    "tech_dimension": "智能驾驶" // 可选，指定一级维度范围
  }
  ```
- **Response**:
  ```json
  {
    "message": "Update successful",
    "updated_count": 5
  }
  ```

## Database Models

### TechAnalysisTask (一阶段结果)
- `article_id`: 关联文章ID
- `vehicle_brand`: 车企
- `vehicle_model`: 车型
- `tech_dimension`: 一级技术维度
- `secondary_tech_dimension`: 二级子维度
- `tech_name`: 技术名称
- `tech_description`: 技术描述
- `reliability`: 可靠性评分 (1-4)
- `is_processed_stage2`: 是否已进行二阶段处理

### VehicleBrand
- `name`: 车企名称

### TechDimension
- `name`: 维度名称
