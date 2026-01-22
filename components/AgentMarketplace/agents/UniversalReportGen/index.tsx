
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
    // 1. 优先尝试提取 <plan> 标签内的 JSON 内容 (最稳健)
    const planMatch = text.match(/<plan>([\s\S]*?)<\/plan>/i);
    
    if (planMatch && planMatch[1]) {
        try {
            // 清理可能存在的 markdown 代码块标记，如 ```json ... ```
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

    // 2. 降级策略：如果 JSON 解析失败，尝试智能正则提取
    // 移除 <think> 和 <plan> 标签本身，只保留文本内容
    const contentToParse = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?plan>/gi, ''); // 移除 plan 标签，防止干扰

    const lines = contentToParse.split('\n');
    const steps: { title: string; instruction: string }[] = [];
    
    // 正则策略：
    // 1. 匹配 "1. 标题: 说明" 
    // 2. 匹配 "章节一：标题" (不带点)
    // 3. 匹配 "**标题**" (Markdown 加粗)
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        // 尝试匹配 "数字. 标题" 或 "数字 标题"
        let match = cleanLine.match(/^(\d+)[\.\、\s]\s*(.*)/);
        
        // 如果没匹配到数字，尝试匹配 "章节X："
        if (!match) {
            match = cleanLine.match(/^(?:章节|Chapter)\s*[\d一二三四五六七八九十]+[：:](.*)/);
        }

        if (match) {
            const fullContent = (match[2] || match[1]).trim();
            // 尝试分割 标题 和 指令 (支持冒号、破折号、空格后跟"研究重点"等)
            // 例子: "背景分析 - 研究重点：xxx"
            const splitRegex = /[:：\-\—]|\s(?=研究重点|写作指令)/;
            const splitIdx = fullContent.search(splitRegex);
            
            if (splitIdx > -1 && splitIdx < fullContent.length - 1) {
                steps.push({
                    title: fullContent.substring(0, splitIdx).trim().replace(/\*\*/g, ''), // 去除 markdown 加粗
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
    
    // 3. 最终兜底
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
    // 状态机
    const [status, setStatus] = useState<GenStatus>('planning');
    const [topic, setTopic] = useState('');
    
    // 规划阶段数据
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // 执行阶段数据
    const [sections, setSections] = useState<ReportSection[]>([]);
    const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(-1);
    
    // Abort Controller for stopping generation
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
                if (currentSectionIdx >= 0 && currentSectionIdx < prev.length) {
                    const n = [...prev];
                    n[currentSectionIdx] = { 
                        ...n[currentSectionIdx], 
                        status: 'error', 
                        logs: [...(n[currentSectionIdx].logs || []), '用户手动停止生成。'] 
                    };
                    return n;
                }
                return prev;
            });
            setStatus('planning'); 
            setChatMessages(prev => [...prev, { role: 'system', content: '任务已手动终止。您可以修改主题后重新开始。' }]);
        }
    };
    
    // --- Phase 1: Planning Interaction ---
    
    const handleUserSend = async (input: string) => {
        if (!input.trim() || isGenerating) return;

        const newMessages = [...chatMessages, { role: 'user', content: input, id: crypto.randomUUID() }];
        setChatMessages(newMessages);
        setIsGenerating(true);

        // Init AbortController
        abortRef.current = new AbortController();

        if (!topic) setTopic(input); // 第一次输入作为主题

        // 构建 Prompt (核心优化点)
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        const systemPrompt = `你是一个专业的深度研究规划专家。当前时间：${today}。
你的目标是帮助用户制定一份详尽的研究报告大纲。

用户输入主题后，请按以下步骤执行：
1. **思考阶段**：在 <think> 标签中分析用户意图、关键研究维度和逻辑结构。
2. **交互阶段**：用自然的语言向用户简要介绍你的思路，询问是否满意。
3. **结构化输出**：**必须**生成一份标准 JSON 格式的大纲，并包裹在 <plan> 标签中。

**<plan> 标签内部格式要求：**
- 必须是纯 JSON 数组 (Array)。
- 每个对象包含 "title" (章节标题) 和 "instruction" (具体的写作指令/研究重点)。
- 不要包含 Markdown 代码块标记 (\`\`\`json)，直接输出 JSON 字符串。

**JSON 示例：**
<plan>
[
  {"title": "第一章：行业背景", "instruction": "分析宏观经济政策与市场规模，引用近三年数据。"},
  {"title": "第二章：核心技术路线", "instruction": "对比 A 技术与 B 技术的优劣，分析技术成熟度。"}
]
</plan>

注意：
- JSON 必须合法，不要有多余逗号。
- instruction 要具体，用于指导后续的 AI 研究员进行搜索和写作。
`;

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

    // 用户确认方案，开始研究
    const handleStartResearch = () => {
        // 1. 从最后一条 AI 消息中解析大纲
        const lastAiMsg = [...chatMessages].reverse().find(m => m.role === 'assistant');
        if (!lastAiMsg) return;

        const outline = parsePlanFromMessage(lastAiMsg.content);
        
        if (outline.length === 0) {
            alert("未能识别到有效的大纲。请尝试对 AI 说：“请重新生成符合 JSON 格式的大纲”");
            return;
        }
        
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
            updateSec({ status: 'planning' });
            
            let loopCount = 0;
            let collectedContext = "";
            let finished = false;
            
            const systemPrompt = `你是一个拥有向量检索工具的资深行业研究员。当前时间：${today}。
任务：撰写报告章节【${section.title}】。
要求：${section.instruction}

工具：
- search_knowledge_base: 搜索内部知识库和全网数据。

**工作流程 (ReAct)**：
1. 分析当前章节需要什么数据。
2. 决定是【搜索】还是【开始撰写】。
   - 需要数据 -> 输出: \`call:search["关键词1", "关键词2"]\` (JSON数组格式的关键词)。
   - 数据足够 -> 直接开始撰写正文 (Markdown格式)。

注意：
- 关键词使用简体中文。
- 严禁在正文中输出 call:search 指令。
- 必须引用数据来源。
`;

            let conversationHistory: { role: string; content: string }[] = [
                { role: 'user', content: `请开始为章节【${section.title}】收集资料并撰写内容。` }
            ];

            while (loopCount < MAX_SEARCH_ROUNDS && !finished) {
                if (signal.aborted) break;

                updateSec({ status: 'planning' }); 
                
                let llmResponse = "";
                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory
                    ],
                    stream: true,
                    temperature: 0.1, 
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.content) llmResponse += chunk.content;
                }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, signal);

                if (signal.aborted) break;

                const toolCallMatch = llmResponse.match(/call:search(\[.*?\])/);

                if (toolCallMatch) {
                    // --- CASE A: Tool Execution ---
                    updateSec({ status: 'searching' });
                    
                    let queries: string[] = [];
                    try {
                        queries = JSON.parse(toolCallMatch[1]);
                    } catch (e) {
                        queries = [toolCallMatch[1].replace(/[\[\]"]/g, '')];
                    }

                    addLog(`[Round ${loopCount+1}] 思考中...决定检索: ${queries.join(', ')}`);
                    
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
                    
                    addLog(`检索完成，捕获 ${uniqueItems.length} 条新情报。阅读中...`);

                    conversationHistory.push({ role: 'assistant', content: llmResponse });
                    conversationHistory.push({ role: 'user', content: `【工具返回结果】\n${observation}\n\n请基于以上新信息，决定是继续搜索不同维度，还是开始撰写？` });
                    
                    collectedContext += observation + "\n";
                    loopCount++;
                } else {
                    // --- CASE B: Writing (Finish) ---
                    finished = true;
                    updateSec({ status: 'writing' });
                    addLog("信息充足，开始合成最终报告...");
                    
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
                    }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, signal);
                }
            }
            
            if (!finished && !signal.aborted) {
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
                }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN, signal);
            }

            if (!signal.aborted) {
                updateSec({ status: 'completed' });
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
