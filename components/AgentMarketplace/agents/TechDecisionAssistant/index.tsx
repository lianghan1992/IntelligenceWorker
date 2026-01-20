import React, { useState, useEffect } from 'react';
import { ChartIcon, ArrowLeftIcon, CheckCircleIcon, RefreshIcon, ShieldExclamationIcon, DocumentTextIcon, ClipboardIcon } from '../../../icons';
import { ChatPanel } from './ChatPanel';
import { ReportCanvas } from './ReportCanvas';
import { StepId, TechEvalSessionData, ChatMessage, ReportSection } from './types';
import { getPrompts, streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { StratifyPrompt } from '../../../../types';

interface TechDecisionAssistantProps {
    onBack: () => void;
}

const DEFAULT_SECTIONS: Record<StepId, ReportSection> = {
    init: { id: 'init', title: '初始化', status: 'pending', markdown: '' },
    route: { id: 'route', title: '技术路线', status: 'pending', markdown: '' },
    risk: { id: 'risk', title: '风险评估', status: 'pending', markdown: '' },
    solution: { id: 'solution', title: '解决方案', status: 'pending', markdown: '' },
    compare: { id: 'compare', title: '综合决策', status: 'pending', markdown: '' },
};

const STEPS: StepId[] = ['init', 'route', 'risk', 'solution', 'compare'];
const DISPLAY_STEPS: StepId[] = ['route', 'risk', 'solution', 'compare'];
const SCENARIO_ID = 'd18630c7-d643-4a6d-ab8d-1af1731a35fb';

// 指定用于生成搜索关键词的模型（不计费）
const QUERY_REFINER_MODEL = "zhipu@glm-4-flash-250414";

const RETRIEVAL_CONFIG = {
    threshold: 0.3,
    maxSegmentsPerQuery: 12 // 每个维度的片段数
};

// 定义每个阶段的任务目标，用于指导 AI 生成关键词
const STEP_DEFINITIONS: Record<StepId, { title: string, objective: string }> = {
    init: { title: '初始化', objective: '明确技术定义' },
    route: { title: '技术路线', objective: '深度挖掘该技术的物理原理、代际演进路线，以及当前主流竞品的参数对比' },
    risk: { title: '风险评估', objective: '排查该技术在工程落地时的物理失效模式、极端环境适应性风险及供应链安全隐患' },
    solution: { title: '解决方案', objective: '寻找针对上述风险的行业主流工程对策、优化方案、专利路径及头部企业的解决案例' },
    compare: { title: '综合决策', objective: '全方位对比不同技术路线（Plan A/B/C）的成本、性能上限与量产可行性，给出最终决策建议' },
};

const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1];
    
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section/i);
    if (rawStart !== -1) return cleanText.substring(rawStart);
    return '';
};

