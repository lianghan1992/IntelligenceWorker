
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
    // 简单解析 markdown 列表 (1. xxx \n 2. xxx)
    const lines = text.split('\n');
    const steps: { title: string; instruction: string }[] = [];
    
    // 移除 <think> 块干扰
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    cleanText.split('\n').forEach(line => {
        const match = line.match(/^(\d+)\.\s+(.*)/);
        if (match) {
            // 尝试分离标题和说明 (假设格式: 标题：说明 或 标题 - 说明)
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
    
    // 如果解析失败，回退默认
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
        const systemPrompt = `你是一个专业的深度研究规划专家。
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
                n[idx] = { ...n[idx], logs: [...(n[idx].logs || []), log] };
                return n;
            });
        };

        try {
            // A. 生成检索词
            updateSec({ status: 'planning' });
            addLog("正在分析本章信息缺口...");
            const qPrompt = `针对章节【${section.title}】（要求：${section.instruction}），请生成 3 个用于 Google 搜索的关键词。只返回关键词，每行一个。`;
            let qStr = "";
            await streamChatCompletions({ model: MODEL_ID, messages: [{role:'user', content:qPrompt}], stream:true, enable_billing: true }, (c)=>{if(c.content) qStr+=c.content});
            const queries = qStr.split('\n').map(s=>s.replace(/^\d+\.\s*|-/, '').trim()).filter(s=>s.length>1).slice(0,3);

            // B. 检索
            updateSec({ status: 'searching' });
            addLog(`执行全网检索: ${queries.join(', ')}`);
            const sRes = await searchSemanticBatchGrouped({ query_texts: queries, max_segments_per_query: 4 });
            const allItems = (sRes.results || []).flatMap((r: any) => r.items || []);
            const uniqueItems = Array.from(new Map(allItems.map((item:any) => [item.id || item.article_id, item])).values());
            
            updateSec({ references: uniqueItems.map((i:any)=>({ title:i.title, url:i.url, source:i.source_name })) });
            const context = uniqueItems.map((it:any, i:number) => `[资料${i+1}] ${it.title}: ${(it.segments||[]).map((s:any)=>s.content).join('\n')}`).join('\n\n');

            // C. 撰写
            updateSec({ status: 'writing' });
            addLog("检索完成，AI 研究员正在撰写...");
            
            const wPrompt = `你是一名资深行业分析师。请基于以下检索到的资料，撰写报告章节。
章节标题：${section.title}
写作要求：${section.instruction}

参考资料：
${context || "（无直接资料，请基于通识撰写）"}

要求：
1. 内容详实，逻辑严密，多引用数据。
2. 必须使用 Markdown 格式。
3. **不要**写“根据资料”、“综上所述”等套话，直接输出干货内容。`;

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
            // 出错暂停，手动重试
        }
    };

    return (
        <div className="flex h-full w-full bg-[#f8fafc] relative overflow-hidden">
            {/* Left: Chat & Planning Area (Always visible, but changes mode) */}
            <div className={`
                flex-shrink-0 bg-white border-r border-slate-200 h-full transition-all duration-500 ease-in-out z-20 shadow-xl
                ${status === 'planning' ? 'w-full md:w-[600px] lg:w-[700px]' : 'w-[400px] hidden md:flex'}
            `}>
                <PlanChatArea 
                    messages={chatMessages}
                    isGenerating={isGenerating}
                    onSendMessage={handleUserSend}
                    onStartResearch={handleStartResearch}
                    status={status}
                />
            </div>
            
            {/* Right: Canvas (Hidden during initial planning, slides in for execution) */}
            <div className={`flex-1 relative bg-slate-50 transition-all duration-500 ${status === 'planning' ? 'translate-x-full opacity-0 absolute right-0 w-0' : 'translate-x-0 opacity-100'}`}>
                <ReportCanvas 
                    mainStatus={status}
                    topic={topic}
                    outline={[]} // Execution phase uses sections directly
                    sections={sections}
                    currentSectionIdx={currentSectionIdx}
                    onStart={()=>{}} // Auto started
                    onRetry={(i) => setCurrentSectionIdx(i)}
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
