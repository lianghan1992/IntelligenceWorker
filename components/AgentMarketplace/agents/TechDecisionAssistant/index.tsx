
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    StepId, TechEvalSessionData, ReportSection, ChatMessage 
} from './types';
import { ChatPanel } from './ChatPanel';
import { ReportCanvas } from './ReportCanvas';
import { 
    getPromptDetail, streamChatCompletions, 
    createSession, getSession, updateSession 
} from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { ArrowLeftIcon, ShieldCheckIcon } from '../../../../components/icons';

// --- Constants ---

const STEP_DEFINITIONS: Record<StepId, { title: string; promptKey: string }> = {
    'init': { title: '初始化', promptKey: 'tech_eval_init' },
    'route': { title: '技术路线分析', promptKey: 'tech_eval_step1_route' },
    'risk': { title: '工程风险评估', promptKey: 'tech_eval_step2_risk' },
    'solution': { title: '解决方案推演', promptKey: 'tech_eval_step3_solution' },
    'compare': { title: '综合决策建议', promptKey: 'tech_eval_step4_compare' }
};

const DEFAULT_MODEL = "xiaomi/mimo-v2-flash:free"; 
const HTML_GENERATION_MODEL = "google/gemini-3-flash-preview";

// Helper to extract clean HTML
const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*/i);
    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        let clean = cleanText.substring(codeBlockMatch.index + codeBlockMatch[0].length);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section|<head|<body/i);
    if (rawStart !== -1) {
        let clean = cleanText.substring(rawStart);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    return '';
};


