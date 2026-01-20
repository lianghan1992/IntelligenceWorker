import React, { useState, useEffect } from 'react';
import { ChartIcon, ArrowLeftIcon, CheckCircleIcon, RefreshIcon, ShieldExclamationIcon } from '../../../icons';
import { ChatPanel } from './ChatPanel';
import { ReportCanvas } from './ReportCanvas';
import { StepId, TechEvalSessionData, ChatMessage, ReportSection } from './types';
import { getPrompts, streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { StratifyPrompt } from '../../../../types';

interface TechDecisionAssistantProps {
    onBack?: () => void;
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

const RETRIEVAL_CONFIG = {
    threshold: 0.3,
    maxSegmentsPerQuery: 15 // 每个维度的片段数，批量检索总数约 40-100
};

const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1];
    
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section/i);
    if (rawStart !== -1) return cleanText.substring(rawStart);
    return '';
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
    const [promptError, setPromptError] = useState<string | null>(null);

    // 定义派生状态以修复 Cannot find name 'currentStepId' 和 'currentSection' 错误
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
            } catch (err: any) {
                setPromptError("加载评估模型配置失败。");
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

    // --- Core Logic: Execute Batch Retrieval and Notify User ---
    const executeBatchRetrieval = async (queries: string[]): Promise<string> => {
        if (!queries || queries.length === 0) return "";

        // 1. Notify User: Start Batch Search
        const queryListStr = queries.map(q => `• ${q}`).join('\n');
        addMessage('assistant', `🔍 正在执行多维深度检索 (Batch Mode)...\n检索维度清单：\n${queryListStr}`);
        
        try {
            const response = await searchSemanticBatchGrouped({ 
                query_texts: queries, 
                similarity_threshold: RETRIEVAL_CONFIG.threshold,
                max_segments_per_query: RETRIEVAL_CONFIG.maxSegmentsPerQuery
            });

            const results = response.results || [];
            
            // 2. Format Context for LLM with clear classification
            let contextString = "";
            let totalSegmentsFound = 0;

            results.forEach(res => {
                const { query_text, items } = res;
                if (items && items.length > 0) {
                    contextString += `\n\n【检索主题：${query_text}】\n`;
                    items.forEach((article: any) => {
                        article.segments.forEach((seg: any, idx: number) => {
                            totalSegmentsFound++;
                            contextString += `资料[来自:${article.source_name}]: ${seg.content}\n`;
                        });
                    });
                }
            });

            // 3. Notify User: Summary of findings
            if (totalSegmentsFound > 0) {
                 addMessage('assistant', `✅ 批量检索完成：已在知识库中捕获 **${totalSegmentsFound}** 个高价值情报片段。正在基于分类数据进行专业分析...`);
                 return contextString;
            } else {
                 addMessage('assistant', `⚠️ 批量检索结束：当前知识库中未找到足够匹配的细节（Threshold: ${RETRIEVAL_CONFIG.threshold}）。将结合行业常识生成评估建议。`);
                 return "";
            }
        } catch (e: any) {
            addMessage('assistant', `❌ 批量检索服务异常: ${e.message}。`);
            return "";
        }
    };

    const runInitStep = async (input: string) => {
        const config = getModelConfig('tech_eval_init');
        if (!config) {
            addMessage('assistant', `❌ 错误：未找到提示词配置 [tech_eval_init]。`);
            return;
        }

        setIsGenerating(true);
        updateSection('init', { status: 'generating', usedModel: config.model });
        
        try {
            // Init phase still uses broad single retrieval to anchor tech name
            const ragContext = await executeBatchRetrieval([input]);
            const augmentedInput = ragContext ? `用户需求: ${input}\n\n参考背景资料:\n${ragContext.slice(0, 3000)}` : input;
            const filledPrompt = config.contentTemplate.replace('{{ user_input }}', augmentedInput);

            let jsonBuffer = "";
            await streamChatCompletions({
                model: config.model,
                messages: [{ role: 'user', content: filledPrompt }],
                stream: true,
                temperature: 0.1
            }, (chunk) => {
                if (chunk.content) jsonBuffer += chunk.content;
            });

            let parsed;
            try {
                const match = jsonBuffer.match(/```json([\s\S]*?)```/) || jsonBuffer.match(/\{[\s\S]*\}/);
                const cleanJson = match ? match[0].replace(/```json/g, '').replace(/```/g, '') : jsonBuffer;
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                parsed = { tech_name: input, search_queries: [input], definition: "自动解析失败。" };
            }

            setData(prev => ({
                ...prev,
                techName: parsed.tech_name,
                techDefinition: parsed.definition,
                searchQueries: parsed.search_queries || [parsed.tech_name],
                currentStepIndex: 1,
            }));
            
            addMessage('assistant', `已确认评估对象：**${parsed.tech_name}**。\n\n正在启动第一阶段分析：技术路线与竞品锚定...`);
            setTimeout(() => runGenerationStep('route', parsed.tech_name, parsed.search_queries), 500);

        } catch (e: any) {
            addMessage('assistant', `初始化失败: ${e.message}`);
        } finally {
            setIsGenerating(false);
            updateSection('init', { status: 'done' });
        }
    };

    const runGenerationStep = async (stepId: StepId, techName: string, queries: string[], userInstructions?: string) => {
        const promptKeyMap: Record<StepId, string> = {
            'init': 'tech_eval_init',
            'route': 'tech_eval_step1_route',
            'risk': 'tech_eval_step2_risk',
            'solution': 'tech_eval_step3_solution',
            'compare': 'tech_eval_step4_compare'
        };

        const config = getModelConfig(promptKeyMap[stepId]);
        if (!config) {
            addMessage('assistant', `❌ 错误：未找到提示词配置 [${promptKeyMap[stepId]}]。`);
            return;
        }

        setIsGenerating(true);
        updateSection(stepId, { status: 'generating', markdown: '', usedModel: config.model });
        
        try {
            // Execute Batch Retrieval based on AI-generated search_queries
            let ragContext = "";
            if (!userInstructions) {
                // Use the structured queries generated during init phase
                ragContext = await executeBatchRetrieval(queries);
            } else {
                 ragContext = await executeBatchRetrieval([techName, userInstructions]);
            }

            const prevSummary = stepId === 'risk' ? data.sections['route'].markdown.slice(0, 500) :
                                stepId === 'solution' ? data.sections['risk'].markdown.slice(0, 500) :
                                stepId === 'compare' ? (data.sections['route'].markdown + data.sections['risk'].markdown + data.sections['solution'].markdown).slice(0, 1000) : '';

            let filledPrompt = config.contentTemplate
                .replace(/{{ tech_name }}/g, techName)
                .replace(/{{ retrieved_info }}/g, ragContext || '暂无更多外部资料。')
                .replace(/{{ step1_summary }}/g, prevSummary)
                .replace(/{{ step2_summary }}/g, prevSummary)
                .replace(/{{ steps_summary }}/g, prevSummary);
            
            if (userInstructions) {
                filledPrompt += `\n\n**用户补充指令：**\n${userInstructions}`;
            }

            let fullContent = "";
            await streamChatCompletions({
                model: config.model,
                messages: [{ role: 'user', content: filledPrompt }],
                stream: true,
                temperature: 0.2
            }, (chunk) => {
                if (chunk.content) {
                    fullContent += chunk.content;
                    const cleanHtml = extractCleanHtml(fullContent);
                    updateSection(stepId, { markdown: fullContent, html: cleanHtml });
                }
            }, undefined, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT);

            updateSection(stepId, { status: 'review' });
            addMessage('assistant', `**${data.sections[stepId].title}** 分析草稿已生成。请查阅。`);

        } catch (e: any) {
            addMessage('assistant', `生成失败: ${e.message}`);
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
            runGenerationStep(currentStepId, data.techName, data.searchQueries, text);
        }
    };

    const handleConfirmStep = () => {
        updateSection(currentStepId, { status: 'done' });
        if (data.currentStepIndex < STEPS.length - 1) {
            const nextIndex = data.currentStepIndex + 1;
            setData(prev => ({ ...prev, currentStepIndex: nextIndex }));
            addMessage('assistant', `阶段确认。启动：**${data.sections[STEPS[nextIndex]].title}**...`);
            setTimeout(() => runGenerationStep(STEPS[nextIndex], data.techName, data.searchQueries), 500);
        } else {
            addMessage('assistant', `🎉 恭喜！全流程评估已完成。`);
        }
    };

    const handleRegenerateStep = () => {
        runGenerationStep(currentStepId, data.techName, data.searchQueries, "请重新生成本节内容，尝试更深入的维度。");
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
                    {data.techName && <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"><span className="text-xs text-slate-500 font-medium">评估对象:</span><span className="text-sm font-bold text-slate-800">{data.techName}</span></div>}
                    <div className="flex gap-2">
                        {DISPLAY_STEPS.map((step, idx) => <StepIndicator key={step} status={data.sections[step].status} index={idx} title={data.sections[step].title} isActive={currentStepId === step} />)}
                    </div>
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 min-w-0 border-r border-slate-200 relative"><ReportCanvas sections={data.sections} currentStep={currentStepId} techName={data.techName} /></div>
                <div className="w-[450px] flex-shrink-0 bg-white shadow-xl z-10"><ChatPanel messages={data.messages} onSendMessage={handleSendMessage} isGenerating={isGenerating} currentStep={currentStepId} stepStatus={currentSection.status} onConfirmStep={handleConfirmStep} onRegenerateStep={handleRegenerateStep} /></div>
            </div>
        </div>
    );
};

export default TechDecisionAssistant;