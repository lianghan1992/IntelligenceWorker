
import React, { useState, useEffect, useRef } from 'react';
import { streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { ReportCanvas, ReportSection } from './ReportCanvas';
import { AGENTS } from '../../../../agentConfig';
import { PlanChatArea } from './PlanChatArea';

// --- Types ---
export type GenStatus = 'planning' | 'executing' | 'finished';

// --- Constants ---
const MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free";
const MAX_SEARCH_ROUNDS = 3; // 最大自主检索轮次，防止死循环

// --- Helpers ---
const parsePlanFromMessage = (text: string): { title: string; instruction: string }[] => {
    const lines = text.split('\n');
    const steps: { title: string; instruction: string }[] = [];
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    cleanText.split('\n').forEach(line => {
        const match = line.match(/^(\d+)\.\s+(.*)/);
        if (match) {
            const fullContent = match[2].trim();
            const splitIdx = fullContent.search(/[:：-]/);
            
            if (splitIdx > -1 && splitIdx < fullContent.length - 1) {
                steps.push({
                    title: fullContent.substring(0, splitIdx).trim(),
                    instruction: fullContent.substring(splitIdx + 1).trim()
                });
            } else {
                steps.push({
                    title: fullContent,
                    instruction: "综合分析该部分内容"
                });
            }
        }
    });
    
    if (steps.length === 0) {
        return [
            { title: "市场背景分析", instruction: "分析行业宏观背景" },
            { title: "核心技术趋势", instruction: "分析技术发展路线" },
            { title: "主要竞争格局", instruction: "分析主要玩家及份额" },
            { title: "未来展望", instruction: "预测未来发展趋势" }
        ];
    }
    return steps;
};

const UniversalReportGen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // 状态机
    const [status, setStatus] = useState<GenStatus>('planning');
    const [topic, setTopic] = useState('');
    
    // 规划阶段数据
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // 执行阶段数据
    const [sections, setSections] = useState<ReportSection[]>([]);
    const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(-1);
    
    // --- Phase 1: Planning Interaction ---
    
    const handleUserSend = async (input: string) => {
        if (!input.trim() || isGenerating) return;

        const newMessages = [...chatMessages, { role: 'user', content: input, id: crypto.randomUUID() }];
        setChatMessages(newMessages);
        setIsGenerating(true);

        if (!topic) setTopic(input); // 第一次输入作为主题

        // 构建 Prompt
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        const systemPrompt = `你是一个专业的深度研究规划专家。
当前时间：${today}。
你的目标是帮助用户制定一份详尽的研究报告大纲。

用户输入主题后，请按以下步骤思考：
1. 分析用户的意图和研究深度。
2. 在 <think> 标签中输出你的思考过程（分析用户需求、拆解关键维度）。
3. 输出一份建议的研究方案清单（Markdown 有序列表格式）。
4. 询问用户是否需要修改方案。

注意：
- 保持对话风格专业且乐于助人。
- **必须** 包含 <think> 标签的思考过程。
- 方案清单必须使用 "1. ", "2. " 这样的有序列表格式，以便后续解析。`;

        let fullContent = "";
        const assistantMsgId = crypto.randomUUID();
        
        // 乐观更新 UI
        setChatMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId }]);

        try {
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...newMessages.map(m => ({ role: m.role, content: m.content }))
                ],
                stream: true,
                temperature: 0.7,
                enable_billing: true
            }, (chunk) => {
                if (chunk.content) {
                    fullContent += chunk.content;
                    setChatMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m));
                }
            }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: '抱歉，规划服务暂时繁忙，请重试。', id: crypto.randomUUID() }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // 用户确认方案，开始研究
    const handleStartResearch = () => {
        // 1. 从最后一条 AI 消息中解析大纲
        const lastAiMsg = [...chatMessages].reverse().find(m => m.role === 'assistant');
        if (!lastAiMsg) return;

        const outline = parsePlanFromMessage(lastAiMsg.content);
        
        // 2. 初始化执行状态
        const initialSections: ReportSection[] = outline.map((item, idx) => ({
            id: `sec-${idx}`,
            title: item.title,
            instruction: item.instruction,
            status: 'pending',
            content: '',
            logs: [],
            references: []
        }));

        setSections(initialSections);
        setStatus('executing');
        setCurrentSectionIdx(0);
    };

    // --- Phase 2: Execution Loop (ReAct Agent) ---
    
    useEffect(() => {
        if (status !== 'executing') return;
        if (currentSectionIdx < 0 || currentSectionIdx >= sections.length) {
            if (currentSectionIdx >= sections.length) setStatus('finished');
            return;
        }
        executeSectionResearch(currentSectionIdx);
    }, [currentSectionIdx, status]);

    const executeSectionResearch = async (idx: number) => {
        const section = sections[idx];
        const today = new Date().toLocaleDateString('zh-CN');
        
        const updateSec = (up: Partial<ReportSection>) => {
            setSections(prev => {
                const n = [...prev];
                n[idx] = { ...n[idx], ...up };
                return n;
            });
        };
        const addLog = (log: string) => {
            setSections(prev => {
                const n = [...prev];
                n[idx] = { ...n[idx], logs: [...(n[idx].logs || []), log] }
                return n;
            });
        };
        const appendReferences = (newRefs: any[]) => {
            setSections(prev => {
                const n = [...prev];
                // Merge and deduplicate references by URL
                const existingUrls = new Set(n[idx].references.map(r => r.url));
                const uniqueNewRefs = newRefs.filter(r => !existingUrls.has(r.url));
                n[idx] = { ...n[idx], references: [...n[idx].references, ...uniqueNewRefs] };
                return n;
            });
        };

        try {
            updateSec({ status: 'planning' });
            
            // ReAct Loop Variables
            let loopCount = 0;
            let collectedContext = "";
            let finished = false;
            
            // 系统提示词：定义工具和行为规范
            const systemPrompt = `你是一个拥有向量检索工具的资深行业研究员。当前时间：${today}。
任务：撰写报告章节【${section.title}】。
要求：${section.instruction}

你可以使用以下工具来获取信息：
- search_knowledge_base: 搜索内部知识库和全网数据。

**工作流程 (ReAct)**：
1. 分析当前章节需要什么数据。
2. 决定是【搜索】还是【开始撰写】。
   - 如果需要数据，输出工具调用指令：\`call:search["关键词1", "关键词2"]\`。**关键词必须使用简体中文**，具体且精准。
   - 如果数据已足够或无法获取更多数据，直接开始撰写正文。

注意：
- 每次搜索最多生成 3 个关键词。
- 只有当你确信有足够信息时才开始写正文。
- 正文必须使用 Markdown 格式。
- 正文中必须引用你获取到的数据，增强可信度。
- **严禁**在正文输出 call:search 指令。
`;

            // 对话历史：维护本章节的推理链
            let conversationHistory: { role: string; content: string }[] = [
                { role: 'user', content: `请开始为章节【${section.title}】收集资料并撰写内容。` }
            ];

            while (loopCount < MAX_SEARCH_ROUNDS && !finished) {
                updateSec({ status: 'planning' }); 
                
                // 1. Call LLM to decide next step
                let llmResponse = "";
                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory
                    ],
                    stream: true,
                    temperature: 0.1, // Low temperature for precise tool calling
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.content) llmResponse += chunk.content;
                }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);

                // 2. Parse Response for Tool Call
                // 格式如：call:search["小米汽车 销量", "SU7 交付量"]
                const toolCallMatch = llmResponse.match(/call:search(\[.*?\])/);

                if (toolCallMatch) {
                    // --- CASE A: Tool Execution ---
                    updateSec({ status: 'searching' });
                    
                    let queries: string[] = [];
                    try {
                        queries = JSON.parse(toolCallMatch[1]);
                    } catch (e) {
                        // Fallback parsing if JSON is malformed
                        queries = [toolCallMatch[1].replace(/[\[\]"]/g, '')];
                    }

                    addLog(`[Round ${loopCount+1}] 思考中...决定检索: ${queries.join(', ')}`);
                    
                    // Call Vector Search API
                    const searchRes = await searchSemanticBatchGrouped({ 
                        query_texts: queries, 
                        max_segments_per_query: 4,
                        similarity_threshold: 0.35
                    });
                    
                    // Process Results
                    const allItems = (searchRes.results || []).flatMap((r: any) => r.items || []);
                    const uniqueItems = Array.from(new Map(allItems.map((item:any) => [item.id || item.article_id, item])).values());
                    
                    // Update References in UI
                    const mappedRefs = uniqueItems.map((i:any)=>({ 
                        title: i.title || "未命名文档", 
                        url: i.original_url || i.url || '#', 
                        source: i.source_name || "数据库",
                        snippet: i.segments?.[0]?.content?.slice(0, 150) || i.content?.slice(0, 150)
                    }));
                    appendReferences(mappedRefs);

                    // Add observation to history
                    const observation = uniqueItems.length > 0 
                        ? uniqueItems.map((it:any, i:number) => `[资料${i+1}] ${it.title}: ${(it.segments||[]).map((s:any)=>s.content).join('... ')}`).join('\n\n')
                        : "本次检索未找到高相关性结果。";
                    
                    addLog(`检索完成，捕获 ${uniqueItems.length} 条新情报。阅读中...`);

                    conversationHistory.push({ role: 'assistant', content: llmResponse });
                    conversationHistory.push({ role: 'user', content: `【工具返回结果】\n${observation}\n\n请基于以上新信息，决定是继续搜索不同维度，还是开始撰写？` });
                    
                    collectedContext += observation + "\n";
                    loopCount++;
                } else {
                    // --- CASE B: Writing (Finish) ---
                    // If no tool call is detected, assume the model is writing the final content
                    finished = true;
                    updateSec({ status: 'writing' });
                    addLog("信息充足，开始合成最终报告...");
                    
                    // We can reuse the llmResponse as the start of the content if it's not just "I will write now"
                    // But usually, it's better to force a clean write pass with full context.
                    
                    const wPrompt = `资料收集阶段结束。
请基于以下所有累积的参考资料，撰写章节【${section.title}】。
要求：${section.instruction}

【所有参考资料】
${collectedContext || "（无直接资料，请基于通识撰写）"}

【写作要求】
1. 逻辑严密，多引用数据。
2. 必须使用 Markdown 格式。
3. 直接输出正文，不要包含 "好的"、"根据资料" 等废话。`;

                    let contentBuffer = "";
                    await streamChatCompletions({
                        model: MODEL_ID,
                        messages: [{ role: 'user', content: wPrompt }],
                        stream: true,
                        temperature: 0.4,
                        enable_billing: true
                    }, (chunk) => {
                        if (chunk.content) {
                            contentBuffer += chunk.content;
                            updateSec({ content: contentBuffer });
                        }
                    }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);
                }
            }
            
            // If loop ended without writing (e.g. max rounds reached), force write
            if (!finished) {
                 updateSec({ status: 'writing' });
                 addLog("检索轮次耗尽，强制生成报告...");
                 const wPrompt = `请基于目前已有的信息撰写章节【${section.title}】。${collectedContext ? '参考资料如下：\n' + collectedContext : ''}`;
                 let contentBuffer = "";
                 await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [{ role: 'user', content: wPrompt }],
                    stream: true,
                    temperature: 0.4,
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.content) {
                        contentBuffer += chunk.content;
                        updateSec({ content: contentBuffer });
                    }
                }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);
            }

            updateSec({ status: 'completed' });
            setCurrentSectionIdx(idx + 1);

        } catch (e: any) {
            updateSec({ status: 'error', logs: [...(sections[idx].logs||[]), `错误: ${e.message}`] });
        }
    };

    return (
        <div className="flex h-full w-full bg-[#f1f5f9] relative overflow-hidden">
            {/* Left: Canvas Area (Fluid) */}
            <div className="flex-1 relative bg-slate-50 transition-all duration-500 overflow-hidden border-r border-slate-200">
                <ReportCanvas 
                    mainStatus={status}
                    topic={topic}
                    outline={[]} 
                    sections={sections}
                    currentSectionIdx={currentSectionIdx}
                    onStart={()=>{}}
                    onRetry={(i) => setCurrentSectionIdx(i)}
                />
            </div>

            {/* Right: Chat & Control Area (Fixed Width) */}
            <div className="w-[450px] flex-shrink-0 bg-white h-full z-20 shadow-xl flex flex-col">
                <PlanChatArea 
                    messages={chatMessages}
                    isGenerating={isGenerating}
                    onSendMessage={handleUserSend}
                    onStartResearch={handleStartResearch}
                    status={status}
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
