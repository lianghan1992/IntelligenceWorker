
# 新技术评估场景 (Tech Evaluation Scenario)

**标识符**: `tech_eval` / `tech_evaluation`
**UUID**: `50de3a59-0502-4202-9ddb-36ceb07fb3f1`

## 概述
该场景实现了一个专门用于评估汽车新技术的专家级工作流。与线性的 `general_ppt` 不同，此场景采用 **“控制台 + 文档 (Console + Document)”** 的布局，模仿专业分析师的工作台。

## 工作流架构

该场景使用 `WorkflowProcessor` 自动执行预定义的思维链（Chain of Thought）协议。

### 处理流水线
1.  **角色与协议设定 (Role & Protocol Setup)**: 初始化 AI Agent，设定特定人设（资深技术分析师）及严格的输出约束。
2.  **数据注入 (Data Ingestion)**: 将参考资料（知识库片段或上传的文件）注入到上下文中。
3.  **触发生成 (Trigger Generation - 多步执行)**:
    -   **步骤 1**: 技术路线分析 (Landscape)。
    -   **步骤 2**: 风险识别 (工程/供应链风险)。
    -   **步骤 3**: 推荐模型 (Plan A/B/C)。
    -   **步骤 4**: 引用来源映射。
4.  **合成 (Synthesis)**: 将所有部分组合成最终连贯的 Markdown 报告。
5.  **视觉渲染 (Visual Rendering)**: 使用专用的视觉模型将 Markdown 转换为高信息密度的杂志级 HTML 报告。

## UI 模式
- **左侧面板**: 输入收集器（目标技术 & 参考资料）。
- **中间面板**: 实时 Agent 控制台（流式思维展示）& Markdown 预览。
- **右侧面板**: 最终 HTML 渲染器（高保真输出）。
