
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
const MAX_SEARCH_ROUNDS = 3; // 最大自主检索轮次

// --- Helpers ---
const parsePlanFromMessage = (text: string): { title: string; instruction: string }[] => {
    // 1. 优先尝试提取 <plan> 标签内的 JSON 内容 (最稳健)
    const planMatch = text.match(/<plan>([\s\S]*?)<\/plan>/i);
    
    if (planMatch && planMatch[1]) {
        try {
            // 清理可能存在的 markdown 代码块标记
            const cleanJson = planMatch[1]
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();
            
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
                return parsed.map((item: any) => ({
                    title: item.title,
                    instruction: item.instruction || item.desc || "综合分析本章内容"
                }));
            }
        } catch (e) {
            console.warn("JSON parse failed inside <plan>, falling back to regex", e);
        }
    }

    // 2. 降级策略
    const contentToParse = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?plan>/gi, '');

    const lines = contentToParse.split('\n');
    const steps: { title: string; instruction: string }[] = [];
    
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        let match = cleanLine.match(/^(\d+)[\.\、\s]\s*(.*)/);
        if (!match) {
            match = cleanLine.match(/^(?:章节|Chapter)\s*[\d一二三四五六七八九十]+[：:](.*)/);
        }
        if (match) {
            const fullContent = (match[2] || match[1]).trim();
            const splitRegex = /[:：\-\—]|\s(?=研究重点|写作指令)/;
            const splitIdx = fullContent.search(splitRegex);
            
            if (splitIdx > -1 && splitIdx < fullContent.length - 1) {
                steps.push({
                    title: fullContent.substring(0, splitIdx).trim().replace(/\*\*/g, ''), 
                    instruction: fullContent.substring(splitIdx + 1).trim()
                });
            } else {
                steps.push({
                    title: fullContent.replace(/\*\*/g, ''),
                    instruction: "综合分析该部分内容，包含现状、趋势与数据支持。"
                });
            }
        }
    });
    
    if (steps.length === 0) {
        if (!text.trim()) return []; 
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
    const [status, setStatus] = useState<GenStatus>('planning');
    const [topic, setTopic] = useState('');
    
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [sections, setSections] = useState<ReportSection[]>([]);
    const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(-1);
    
    const abortRef = useRef<AbortController | null>(null);

    // --- Actions ---

    const handleStop = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsGenerating(false);
        if (status === 'executing') {
            setSections(prev => {
                // 将当前正在执行的章节标记为 'stopped' 而非 'error'，体验更好
                if (currentSectionIdx >= 0 && currentSectionIdx < prev.length) {
                    const n = [...prev];
                    const currentLog = n[currentSectionIdx].logs || [];
                    n[currentSectionIdx] = { 
                        ...n[currentSectionIdx], 
                        status: 'error', 
                        logs: [...currentLog, '🛑 用户手动停止了任务。'] 
                    };
                    return n;
                }
                return prev;
            });
            // 关键修改：停止后进入 finished 状态，保留 Canvas 内容，而不是 planning
            setStatus('finished'); 
            setChatMessages(prev => [...prev, { role: 'system', content: '任务已手动终止。您可以查看已生成的内容，或刷新页面重新开始。' }]);
        }
    };
    
    // --- Phase 1: Planning Interaction ---
    
    const handleUserSend = async (input: string) => {
        if (!input.trim() || isGenerating) return;

        const newMessages = [...chatMessages, { role: 'user', content: input, id: crypto.randomUUID() }];
        setChatMessages(newMessages);
        setIsGenerating(true);
        abortRef.current = new AbortController();

        if (!topic) setTopic(input); 

        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        const systemPrompt = `你是一个专业的深度研究规划专家。当前时间：${today}。
目标：帮助用户制定一份详尽的研究报告大纲。

步骤：
1. **思考**：在 <think> 标签中分析用户意图。
2. **交互**：用自然语言简述思路。
3. **输出**：**必须**生成一份标准 JSON 格式的大纲，包裹在 <plan> 标签中。

**<plan> 格式要求：**
- 纯 JSON 数组。
- 每个对象包含 "title" (章节标题) 和 "instruction" (具体写作指令/重点)。
- 无 Markdown 代码块标记。

**JSON 示例：**
<plan>
[
  {"title": "第一章：行业背景", "instruction": "分析宏观经济政策与市场规模，引用近三年数据。"},
  {"title": "第二章：核心技术路线", "instruction": "对比 A 技术与 B 技术的优劣。"}
]
</plan>`;

        let fullContent = "";
        const assistantMsgId = crypto.randomUUID();
        
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
            }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, abortRef.current?.signal);
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                 setChatMessages(prev => [...prev, { role: 'assistant', content: '抱歉，规划服务暂时繁忙，请重试。', id: crypto.randomUUID() }]);
            }
        } finally {
            setIsGenerating(false);
            abortRef.current = null;
        }
    };

    const handleStartResearch = () => {
        const lastAiMsg = [...chatMessages].reverse().find(m => m.role === 'assistant');
        if (!lastAiMsg) return;

        const outline = parsePlanFromMessage(lastAiMsg.content);
        
        if (outline.length === 0) {
            alert("未能识别到有效的大纲。请尝试对 AI 说：“请重新生成符合 JSON 格式的大纲”");
            return;
        }
        
        const initialSections: ReportSection[] = outline.map((item, idx) => ({
            id: `sec-${idx}`,
            title: item.title,
            instruction: item.instruction,
            status: 'pending',
            content: '',
            logs: [],
            references: [],
            currentThought: '' // Initialize thought
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
        
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, [currentSectionIdx, status]);

    const executeSectionResearch = async (idx: number) => {
        const section = sections[idx];
        const today = new Date().toLocaleDateString('zh-CN');
        
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

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
                const existingUrls = new Set(n[idx].references.map(r => r.url));
                const uniqueNewRefs = newRefs.filter(r => !existingUrls.has(r.url));
                n[idx] = { ...n[idx], references: [...n[idx].references, ...uniqueNewRefs] };
                return n;
            });
        };

        try {
            updateSec({ status: 'planning', currentThought: '' });
            
            let loopCount = 0;
            let collectedContext = "";
            let finished = false;
            
            // 核心 Prompt 优化：强调“无知”属性，强制搜索
            const systemPrompt = `你是一个严谨的研究员。当前时间：${today}。
任务：撰写报告章节【${section.title}】。
要求：${section.instruction}

**重要原则**：
1. **你对当前实时信息一无所知**。必须且只能依靠工具获取信息。
2. 在没有使用 \`search_knowledge_base\` 获取到足够信息前，**严禁**开始撰写正文。
3. 如果是第一轮交互，**必须**调用搜索工具。

工具：
- search_knowledge_base: 搜索内部知识库和全网数据。

**工作流程**：
1. 思考当前缺失什么数据。
2. **决策**：
   - 缺数据 -> 输出工具指令：\`call:search["关键词1", "关键词2"]\` (JSON数组)。
   - 资料已完全充足 -> 直接开始撰写正文 (Markdown格式，必须引用数据)。

注意：
- 严禁在正文中输出 call:search 指令。
- 严禁编造数据，必须基于 search_knowledge_base 返回的内容。
`;

            let conversationHistory: { role: string; content: string }[] = [
                { role: 'user', content: `请开始为章节【${section.title}】收集资料并撰写内容。` }
            ];

            while (loopCount < MAX_SEARCH_ROUNDS && !finished) {
                if (signal.aborted) break;

                updateSec({ status: 'planning', currentThought: '' }); 
                
                // 策略：首轮强制注入搜索指令 (Anti-Laziness Strategy)
                if (loopCount === 0) {
                     conversationHistory.push({ 
                         role: 'system', 
                         content: `(系统强制指令：这是第一轮思考。你目前没有任何资料。请务必先输出 call:search 指令进行初步调研。)` 
                     });
                }

                let llmResponse = "";
                // Reset thought for new turn
                updateSec({ currentThought: '' });

                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory
                    ],
                    stream: true,
                    temperature: 0.1, // 低温以保证指令遵循
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.content) {
                        llmResponse += chunk.content;
                        // Stream thought to UI, but mask tool calls
                        const displayThought = llmResponse.replace(/call:search\s*(\[.*?\])?/gi, '⚡️ 正在调用全网检索工具...');
                        updateSec({ currentThought: displayThought });
                    }
                }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, signal);

                if (signal.aborted) break;

                // Try to find tool call
                let toolCallMatch = llmResponse.match(/call:search\s*(\[.*?\])/i);
                
                // --- HARD FALLBACK for First Round ---
                // If round 0 and no tool call found, force search with title
                if (loopCount === 0 && !toolCallMatch) {
                    addLog("检测到模型未调用工具，强制执行兜底搜索策略...");
                    // Inject a fake tool call match structure
                    toolCallMatch = [`call:search["${section.title}"]`, `["${section.title}"]`] as any;
                }

                if (toolCallMatch) {
                    // --- CASE A: Tool Execution ---
                    updateSec({ status: 'searching' });
                    
                    let queries: string[] = [];
                    try {
                        queries = JSON.parse(toolCallMatch[1]);
                    } catch (e) {
                        // Fallback parsing if JSON is malformed
                         const rawParams = toolCallMatch[1].replace(/[\[\]"]/g, '').split(',');
                         queries = rawParams.map(q => q.trim()).filter(Boolean);
                    }

                    if (queries.length === 0) queries = [section.title];

                    addLog(`[第 ${loopCount+1} 轮] 正在检索: ${queries.join(', ')}`);
                    
                    const searchRes = await searchSemanticBatchGrouped({ 
                        query_texts: queries, 
                        max_segments_per_query: 4,
                        similarity_threshold: 0.35
                    });
                    
                    if (signal.aborted) break;

                    const allItems = (searchRes.results || []).flatMap((r: any) => r.items || []);
                    const uniqueItems = Array.from(new Map(allItems.map((item:any) => [item.id || item.article_id, item])).values());
                    
                    const mappedRefs = uniqueItems.map((i:any)=>({ 
                        title: i.title || "未命名文档", 
                        url: i.original_url || i.url || '#', 
                        source: i.source_name || "数据库",
                        snippet: i.segments?.[0]?.content?.slice(0, 150) || i.content?.slice(0, 150)
                    }));
                    appendReferences(mappedRefs);

                    const observation = uniqueItems.length > 0 
                        ? uniqueItems.map((it:any, i:number) => `[资料${i+1}] ${it.title}: ${(it.segments||[]).map((s:any)=>s.content).join('... ')}`).join('\n\n')
                        : "本次检索未找到高相关性结果。";
                    
                    addLog(`检索完成，阅读 ${uniqueItems.length} 篇资料中...`);

                    conversationHistory.push({ role: 'assistant', content: llmResponse });
                    conversationHistory.push({ role: 'user', content: `【工具返回结果】\n${observation}\n\n请评估信息是否充足。如果不足，请换个角度继续搜索；如果充足，请开始撰写。` });
                    
                    collectedContext += observation + "\n";
                    loopCount++;
                } else {
                    // --- CASE B: Writing (Finish) ---
                    finished = true;
                    updateSec({ status: 'writing', currentThought: '' }); // Clear thought for writing phase
                    addLog("信息研判完成，开始生成报告...");
                    
                    const wPrompt = `资料收集阶段结束。
请基于以下所有累积的参考资料，撰写章节【${section.title}】。
要求：${section.instruction}

【所有参考资料】
${collectedContext || "（无直接资料，请基于通识撰写，但需注明数据来源不详）"}

【写作要求】
1. 逻辑严密，多引用数据。
2. 必须使用 Markdown 格式。
3. 结构清晰，分点论述。
4. **直接输出正文**，不要包含 "好的"、"根据资料"、"报告如下" 等废话。`;

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
                    }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, signal);
                }
            }
            
            // 轮次耗尽兜底
            if (!finished && !signal.aborted) {
                 updateSec({ status: 'writing', currentThought: '' });
                 addLog("最大检索轮次已达，强制生成报告...");
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
                }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, signal);
            }

            if (!signal.aborted) {
                updateSec({ status: 'completed', currentThought: '' });
                setCurrentSectionIdx(idx + 1);
            }

        } catch (e: any) {
             if (e.name !== 'AbortError') {
                 updateSec({ status: 'error', logs: [...(sections[idx].logs||[]), `错误: ${e.message}`] });
             }
        }
    };

    return (
        <div className="flex h-full w-full bg-[#f1f5f9] relative overflow-hidden">
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

            <div className="w-[450px] flex-shrink-0 bg-white h-full z-20 shadow-xl flex flex-col">
                <PlanChatArea 
                    messages={chatMessages}
                    isGenerating={isGenerating}
                    onSendMessage={handleUserSend}
                    onStartResearch={handleStartResearch}
                    onStop={handleStop}
                    status={status}
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
