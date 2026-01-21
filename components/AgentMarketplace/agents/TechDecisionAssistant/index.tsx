
import React, { useState, useEffect } from 'react';
import { ChartIcon, ArrowLeftIcon, CheckCircleIcon, RefreshIcon, ShieldExclamationIcon, DocumentTextIcon, ClipboardIcon, DownloadIcon } from '../../../icons';
import { ChatPanel } from './ChatPanel';
import { ReportCanvas } from './ReportCanvas';
import { StepId, TechEvalSessionData, ChatMessage, ReportSection } from './types';
import { getPrompts, streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { StratifyPrompt } from '../../../../types';
import { marked } from 'marked';
import { toPng } from 'html-to-image';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

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

// 全局系统设定：赋予 Agent 专家人设与行为规范
const GLOBAL_SYSTEM_INSTRUCTION = `你是一位拥有15年以上经验的汽车/硬科技行业技术专家。你的核心能力是基于行业情报，对技术方案进行深度的竞品分析、技术路线评估和工程风险排查。文风务实、犀利、逻辑严密，严禁营销辞藻，仅进行客观分析。

核心限制 (Constraints):
1. **中文优先**：除专业术语外，**严禁中英混合！** 严禁在中文句子中夹杂不必要的英文单词。
2. **证据导向**：所有分析必须基于事实或检索到的情报。
3. **禁止废话**：直接输出报告内容，**不要**输出 "好的，我来为您分析..." 或 "您还需要什么帮助..." 等对话式填充语。
4. **图文穿插**：在需要数据可视化或原理解析的地方，**必须**插入图表占位符。格式为：\`[VISUAL: 图表标题 | 图表描述]\`。请根据内容深度，在一个章节中插入 1-3 个不等的图表。`;

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
        techDefinition: undefined,
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
    const [isCopying, setIsCopying] = useState(false);
    const [isExportingWord, setIsExportingWord] = useState(false);
    
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

    const refineSearchQueries = async (text: string): Promise<string[]> => {
        const prompt = `你是一个搜索专家。请将以下技术评估需求拆分为 5-8 个独立的语义检索关键词。
要求：涵盖技术原理、竞品动态、工程风险、专利信息等维度。每个关键词简洁精准。
仅返回 JSON 字符串数组，如: ["关键词1", "关键词2"]

评估需求：${text}`;

        try {
            let buffer = "";
            await streamChatCompletions({
                model: QUERY_REFINER_MODEL,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: 0.1,
                enable_billing: false
            }, (chunk) => {
                if (chunk.content) buffer += chunk.content;
            });
            const match = buffer.match(/\[[\s\S]*\]/);
            if (match) return JSON.parse(match[0]);
        } catch (e) {
            console.warn("Refine queries failed");
        }
        return [text];
    };

    const generateStepSearchQueries = async (stepId: StepId, techName: string): Promise<string[]> => {
        const stepInfo = STEP_DEFINITIONS[stepId];
        if (!stepInfo) return [techName];

        const prompt = `你是一个汽车行业技术情报专家。正在进行【${techName}】的【${stepInfo.title}】评估。
请根据当前阶段的任务目标，生成 3-5 个具体的搜索引擎检索关键词。
当前阶段：${stepInfo.title}
任务重点：${stepInfo.objective}
仅返回纯 JSON 字符串数组，例如：["关键词1", "关键词2"]`;

        try {
            let buffer = "";
            await streamChatCompletions({
                model: QUERY_REFINER_MODEL,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: 0.2,
                enable_billing: false
            }, (chunk) => {
                if (chunk.content) buffer += chunk.content;
            });
            const match = buffer.match(/\[[\s\S]*\]/);
            if (match) return JSON.parse(match[0]);
        } catch (e) {
            console.error("Query generation failed", e);
        }
        return [`${techName} ${stepInfo.title}`];
    };

    const executeBatchRetrieval = async (queries: string[]): Promise<string> => {
        if (!queries || queries.length === 0) return "";
        const queryListStr = queries.map(q => `• ${q}`).join('\n');
        addMessage('assistant', `🔍 正在执行情报检索...\n**策略关键词**：\n${queryListStr}`);
        
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
                 addMessage('assistant', `✅ 检索完成：捕获 **${totalSegmentsFound}** 条情报。正在深度评估...`);
                 return contextString;
            } else {
                 addMessage('assistant', `⚠️ 检索结束：未找到高相关细节。将基于通用知识评估。`);
                 return "";
            }
        } catch (e: any) {
            addMessage('assistant', `❌ 检索服务异常: ${e.message}。`);
            return "";
        }
    };

    // --- Phase 1: Initialization (Reasoning Only) ---
    const runInitStep = async (input: string) => {
        const config = getModelConfig('tech_eval_init');
        if (!config) {
             addMessage('assistant', '系统初始化错误：找不到 Prompt 配置。');
             return;
        }

        setIsGenerating(true);
        updateSection('init', { status: 'generating', usedModel: config.model });
        
        try {
            const filledPrompt = config.contentTemplate.replace('{{ user_input }}', input);

            let jsonBuffer = "";
            addMessage('assistant', `🤔 正在分析需求并规划评估路径...`);

            await streamChatCompletions({
                model: config.model,
                messages: [
                    { role: 'system', content: GLOBAL_SYSTEM_INSTRUCTION },
                    { role: 'user', content: filledPrompt }
                ],
                stream: true,
                temperature: 0.1,
                enable_billing: true
            }, (chunk) => {
                if (chunk.content) jsonBuffer += chunk.content;
            }, undefined, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT);

            let parsed;
            try {
                const match = jsonBuffer.match(/\{[\s\S]*\}/);
                parsed = JSON.parse(match ? match[0] : jsonBuffer);
            } catch (e) {
                console.error("Init JSON Parse Failed", e);
                parsed = { tech_name: input, search_queries: [input], definition: "自动解析失败，使用原始输入。" };
            }

            setData(prev => ({
                ...prev,
                techName: parsed.tech_name,
                techDefinition: parsed.definition,
                searchQueries: parsed.search_queries || [input],
                currentStepIndex: 1, // Move to next step
            }));
            
            addMessage('assistant', `🎯 评估对象确认：**${parsed.tech_name}**\n> ${parsed.definition || ''}\n\n已规划检索路径，启动第一阶段：技术路线深度解析...`);
            
            setTimeout(() => runGenerationStep('route', parsed.tech_name, undefined, parsed.search_queries), 500);

        } catch (e: any) {
            addMessage('assistant', `初始化失败: ${e.message}`);
        } finally {
            setIsGenerating(false);
            updateSection('init', { status: 'done' });
        }
    };

    // --- Phase 2 & Beyond: Execution & Generation ---
    const runGenerationStep = async (stepId: StepId, techName: string, userInstructions?: string, preDefinedQueries?: string[]) => {
        const promptKeyMap: Record<StepId, string> = {
            'init': 'tech_eval_init',
            'route': 'tech_eval_step1_route',
            'risk': 'tech_eval_step2_risk',
            'solution': 'tech_eval_step3_solution',
            'compare': 'tech_eval_step4_compare'
        };

        const config = getModelConfig(promptKeyMap[stepId]);
        if (!config) return;

        // Visual Engine Config
        const visualConfig = getModelConfig('tech_eval_visualize');

        setIsGenerating(true);
        updateSection(stepId, { status: 'generating', markdown: '', usedModel: config.model, visuals: {} });
        
        try {
            let activeQueries = preDefinedQueries || [];
            
            if (activeQueries.length === 0 || userInstructions) {
                if (userInstructions) {
                    const refined = await refineSearchQueries(`${techName} ${userInstructions}`);
                    activeQueries = [...activeQueries, ...refined];
                } else {
                    addMessage('assistant', `🤔 AI 正在思考【${STEP_DEFINITIONS[stepId].title}】阶段的检索策略...`);
                    const stepQueries = await generateStepSearchQueries(stepId, techName);
                    activeQueries = [...activeQueries, ...stepQueries];
                }
            }

            // 1. 执行检索
            const ragContext = await executeBatchRetrieval(activeQueries);

            // 2. 准备上下文摘要
            const prevSummary = stepId === 'risk' ? data.sections['route'].markdown.slice(0, 1000) :
                                stepId === 'solution' ? data.sections['risk'].markdown.slice(0, 1000) :
                                stepId === 'compare' ? (data.sections['route'].markdown + data.sections['risk'].markdown + data.sections['solution'].markdown).slice(0, 2000) : '';

            // 3. 构建 Prompt
            let filledPrompt = config.contentTemplate
                .replace(/{{ tech_name }}/g, techName)
                .replace(/{{ retrieved_info }}/g, ragContext || '暂无外部补充资料。')
                .replace(/{{ step1_summary }}/g, prevSummary)
                .replace(/{{ step2_summary }}/g, prevSummary)
                .replace(/{{ steps_summary }}/g, prevSummary);
            
            if (userInstructions) {
                filledPrompt += `\n\n**用户补充要求：**\n${userInstructions}`;
            }

            // 4. 生成报告 Markdown (First Pass)
            let fullMarkdown = "";
            await streamChatCompletions({
                model: config.model,
                messages: [
                    { role: 'system', content: GLOBAL_SYSTEM_INSTRUCTION },
                    { role: 'user', content: filledPrompt }
                ],
                stream: true,
                temperature: 0.2,
                enable_billing: true
            }, (chunk) => {
                if (chunk.content) {
                    fullMarkdown += chunk.content;
                    updateSection(stepId, { markdown: fullMarkdown });
                }
            }, undefined, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT);

            // 5. 扫描并生成多个图表 (Multi-Visual Generation)
            // 匹配格式：[VISUAL: 标题 | 描述]
            const visualTagsRegex = /\[VISUAL:\s*(.*?)\s*\|\s*(.*?)\]/g;
            let match;
            const tasks: Array<{ fullTag: string, title: string, desc: string }> = [];

            while ((match = visualTagsRegex.exec(fullMarkdown)) !== null) {
                tasks.push({
                    fullTag: match[0],
                    title: match[1].trim(),
                    desc: match[2].trim()
                });
            }

            if (tasks.length > 0 && visualConfig) {
                 addMessage('assistant', `🎨 正在绘制 **${tasks.length}** 张可视化图表...`);
                 
                 const visualsMap: Record<string, string> = {};

                 // 并行生成所有图表
                 await Promise.all(tasks.map(async (task) => {
                     const vizPrompt = visualConfig.contentTemplate
                         .replace('{{ chart_title }}', task.title)
                         .replace('{{ chart_desc }}', task.desc)
                         .replace('{{ context_summary }}', fullMarkdown.slice(0, 1500)); // 给一部分上下文
                    
                     let fullHtml = "";
                     try {
                         await streamChatCompletions({
                             model: visualConfig.model, 
                             messages: [
                                { role: 'user', content: vizPrompt }
                             ],
                             stream: true,
                             temperature: 0.1, 
                             enable_billing: true
                         }, (chunk) => {
                             if (chunk.content) fullHtml += chunk.content;
                         }, undefined, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT);
                         
                         const cleanHtml = extractCleanHtml(fullHtml);
                         if (cleanHtml) {
                             visualsMap[task.fullTag] = cleanHtml;
                         }
                     } catch (e) {
                         console.error("Failed to gen visual", task.title, e);
                     }
                 }));
                 
                 // 更新 State
                 updateSection(stepId, { visuals: visualsMap });
            }

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
    
    // --- New Export Functions ---

    // 1. Copy to Lark (Rich Text)
    const handleCopyToLark = async () => {
        if (isCopying) return;
        setIsCopying(true);
        try {
            let htmlContent = `<h1 style="text-align:center">${data.techName} - 深度技术评估报告</h1>`;
            
            for (const stepId of DISPLAY_STEPS) {
                const section = data.sections[stepId];
                if (!section.markdown) continue;

                // 1. Convert Markdown to HTML
                let sectionHtml = await marked.parse(section.markdown);
                
                // 2. Process Visuals
                const visualTagRegex = /(\[VISUAL:\s*.*?\s*\|\s*.*?\])/g;
                // Need to do this async replacement carefully
                // We will split and reconstruct
                const parts = section.markdown.split(visualTagRegex);
                let reconstructedHtml = "";

                for (const part of parts) {
                     if (part.match(visualTagRegex)) {
                         const tag = part;
                         // Find DOM Node
                         // We need a deterministic way to find ID. 
                         // In ReportCanvas.tsx: const widgetId = `visual-widget-${stepId}-${index}`;
                         // But index depends on the split array index in mixed renderer.
                         // Let's use the exact same split logic in ReportCanvas to infer index
                         
                         // Re-simulate MixedContentRenderer split to find index
                         const allParts = section.markdown.split(visualTagRegex);
                         const visualIndex = allParts.indexOf(tag);
                         const domId = `visual-widget-${stepId}-${visualIndex}`;
                         const element = document.getElementById(domId);

                         if (element) {
                             try {
                                 // Wait a bit for render
                                 const dataUrl = await toPng(element, { 
                                     width: 1600, 
                                     height: 900,
                                     style: { transform: 'scale(1)', transformOrigin: 'top left' }
                                 });
                                 reconstructedHtml += `<br/><img src="${dataUrl}" width="800" /><br/>`;
                             } catch (e) {
                                 console.warn("Snapshot failed for", domId);
                                 reconstructedHtml += `<p><i>[图表生成快照失败]</i></p>`;
                             }
                         }
                     } else {
                         reconstructedHtml += await marked.parse(part);
                     }
                }
                htmlContent += `<hr/>${reconstructedHtml}`;
            }
            
            // 3. Write to Clipboard
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const item = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([item]);
            alert('已复制图文到剪贴板！请直接粘贴。');

        } catch (e) {
            console.error(e);
            alert('复制失败，请重试');
        } finally {
            setIsCopying(false);
        }
    };

    // 2. Export Word (.docx)
    const handleExportWord = async () => {
        if (isExportingWord) return;
        setIsExportingWord(true);
        try {
            const docChildren: any[] = [];
            
            // Title
            docChildren.push(new Paragraph({
                text: `${data.techName} - 深度技术评估报告`,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER
            }));

            for (const stepId of DISPLAY_STEPS) {
                const section = data.sections[stepId];
                if (!section.markdown) continue;

                // Section Title (we don't have it in markdown usually, adding manually)
                // docChildren.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));

                const visualTagRegex = /(\[VISUAL:\s*.*?\s*\|\s*.*?\])/g;
                const parts = section.markdown.split(visualTagRegex);
                const allParts = section.markdown.split(visualTagRegex); // needed for index

                for (const part of parts) {
                    if (part.match(visualTagRegex)) {
                        const tag = part;
                        const visualIndex = allParts.indexOf(tag);
                        const domId = `visual-widget-${stepId}-${visualIndex}`;
                        const element = document.getElementById(domId);

                        if (element) {
                            try {
                                const dataUrl = await toPng(element, { 
                                    width: 1600, 
                                    height: 900,
                                    style: { transform: 'scale(1)', transformOrigin: 'top left' }
                                });
                                // Convert Data URL to Uint8Array
                                const response = await fetch(dataUrl);
                                const blob = await response.blob();
                                const buffer = await blob.arrayBuffer();
                                
                                docChildren.push(new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: buffer,
                                            transformation: { width: 600, height: 337.5 }, // 16:9 aspect
                                            type: "png"
                                        })
                                    ]
                                }));
                            } catch (e) {
                                console.warn("Snapshot failed for docx", domId);
                            }
                        }
                    } else {
                        // Simple Markdown Text parsing
                        // Using marked to tokenize would be better but for simplicity, splitting by lines
                        const lines = part.split('\n');
                        for (const line of lines) {
                            if (!line.trim()) continue;
                            
                            let text = line.trim();
                            let headingLevel = undefined;
                            
                            if (text.startsWith('### ')) { headingLevel = HeadingLevel.HEADING_3; text = text.replace(/^###\s+/, ''); }
                            else if (text.startsWith('## ')) { headingLevel = HeadingLevel.HEADING_2; text = text.replace(/^##\s+/, ''); }
                            else if (text.startsWith('# ')) { headingLevel = HeadingLevel.HEADING_1; text = text.replace(/^#\s+/, ''); }
                            
                            // Basic bold parsing (**text**)
                            const runs = [];
                            const boldRegex = /\*\*(.*?)\*\*/g;
                            let lastIndex = 0;
                            let match;
                            
                            while ((match = boldRegex.exec(text)) !== null) {
                                if (match.index > lastIndex) {
                                    runs.push(new TextRun({ text: text.substring(lastIndex, match.index) }));
                                }
                                runs.push(new TextRun({ text: match[1], bold: true }));
                                lastIndex = boldRegex.lastIndex;
                            }
                            if (lastIndex < text.length) {
                                runs.push(new TextRun({ text: text.substring(lastIndex) }));
                            }

                            if (runs.length === 0) runs.push(new TextRun({ text: text }));

                            // List items
                            let bullet = undefined;
                            if (text.startsWith('- ') || text.startsWith('* ')) {
                                runs[0] = new TextRun({ text: (runs[0] as any).text.substring(2), bold: (runs[0] as any).bold });
                                bullet = { level: 0 };
                            }

                            docChildren.push(new Paragraph({
                                children: runs,
                                heading: headingLevel,
                                bullet: bullet
                            }));
                        }
                    }
                }
            }

            const doc = new Document({
                sections: [{ properties: {}, children: docChildren }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${data.techName}_评估报告.docx`);

        } catch (e: any) {
            console.error("Export Word error:", e);
            alert(`导出 Word 失败: ${e.message || '未知错误'}`);
        } finally {
            setIsExportingWord(false);
        }
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
                        <div className="flex gap-2">
                             <button 
                                onClick={handleCopyToLark}
                                disabled={isCopying}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                title="生成图文并茂的内容到剪贴板，可直接粘贴飞书"
                            >
                                {isCopying ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <ClipboardIcon className="w-3.5 h-3.5" />} 
                                复制图文到剪贴板
                            </button>
                            <button 
                                onClick={handleExportWord}
                                disabled={isExportingWord}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                title="下载 .docx 文件"
                            >
                                {isExportingWord ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DocumentTextIcon className="w-3.5 h-3.5" />} 
                                导出 Word
                            </button>
                        </div>
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
                        onUpdateSection={updateSection}
                    />
                </div>
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