// 新增：从 Markdown 中移除 HTML 代码块，防止在正文中显示 raw code
const stripHtmlFromMarkdown = (text: string) => {
    let cleanText = text;
    // 1. 移除 ```html ... ``` 代码块
    cleanText = cleanText.replace(/```html[\s\S]*?```/gi, '');
    // 2. 移除可能的长段 HTML 标签（兜底）
    cleanText = cleanText.replace(/<!DOCTYPE html>[\s\S]*<\/html>/gi, '');
    // 3. 移除独立的 div 块 (针对某些模型直接输出 div 的情况)
    cleanText = cleanText.replace(/<div class="[\s\S]*?<\/div>\s*<\/div>/gi, '');
    return cleanText.trim();
};

const StepIndicator: React.FC<{ status: string, index: number, title: string, isActive: boolean }> = ({ status, index, title, isActive }) => {
    let colorClass = 'bg-slate-100 text-slate-400 border-slate-200';
    if (status === 'done') colorClass = 'bg-green-100 text-green-700 border-green-200';
    else if (status === 'generating' || status === 'review') colorClass = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all whitespace-nowrap ${colorClass} ${isActive ? 'ring-2 ring-indigo-500/30 shadow-sm' : 'opacity-70'}`}>
            <span className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-[10px]">{index + 1}</span>
            <span className="hidden sm:inline">{title}</span>
            {status === 'generating' && <RefreshIcon className="w-3 h-3 animate-spin"/>}
            {status === 'done' && <CheckCircleIcon className="w-3.5 h-3.5"/>}
        </div>
    );
};

const TechDecisionAssistant: React.FC<TechDecisionAssistantProps> = ({ onBack }) => {
    const [data, setData] = useState<TechEvalSessionData>({
        techName: '',
        searchQueries: [],
        currentStepIndex: 0,
        sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
        messages: [{
            id: 'welcome',
            role: 'assistant',
            content: '我是您的技术决策评估助手。请告诉我您想要评估的技术名称（例如：800V碳化硅平台、半固态电池等）。',
            timestamp: Date.now()
        }]
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [promptMap, setPromptMap] = useState<Record<string, StratifyPrompt>>({});
    const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

    const currentStepId = STEPS[data.currentStepIndex];
    const currentSection = data.sections[currentStepId];

    useEffect(() => {
        const loadPrompts = async () => {
            setIsLoadingPrompts(true);
            try {
                const fetchedPrompts = await getPrompts({ scenario_id: SCENARIO_ID });
                const map: Record<string, StratifyPrompt> = {};
                fetchedPrompts.forEach(p => {
                    map[p.name] = p;
                });
                setPromptMap(map);
            } catch (err) {
                console.error("Load prompts failed");
            } finally {
                setIsLoadingPrompts(false);
            }
        };
        loadPrompts();
    }, []);

    const addMessage = (role: 'user' | 'assistant', content: string) => {
        const msg: ChatMessage = { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
        setData(prev => ({ ...prev, messages: [...prev.messages, msg] }));
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

    const getModelConfig = (promptName: string) => {
        const prompt = promptMap[promptName];
        if (!prompt) return null;
        let modelStr = 'zhipu@glm-4-flash'; 
        if (prompt.channel_code && prompt.model_id) {
            modelStr = `${prompt.channel_code}@${prompt.model_id}`;
        }
        return { contentTemplate: prompt.content, model: modelStr };
    };

    /**
     * 使用指定模型 (glm-4-flash-250414) 拆分关键词
     * 不计费
     */
    const refineSearchQueries = async (text: string): Promise<string[]> => {
        const prompt = `你是一个搜索专家。请将以下技术评估需求拆分为 5-8 个独立的语义检索关键词，用于向量数据库检索。
要求：
1. 涵盖技术原理、竞品动态、工程风险、专利信息等维度。
2. 每个关键词应简洁精准。
3. 仅返回 JSON 字符串数组，如: ["关键词1", "关键词2"]

评估需求：${text}`;

        try {
            let buffer = "";
            await streamChatCompletions({
                model: QUERY_REFINER_MODEL,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: 0.1,
                enable_billing: false // 明确指定不计费
            }, (chunk) => {
                if (chunk.content) buffer += chunk.content;
            });

            const match = buffer.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch (e) {
            console.warn("Refine queries failed, fallback to simple split");
        }
        return [text];
    };

    /**
     * 核心逻辑：根据当前步骤动态生成检索关键词
     */
    const generateStepSearchQueries = async (stepId: StepId, techName: string): Promise<string[]> => {
        const stepInfo = STEP_DEFINITIONS[stepId];
        if (!stepInfo) return [techName];

        const prompt = `你是一个汽车行业技术情报专家。正在进行【${techName}】的【${stepInfo.title}】评估。
请根据当前阶段的任务目标，生成 3-5 个具体的搜索引擎检索关键词，用于挖掘深度信息。

当前阶段：${stepInfo.title}
任务重点：${stepInfo.objective}

要求：
1. 关键词必须包含技术名称。
2. 针对性强，例如风险阶段搜“${techName} 失效案例”，对比阶段搜“${techName} vs 竞品”。
3. 仅返回纯 JSON 字符串数组，不要包含任何 Markdown 代码块标记。例如：["关键词1", "关键词2"]`;

        try {
            let buffer = "";
            await streamChatCompletions({
                model: QUERY_REFINER_MODEL, // 使用不计费的 Flash 模型
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: 0.2,
                enable_billing: false
            }, (chunk) => {
                if (chunk.content) buffer += chunk.content;
            });

            // Extract JSON
            const match = buffer.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch (e) {
            console.error("Query generation failed", e);
        }
        // Fallback
        return [`${techName} ${stepInfo.title}`, `${techName} 深度解析`];
    };

    /**
     * 执行批量向量检索并格式化输出
     */
    const executeBatchRetrieval = async (queries: string[]): Promise<string> => {
        if (!queries || queries.length === 0) return "";

        const queryListStr = queries.map(q => `• ${q}`).join('\n');
        addMessage('assistant', `🔍 正在执行情报检索...\n**检索策略**：\n${queryListStr}`);
        
        try {
            const response = await searchSemanticBatchGrouped({ 
                query_texts: queries, 
                similarity_threshold: RETRIEVAL_CONFIG.threshold,
                max_segments_per_query: RETRIEVAL_CONFIG.maxSegmentsPerQuery
            });

            const results = response.results || [];
            let contextString = "";
            let totalSegmentsFound = 0;

            results.forEach(res => {
                const { query_text, items } = res;
                if (items && items.length > 0) {
                    contextString += `\n\n【检索内容：${query_text}】\n`;
                    items.forEach((article: any) => {
                        article.segments.forEach((seg: any) => {
                            totalSegmentsFound++;
                            contextString += `- [来自:${article.source_name}]: ${seg.content}\n`;
                        });
                    });
                }
            });

            if (totalSegmentsFound > 0) {
                 addMessage('assistant', `✅ 检索完成：已捕获 **${totalSegmentsFound}** 条结构化情报。正在进行深度技术评估...`);
                 return contextString;
            } else {
                 addMessage('assistant', `⚠️ 检索结束：未在知识库中找到高相关的技术细节。将基于行业通用知识进行评估。`);
                 return "";
            }
        } catch (e: any) {
            addMessage('assistant', `❌ 检索服务异常: ${e.message}。`);
            return "";
        }
    };

    const runInitStep = async (input: string) => {
        const config = getModelConfig('tech_eval_init');
        if (!config) return;

        setIsGenerating(true);
        updateSection('init', { status: 'generating', usedModel: config.model });
        
        try {
            // 步骤准备：先拆分关键词
            const refinedQueries = await refineSearchQueries(input);
            // 初始化阶段使用通用检索
            const ragContext = await executeBatchRetrieval(refinedQueries);
            
            const augmentedInput = ragContext ? `用户需求: ${input}\n\n参考背景资料:\n${ragContext.slice(0, 4000)}` : input;
            const filledPrompt = config.contentTemplate.replace('{{ user_input }}', augmentedInput);

            let jsonBuffer = "";
            await streamChatCompletions({
                model: QUERY_REFINER_MODEL, // 初始化阶段也使用该免费模型以确保稳定性
                messages: [{ role: 'user', content: filledPrompt }],
                stream: true,
                temperature: 0.1,
                enable_billing: false
            }, (chunk) => {
                if (chunk.content) jsonBuffer += chunk.content;
            });

            let parsed;
            try {
                const match = jsonBuffer.match(/\{[\s\S]*\}/);
                parsed = JSON.parse(match ? match[0] : jsonBuffer);
            } catch (e) {
                parsed = { tech_name: input, search_queries: refinedQueries, definition: "解析失败" };
            }

            setData(prev => ({
                ...prev,
                techName: parsed.tech_name,
                searchQueries: parsed.search_queries || refinedQueries,
                currentStepIndex: 1,
            }));
            
            addMessage('assistant', `评估对象确认：**${parsed.tech_name}**。\n\n启动第一阶段：技术路线深度解析...`);
            setTimeout(() => runGenerationStep('route', parsed.tech_name), 500);

        } catch (e: any) {
            addMessage('assistant', `初始化失败: ${e.message}`);
        } finally {
            setIsGenerating(false);
            updateSection('init', { status: 'done' });
        }
    };

    // Updated: Now accepts minimal args, handles dynamic query generation internally
    const runGenerationStep = async (stepId: StepId, techName: string, userInstructions?: string) => {
        const promptKeyMap: Record<StepId, string> = {
            'init': 'tech_eval_init',
            'route': 'tech_eval_step1_route',
            'risk': 'tech_eval_step2_risk',
            'solution': 'tech_eval_step3_solution',
            'compare': 'tech_eval_step4_compare'
        };

        const config = getModelConfig(promptKeyMap[stepId]);
        if (!config) return;

        setIsGenerating(true);
        updateSection(stepId, { status: 'generating', markdown: '', usedModel: config.model });
        
        try {
            let activeQueries = [];
            
            if (userInstructions) {
                // 如果用户有补充指令，基于指令生成检索词
                activeQueries = await refineSearchQueries(`${techName} ${userInstructions}`);
            } else {
                // 否则，基于当前步骤目标，让模型动态生成检索词
                addMessage('assistant', `🤔 AI 正在思考【${STEP_DEFINITIONS[stepId].title}】阶段的检索策略...`);
                activeQueries = await generateStepSearchQueries(stepId, techName);
            }

            const ragContext = await executeBatchRetrieval(activeQueries);

            const prevSummary = stepId === 'risk' ? data.sections['route'].markdown.slice(0, 1000) :
                                stepId === 'solution' ? data.sections['risk'].markdown.slice(0, 1000) :
                                stepId === 'compare' ? (data.sections['route'].markdown + data.sections['risk'].markdown + data.sections['solution'].markdown).slice(0, 2000) : '';

            let filledPrompt = config.contentTemplate
                .replace(/{{ tech_name }}/g, techName)
                .replace(/{{ retrieved_info }}/g, ragContext || '暂无外部补充资料。')
                .replace(/{{ step1_summary }}/g, prevSummary)
                .replace(/{{ step2_summary }}/g, prevSummary)
                .replace(/{{ steps_summary }}/g, prevSummary);
            
            if (userInstructions) {
                filledPrompt += `\n\n**用户补充要求：**\n${userInstructions}`;
            }

            let fullContent = "";
            await streamChatCompletions({
                model: config.model,
                messages: [{ role: 'user', content: filledPrompt }],
                stream: true,
                temperature: 0.2,
                enable_billing: true
            }, (chunk) => {
                if (chunk.content) {
                    fullContent += chunk.content;
                    const cleanHtml = extractCleanHtml(fullContent);
                    const cleanMarkdown = stripHtmlFromMarkdown(fullContent);
                    updateSection(stepId, { markdown: cleanMarkdown, html: cleanHtml });
                }
            }, undefined, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT);

            updateSection(stepId, { status: 'review' });
            addMessage('assistant', `**${data.sections[stepId].title}** 分析草稿已完成。您可以输入反馈进行微调，或直接确认。`);

        } catch (e: any) {
            addMessage('assistant', `分析失败: ${e.message}`);
            updateSection(stepId, { status: 'pending' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendMessage = (text: string) => {
        addMessage('user', text);
        if (currentStepId === 'init') {
            runInitStep(text);
        } else if (currentSection.status === 'review') {
            runGenerationStep(currentStepId, data.techName, text);
        }
    };

    const handleConfirmStep = () => {
        updateSection(currentStepId, { status: 'done' });
        if (data.currentStepIndex < STEPS.length - 1) {
            const nextIndex = data.currentStepIndex + 1;
            setData(prev => ({ ...prev, currentStepIndex: nextIndex }));
            addMessage('assistant', `阶段已确认。正在启动：**${data.sections[STEPS[nextIndex]].title}**...`);
            setTimeout(() => runGenerationStep(STEPS[nextIndex], data.techName), 500);
        } else {
            addMessage('assistant', `🎉 评估报告全流程已生成。您可以点击上方按钮导出为 Markdown。`);
        }
    };

    const handleRegenerateStep = () => {
        runGenerationStep(currentStepId, data.techName, "请重新审视现有情报，给出更深入的专业分析。");
    };

    // 导出功能
    const handleExportMarkdown = () => {
        let fullMarkdown = `# ${data.techName} - 深度技术评估报告\n\n`;
        
        DISPLAY_STEPS.forEach(stepId => {
            const section = data.sections[stepId];
            if (section.markdown) {
                fullMarkdown += `\n${section.markdown}\n\n`;
                if (section.html) {
                    fullMarkdown += `\n> [图表: ${section.title} 可视化组件已生成]\n\n`;
                }
                fullMarkdown += `---\n`;
            }
        });
        
        navigator.clipboard.writeText(fullMarkdown).then(() => {
            alert("完整报告 Markdown 已复制到剪贴板！");
        }).catch(err => {
            alert("复制失败，请重试");
        });
    };

    if (isLoadingPrompts) return <div className="flex items-center justify-center h-full bg-[#f8fafc]"><RefreshIcon className="w-8 h-8 animate-spin text-indigo-600"/></div>;

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <div className="h-16 px-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors group"><ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" /></button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md"><ChartIcon className="w-4 h-4" /></div>
                        <h1 className="text-lg font-bold text-slate-800">技术决策评估助手</h1>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {data.techName && (
                        <button 
                            onClick={handleExportMarkdown}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            <ClipboardIcon className="w-3.5 h-3.5" /> 导出全文
                        </button>
                    )}
                    <div className="flex gap-2">
                        {DISPLAY_STEPS.map((step, idx) => <StepIndicator key={step} status={data.sections[step].status} index={idx} title={data.sections[step].title} isActive={currentStepId === step} />)}
                    </div>
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 min-w-0 border-r border-slate-200 relative">
                    <ReportCanvas 
                        sections={data.sections} 
                        currentStep={currentStepId} 
                        techName={data.techName} 
                        // 将 updateSection 传递给 ReportCanvas，以便内部 VisualEditor 更新 HTML
                        onUpdateSection={updateSection}
                    />
                </div>
                <div className="w-[450px] flex-shrink-0 bg-white shadow-xl z-10"><ChatPanel messages={data.messages} onSendMessage={handleSendMessage} isGenerating={isGenerating} currentStep={currentStepId} stepStatus={currentSection.status} onConfirmStep={handleConfirmStep} onRegenerateStep={handleRegenerateStep} /></div>
            </div>
        </div>
    );
};

export default TechDecisionAssistant;