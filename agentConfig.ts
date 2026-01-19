
/**
 * 全局智能体 (Agent) 配置表
 * 
 * 此文件是前端应用中所有智能体 ID 的唯一事实来源 (Single Source of Truth)。
 * 
 * --- 架构说明 ---
 * 1. 与后端的对应关系：
 *    这里的 UUID 必须与后端数据库或配置中定义的 Agent ID 严格一致。
 *    后端依据此 ID 识别用户请求的是哪个功能模块，从而加载对应的：
 *    - 提示词模板 (System Prompts)
 *    - 模型路由策略 (Model Routing & Channels)
 *    - 计费与定价策略 (Pricing & Billing)
 *    - 上下文记忆配置 (Memory Settings)
 * 
 * 2. 数据维护规范：
 *    - 统一使用 UUID v4 格式，确保全局唯一性，避免字符串冲突。
 *    - 禁止使用 "new-tech" 等语义化字符串作为 ID，以免后续重名或重构时造成数据迁移困难。
 *    - 开发新 Agent 流程：后端注册并生成 UUID -> 在此文件添加配置 -> 前端组件引用。
 */

export const AGENTS = {
    /**
     * AI 深度研报生成器
     * 位置：主页核心入口 / "AI 报告生成" 模块
     * 功能：生成长篇行业研究报告，包含大纲生成、内容撰写、HTML 幻灯片渲染。
     */
    REPORT_GENERATOR: '212fb1f7-9b92-42b9-a315-d05addaebcae',
    
    /**
     * 新技术识别助手
     * 位置：效率集市 -> 新技术识别
     * 功能：上传 CSV/Markdown，提取创新技术点，生成四象限分析矩阵。
     */
    NEW_TECH_IDENTIFIER: '9f8c6b3a-1d4e-4b5a-9c8d-7e6f5a4b3c2d',
    
    /**
     * 战略副驾驶 (Chat Copilot)
     * 位置：AI 情报洞察 (Cockpit) 右侧对话栏
     * 功能：基于 RAG (检索增强生成) 的问答助手，支持互联网搜索和知识库检索。
     */
    STRATEGIC_COPILOT: '3a2b1c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',

    /**
     * 技术决策评估助手
     * 位置：效率集市
     * 功能：分步式深度技术评估专家，生成图文并茂的评估报告。
     */
    TECH_DECISION_ASSISTANT: 'd18630c7-d643-4a6d-ab8d-1af1731a35fb',
} as const;

/**
 * Agent 显示名称映射
 * 用于前端日志显示、计费账单展示等非关键业务逻辑。
 */
export const AGENT_NAMES = {
    [AGENTS.REPORT_GENERATOR]: 'AI报告生成',
    [AGENTS.NEW_TECH_IDENTIFIER]: '新技术识别',
    [AGENTS.STRATEGIC_COPILOT]: 'AI情报助手',
    [AGENTS.TECH_DECISION_ASSISTANT]: '技术决策评估',
};
