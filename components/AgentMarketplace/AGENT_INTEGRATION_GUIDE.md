
# 效率集市 Agent 集成指南

Auto Insight 的效率集市是一个模块化平台，允许快速集成独立的 React 应用（Agent）。

## 1. 目录结构

所有 Agent 相关的代码都位于 `components/AgentMarketplace` 目录下。

```
components/AgentMarketplace/
├── index.tsx              # 主控制器 (不可修改)
├── types.ts               # 类型定义
├── registry.tsx           # 注册表 (在此处注册新 Agent)
├── MarketHome.tsx         # 集市首页
├── AgentLayout.tsx        # 通用 Layout
└── agents/                # 【你的工作区】所有具体 Agent 放在这里
    ├── MyNewAgent/
    │   ├── index.tsx      # Agent 入口组件
    │   └── ...
```

## 2. 如何添加一个新的 Agent

### 步骤 1: 创建组件
在 `components/AgentMarketplace/agents/` 下创建一个新文件夹，例如 `JsonFormatter`。
创建 `index.tsx` 并导出你的组件。

**注意：**
*   Agent 组件应该是自包含的。
*   你可以使用项目现有的 UI 组件（如 icons），也可以定义自己的样式。
*   组件**默认**会以此页面的全屏高度渲染，因此请确保处理好滚动条（使用 `flex-1 overflow-auto` 等）。

```tsx
// components/AgentMarketplace/agents/JsonFormatter/index.tsx
import React from 'react';

const JsonFormatter: React.FC = () => {
    return (
        <div className="p-6 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold">JSON 格式化工具</h2>
            {/* 你的业务逻辑 */}
        </div>
    );
};

export default JsonFormatter;
```

### 步骤 2: 注册 Agent
打开 `components/AgentMarketplace/registry.tsx`。
1.  使用 `React.lazy` 导入你的组件。
2.  在 `AGENT_REGISTRY` 数组中添加配置对象。

```tsx
// components/AgentMarketplace/registry.tsx
import { AgentConfig } from './types';
import { CodeIcon } from '../../icons'; // 使用现有图标或导入新图标

// 懒加载你的组件
const JsonFormatter = React.lazy(() => import('./agents/JsonFormatter'));

export const AGENT_REGISTRY: AgentConfig[] = [
    // ... 其他 agent
    {
        id: 'json-formatter', // 唯一 ID
        name: 'JSON 格式化',
        description: '简单的 JSON 数据美化与验证工具。',
        category: '开发工具', // 可选值见 types.ts
        icon: CodeIcon,
        component: JsonFormatter,
        tags: ['JSON', 'DevTools']
    }
];
```

### 步骤 3: 验证
保存文件。并在浏览器中访问“效率集市”。你应该能看到新卡片，点击即可进入你的 Agent 页面。

## 3. 设计规范

*   **独立性**: 尽量减少对外部状态的依赖。Agent 应该像是一个嵌入的微应用。
*   **样式**: 保持与 Auto Insight 整体风格一致（使用 Tailwind CSS, slate-50 背景等）。
*   **响应式**: 确保在移动端也能正常显示。
