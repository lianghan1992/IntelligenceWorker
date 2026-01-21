
import React, { useState, useRef, useCallback } from 'react';
import { streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { SharedChatPanel, ChatMessage } from '../../../../components/shared/ChatPanel';
import { ReportCanvas, ResearchLog, ReportSection } from './ReportCanvas';
import { tryParsePartialJson } from '../../../ReportGenerator/Step1Collect';

interface UniversalReportGenProps {
    onBack: () => void;
}

// Config
const PLANNING_MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free"; 
const QUERY_MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free";
const WRITING_MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";

const UniversalReportGen: React.FC<UniversalReportGenProps> = ({ onBack }) => {
    // --- State ---
    const [status, setStatus] = useState<'idle' | 'researching' | 'planning' | 'waiting_confirmation' | 'generating' | 'done'>('idle');
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init',
        role: 'assistant',
        content: '我是您的万能研报助手。请告诉我您想研究的主题，我将为您全自动生成深度报告。',
        timestamp: Date.now()
    }]);
    
    // Data
    const [topic, setTopic] = useState('');
    const [globalContext, setGlobalContext] = useState('');
    const [logs, setLogs] = useState<ResearchLog[]>([]);
    const [outline, setOutline] = useState<{ title: string; instruction: string }[]>([]);
    const [sections, setSections] = useState<ReportSection[]>([]);
    
    // Per-Chapter Execution State
    const [processingIndex, setProcessingIndex] = useState<number>(-1);
    const [processingPhase, setProcessingPhase] = useState<'analyzing' | 'searching' | 'writing'>('analyzing');
    
    const abortRef = useRef(false);

    // --- Actions ---

    const addLog = (message: string, type: 'search' | 'read' | 'plan') => {
        const id = crypto.randomUUID();
        setLogs(prev => [...prev, { id, message, type, status: 'loading' }]);
        return id;
    };

    const updateLogStatus = (id: string, status: 'done') => {
        setLogs(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    };

    const handleUserMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        if (status === 'idle') {
            setTopic(text);
            startPlanningProcess(text);
        } else {
            setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: '任务执行中，请先处理当前流程。', 
                timestamp: Date.now() 
            }]);
        }
    };

    // 1. 规划研究思路 (流式解析 JSON)
    const startPlanningProcess = async (query: string) => {
        setStatus('researching');
        setOutline([]);
        setSections([]);
        
        // A. 初始全局背景检索
        const searchLogId = addLog(`正在执行全局背景透视: "${query}"...`, 'search');
        let context = "";
        try {
            const searchRes = await searchSemanticBatchGrouped({
                query_texts: [query, `${query} 核心现状`, `${query} 发展趋势`],
                max_segments_per_query: 4
            });
            updateLogStatus(searchLogId, 'done');
            const items = (searchRes.results || []).flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
            context = items.join('\n\n').slice(0, 8000);
            setGlobalContext(context);
        } catch (e) {
            updateLogStatus(searchLogId, 'done');
        }

        // B. 流式规划思路
        setStatus('planning');
        const planPrompt = `你是一个专业的研报架构师。请针对主题【${query}】结合背景资料，规划深度研究思路。
要求：4-6个章节。必须输出 JSON 格式（不要Markdown代码块）：
{
  "title": "最终报告标题",
  "pages": [
    { "title": "章节名称", "instruction": "本章分析重点" }
  ]
}
背景参考：${context.slice(0, 2000)}`;

        let planBuffer = "";
        try {
            await streamChatCompletions({
                model: PLANNING_MODEL_ID,
                messages: [{ role: 'user', content: planPrompt }],
                stream: true,
                temperature: 0.1
            }, (data) => {
                if (data.content) {
                    planBuffer += data.content;
                    // 核心：实时尝试解析 JSON 数组
                    const partial = tryParsePartialJson(planBuffer);
                    if (partial && partial.pages) {
                        setOutline(partial.pages);
                        if (partial.title) setTopic(partial.title);
                    }
                }
            });
            
            setStatus('waiting_confirmation');
            setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: '我已经规划好了研究思路，请在左侧预览。如果没有问题，请点击“确认思路并开始撰写”。', 
                timestamp: Date.now() 
            }]);
        } catch (e) {
            setStatus('idle');
        }
    };

    // 2. 分章节撰写 (搜-写 循环)
    const handleConfirmOutline = () => {
        if (outline.length === 0) return;
        startWritingLoop();
    };

    const startWritingLoop = async () => {
        setStatus('generating');
        // 初始化空内容占位
        setSections(outline.map(item => ({ title: item.title, content: '', queries: [], retrievedCount: 0 })));

        for (let i = 0; i < outline.length; i++) {
            if (abortRef.current) break;
            const chapter = outline[i];
            setProcessingIndex(i);

            // A. 流式规划本章检索词
            setProcessingPhase('analyzing');
            let queries: string[] = [];
            try {
                const queryPrompt = `正在撰写报告《${topic}》。当前章节：【${chapter.title}】。请生成 3 个用于深度检索该章节细节的关键词。
仅返回 JSON 字符串数组，如：["关键词1", "关键词2"]`;
                
                let queryBuffer = "";
                await streamChatCompletions({
                    model: QUERY_MODEL_ID,
                    messages: [{ role: 'user', content: queryPrompt }],
                    stream: true,
                    temperature: 0.1
                }, (d) => {
                    if (d.content) {
                        queryBuffer += d.content;
                        const partialQueries = tryParsePartialJson(queryBuffer);
                        if (Array.isArray(partialQueries)) {
                            setSections(prev => {
                                const next = [...prev];
                                next[i] = { ...next[i], queries: partialQueries };
                                return next;
                            });
                        }
                    }
                });
                queries = tryParsePartialJson(queryBuffer) || [];
            } catch (e) {}

            // B. 执行语义搜索
            setProcessingPhase('searching');
            let chapterContext = "";
            if (queries.length > 0) {
                try {
                    const searchRes = await searchSemanticBatchGrouped({
                        query_texts: queries,
                        max_segments_per_query: 5
                    });
                    const items = (searchRes.results || []).flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
                    chapterContext = items.join('\n\n').slice(0, 6000);
                    setSections(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], retrievedCount: items.length };
                        return next;
                    });
                } catch (e) {}
            }

            // C. 流式撰写正文
            setProcessingPhase('writing');
            const writePrompt = `你是一位资深行业分析师。正在撰写报告【${topic}】的章节：【${chapter.title}】。
写作指导：${chapter.instruction}
参考情报：
${chapterContext || globalContext}

请使用 Markdown 撰写，要求内容详实、有数据支撑，字数 600-1000 字。`;

            let contentBuffer = "";
            await streamChatCompletions({
                model: WRITING_MODEL_ID,
                messages: [{ role: 'user', content: writePrompt }],
                stream: true,
                temperature: 0.3
            }, (data) => {
                if (data.content) {
                    contentBuffer += data.content;
                    setSections(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], content: contentBuffer };
                        return next;
                    });
                }
            });
        }

        setProcessingIndex(-1);
        setStatus('done');
        setMessages(prev => [...prev, { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: '全篇报告已生成完毕！', 
            timestamp: Date.now() 
        }]);
    };

    return (
        <div className="flex h-full w-full bg-[#f8fafc]">
            <div className="flex-1 overflow-hidden border-r border-slate-200 relative">
                <ReportCanvas 
                    status={status}
                    logs={logs}
                    outline={outline}
                    sections={sections}
                    topic={topic}
                    processingIndex={processingIndex}
                    processingPhase={processingPhase}
                    onConfirmOutline={handleConfirmOutline}
                />
            </div>
            <div className="w-[400px] flex-shrink-0 bg-white shadow-xl z-10 h-full">
                <SharedChatPanel 
                    messages={messages}
                    onSendMessage={handleUserMessage}
                    isGenerating={['researching', 'planning', 'generating'].includes(status)}
                    placeholder="输入研究主题..."
                    title="智能研报 Copilot"
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
