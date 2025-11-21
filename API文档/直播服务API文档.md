# 直播录制服务 最新 API 文档

说明：所有接口前缀为 `/api`，返回均为 JSON；时间字段统一为北京时间字符串（`YYYY-MM-DD HH:MM:SS`）。

## 接口总览
- 创建任务：`POST /api/tasks`
- 启动任务：`POST /api/tasks/{task_id}/start`
- 停止任务：`POST /api/tasks/{task_id}/stop`
- 删除任务：`DELETE /api/tasks/{task_id}`
- 查询任务状态：`GET /api/tasks/{task_id}`
- 获取总结报告文本：`GET /api/tasks/{task_id}/summary`
- 查询任务列表：`GET /api/tasks`
- 重新抽帧与总结：`POST /api/tasks/{task_id}/reprocess`
- 重新总结：`POST /api/tasks/{task_id}/resummarize`
- 获取可用提示词：`GET /api/prompts`

---

## 创建任务
- 接口介绍：创建一个新的直播录制或直链下载任务。若 `live_url` 为 `.mp4`/`.m3u8`/`.flv`，系统会自动走直链分段下载；否则按平台页面录制。
- 接口方法：`POST /api/tasks`
- 字段说明：
  - `live_url`：字符串，平台页面或直链地址。
  - `task_name`：字符串，任务名称。
  - `company`：字符串，车企名称，必填。
  - `start_time`：字符串，可选，到点后再启动（支持 ISO 格式，服务端统一转北京时间）。
  - `summary_prompt`：字符串，可选，总结提示词文件名（默认 `default_summary.md`）。
  - `direct_download`：布尔，可选，存在直链时是否直接按直链处理（系统可自动判定）。
  - `cover_image_b64`：字符串，必填，创建时上传的封面图片（服务端压缩至 ≤300KB 并存储）。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "live_url": "https://live.bilibili.com/8178490",
    "task_name": "B站直播测试",
    "company": "示例车企",
    "summary_prompt": "04.峰会论坛总结.md",
    "cover_image_b64": "<base64>"
  }'
```
- 返回示例：
```
{ "task_id": "66c0e799-d0e7-4de6-95ea-dbd45022d11a", "status": "listening", "message": "任务创建成功，已开始监听直播状态" }
```

---

## 启动任务
- 接口介绍：启动或重新启动一个任务（仅当任务状态为 `listening` 或 `failed` 时允许）。
- 接口方法：`POST /api/tasks/{task_id}/start`
- 字段说明：无请求体；根据任务已有的 `start_time` 判断是否为计划启动。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/start
```
- 返回示例：
```
{ "task_id": "<task_id>", "status": "listening", "message": "任务已启动监听/等待录制", "scheduled_at": "2025-11-18 10:00:00", "scheduled": true }
```

---