const TechDecisionAssistant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // --- State ---
    const [data, setData] = useState<TechEvalSessionData>({
        techName: '',
        searchQueries: [],
        currentStepIndex: 0,
        sections: {
            'init': { id: 'init', title: '初始化', status: 'done', markdown: '' },
            'route': { id: 'route', title: '技术路线', status: 'pending', markdown: '' },
            'risk': { id: 'risk', title: '风险评估', status: 'pending', markdown: '' },
            'solution': { id: 'solution', title: '解决方案', status: 'pending', markdown: '' },
            'compare': { id: 'compare', title: '决策建议', status: 'pending', markdown: '' },
        },
        messages: [{
            id: 'welcome',
            role: 'assistant',
            content: '我是您的技术决策评估助手。请告诉我您想要评估的技术名称（例如：800V碳化硅、线控转向...），我将为您生成深度分析报告。',
            timestamp: Date.now()
        }]
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // --- Helpers ---
    
    const getCurrentStepId = (): StepId => {
        const steps: StepId[] = ['init', 'route', 'risk', 'solution', 'compare'];
        return steps[data.currentStepIndex];
    };

    const addMessage = (role: 'user' | 'assistant', content: string, reasoning?: string) => {
        setData(prev => ({
            ...prev,
            messages: [...prev.messages, {
                id: crypto.randomUUID(),
                role: role as any,
                content,
                reasoning,
                timestamp: Date.now()
            }]
        }));
    };

    const updateSection = (stepId: StepId, updates: Partial<ReportSection>) => {
        setData(prev => ({
            ...prev,
            sections: {
                ...prev.sections,
                [stepId]: { ...prev.sections[stepId], ...updates }
            }
        }));
    };

    const ensureSession = async (title: string): Promise<string> => {
        if (sessionId) return sessionId;
        try {
            const sess = await createSession(AGENTS.TECH_DECISION_ASSISTANT, title || '技术评估任务');
            setSessionId(sess.id);
            return sess.id;
        } catch (e) {
            console.error("Failed to create session", e);
            throw e; // Block if session creation fails
        }
    };

    const refreshCost = async (sid?: string) => {
        // Implement cost refresh if needed, usually tied to session update
    };

    // --- Logic: Search Query Generation ---
    const generateStepSearchQueries = async (stepId: StepId, techName: string): Promise<string[]> => {
        const promptText = `
请针对技术主题“${techName}”，生成用于“${STEP_DEFINITIONS[stepId].title}”阶段的搜索引擎关键词。
返回格式要求：JSON数组，包含3-5个关键词。
例如：["${techName} 技术路线", "${techName} 优缺点", "${techName} 竞品对比"]
`;
        let jsonStr = "";
        try {
            await streamChatCompletions({
                model: DEFAULT_MODEL,
                messages: [{ role: 'user', content: promptText }],
                stream: true,
                temperature: 0.7
            }, (chunk) => {
                if (chunk.content) jsonStr += chunk.content;
            });
            
            // Clean markdown
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const queries = JSON.parse(jsonStr);
            return Array.isArray(queries) ? queries : [`${techName} ${STEP_DEFINITIONS[stepId].title}`];
        } catch (e) {
            return [`${techName} ${STEP_DEFINITIONS[stepId].title}`];
        }
    };

    const refineSearchQueries = async (userQuery: string): Promise<string[]> => {
         // Simple passthrough or LLM refinement
         return [userQuery];
    };

    const executeBatchRetrieval = async (queries: string[]): Promise<string> => {
        if (!queries.length) return "";
        addMessage('assistant', `🔎 正在检索: ${queries.join(', ')}...`);
        
        try {
            const res = await searchSemanticBatchGrouped({
                query_texts: queries,
                max_segments_per_query: 3,
                similarity_threshold: 0.4
            });
            
            let context = "";
            (res.results || []).forEach((group: any) => {
                (group.items || []).forEach((item: any) => {
                    context += `[Source: ${item.title}]\n${item.content}\n\n`;
                });
            });
            
            if (!context) return "未找到直接相关资料。";
            return context;
        } catch (e) {
            return "检索失败。";
        }
    };

    const getModelConfig = (key: string) => {
        // For simplicity, hardcoded model or fetch from prompts if needed. 
        // Here we just return a default model config structure.
        return { 
             model: DEFAULT_MODEL,
             contentTemplate: `你是一个汽车技术专家。请撰写关于 {{ tech_name }} 的 {{ step_title }}。
参考资料：
{{ retrieved_info }}

前序内容摘要：
{{ steps_summary }}

要求：
1. 深度分析，逻辑严密。
2. 使用 Markdown 格式。
3. 必须包含 [VISUAL: 标题 | 描述] 标记用于生成图表。
` 
        };
    };

    // --- Phase 2 & Beyond: Generation Logic ---
    const runGenerationStep = async (stepId: StepId, techName: string, userInstructions?: string, preDefinedQueries?: string[]) => {
        const config = getModelConfig(''); // uses default template
        
        const stepTitle = STEP_DEFINITIONS[stepId].title;
        const visualConfig = { model: HTML_GENERATION_MODEL, contentTemplate: 'Visualize the following data: {{ chart_desc }}. Context: {{ context_summary }}' }; // Mock

        setIsGenerating(true);
        updateSection(stepId, { status: 'generating', markdown: '', usedModel: config.model, visuals: {} });
        
        try {
            const activeSid = await ensureSession(techName);
            let activeQueries = preDefinedQueries || [];
            
            if (activeQueries.length === 0 || userInstructions) {
                if (userInstructions) {
                    const refined = await refineSearchQueries(`${techName} ${userInstructions}`);
                    activeQueries = [...activeQueries, ...refined];
                } else {
                    addMessage('assistant', `🤔 AI 正在思考【${stepTitle}】阶段的检索策略...`);
                    const stepQueries = await generateStepSearchQueries(stepId, techName);
                    activeQueries = [...activeQueries, ...stepQueries];
                }
            }

            const ragContext = await executeBatchRetrieval(activeQueries);

            // Context accumulation
            const prevSummary = Object.values(data.sections)
                .filter(s => s.status === 'done' && s.id !== stepId)
                .map(s => s.markdown)
                .join('\n\n')
                .slice(0, 3000); // Limit context

            let filledPrompt = config.contentTemplate
                .replace('{{ tech_name }}', techName)
                .replace('{{ step_title }}', stepTitle)
                .replace('{{ retrieved_info }}', ragContext || '暂无外部补充资料。')
                .replace('{{ steps_summary }}', prevSummary);
            
            // 核心修复：强制追加可视化要求，防止 LLM 在后续轮次中遗忘
            filledPrompt += `\n\n**【排版强制指令】**\n请务必基于本节内容逻辑，在文中插入 **1-3 个** \`[VISUAL: 标题 | 详细描述]\` 标记。不要只输出纯文本，必须图文并茂。`;

            if (userInstructions) filledPrompt += `\n\n**用户补充要求：**\n${userInstructions}`;

            // Use the accumulated history
            const newMessages: any[] = [
                ...(data.llmContext || []),
                { role: 'user', content: filledPrompt }
            ];

            let fullMarkdown = "";
            let fullReasoning = "";
            
            await streamChatCompletions({
                model: config.model,
                messages: newMessages,
                stream: true,
                temperature: 0.2,
                enable_billing: true
            }, (chunk) => {
                if (chunk.reasoning) fullReasoning += chunk.reasoning;
                if (chunk.content) {
                    fullMarkdown += chunk.content;
                    updateSection(stepId, { markdown: fullMarkdown });
                }
            }, () => {
                refreshCost(activeSid);
            }, undefined, activeSid, AGENTS.TECH_DECISION_ASSISTANT);

            // Update history with result
            setData(prev => ({
                ...prev,
                llmContext: [...newMessages, { role: 'assistant', content: fullMarkdown }]
            }));

            // 绘制图表 (独立调用，不进入主 History)
            const visualTagsRegex = /\[VISUAL:\s*(.*?)\s*\|\s*(.*?)\]/g;
            let match;
            const tasks: Array<{ fullTag: string, title: string, desc: string }> = [];

            while ((match = visualTagsRegex.exec(fullMarkdown)) !== null) {
                tasks.push({ fullTag: match[0], title: match[1].trim(), desc: match[2].trim() });
            }

            if (tasks.length > 0) {
                 addMessage('assistant', `🎨 正在绘制 **${tasks.length}** 张可视化图表...`);
                 const visualsMap: Record<string, string> = {};

                 await Promise.all(tasks.map(async (task) => {
                     // HTML Gen Prompt
                     const vizPrompt = `You are a data visualization expert. Create a HTML/Tailwind CSS chart/diagram.
Title: ${task.title}
Description: ${task.desc}
Context: ${fullMarkdown.slice(0, 1000)}

Output only HTML.`;
                    
                     let fullHtml = "";
                     try {
                         // Independent call, fresh context for viz
                         await streamChatCompletions({
                             model: HTML_GENERATION_MODEL, 
                             messages: [{ role: 'system', content: 'You are an expert web developer.' }, { role: 'user', content: vizPrompt }],
                             stream: true,
                             temperature: 0.1, 
                             enable_billing: true
                         }, (chunk) => {
                             if (chunk.content) fullHtml += chunk.content;
                         }, () => {
                             refreshCost(activeSid);
                         }, undefined, activeSid, AGENTS.TECH_DECISION_ASSISTANT);
                         
                         const cleanHtml = extractCleanHtml(fullHtml);
                         if (cleanHtml) visualsMap[task.fullTag] = cleanHtml;
                     } catch (e) {
                         console.error("Visual gen failed", e);
                     }
                 }));
                 updateSection(stepId, { visuals: visualsMap });
            }

            updateSection(stepId, { status: 'review' });
            addMessage('assistant', `**${stepTitle}** 分析草稿已完成。`, fullReasoning);

        } catch (e: any) {
            addMessage('assistant', `分析失败: ${e.message}`);
            updateSection(stepId, { status: 'pending' });
        } finally {
            setIsGenerating(false);
            refreshCost(); 
        }
    };

    // --- Interaction Handlers ---

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isGenerating) return;

        addMessage('user', text);

        // Case 1: Initial Input
        if (data.currentStepIndex === 0 && !data.techName) {
            setData(prev => ({ ...prev, techName: text }));
            // Start Step 1 automatically
            await runGenerationStep('route', text);
            // Move to next step if successful
            setData(prev => ({ ...prev, currentStepIndex: 1 }));
            return;
        }

        // Case 2: Modification during Review
        const currentStep = getCurrentStepId();
        if (data.sections[currentStep].status === 'review') {
            await runGenerationStep(currentStep, data.techName, text);
            return;
        }
    };

    const handleConfirmStep = () => {
        const currentStep = getCurrentStepId();
        updateSection(currentStep, { status: 'done' });
        
        if (data.currentStepIndex < 4) {
            const nextIndex = data.currentStepIndex + 1;
            setData(prev => ({ ...prev, currentStepIndex: nextIndex }));
            const nextStepId = Object.keys(data.sections)[nextIndex] as StepId;
            // Auto start next step? Or wait for user?
            // Let's trigger it automatically
            runGenerationStep(nextStepId, data.techName);
        } else {
            addMessage('assistant', '🎉 所有分析步骤已完成！');
        }
    };

    const handleRegenerateStep = () => {
        const currentStep = getCurrentStepId();
        runGenerationStep(currentStep, data.techName);
    };

    return (
        <div className="flex h-full bg-[#f8fafc]">
            {/* Left: Chat */}
            <div className="w-[450px] flex-shrink-0 border-r border-slate-200 bg-white">
                {/* Custom Header for this agent */}
                <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
                     <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                         <ArrowLeftIcon className="w-5 h-5"/>
                     </button>
                     <div className="font-bold text-slate-800 flex items-center gap-2">
                         <ShieldCheckIcon className="w-5 h-5 text-indigo-600"/>
                         技术决策评估助手
                     </div>
                     <div className="w-8"></div>
                </div>
                
                <ChatPanel 
                    messages={data.messages}
                    onSendMessage={handleSendMessage}
                    isGenerating={isGenerating}
                    currentStep={getCurrentStepId()}
                    stepStatus={data.sections[getCurrentStepId()].status}
                    onConfirmStep={handleConfirmStep}
                    onRegenerateStep={handleRegenerateStep}
                />
            </div>

            {/* Right: Report Canvas */}
            <div className="flex-1 overflow-hidden relative">
                <ReportCanvas 
                    sections={data.sections}
                    currentStep={getCurrentStepId()}
                    techName={data.techName}
                    onUpdateSection={(id, updates) => updateSection(id, updates)}
                />
            </div>
        </div>
    );
};

export default TechDecisionAssistant;
