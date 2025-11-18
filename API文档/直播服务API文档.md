# 直播录制服务 API 文档

说明：所有接口前缀为 `/api`，返回均为 JSON；时间字段统一使用北京时间字符串（`YYYY-MM-DD HH:MM:SS`）。若传入 ISO8601（例如 `2025-11-13T08:00:00Z`），服务端将转换为北京时间字符串保存与返回。

## 总览
- 框架：FastAPI。
- 接口涵盖：任务创建、停止、删除、查询、图片上传/获取、重新抽帧与总结、重新总结、提示词列表。
- 平台页面链接支持：优先使用 `streamlink --stream-url <page_url> best` 解析真实流；失败则回退直接使用页面 URL。
 - 时间与时区：服务端统一使用北京时间（可通过 `TIMEZONE_OFFSET_HOURS` 配置），数据库 `created_at`/`updated_at` 字段以 `YYYY-MM-DD HH:MM:SS`（北京时间）格式存储与返回。

## 状态说明
- `scheduled`（即将开始）：创建任务并设置了 `start_time`，在到达指定时间前处于该状态。
- `listening`（监听中）：未设置 `start_time` 或已到点但直播尚未开始，系统轮询检测直播是否可用。
- `recording`（录制中）：平台页面直播（B站/微博/抖音等）正在录制分段。
- `downloading`（下载中）：直链源（`mp4`/`flv`/`m3u8`）正在下载或二次分段处理。
- `processing`（AI总结）：录制或下载完成，进行抽帧识别与总结，直到生成 `Final_Report.md`。
- `finished`（已结束）：总结完成并写入 `Final_Report.md`。
- `failed`（失败）：在任何阶段发生错误或无法生成最终报告。
- `stopping`（停止中）：收到停止请求，等待ffmpeg/下载进程结束后进入 `processing`，最终到达 `finished` 或 `failed`。

## 接口一览
- 创建任务：`POST /api/tasks`
- 停止任务：`POST /api/tasks/{task_id}/stop`
- 启动任务：`POST /api/tasks/{task_id}/start`
- 删除任务：`DELETE /api/tasks/{task_id}`
- 查询任务状态：`GET /api/tasks/{task_id}`
- 获取总结报告文本：`GET /api/tasks/{task_id}/summary`
- 查询所有任务：`GET /api/tasks?page={n}&page_size={m}`
- 重新抽帧与总结：`POST /api/tasks/{task_id}/reprocess`
- 重新总结：`POST /api/tasks/{task_id}/resummarize`
- 获取可用提示词：`GET /api/prompts`

## 创建任务
- 方法：`POST /api/tasks`
- 描述：提交一个新的录制任务并开始监听。若 `live_url` 为 `.mp4`/`.m3u8` 直链且未显式设置 `direct_download`，系统会自动走直链下载模式。
- 请求体：
```
{
  "live_url": "string",
  "task_name": "string",
  "company": "string",
  "start_time": "2025-11-13 08:00:00",
  "summary_prompt": "default_summary.md",
  "direct_download": true,
  "cover_image_b64": "<base64>"
}
```
- 成功响应：
```
{ "task_id": "...", "status": "listening", "message": "任务创建成功，已开始监听直播状态" }
```
- 说明：`cover_image_b64` 必填；服务端会将图片压缩为 ≤300KB 后以 base64 存储在任务表中。
 - 时间格式与时区：支持 ISO8601（推荐，如 `2025-11-13T08:00:00Z`）；若不带时区将按北京时间偏移（默认 `TIMEZONE_OFFSET_HOURS=8`）处理。

## 停止任务
- 方法：`POST /api/tasks/{task_id}/stop`
- 描述：请求停止录制，系统会结束 ffmpeg，并将最后一个分段文件重命名为完整文件后继续处理剩余步骤。
- 成功响应：
```
{ "task_id": "...", "status": "stopping", "message": "任务停止中" }
```