## 停止任务
- 接口介绍：请求停止录制或下载；系统会结束 ffmpeg/下载进程并继续后续收尾。
- 接口方法：`POST /api/tasks/{task_id}/stop`
- 字段说明：无请求体。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/stop
```
- 返回示例：
```
{ "task_id": "<task_id>", "status": "stopping", "message": "任务停止中" }
```
（若当前为 `listening`，则直接返回 `{ "status": "stopped" }`）

---

## 删除任务
- 接口介绍：删除任务及其目录（如存在），并从数据库移除记录。
- 接口方法：`DELETE /api/tasks/{task_id}`
- 字段说明：无请求体。
- curl 示例：
```
curl -sS -X DELETE http://127.0.0.1:7651/api/tasks/<task_id>
```
- 返回示例：
```
{ "task_id": "<task_id>", "status": "deleted", "message": "任务已删除" }
```

---

## 查询任务状态
- 接口介绍：返回某个任务的完整记录（包含 `stats_json` 动态统计信息）。
- 接口方法：`GET /api/tasks/{task_id}`
- 字段说明（响应中的主要字段）：
  - `id`、`task_name`、`live_url`、`company`、`start_time`、`summary_prompt`、`status`、`created_at`、`updated_at`、`dir`、`cover_image_b64`。
  - `stats_json`：对象，任务的动态统计信息与元数据（详见下文“stats_json 字段说明”）。
- curl 示例：
```
curl -sS http://127.0.0.1:7651/api/tasks/<task_id>
```
- 返回示例（截断）：
```
{
  "id": "<task_id>",
  "task_name": "B站直播测试",
  "company": "示例车企",
  "status": "recording",
  "dir": "recordings/25-11-18-示例直播-<task_id>",
  "stats_json": {
    "status_text": "[xxxxxxxxxxxx] - B站直播测试：[录制中] 、已录制/抽帧分段: 2/1、已抽帧 14 张图片、检测出 14 张有文字、AI已识别 14 张图片。",
    "start_time": "2025-11-18 10:00:00",
    "mode": "segment",
    "resolved_stream_url": "https://example.com/live.m3u8",
    "ffmpeg_running": true,
    "recorded_segments_total": 2,
    "segments_extracted_done": 1,
    "frames_extracted_total": 14,
    "text_detected_total": 14,
    "unique_images_total": 12,
    "ai_recognized_total": 14,
    "ai_recognized_success_total": 13,
    "asr_submitted_total": 2,
    "asr_success_total": 2,
    "asr_failed_total": 0,
    "asr_finished": false
  }
}
```

---

## 查询任务列表（重点：stats_json 字段与流程）
- 接口介绍：分页返回所有任务列表，支持按车企与开始日期筛选；每条记录包含动态 `stats_json`。
- 接口方法：`GET /api/tasks`
- 字段说明（查询参数）：
  - `page`：整数，默认 `1`。
  - `page_size`：整数，默认 `20`。
  - `company`：字符串，可选，按车企名称模糊筛选（数据库 ILIKE）。
  - `start_date`：字符串，可选，格式 `YYYY-MM-DD`，筛选指定日期及之后的任务（按 `start_time`）。
- curl 示例：
```
curl -sS 'http://127.0.0.1:7651/api/tasks?page=1&page_size=20&company=捷途汽车&start_date=2025-11-18'
```
- 返回示例（截断）：
```
{
  "total": 132,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "<task_id>",
      "task_name": "示例任务",
      "company": "捷途汽车",
      "status": "recording",
      "dir": "recordings/...",
      "stats_json": {
        "status_text": "[...]",
        "recorded_segments_total": 2,
        "segments_extracted_done": 1,
        "frames_extracted_total": 14,
        "text_detected_total": 14,
        "unique_images_total": 12,
        "ai_recognized_total": 14,
        "ai_recognized_success_total": 13,
        "ffmpeg_running": true,
        "resolved_stream_url": "https://..."
      }
    }
  ]
}
```
- `stats_json` 字段说明：
  - `status_text`：字符串，面向用户的当前状态描述（与任务 `status` 联动）。
  - `start_time`：字符串，任务计划开始时间（北京时间），仅作为元数据展示。
  - `mode`：字符串，`segment`（分段录制）或 `direct`（直链下载）。
  - `resolved_stream_url`：字符串，解析后或最终使用的流地址（可能与页面 URL不同）。
  - `ffmpeg_running`：布尔，ffmpeg 进程是否在运行（录制或分段处理中）。
  - `recorded_segments_total`：整数，已录制/生成的分段文件数量（含进行中 `.part` 的计数推算）。
  - `segments_extracted_done`：整数，已完成抽帧与识别处理的分段数量。
  - `frames_extracted_total`：整数，累计抽取的帧总数。
  - `text_detected_total`：整数，检测到含有文本的帧数量（抽帧后的文本存在判定）。
  - `unique_images_total`：整数，去重后保留下来的含文本图片数量（基于 pHash 与窗口去重）。
  - `ai_recognized_total`：整数，提交至 AI 识别的帧数中返回了文本的数量（总计）。
  - `ai_recognized_success_total`：整数，AI 识别成功的数量（非空文本计数）。
  - `asr_submitted_total`：整数，已提交语音转文字的分段数量（触发提取音频与识别）。
  - `asr_success_total`：整数，语音识别成功并写入 `Raw_Manuscript.md` 的分段数量。
  - `asr_failed_total`：整数，语音识别最终失败或超时跳过的分段数量（重试3次后计入）。
  - `asr_finished`：布尔，汇总阶段是否已结束对 ASR 的等待（达到 `ASR_SUMMARY_WAIT_MAX_SECONDS` 或全部 ASR 任务完成）。
- 流程说明（stats_json 的动态变化）：
  - `scheduled`：到点前，`status_text` 显示“即将开始”，`ffmpeg_running=false`，计数均为零。
  - `listening`：轮询直播可用性，`ffmpeg_running=false`，计数基本为零；当到达 `start_time` 或直播可用时进入下阶段。
  - `recording`：平台页面录制，`ffmpeg_running=true`，`recorded_segments_total` 持续增加；抽帧与识别完成后 `segments_extracted_done`、`frames_extracted_total`、`text_detected_total`、`ai_recognized_total` 等累计增长。
  - `downloading`：直链源分段下载或拼接，`ffmpeg_running=true`（分段场景）或 `false`（HTTP Range 下载场景）；完成后进入 `processing`。
  - `processing`：ffmpeg 停止，进行总结生成，`ffmpeg_running=false`；若开启 ASR（`ASR_ENABLE=true`），在总结前对 ASR 进行有限等待（由 `ASR_SUMMARY_WAIT_MAX_SECONDS` 控制），等待结束后将 `asr_finished` 置为 `true` 并生成总结；最终进入 `finished` 或 `failed`。
  - 当 ASR 失败或超时时，系统不会阻塞总结；对应计数将体现在 `asr_failed_total` 中，且 `Raw_Manuscript.md` 可不写入该分段的 ASR 段落。
  - 注意：`stats_json` 不包含 `status` 字段，状态以任务记录的 `status` 字段为准；用于展示的 `status_text` 会同步刷新。

---

## 获取原始识别稿（Raw_Manuscript.md）
- 接口介绍：返回任务的原始识别稿（逐帧识别结果汇总）。若文件不存在则返回 404。
- 接口方法：`GET /api/tasks/{task_id}/manuscript`
- 字段说明：无请求体。
- curl 示例：
```
curl -sS http://127.0.0.1:7651/api/tasks/<task_id>/manuscript
```
- 返回示例（`text/plain; charset=utf-8`）：
```
frames:1\nconfidence:medium\nraw_text:......\n---\nframes:2\nconfidence:high\nraw_text:......\n---\n
```

## 获取最终报告文本（Final_Report.md）
- 接口介绍：返回任务生成的最终总结报告文本。若未生成则返回 404。
- 接口方法：`GET /api/tasks/{task_id}/summary`
- 字段说明：无请求体。
- curl 示例：
```
curl -sS http://127.0.0.1:7651/api/tasks/<task_id>/summary
```
- 返回示例（`text/plain; charset=utf-8`）：
```
车企发布会摘要：...
```

---

## 重新抽帧与总结
- 接口介绍：对直链原始文件或分段文件重新抽帧识别并生成新的总结报告。
- 接口方法：`POST /api/tasks/{task_id}/reprocess`
- 字段说明（请求体，可选）：
  - `fps_scale`：浮点，抽帧密度系数。
  - `prompt`：字符串，视觉分析提示词文件名。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/reprocess \
  -H 'Content-Type: application/json' \
  -d '{ "fps_scale": 1.0, "prompt": "04.峰会论坛总结.md" }'
```
- 返回示例：
```
{ "task_id": "<task_id>", "status": "finished", "message": "已重新抽帧识别并生成总结", "summary_path": "recordings/.../Final_Report.md" }
```

