import React, { useState, useEffect } from 'react';
import { ChartIcon, ArrowLeftIcon, CheckCircleIcon, RefreshIcon, ShieldExclamationIcon, ServerIcon } from '../../../icons';
import { ChatPanel } from './ChatPanel';
import { ReportCanvas } from './ReportCanvas';
import { StepId, TechEvalSessionData, ChatMessage, ReportSection } from './types';
import { getPrompts, streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticSegments } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { StratifyPrompt } from '../../../../types';

interface TechDecisionAssistantProps {
    onBack?: () => void;
}

// FIX: 'init' status should be 'pending' to allow input
const DEFAULT_SECTIONS: Record<StepId, ReportSection> = {
    init: { id: 'init', title: '初始化', status: 'pending', markdown: '' },
    route: { id: 'route', title: '技术路线', status: 'pending', markdown: '' },
    risk: { id: 'risk', title: '风险评估', status: 'pending', markdown: '' },
    solution: { id: 'solution', title: '解决方案', status: 'pending', markdown: '' },
    compare: { id: 'compare', title: '综合决策', status: 'pending', markdown: '' },
};

const STEPS: StepId[] = ['init', 'route', 'risk', 'solution', 'compare'];
// Display steps (excluding init)
const DISPLAY_STEPS: StepId[] = ['route', 'risk', 'solution', 'compare'];

// The Scenario ID provided by user
const SCENARIO_ID = 'd18630c7-d643-4a6d-ab8d-1af1731a35fb';

// --- Configuration for Retrieval ---
const RETRIEVAL_CONFIG = {
    pageSize: 40,        // User requested 40 segments
    threshold: 0.3,      // Similarity threshold
    maxSegments: 40
};

const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1];
    
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section/i);
    if (rawStart !== -1) return cleanText.substring(rawStart);
    return '';
};

// Component for Step Indicator
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

// 小胶囊模型标签
const ModelBadge: React.FC<{ promptName: string; prompts: Record<string, StratifyPrompt> }> = ({ promptName, prompts }) => {
    const p = prompts[promptName];
    if (!p || (!p.channel_code && !p.model_id)) return null;
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 font-mono text-[9px] font-bold" title={`${promptName} 所用模型`}>
            <ServerIcon className="w-2.5 h-2.5" />
            {p.channel_code}@{p.model_id}
        </span>
    );
};

