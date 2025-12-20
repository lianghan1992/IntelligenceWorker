### 获取分析统计信息
- 接口介绍：获取通用分析的统计数据（模版总数、活跃数、分析任务总数等）。
- 接口方法：`GET /intelspider/analysis/stats`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/analysis/stats
```
- 返回示例：
```json
{
  "total_templates": 5,
  "active_templates": 3,
  "total_analysis_tasks": 1024,
  "completed_tasks": 980
}
```

### 获取分析任务列表
- 接口介绍：获取所有分析任务（结果）的列表，支持分页。
- 接口方法：`GET /intelspider/analysis/tasks`
- 参数说明：
  - `page`: 页码，默认 1。
  - `page_size`: 每页数量，默认 50。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/analysis/tasks?page=1"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "page_size": 50,
  "items": [
    {
      "uuid": "analysis-uuid-1",
      "article_uuid": "article-uuid-1",
      "status": "completed",
      "result": {...},
      "created_at": "2024-01-01T10:00:00"
    }
  ]
}
```

### Gemini 状态检查
- 接口介绍：检查 Gemini 服务的 Cookie 状态。
- 接口方法：`GET /intelspider/gemini/status`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/gemini/status
```
- 返回示例：
```json
{
  "valid": true,
  "message": "Cookies are valid"
}
```

---

## 文档上传与管理

### 文档标签管理

#### 获取标签列表
- 接口介绍：获取所有属于“深度洞察报告”的分类标签（情报点）。
- 接口方法：`GET /intelspider/uploaded-docs/tags`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/tags
```
- 返回示例：
```json
[
  {
    "uuid": "tag-uuid-1",
    "name": "市场分析",
    "created_at": "2024-01-01T10:00:00",
    "doc_count": 10
  }
]
```

#### 创建标签
- 接口介绍：创建一个新的分类标签。
- 接口方法：`POST /intelspider/uploaded-docs/tags`
- 字段说明：
  - `name`: 字符串，标签名称，必填。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/tags \
  -H 'Content-Type: application/json' \
  -d '{"name": "竞品分析"}'
```

#### 重命名标签
- 接口介绍：修改标签名称。
- 接口方法：`PUT /intelspider/uploaded-docs/tags/{tag_uuid}`
- 字段说明：
  - `name`: 字符串，新的标签名称，必填。
- curl 示例：
```bash
curl -sS -X PUT http://127.0.0.1:7657/intelspider/uploaded-docs/tags/tag-uuid-1 \
  -H 'Content-Type: application/json' \
  -d '{"name": "竞品深度分析"}'