## 启动任务
- 方法：`POST /api/tasks/{task_id}/start`
- 描述：启动或重新启动一个任务。如果任务状态为 `listening` 或 `failed`，则可以强制启动。
- 成功响应：
```
{ "task_id": "...", "status": "listening", "message": "任务已启动监听/等待录制", "scheduled_at": "2025-11-13 08:00:00", "scheduled": true }
```
- 方法：`POST /api/tasks/{task_id}/stop`
- 描述：请求停止录制，系统会结束 ffmpeg，并将最后一个分段文件重命名为完整文件后继续处理剩余步骤。
- 成功响应：
```
{ "task_id": "...", "status": "stopping", "message": "任务停止中" }
```

## 删除任务
- 方法：`DELETE /api/tasks/{task_id}`
- 描述：停止运行中的任务，删除其在 `recordings/` 下的目录与数据库记录。
- 成功响应：
```
{ "task_id": "...", "status": "deleted", "message": "任务已删除" }
```

## 查询任务状态
- 方法：`GET /api/tasks/{task_id}`
- 描述：返回数据库中该任务的完整记录。
- 成功响应示例：
```
{
  "id": "...",
  "task_name": "...",
  "live_url": "...",
  "start_time": "2025-11-13T08:00:00Z",
  "summary_prompt": "default_summary.md",
  "status": "recording",
  "created_at": "2025-11-13 07:50:00",
  \"updated_at\": \"2025-11-13 07:55:30\,
  "dir": "recordings/25-11-13-示例直播-<task_id>",
  "direct_download": 1,
  "stats_json": {
    "status_text": "[xxxxxxxxxxxx] - 央视新闻：[录制中] 、已录制/抽帧分段: 2/1、已抽帧 14 张图片、检测出 14 张有文字、AI已识别 14 张图片。",
    "start_time": "2025-11-13 08:00:00",
    "mode": "segment",
    "resolved_stream_url": "https://example.com/live.m3u8",
    "ffmpeg_running": true,
    "recorded_segments_total": 2,
    "segments_extracted_done": 1,
    "frames_extracted_total": 14,
    "text_detected_total": 14,
    "unique_images_total": 12,
    "ai_recognized_total": 14,
    "ai_recognized_success_total": 13
  }
}
```

## 查询所有任务
- 方法：`GET /api/tasks?page={n}&page_size={m}&company={name}&start_date={YYYY-MM-DD}`
- 成功响应：
```
{ "total": 132, "page": 1, "page_size": 20, "items": [ { "id": "...", "task_name": "...", "company": "捷途汽车", "status": "recording", "summary_prompt": "...", "dir": "recordings/...", "stats_json": { "recorded_segments_total": 2, "ai_recognized_total": 14, "ai_recognized_success_total": 13 } }, ... ] }
```

## 封面图片
- 仅在创建任务时通过 `cover_image_b64` 上传封面图片；服务端压缩到 ≤300KB 并直接存储在任务表字段 `cover_image_b64`。

## 重新抽帧与总结
- 方法：`POST /api/tasks/{task_id}/reprocess`
- 描述：对已完成录制的视频资源（直链 `original.<ext>` 或分段 `stream_segments/*.ts|*.flv`）重新抽帧、识别并生成总结。
- 请求体（可选）：
```
{ "fps_scale": 1.0, "prompt": "04.峰会论坛总结.md" }
```
- 成功响应：
```
{ "task_id": "...", "status": "finished", "message": "已重新抽帧识别并生成总结", "summary_path": "recordings/YY-MM-DD-task-name-taskid/Final_Report.md" }
```

## 重新总结
- 方法：`POST /api/tasks/{task_id}/resummarize`
- 描述：对已结束或进入处理阶段的任务，重新读取 `Raw_Manuscript.json` 并生成新的 `Final_Report.md`。可通过 `summary_prompt` 参数覆盖默认提示词。
- 请求体（可选）：
```
{ "summary_prompt": "04.峰会论坛总结.md" }
```
- 成功响应：
```
{ "task_id": "...", "status": "finished", "message": "已重新生成总结", "summary_path": "recordings/.../Final_Report.md" }
```

