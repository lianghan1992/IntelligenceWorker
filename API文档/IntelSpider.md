
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

### 上传文档
- 接口介绍：上传一个或多个文档（PDF/Word/PPT）到指定的情报点（标签）。支持文档去重、元数据提取。
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
    "page_count": 15,
    "download_count": 0,
    "view_count": 0,
    "publish_date": "2024-01-01T10:00:00",
    "created_at": "2024-01-02T12:00:00",
    "point_name": "深度分析",
    "source_name": "上传文档",
    "title": "report",
    "status": "pending",
    "stage": null,
    "error_message": null,
    "updated_at": null
  }
]
```

### 获取上传文档列表
- 接口介绍：获取上传的文档列表，支持分页和筛选。
- 接口方法：`GET /intelspider/uploaded-docs/`
- 参数说明（Query Parameters）：
  - `page`: 整数，页码，默认 1。
  - `page_size`: 整数，每页数量，默认 20。
  - `point_uuid`: 字符串，可选。按情报点筛选。
  - `keyword`: 字符串，可选。按文件名或标题关键词模糊搜索。
  - `start_date`: 字符串，可选。发布时间范围起始。
  - `end_date`: 字符串，可选。发布时间范围结束。
- curl 示例：
```bash
curl -sS "http://127.0.0.1:7657/intelspider/uploaded-docs/?page=1&point_uuid=point-uuid-123"
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
      "article_uuid": "article-uuid-1",
      "original_filename": "深度洞察报告.pdf",
      "file_size": 1024,
      "mime_type": "application/pdf",
      "page_count": 15,
      "download_count": 5,
      "view_count": 20,
      "publish_date": "2024-01-01T10:00:00",
      "created_at": "2024-01-02T12:00:00",
      "point_name": "深度分析",
      "source_name": "上传文档",
      "title": "深度洞察报告"
    }
  ]
}
```

### 获取文档处理状态
- 接口介绍：获取文档的后台处理状态（如 OCR、向量化等）。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}/status`
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/status
```
- 返回示例：
```json
{
  "uuid": "doc-uuid-1",
  "status": "pending",
  "stage": "ocr_processing",
  "error_message": null,
  "updated_at": "2024-01-02T12:05:00",
  "is_vectorized": false
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
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/download --output report.pdf
```

### 删除文档
- 接口介绍：删除指定的上传文档，同时删除数据库记录（包括文章、向量索引）和物理文件。
- 接口方法：`DELETE /intelspider/uploaded-docs/{doc_uuid}`
- 参数说明：
  - `doc_uuid`: 字符串，必填。文档的 UUID。
- 返回值：
  - 成功：HTTP 204 No Content
  - 失败：HTTP 404 (Document not found)
- curl 示例：
```bash
curl -X DELETE http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1
```

### 预览文档（PDF页）
- 接口介绍：获取 PDF 文档指定页的图片流（PNG格式）。用于前端安全预览，避免直接暴露原始 PDF 文件。
- 接口方法：`GET /intelspider/uploaded-docs/{doc_uuid}/preview/{page_num}`
- 参数说明：
  - `page_num`: 整数，必填。页码，从 1 开始。
- curl 示例：
```bash
curl -sS http://127.0.0.1:7657/intelspider/uploaded-docs/doc-uuid-1/preview/1 --output page1.png
```