```

#### 删除标签
- 接口介绍：删除指定标签。**注意：只有该标签下没有关联文档时才允许删除。**
- 接口方法：`DELETE /intelspider/uploaded-docs/tags/{tag_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/uploaded-docs/tags/tag-uuid-1
```
- 返回示例：
```json
{
  "message": "Tag deleted successfully"
}
```

#### 搜索标签
- 接口介绍：根据名称搜索标签（情报点）。
- 接口方法：`POST /intelspider/search/tags`
- 字段说明：
  - `query`: 字符串，可选。搜索关键词。如果不填则返回所有。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/search/tags \
  -H 'Content-Type: application/json' \
  -d '{"query": "分析"}'
```
- 返回示例：
```json
[
  {
    "uuid": "tag-uuid-1",
    "name": "市场分析",
    "created_at": "2024-01-01T10:00:00",
    "doc_count": 10
  }
]
```

#### 获取标签列表（别名）
- 接口介绍：同 `GET /intelspider/uploaded-docs/tags`，用于获取所有属于“深度洞察报告”的分类标签。
- 接口方法：`GET /intelspider/doc-tags`

### 上传文档
- 接口介绍：上传一个或多个文档（PDF/Word/PPT）到指定的情报点（标签）。支持文档去重、元数据提取。**注意：文档上传后会立即返回，后台进行异步处理（OCR、向量化）。可通过返回的 status 和 process_progress 字段查看进度。**
- 接口方法：`POST /intelspider/uploaded-docs/upload`
- 字段说明（Form Data）：
  - `files`: 文件列表，必填。支持 .pdf, .docx, .pptx, .doc, .ppt 格式。
  - `point_uuid`: 字符串，必填。文档所属的情报点 UUID。
  - `publish_date`: 字符串（ISO格式），可选。文档发布时间。
    - **优先级说明**：
      1. 若用户传入此字段，则使用此时间。
      2. 若用户未传，则尝试从文档元数据（Creation Date）中提取。
      3. 若提取失败，则默认为服务器当前时间（北京时间）。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/upload \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/path/to/report.pdf" \
  -F "point_uuid=point-uuid-123" \
  -F "publish_date=2024-01-01T10:00:00"
```
- 返回示例：
```json
[
  {
    "uuid": "doc-uuid-1",
    "article_uuid": "article-uuid-1",
    "original_filename": "report.pdf",
    "file_size": 1024,
    "file_hash": "sha256...",
    "mime_type": "application/pdf",
    "page_count": 0,
    "download_count": 0,
    "view_count": 0,
    "publish_date": "2024-01-01T10:00:00",
    "created_at": "2024-01-02T12:00:00",
    "point_name": "深度分析",
    "source_name": "用户上传",
    "title": "report",
    "status": "pending",
    "process_stage": "queued",
    "process_progress": 0,
    "error_message": null
  }
]
```

### 获取上传文档列表（含进度状态）
- 接口介绍：获取上传的文档列表，支持分页和筛选。**返回结果包含文档的处理状态和进度。**
- 接口方法：`GET /intelspider/uploaded-docs`
- 参数说明（Query Parameters）：
  - `page`: 整数，页码，默认 1。
  - `page_size`: 整数，每页数量，默认 20。
  - `point_uuid`: 字符串，可选。按情报点筛选。
  - `start_date`: 字符串，可选。发布时间范围起始。
  - `end_date`: 字符串，可选。发布时间范围结束。
  - `search`: 字符串，可选。文件名模糊搜索。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/uploaded-docs?page=1&point_uuid=point-uuid-123"
```
- 返回示例：
```json
{
  "total": 100,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "uuid": "doc-uuid-1",
      "original_filename": "深度洞察报告.pdf",
      "file_size": 1024,
      "mime_type": "application/pdf",
      "page_count": 15,
      "download_count": 5,
      "view_count": 20,
      "publish_date": "2024-01-01T10:00:00",
      "created_at": "2024-01-02T12:00:00",
      "point_name": "深度分析",
      "status": "completed",
      "process_stage": "finished",
      "process_progress": 100,
      "error_message": null
    }
  ]
}
```

### 获取上传文档详情（含进度状态）
- 接口介绍：获取单个上传文档的详细信息，包含处理状态和进度。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1
```
- 返回示例：
```json
{
  "uuid": "doc-uuid-1",
  "original_filename": "深度洞察报告.pdf",
  "file_size": 1024,
  "mime_type": "application/pdf",
  "page_count": 15,
  "download_count": 5,
  "view_count": 20,
  "publish_date": "2024-01-01T10:00:00",
  "created_at": "2024-01-02T12:00:00",
  "point_name": "深度分析",
  "source_name": "用户上传",
  "title": "深度洞察报告",
  "status": "processing",
  "process_stage": "ocr",
  "process_progress": 45,
  "error_message": null
}
```

### 删除文档
- 接口介绍：删除指定的文档。**同步删除文件系统中的文件、数据库记录（文档记录、关联文章记录、向量数据）。**
- 接口方法：`DELETE /intelspider/uploaded-docs/{doc_uuid}`
- curl 示例：
```bash
curl -sS -X DELETE http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1
```
- 返回示例：
```json
{
  "message": "Document doc-uuid-1 deleted successfully"
}
```

### 批量更新文档所属情报点
- 接口介绍：批量将文档从一个情报点移动到另一个情报点。用于在删除情报点前迁移文档，或重新组织文档。
- 接口方法：`POST /intelspider/uploaded-docs/batch-update-point`
- 字段说明：
  - `old_point_uuid`: 字符串，必填。原情报点 UUID。
  - `new_point_uuid`: 字符串，必填。目标情报点 UUID。
  - `doc_uuids`: 字符串列表，可选。指定要移动的文档 UUID 列表。如果不填或为空，则移动原情报点下的**所有**文档。
- curl 示例：
```bash
curl -sS -X POST http://127.0.0.1:7657/intelspider/uploaded-docs/batch-update-point \
  -H 'Content-Type: application/json' \
  -d '{
    "old_point_uuid": "old-point-uuid",
    "new_point_uuid": "new-point-uuid"
  }'
```
- 返回示例：
```json
{
  "message": "Successfully moved 5 documents to point 新情报点名称"
}
```

### 下载文档
- 接口介绍：下载原始文档文件。返回文件流。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}/download`