---

## 重新总结
- 接口介绍：基于已存在的 `Raw_Manuscript.md` 重新生成 `Final_Report.md`。
- 接口方法：`POST /api/tasks/{task_id}/resummarize`
- 字段说明（请求体，可选）：
  - `summary_prompt`：字符串，新的总结提示词文件名。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7651/api/tasks/<task_id>/resummarize \
  -H 'Content-Type: application/json' \
  -d '{ "summary_prompt": "04.峰会论坛总结.md" }'
```
- 返回示例：
```
{ "task_id": "<task_id>", "status": "finished", "message": "已重新生成总结", "summary_path": "recordings/.../Final_Report.md" }
```

---

## 获取可用提示词
- 接口介绍：返回 `prompts/` 目录下可选提示词文件名（已排除默认两个：`default_summary.md` 与 `vision_analysis.md`）。
- 接口方法：`GET /api/prompts`
- 字段说明：无请求体。
- curl 示例：
```
curl -sS http://127.0.0.1:7651/api/prompts
```
- 返回示例：
```
{ "prompts": ["01.车企发布会摘要总结.md", "04.峰会论坛总结.md", ...] }
```

---

## 状态枚举与文案
- `scheduled`（即将开始）：设置了 `start_time` 且未到达。
- `listening`（监听中）：未设置开始时间或已到点但直播未开始，系统轮询。
- `recording`（录制中）：平台页面直播分段录制。
- `downloading`（下载中）：直链源下载或二次分段处理。
- `processing`（AI总结）：抽帧识别与总结阶段。
- `finished`（已结束）：总结完成并生成 `Final_Report.md`。
- `failed`（失败）：异常或无法生成最终报告。
- `stopping`（停止中）：收到停止请求，等待进程结束后进入处理阶段并最终结束。

（在中国大陆环境如需代理，可设置 `HTTP_PROXY=127.0.0.1:20171`、`HTTPS_PROXY=127.0.0.1:20171`、`ALL_PROXY=socks5://127.0.0.1:20170` 以提高访问流媒体与第三方 AI 服务的稳定性。）