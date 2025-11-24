# 深度洞察服务 API 文档

说明：所有接口前缀为 `/deep_insight`，认证使用统一的 Bearer Token。服务目标：将上传的 PDF/PPT 分页重绘，生成每页 HTML 与 PDF，并最终合稿输出一个新的 PDF。

## 分类管理
- `POST /deep_insight/categories`
  - 方法说明：新增分类
  - 请求：`multipart/form-data`
    - 字段：`name`(string, 必填)，`parent_id`(string, 可选)
  - 返回示例：
    ```json
    {"id":"<uuid>","message":"created"}
    ```
  - cURL 示例：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/categories \
      -H "Authorization: Bearer <token>" \
      -F "name=一级分类A"
    ```

- `GET /deep_insight/categories`
  - 方法说明：列出所有分类
  - 返回示例：
    ```json
    [{"id":"<uuid>","name":"一级分类A","parent_id":null,"created_at":"...","updated_at":"..."}]
    ```
  - cURL：
    ```bash
    curl -X GET http://127.0.0.1:7657/api/deep_insight/categories \
      -H "Authorization: Bearer <token>"
    ```

- `DELETE /deep_insight/categories/{cid}`
  - 方法说明：删除分类
  - 返回示例：
    ```json
    {"message":"deleted"}
    ```
  - cURL：
    ```bash
    curl -X DELETE http://127.0.0.1:7657/api/deep_insight/categories/<cid> \
      -H "Authorization: Bearer <token>"
    ```

## 任务管理
- `POST /deep_insight/tasks`
  - 方法说明：上传文档任务（支持 pdf/ppt/pptx）
  - 请求：`multipart/form-data`
    - 字段：`file`(file, 必填)，`category_id`(string, 可选)
  - 返回示例：
    ```json
    {"task_id":"<uuid>","status":"pending"}
    ```
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/tasks \
      -H "Authorization: Bearer <token>" \
      -F "file=@/path/to/report.pdf" -F "category_id=<uuid>"
    ```

- `GET /deep_insight/tasks/{task_id}`
  - 方法说明：查询任务状态
  - 返回字段：`status(total_pages, processed_pages, result_bundle_pdf, created_at, updated_at)`
  - 返回示例：
    ```json
    {"id":"<uuid>","file_name":"report.pdf","file_type":"pdf","status":"processing","total_pages":30,"processed_pages":12,"result_bundle_pdf":null}
    ```
  - cURL：
    ```bash
    curl -X GET http://127.0.0.1:7657/api/deep_insight/tasks/<task_id> \
      -H "Authorization: Bearer <token>"
    ```

- `GET /deep_insight/tasks/{task_id}/pages`
  - 方法说明：分页列出任务页（懒加载）
  - 查询参数：`page`(int, 默认1)，`limit`(int, 默认20, ≤100)
  - 返回示例：
    ```json
    {"total":30,"page":1,"limit":20,"items":[{"id":"<uuid>","page_index":1,"image_path":".../images/page_1.png","html_path":".../html/page_1.html","pdf_path":".../pdf/page_1.pdf","status":"completed"}]}
    ```
  - cURL：
    ```bash
    curl -X GET "http://127.0.0.1:7657/api/deep_insight/tasks/<task_id>/pages?page=1&limit=20" \
      -H "Authorization: Bearer <token>"
    ```

- `GET /deep_insight/tasks/{task_id}/pages/{page_index}/pdf`
  - 方法说明：下载单页PDF
  - cURL：
    ```bash
    curl -X GET http://127.0.0.1:7657/api/deep_insight/tasks/<task_id>/pages/1/pdf \
      -H "Authorization: Bearer <token>" -o page_1.pdf
    ```

- `GET /deep_insight/tasks/{task_id}/bundle`
  - 方法说明：下载合稿PDF
  - cURL：
    ```bash
    curl -X GET http://127.0.0.1:7657/api/deep_insight/tasks/<task_id>/bundle \
      -H "Authorization: Bearer <token>" -o result.pdf
    ```

## Gemini Cookie
- `POST /deep_insight/gemini/cookies`
  - 方法说明：更新 Gemini Cookie（共享爬虫服务的缓存）
  - 请求：`multipart/form-data`
    - 字段：`secure_1psid`(string, 必填), `secure_1psidts`(string, 必填), `http_proxy`(string, 可选)
  - 返回示例：
    ```json
    {"ok":true,"message":"updated"}
    ```
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/gemini/cookies \
      -H "Authorization: Bearer <token>" \
      -F "secure_1psid=<cookie>" -F "secure_1psidts=<cookie_ts>"
    ```

- `GET /deep_insight/gemini/cookies/check`
  - 方法说明：检测 Cookie 是否有效
  - 返回示例：
    ```json
    {"has_cookie":true,"valid":true}
    ```
  - cURL：
    ```bash
    curl -X GET http://127.0.0.1:7657/api/deep_insight/gemini/cookies/check \
      -H "Authorization: Bearer <token>"
    ```

## 处理流程
1. 接收 PDF/PPT，入库创建 Task，落盘到 `services/deep_insight/storage/<task_id>/`。
2. 后台处理：切页为图片 → 以 ZhipuAI (glm-4v-flash) 生成每页 markdown 讲解（json模式、健壮解析）→ Gemini 生成每页 HTML 与单页 PDF。
3. 拼接所有单页 PDF 为合稿 PDF，更新任务状态与结果路径。
4. 支持懒加载：`/pages` 接口分页返回，前端逐页展示或下载。

## 配置 (services/deep_insight/.env)
- 带行级注释示例已提供于 `services/deep_insight/.env`
- 关键项：
  - `DEEP_INSIGHT_ENABLED`、`DEEP_INSIGHT_STORAGE_DIR`
  - `DEEP_INSIGHT_ZHIPUAI_API_KEY`、`DEEP_INSIGHT_ZHIPUAI_VISION_MODEL`
  - `DEEP_INSIGHT_HTML_PROVIDER`、`DEEP_INSIGHT_GEMINI_*`

## 备注
- 未完成任务可在服务重启后继续，处理状态存于数据库与存储目录。
- 数据表：`deep_insight_categories`、`deep_insight_tasks`、`deep_insight_pages`。