## 获取可用提示词列表
- 方法：`GET /api/prompts`
- 描述：返回 `prompts/` 目录下的可选提示词文件名（排除默认两个：`default_summary.md` 与 `vision_analysis.md`）。
- 成功响应：
```
{ "prompts": ["01.车企发布会摘要总结.md", "04.峰会论坛总结.md", ...] }
```

## 字段与配置
- 字段：
  - `live_url`：直播或平台页面地址。
  - `task_name`：任务名称。
  - `company`：车企名称，必填。
  - `start_time`：ISO 时间；留空则自动监听，一旦直播可用即开始；设置时间则到点启动。
  - `summary_prompt`：总结提示词文件名；默认使用 `prompts/default_summary.md`。
  - `direct_download`：是否直接下载整文件（适用于 `.mp4`、`.m3u8` 直链）。
  - `cover_image_b64`：必填，任务创建时上传封面图片（≤300KB）。
  - `dir`：任务存储目录，如 `recordings/YY-MM-DD-task_name-taskid`。
  - `progress_mb/total_mb/heartbeat`：直链下载模式下的进度与心跳。
- 配置（环境变量）：
  - `SEGMENT_DURATION`：分段录制时长（秒），默认 `30`。
  - `RECORDING_FORMAT`：分段格式，默认 `ts`。
  - `LIVE_END_CONFIRMATION_DELAY_SECONDS`：总结前静默确认时间，默认 `30`。
  - `PROMPTS_DIR`：提示词目录，默认 `prompts`。
  - `DEFAULT_SUMMARY_PROMPT`：默认总结提示词文件名，默认 `default_summary.md`。
  - `VISION_ANALYSIS_PROMPT`：视觉分析提示词文件名，默认 `vision_analysis.md`。
  - `API_PORT`：API 端口，默认 `7651`。
  - `DB_PATH`：SQLite 数据库文件路径，默认 `${PWD}/data/task.db`。
  - `ZHIPU_API_BASE`、`ZHIPU_API_KEYS`、`ZHIPU_MAX_CONCURRENT_REQUESTS`：视觉识别配置。
  - `OPENAI_API_BASE`、`OPENAI_API_KEY`、`SUMMARY_MODEL`、`SUMMARY_TIMEOUT`、`SUMMARY_MAX_RETRIES`：总结配置。
- 服务重启恢复：启动时自动恢复 `listening`/`recording` 任务，尝试继续 `processing` 的总结；`stopping` 将标记为 `failed` 以避免悬挂。

## cURL 示例
- 创建直链下载任务：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "live_url": "https://cdn.example.com/video.mp4",
    "task_name": "直链下载测试",
    "company": "示例车企",
    "direct_download": true,
    "cover_image_b64": "<base64>"
  }'
```
- 创建平台页面任务（B站示例）：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "live_url": "https://live.bilibili.com/8178490",
    "task_name": "B站直播测试",
    "company": "示例车企",
    "summary_prompt": "04.峰会论坛总结.md"
  }'
```
- 查询状态：
```
curl -sS http://127.0.0.1:7651/api/tasks/<task_id>
```
- 停止录制：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/stop
```
- 启动任务：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/start
```
- 重新总结：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/resummarize \
  -H 'Content-Type: application/json' \
  -d '{ "summary_prompt": "04.峰会论坛总结.md" }'
```
- 重新抽帧与总结：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/reprocess \
  -H 'Content-Type: application/json' \
  -d '{ "fps_scale": 1.0, "prompt": "04.峰会论坛总结.md" }'
```
- 图片上传：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/images \
  -H 'Content-Type: application/json' \
  -d '{ "data_b64": "<base64>" }'
```
- 列出图片与获取内容：
```
curl -sS 'http://127.0.0.1:7651/api/tasks/<task_id>/images?page=1&page_size=20'
curl -sS http://127.0.0.1:7651/api/images/<image_id>
```

