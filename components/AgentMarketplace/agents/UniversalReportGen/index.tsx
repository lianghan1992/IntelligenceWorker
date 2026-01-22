
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { SharedChatPanel, ChatMessage } from '../../../../components/shared/ChatPanel';
import { ReportCanvas, ReportSection } from './ReportCanvas';
import { AGENTS } from '../../../../agentConfig';

// --- Helpers ---
const tryParseJson = (text: string) => {
    if (!text) return null;
    try {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) return JSON.parse(match[1]);
        return JSON.parse(text);
    } catch (e) {
        try {
            const firstOpen = text.indexOf('{');
            const lastClose = text.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose > firstOpen) {
                return JSON.parse(text.substring(firstOpen, lastClose + 1));
            }
        } catch (e2) {}
        return null;
    }
};

const extractListFromText = (text: string): string[] => {
    const json = tryParseJson(text);
    if (Array.isArray(json)) return json;
    return text.split('\n')
        .map(line => line.replace(/^\d+\.\s*|-\s*/, '').trim())
        .filter(line => line.length > 2)
        .slice(0, 5);
};

// --- Models ---
// 统一使用 OpenRouter 代理的小米模型
const PLANNING_MODEL = "openrouter@xiaomi/mimo-v2-flash:free";
const WRITING_MODEL = "openrouter@xiaomi/mimo-v2-flash:free";

export type GenStatus = 'idle' | 'analyzing_intent' | 'initial_retrieval' | 'planning' | 'review_plan' | 'executing' | 'finished';

