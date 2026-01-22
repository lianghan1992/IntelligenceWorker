
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

    // --- Phase 2: Execution Loop ---
    
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

        try {
            // A. 生成检索词
            updateSec({ status: 'planning' });
            addLog(`分析"${section.title}"的信息需求...`);
            
            // 优化：要求生成更具体的搜索词，避免通用词
            const qPrompt = `针对研究报告章节【${section.title}】（写作目标：${section.instruction}），请生成 3 个具体的 Google 搜索关键词。
要求：
1. 关键词必须包含具体的技术术语、公司名或年份（当前是${today}）。
2. 不要使用“介绍”、“概述”等虚词。
3. 只返回关键词，每行一个，不要编号。`;
            
            let qStr = "";
            await streamChatCompletions({ model: MODEL_ID, messages: [{role:'user', content:qPrompt}], stream:true, enable_billing: true }, (c)=>{if(c.content) qStr+=c.content});
            const queries = qStr.split('\n').map(s=>s.replace(/^\d+\.\s*|-/, '').trim()).filter(s=>s.length>1).slice(0,3);

            // B. 检索
            updateSec({ status: 'searching' });
            addLog(`执行全网检索: ${queries.join(', ')}`);
            
            const sRes = await searchSemanticBatchGrouped({ query_texts: queries, max_segments_per_query: 5 });
            const allItems = (sRes.results || []).flatMap((r: any) => r.items || []);
            
            // 去重并提取字段，注意 original_url 的映射
            const uniqueItems = Array.from(new Map(allItems.map((item:any) => [item.id || item.article_id, item])).values());
            
            const mappedRefs = uniqueItems.map((i:any)=>({ 
                title: i.title || "未命名文档", 
                // 优先使用 original_url，如果没有则回退到 url (如果是上传的文档通常有 original_url)
                url: i.original_url || i.url || '#', 
                source: i.source_name || "互联网",
                snippet: i.segments?.[0]?.content?.slice(0, 150) || i.content?.slice(0, 150)
            }));

            updateSec({ references: mappedRefs });
            
            // 整理上下文给 LLM
            const context = uniqueItems.map((it:any, i:number) => {
                const segments = (it.segments || []).map((s:any) => s.content).join('\n...\n');
                const fullContent = segments || it.content || '';
                return `[资料${i+1}] 来源：${it.source_name} | 标题：${it.title}\n内容：${fullContent}`;
            }).join('\n\n');
            
            if (uniqueItems.length > 0) {
                addLog(`成功捕获 ${uniqueItems.length} 条高相关情报，正在阅读...`);
            } else {
                addLog(`未检索到直接资料，将尝试利用通用知识库推理...`);
            }

            // C. 撰写
            updateSec({ status: 'writing' });
            addLog("AI 研究员正在合成最终报告...");
            
            const wPrompt = `你是一名资深行业分析师。当前日期：${today}。
请基于以下检索到的【参考资料】，撰写报告章节。

章节标题：${section.title}
写作核心任务：${section.instruction}

【参考资料】
${context || "（注意：本次检索未返回强相关结果，请基于你的训练知识库进行合理推演，并注明数据来源可能不实时。）"}

【写作要求】
1. **必须引用**参考资料中的具体数据、案例或观点，增强报告的可信度。
2. 逻辑严密，结构清晰，使用 Markdown 格式。
3. 文风专业、客观，避免使用“我认为”、“根据搜索结果”等第一人称口语，直接陈述事实。
4. 如果参考资料不足，请在段落开头简要说明，并基于通识进行分析。
5. 字数控制在 500-1000 字之间。`;

            let contentBuffer = "";
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [{ role: 'user', content: wPrompt }],
                stream: true,
                temperature: 0.3,
                enable_billing: true
            }, (chunk) => {
                if (chunk.content) {
                    contentBuffer += chunk.content;
                    updateSec({ content: contentBuffer });
                }
            }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);

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
