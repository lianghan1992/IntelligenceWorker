# 效率集市 (Efficiency Mart) 架构设计与开发指南

## 1. 概述 (Overview)

**效率集市 (Efficiency Mart)** 是 Auto Insight 平台内的一个插件化、模块化的智能体（Agent）集成中心。它采用 **注册表模式 (Registry Pattern)** 设计，允许开发者在不修改核心框架代码的情况下，通过新增文件夹和配置的方式，快速扩展新的 AI 场景。

## 2. 目录结构 (Directory Structure)

```text
components/EfficiencyMart/
├── README.md                  # 本文档
├── index.tsx                  # 集市主入口 (负责列表展示、搜索、路由分发)
├── types.ts                   # 集市专用类型定义
├── agentRegistry.ts           # 【核心】Agent 注册表 (配置所有 Agent 的元数据)
├── components/                # 集市通用 UI 组件
│   ├── AgentCard.tsx          # 列表卡片
│   ├── AgentWorkspace.tsx     # Agent 运行时的通用容器 (Layout)
│   └── CategoryPill.tsx       # 分类筛选按钮
└── agents/                    # 【核心】所有具体 Agent 的代码存放处
    ├── TextPolisher/          # [示例] 文本润色 Agent
    │   ├── index.tsx          # 业务逻辑主入口
    │   └── config.ts          # 元数据配置
    └── [NewAgentFolder]/      # 新 Agent 文件夹
        ├── index.tsx
        └── config.ts
```

## 3. 核心概念 (Core Concepts)

### 3.1 独立性 (Isolation)
每个 Agent 必须是一个独立的模块，拥有自己的状态管理和视图。原则上，Agent 内部不应直接依赖集市外部的复杂状态，保持“即插即用”的特性。

### 3.2 注册表机制 (Registry)
`agentRegistry.ts` 是连接 Agent 与集市的唯一桥梁。集市不通过硬编码的方式引入 Agent，而是遍历注册表来生成菜单和路由。

### 3.3 统一工作台 (Workspace)
为了保持体验一致性，所有 Agent 的 `index.tsx` 组件在渲染时，都会被包裹在 `AgentWorkspace` 组件中。这个 Wrapper 提供了统一的返回按钮、标题栏和右上角操作区。

## 4. 如何添加一个新的 Agent (How to Add a New Agent)

### 步骤 1: 创建目录
在 `components/EfficiencyMart/agents/` 下创建一个新的文件夹，例如 `MyNewAgent`。

### 步骤 2: 编写主组件
在文件夹内创建 `index.tsx`。该组件接收标准 props（如果需要）。

```tsx
// components/EfficiencyMart/agents/MyNewAgent/index.tsx
import React from 'react';

const MyNewAgent: React.FC = () => {
    return (
        <div className="p-6">
            <h1>我的新 Agent</h1>
            {/* 你的业务逻辑 */}
        </div>
    );
};
export default MyNewAgent;
```

### 步骤 3: 编写配置 (可选但推荐)
虽然可以直接在注册表中写配置，但为了规范，建议在文件夹内创建 `config.ts` 导出元数据。

### 步骤 4: 注册 Agent
打开 `components/EfficiencyMart/agentRegistry.ts`，引入你的组件并添加到列表。

```typescript
import { AgentConfig } from '../types';
// 使用懒加载引入组件
const MyNewAgent = React.lazy(() => import('./agents/MyNewAgent'));

export const agents: AgentConfig[] = [
    // ... 其他 agents
    {
        id: 'my-new-agent',
        name: '我的新功能',
        description: '这是一个很棒的功能描述',
        category: 'efficiency', // 'writing' | 'data' | 'image' | 'dev' | 'analysis'
        tags: ['测试', 'Demo'],
        icon: SomeIconComponent, 
        component: MyNewAgent,
        isNew: true
    }
];
```

**完成！** 刷新页面，你的新 Agent 就会出现在集市列表中。

## 5. UI/UX 规范

*   **色彩**：尽量使用平台主色调 Indigo/Violet (`text-indigo-600`, `bg-indigo-50`)。
*   **交互**：耗时操作（如 AI 生成）必须有 Loading 状态。
*   **响应式**：Agent 界面必须适配移动端，避免固定宽度的布局。