const UniversalReportGen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // 核心状态机
    const [status, setStatus] = useState<GenStatus>('idle');
    const [topic, setTopic] = useState('');
    
    // 阶段数据
    const [intentSummary, setIntentSummary] = useState('');
    const [seedReferences, setSeedReferences] = useState<any[]>([]);
    const [outline, setOutline] = useState<{ title: string; instruction: string }[]>([]);
    const [sections, setSections] = useState<ReportSection[]>([]);
    const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(-1);
    
    // 聊天状态
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init',
        role: 'assistant',
        content: '我是您的 **深度研报 Agent**。\n\n请告诉我您想要研究的主题，我将通过“意图识别-种子检索-动态规划-深度撰写”的全流程为您交付高质量报告。',
        timestamp: Date.now()
    }]);

    // --- Step 1: 意图识别与种子检索词生成 ---
    const handleUserMessage = async (text: string) => {
        if (!text.trim() || ['analyzing_intent', 'planning', 'executing'].includes(status)) return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        if (status === 'idle') {
            setTopic(text);
            await startResearchWorkflow(text);
        } else if (status === 'review_plan') {
            // 用户在审查大纲阶段提出的修改意见
            await planResearchRoute(topic, text); 
        }
    };

    const startResearchWorkflow = async (query: string) => {
        setStatus('analyzing_intent');
        
        // 1. 意图分析与种子关键词
        const intentPrompt = `针对用户研究主题【${query}】，请执行以下任务：
1. 识别用户的核心研究意图（100字以内）。
2. 生成 5 个用于构建知识底座的种子检索词（覆盖技术背景、行业现状、主要竞争者等维度）。
**必须**以 JSON 格式返回：
{
  "intent": "你的分析...",
  "queries": ["词1", "词2", "词3", "词4", "词5"]
}`;

        let intentBuffer = "";
        try {
            await streamChatCompletions({
                model: PLANNING_MODEL,
                messages: [{ role: 'user', content: intentPrompt }],
                stream: true,
                temperature: 0.1,
                enable_billing: true
            }, (chunk) => { if(chunk.content) intentBuffer += chunk.content; }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);

            const parsedIntent = tryParseJson(intentBuffer);
            if (!parsedIntent || !parsedIntent.queries) throw new Error("意图解析失败");

            setIntentSummary(parsedIntent.intent);
            
            // 2. 执行初始检索
            setStatus('initial_retrieval');
            const searchRes = await searchSemanticBatchGrouped({
                query_texts: parsedIntent.queries,
                max_segments_per_query: 3
            });
            const allItems = (searchRes.results || []).flatMap((r: any) => r.items || []);
            const uniqueRefs = Array.from(new Map(allItems.map((item:any) => [item.id || item.article_id, item])).values());
            setSeedReferences(uniqueRefs);

            // 3. 进入研究思路规划
            await planResearchRoute(query, "", uniqueRefs);

        } catch (e: any) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `启动失败: ${e.message}`, timestamp: Date.now() }]);
            setStatus('idle');
        }
    };

    // --- Step 2: 根据检索内容生成研究思路 (Outline) ---
    const planResearchRoute = async (query: string, revisionMsg = "", refs: any[] = []) => {
        setStatus('planning');
        
        const contextText = refs.map((r, i) => `[参考资料${i+1}] ${r.title}: ${r.content || ''}`).join('\n');
        
        const planningPrompt = `你是一个资深行业分析师。
主题：${query}
初始背景资料：\n${contextText}
${revisionMsg ? `用户修改建议：${revisionMsg}` : ''}

请基于现有资料规划这份研究报告的大纲。
要求：
1. 包含 4-6 个逻辑递进的章节。
2. 每个章节必须有写作指导（instruction），说明本章要解决的问题。
3. 必须返回 JSON 格式：
{
  "chapters": [
    { "title": "章节标题", "instruction": "本章重点分析..." }
  ]
}`;

        let planBuffer = "";
        try {
            await streamChatCompletions({
                model: PLANNING_MODEL,
                messages: [{ role: 'user', content: planningPrompt }],
                stream: true,
                temperature: 0.2,
                enable_billing: true
            }, (chunk) => { if(chunk.content) planBuffer += chunk.content; }, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);

            const parsedPlan = tryParseJson(planBuffer);
            if (!parsedPlan || !parsedPlan.chapters) throw new Error("大纲生成失败");

            setOutline(parsedPlan.chapters);
            setStatus('review_plan');
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '研究思路已规划完毕。我已经基于初步检索的资料为您设计了报告架构，请在左侧预览。如果没有问题，请点击“确认并开始撰写”。',
                timestamp: Date.now()
            }]);
        } catch (e) {
            setStatus('idle');
        }
    };

    // --- Step 3: 启动分步研究执行 (Execution) ---
    const handleStartExecution = () => {
        const initialSections: ReportSection[] = outline.map((item, idx) => ({
            id: `sec-${idx}`,
            title: item.title,
            instruction: item.instruction,
            content: '',
            status: 'pending',
            logs: [],
            references: []
        }));
        
        setSections(initialSections);
        setStatus('executing');
        setCurrentSectionIdx(0);
    };

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
            // A. 精准检索词生成
            updateSec({ status: 'planning' });
            addLog("生成本章专项检索词...");
            const qPrompt = `针对章节【${section.title}】，请生成 3 个深度检索词。每行一个。`;
            let qStr = "";
            await streamChatCompletions({ model: PLANNING_MODEL, messages: [{role:'user', content:qPrompt}], stream:true, enable_billing: true }, (c)=>{if(c.content) qStr+=c.content}, undefined, undefined, undefined, AGENTS.UNIVERSAL_REPORT_GEN);
            const queries = extractListFromText(qStr);

            // B. 专项向量检索
            updateSec({ status: 'searching' });
            addLog(`执行专项检索: ${queries.join(', ')}`);
            const sRes = await searchSemanticBatchGrouped({ query_texts: queries, max_segments_per_query: 5 });
            const allItems = (sRes.results || []).flatMap((r: any) => r.items || []);
            const uniqueItems = Array.from(new Map(allItems.map((item:any) => [item.id || item.article_id, item])).values());
            
            updateSec({ references: uniqueItems.map((i:any)=>({ title:i.title, url:i.url, source:i.source_name })) });
            
            const context = uniqueItems.map((it:any, i:number) => `[文献${i+1}] ${it.title}: ${(it.segments||[]).map((s:any)=>s.content).join('\n')}`).join('\n\n');

            // C. 深度撰写
            updateSec({ status: 'writing' });
            addLog("正在由资深专家 Agent 撰写正文...");
            const wPrompt = `你是一个行业研究专家。请根据以下参考资料，撰写报告章节【${section.title}】。
要求：
1. 核心任务：${section.instruction}
2. 风格：专业、详实，必须引用参考资料中的具体数据或观点。
3. 格式：Markdown。
参考资料：
${context || "请基于你的专业知识库撰写。"}
直接输出正文，不要开场白。`;

            let contentBuffer = "";
            await streamChatCompletions({
                model: WRITING_MODEL,
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
        <div className="flex h-full w-full bg-[#f8fafc] relative">
            <div className="flex-1 overflow-hidden border-r border-slate-200 relative">
                <ReportCanvas 
                    mainStatus={status}
                    topic={topic}
                    intentSummary={intentSummary}
                    seedReferences={seedReferences}
                    outline={outline}
                    sections={sections}
                    currentSectionIdx={currentSectionIdx}
                    onStart={handleStartExecution}
                    onRetry={(i) => setCurrentSectionIdx(i)}
                />
            </div>
            
            <div className="w-[360px] flex-shrink-0 bg-white shadow-xl z-10 h-full flex flex-col">
                <SharedChatPanel 
                    messages={messages}
                    onSendMessage={handleUserMessage}
                    isGenerating={['analyzing_intent', 'planning', 'executing'].includes(status)}
                    title="研报控制中心"
                    placeholder={status === 'idle' ? "输入研究主题..." : "输入修改指令..."}
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