const TechDecisionAssistant: React.FC<TechDecisionAssistantProps> = ({ onBack }) => {
    // Corrected object member initialization for useState: removed '?: string' which is not valid syntax in an object literal
    const [data, setData] = useState<TechEvalSessionData>({
        techName: '',
        techDefinition: '',
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

    const currentStepId = STEPS[data.currentStepIndex];
    const currentSection = data.sections[currentStepId];

    // --- Load Prompts on Mount ---
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
                console.error("Failed to load prompts:", err);
                setPromptError("加载评估模型配置失败，请检查网络或联系管理员。");
            } finally {
                setIsLoadingPrompts(false);
            }
        };
        loadPrompts();
    }, []);

    // Helper: Add Message
    const addMessage = (role: 'user' | 'assistant', content: string) => {
        const msg: ChatMessage = { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
        setData(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    };

    // Helper: Update Section
    const updateSection = (stepId: StepId, updates: Partial<ReportSection>) => {
        setData(prev => ({
            ...prev,
            sections: {
                ...prev.sections,
                [stepId]: { ...prev.sections[stepId], ...updates }
            }
        }));
    };

    // --- Retrieve Model Config from Prompt ---
    const getModelConfig = (promptName: string) => {
        const prompt = promptMap[promptName];
        if (!prompt) return null;
        
        // Construct model string "channel@model" if both exist
        // Default fallback if not configured in prompt
        let modelStr = 'zhipu@glm-4.5-flash'; 
        if (prompt.channel_code && prompt.model_id) {
            modelStr = `${prompt.channel_code}@${prompt.model_id}`;
        }

        return {
            contentTemplate: prompt.content,
            model: modelStr
        };
    };

    // --- Helper: Execute Vector Search and Notify User ---
    const executeRetrieval = async (queryStr: string): Promise<string> => {
        // 1. Notify User: Start Search
        addMessage('assistant', `🔍 正在检索本地知识库向量 (Top ${RETRIEVAL_CONFIG.pageSize})...\n关键词: ${queryStr}`);
        
        try {
            const searchRes = await searchSemanticSegments({ 
                query_text: queryStr, 
                page: 1, 
                page_size: RETRIEVAL_CONFIG.pageSize, // Explicitly requesting 40
                similarity_threshold: RETRIEVAL_CONFIG.threshold
            });

            const items = searchRes.items || [];
            
            // 2. Notify User: Results found
            if (items.length > 0) {
                 addMessage('assistant', `✅ 检索完成：共找到 **${items.length}** 条相关分段。正在基于资料生成分析...`);
                 // Return formatted context
                 return items.map((it, idx) => `[资料${idx+1}] ${it.title}: ${it.content}`).join('\n\n');
            } else {
                 addMessage('assistant', `⚠️ 检索完成：未找到高度相关的本地资料 (Threshold: ${RETRIEVAL_CONFIG.threshold})。将基于模型通用知识生成。`);
                 return "";
            }
        } catch (e: any) {
            console.error("Vector search failed:", e);
            addMessage('assistant', `❌ 向量检索服务异常: ${e.message}。将尝试直接生成。`);
            return "";
        }
    };

    // --- STEP 0: Initialization ---
    const runInitStep = async (input: string) => {
        const config = getModelConfig('tech_eval_init');
        if (!config) {
            addMessage('assistant', `❌ 错误：未找到提示词配置 [tech_eval_init]。请确认后台是否已配置该提示词。`);
            return;
        }

        setIsGenerating(true);
        updateSection('init', { status: 'generating' });
        
        try {
            // [NEW] 1. Perform Retrieval even for Init (to better understand valid tech names)
            // Even though output is JSON, context helps correct tech names from local DB
            const ragContext = await executeRetrieval(input);
            
            // Inject context manually if the prompt template supports it, or append to input
            // Usually init prompt is strict JSON, so we append context as "Background Info"
            const augmentedInput = ragContext 
                ? `用户需求: ${input}\n\n参考背景资料:\n${ragContext.slice(0, 3000)}` // Limit context for init to avoid noise
                : input;

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

            // Parse JSON
            let parsed;
            try {
                // Try to find JSON block
                const match = jsonBuffer.match(/```json([\s\S]*?)```/) || jsonBuffer.match(/\{[\s\S]*\}/);
                const cleanJson = match ? match[0].replace(/```json/g, '').replace(/```/g, '') : jsonBuffer;
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error", e);
                // Fallback if simple extraction failed
                parsed = { tech_name: input, search_queries: [input], definition: "自动解析失败，使用原始输入。" };
            }

            setData(prev => ({
                ...prev,
                techName: parsed.tech_name,
                techDefinition: parsed.definition,
                searchQueries: parsed.search_queries || [parsed.tech_name],
                currentStepIndex: 1, // Move to next step immediately
            }));
            
            addMessage('assistant', `已确认评估对象：**${parsed.tech_name}**。\n初步定义：${parsed.definition}\n\n正在启动第一阶段分析：技术路线与竞品锚定...`);
            
            // Auto trigger next step
            setTimeout(() => runGenerationStep('route', parsed.tech_name, parsed.search_queries), 500);

        } catch (e: any) {
            addMessage('assistant', `初始化失败: ${e.message}`);
        } finally {
            setIsGenerating(false);
            updateSection('init', { status: 'done' });
        }
    };

    // --- GENERIC GENERATION STEP ---
    const runGenerationStep = async (stepId: StepId, techName: string, queries: string[], userInstructions?: string) => {
        const promptKeyMap: Record<StepId, string> = {
            'init': 'tech_eval_init',
            'route': 'tech_eval_step1_route',
            'risk': 'tech_eval_step2_risk',
            'solution': 'tech_eval_step3_solution',
            'compare': 'tech_eval_step4_compare'
        };

        const promptKey = promptKeyMap[stepId];
        const config = getModelConfig(promptKey);

        if (!config) {
            addMessage('assistant', `❌ 错误：未找到提示词配置 [${promptKey}]。`);
            return;
        }

        setIsGenerating(true);
        updateSection(stepId, { status: 'generating', markdown: '' });
        
        try {
            // [NEW] 1. RAG Search (Explicit Display to User)
            let ragContext = "";
            if (!userInstructions) { // Only search on first run of the step or standard flow
                const queryStr = queries.join(' ') + ` ${stepId} 技术评估`;
                // Use helper to show UI feedback
                ragContext = await executeRetrieval(queryStr);
            } else {
                 // For user instructions (refinement), we might search for specific instruction keywords
                 addMessage('assistant', `🔍 针对修改指令进行增量检索...`);
                 ragContext = await executeRetrieval(`${techName} ${userInstructions}`);
            }

            // 2. Prepare Context
            // Gather previous summaries if needed
            const prevSummary = stepId === 'risk' ? data.sections['route'].markdown.slice(0, 500) :
                                stepId === 'solution' ? data.sections['risk'].markdown.slice(0, 500) :
                                stepId === 'compare' ? (data.sections['route'].markdown + data.sections['risk'].markdown + data.sections['solution'].markdown).slice(0, 1000) : '';

            let filledPrompt = config.contentTemplate
                .replace(/{{ tech_name }}/g, techName)
                .replace(/{{ retrieved_info }}/g, ragContext || '暂无更多外部资料，请基于您的专业知识分析。')
                .replace(/{{ step1_summary }}/g, prevSummary) // for risk
                .replace(/{{ step2_summary }}/g, prevSummary) // for solution
                .replace(/{{ steps_summary }}/g, prevSummary); // for compare
            
            if (userInstructions) {
                filledPrompt += `\n\n**用户补充指令（请重点关注并修改）：**\n${userInstructions}`;
            }

            // 3. Stream LLM
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
                    updateSection(stepId, { 
                        markdown: fullContent, 
                        html: cleanHtml 
                    });
                }
            }, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT); // Pass Agent ID for billing

            updateSection(stepId, { status: 'review' });
            addMessage('assistant', `**${data.sections[stepId].title}** 草稿已生成。请查阅左侧报告。如有修改意见请直接输入，或点击“确认”进入下一阶段。`);

        } catch (e: any) {
            console.error(e);
            addMessage('assistant', `生成失败: ${e.message}`);
            updateSection(stepId, { status: 'pending' }); // Reset to allow retry
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Handlers ---
    const handleSendMessage = (text: string) => {
        addMessage('user', text);
        
        if (currentStepId === 'init') {
            runInitStep(text);
        } else if (currentSection.status === 'review') {
            // User wants to modify the current step
            runGenerationStep(currentStepId, data.techName, data.searchQueries, text);
        }
    };

    const handleConfirmStep = () => {
        updateSection(currentStepId, { status: 'done' });
        
        if (data.currentStepIndex < STEPS.length - 1) {
            const nextIndex = data.currentStepIndex + 1;
            const nextStepId = STEPS[nextIndex];
            
            setData(prev => ({ ...prev, currentStepIndex: nextIndex }));
            addMessage('assistant', `阶段确认。正在启动下一阶段：**${data.sections[nextStepId].title}**...`);
            
            // Auto start next step
            setTimeout(() => {
                runGenerationStep(nextStepId, data.techName, data.searchQueries);
            }, 500);
        } else {
            addMessage('assistant', `🎉 恭喜！全流程评估已完成。您可以导出报告或继续与我对话完善细节。`);
        }
    };

    const handleRegenerateStep = () => {
        runGenerationStep(currentStepId, data.techName, data.searchQueries, "请重新生成本节内容，尝试不同的分析角度。");
    };

    if (isLoadingPrompts) {
        return (
             <div className="flex items-center justify-center h-full bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                    <p className="text-slate-500 font-medium">正在加载评估模型配置...</p>
                </div>
            </div>
        );
    }

    if (promptError) {
         return (
             <div className="flex items-center justify-center h-full bg-[#f8fafc]">
                <div className="bg-red-50 border border-red-200 p-6 rounded-xl flex flex-col items-center gap-3 max-w-md text-center">
                    <ShieldExclamationIcon className="w-10 h-10 text-red-500" />
                    <h3 className="text-lg font-bold text-red-700">配置加载失败</h3>
                    <p className="text-sm text-red-600">{promptError}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-bold">
                        刷新重试
                    </button>
                    <button onClick={onBack} className="text-slate-400 text-xs hover:text-slate-600 underline">
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    const currentPromptName = currentStepId === 'init' ? 'tech_eval_init' : `tech_eval_step${data.currentStepIndex}_${currentStepId === 'route' ? 'route' : currentStepId === 'risk' ? 'risk' : currentStepId === 'solution' ? 'solution' : 'compare'}`;

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* Custom Unified Header */}
            <div className="h-16 px-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack || (() => window.history.back())}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors group"
                        title="返回"
                    >
                        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    <div className="h-6 w-px bg-slate-200"></div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <ChartIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-none">技术决策评估助手</h1>
                            {data.techName ? (
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">TARGET:</span>
                                    <span className="text-xs font-bold text-indigo-600">{data.techName}</span>
                                    <div className="h-2 w-px bg-slate-200"></div>
                                    <ModelBadge promptName={currentPromptName} prompts={promptMap} />
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Awaiting Technical Subject</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Steps & Status */}
                <div className="flex items-center gap-6">
                    <div className="flex gap-2">
                        {DISPLAY_STEPS.map((step, idx) => (
                            <StepIndicator 
                                key={step} 
                                status={data.sections[step].status} 
                                index={idx} 
                                title={data.sections[step].title} 
                                isActive={currentStepId === step}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Canvas (60%) */}
                <div className="flex-1 min-w-0 border-r border-slate-200 relative">
                    <ReportCanvas 
                        sections={data.sections}
                        currentStep={currentStepId}
                        techName={data.techName}
                    />
                </div>

                {/* Right Chat (40%) */}
                <div className="w-[450px] flex-shrink-0 bg-white shadow-xl z-10">
                    <ChatPanel 
                        messages={data.messages}
                        onSendMessage={handleSendMessage}
                        isGenerating={isGenerating}
                        currentStep={currentStepId}
                        stepStatus={currentSection.status}
                        onConfirmStep={handleConfirmStep}
                        onRegenerateStep={handleRegenerateStep}
                    />
                </div>
            </div>
        </div>
    );
};

export default TechDecisionAssistant;