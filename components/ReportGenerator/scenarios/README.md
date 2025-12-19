
# 场景集成指南 (Scenario Integration Guide)

本目录包含了各种 AI 报告生成场景的前端实现。每个场景都是一个独立的 React 组件，负责编排用户与 StratifyAI 后端的交互流程。

## 目录结构

```
scenarios/
├── registry.ts           # 中央注册表，将场景 ID 映射到组件
├── README.md             # 本指南
├── general_ppt/          # "通用 PPT 生成" 场景实现
│   ├── index.tsx         # (可选) 统一导出
│   ├── GeneralPptScenario.tsx # 主入口组件
│   ├── README.md         # 场景特定文档
│   └── steps/            # 特定工作流步骤的子组件
└── tech_eval/            # "新技术评估" 场景实现
    ├── TechEvalScenario.tsx
    ├── README.md
    └── ...
```

## 如何创建新场景

### 1. 创建场景目录
在 `scenarios/` 下创建一个新文件夹（例如 `market_analysis`）。

### 2. 实现场景组件
创建一个主组件（例如 `MarketAnalysisScenario.tsx`），该组件需实现 `ScenarioProps` 接口。

```typescript
import React from 'react';
import { ScenarioProps } from '../registry';

export const MarketAnalysisScenario: React.FC<ScenarioProps> = ({ 
    taskId,      // 后端创建的 StratifyTask ID
    topic,       // 用户的初始输入
    scenario,    // 场景的 key/name
    sessionId,   // LLM 会话 ID
    context,     // 附带的文件或上下文
    onComplete   // 场景结束时的回调
}) => {
    // 在此处实现您的工作流逻辑。
    // 使用 `api/stratify` 中的 `streamGenerate` 与 LLM 进行流式交互。
    
    return <div>我的自定义场景工作流</div>;
};
```

### 3. 注册场景
将您的组件添加到 `registry.ts` 中的 `SCENARIO_REGISTRY`。请确保同时映射数据库 UUID（如果已知）和唯一的字符串标识符（name）。

```typescript
import { MarketAnalysisScenario } from './market_analysis/MarketAnalysisScenario';

export const SCENARIO_REGISTRY = {
    // ... 现有场景
    'market_analysis': MarketAnalysisScenario,
    'uuid-from-database': MarketAnalysisScenario
};
```

### 4. 后端配置
确保该场景已存在于后端数据库中（通过 **后台管理 > StratifyAI > 场景配置** 进行管理），且 `name` 键值匹配。后端控制该场景可用的提示词文件（Prompt Files）。

## 开发最佳实践
- **状态管理**：将复杂的状态逻辑保持在场景文件夹内部，不要污染全局状态。
- **流式响应**：使用 `streamGenerate` 处理所有 LLM 调用，以支持实时的 Token 流式输出。
- **模块化**：将复杂的工作流（例如：大纲 -> 内容 -> 审查）拆分为 `steps/` 目录下的子组件。
