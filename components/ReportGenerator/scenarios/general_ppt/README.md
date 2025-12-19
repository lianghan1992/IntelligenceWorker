
# 通用 PPT 生成场景 (General PPT Scenario)

**标识符**: `general_ppt` / `default`
**UUID**: `89dc71e5-ee59-4cbc-9b21-24518176c0b1`

## 概述
该场景实现了一个标准的、线性的工作流，用于生成演示文稿风格的报告。它采用 **“分步向导 (Stepper)”** 的 UI 模式，引导用户按顺序完成各个阶段。

## 工作流阶段

1.  **大纲生成 (`01_generate_outline`)**
    -   分析用户的主题。
    -   生成结构化大纲（JSON 格式）。
    -   支持用户进行微调 (`02_revise_outline`)。

2.  **内容撰写 (`03_generate_content`)**
    -   遍历大纲中定义的每一页。
    -   为每个章节生成详细的 Markdown 内容。
    -   支持单页内容的修改 (`04_revise_content`)。

3.  **排版设计 (`05_generate_html`)**
    -   使用基于 LLM 的排版引擎将 Markdown 内容转换为带有样式的 HTML。
    -   生成最终可用于 PDF 导出的成品。

## 核心组件
- `GeneralPptScenario.tsx`: 主控组件，使用 `MinimalStepper` 进行导航。
- `steps/OutlineStep.tsx`: 处理结构化 JSON 的生成与修改。
- `steps/ContentStep.tsx`: 管理页面撰写队列。
- `steps/LayoutStep.tsx`: 处理从文本到可视化 HTML 的转换。
