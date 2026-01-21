
import React, { useState, useRef, useCallback } from 'react';
import { streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { SharedChatPanel, ChatMessage } from '../../../../components/shared/ChatPanel';
import { ReportCanvas, ResearchLog, ReportSection } from './ReportCanvas';
// Import robust JSON parser from ReportGenerator
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
    const [status, setStatus] = useState<'idle' | 'researching' | 'planning' | 'generating' | 'done'>('idle');
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init',
        role: 'assistant',
        content: '我是您的万能研报助手。请告诉我您想研究的主题（例如：人形机器人的商业化前景），我将为您全自动生成深度报告。',
        timestamp: Date.now()
    }]);
    
    // Data
    const [topic, setTopic] = useState('');
    const [logs, setLogs] = useState<ResearchLog[]>([]);
    const [outline, setOutline] = useState<{ title: string; instruction: string }[]>([]);
    const [sections, setSections] = useState<ReportSection[]>([]);
    
    // Execution State
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
            startResearchProcess(text);
        } else {
            setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: '正在生成中，请耐心等待完成。', 
                timestamp: Date.now() 
            }]);
        }
    };

    const startResearchProcess = async (query: string) => {
        setStatus('researching');
        abortRef.current = false;
        setOutline([]);
        setSections([]);
        
        const searchLogId = addLog(`执行全局背景扫描: "${query}"...`, 'search');
        
        let globalContext = "";
        try {
            const searchRes = await searchSemanticBatchGrouped({
                query_texts: [query, `${query} 核心技术`, `${query} 市场格局`, `${query} 发展趋势`],
                max_segments_per_query: 4
            });
            updateLogStatus(searchLogId, 'done');
            
            const results = searchRes.results || [];
            const refs = results.flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
            globalContext = refs.join('\n\n').slice(0, 8000);
            
            if (refs.length > 0) {
                 const readLogId = addLog(`已获取 ${refs.length} 条全局背景情报`, 'read');
                 setTimeout(() => updateLogStatus(readLogId, 'done'), 600);
            }
        } catch (e) {
            updateLogStatus(searchLogId, 'done');
        }

        // 2. Planning Phase
        setStatus('planning');
        const planLogId = addLog('正在构建深度报告大纲...', 'plan');
        
        const planPrompt = `你是一个专业的研报架构师。根据主题【${query}】和背景资料设计深度研报大纲。
要求：4-6个章节，JSON格式：{"title": "报告标题", "pages": [{"title": "章节名", "instruction": "写作重点"}]}。
直接输出JSON。`;
        
        const planMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: planMsgId, role: 'assistant', content: '正在规划大纲...', isThinking: true, timestamp: Date.now() }]);

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
                    const partial = tryParsePartialJson(planBuffer);
                    if (partial && partial.pages) {
                        setOutline(partial.pages);
                        if (partial.title) setTopic(partial.title);
                    }
                }
            });
            
            setMessages(prev => prev.map(m => m.id === planMsgId ? { ...m, isThinking: false, content: "大纲规划完成，开始深度检索与撰写。" } : m));
            updateLogStatus(planLogId, 'done');

            const parsedOutline = tryParsePartialJson(planBuffer);
            if (parsedOutline && parsedOutline.pages) {
                startWritingProcess(parsedOutline.pages, globalContext);
            }
        } catch (e: any) {
            setStatus('idle');
        }
    };

    const startWritingProcess = async (outlineItems: { title: string; instruction: string }[], globalContext: string) => {
        setStatus('generating');
        // 初始化空章节
        setSections(outlineItems.map(item => ({ title: item.title, content: '', queries: [], retrievedCount: 0 })));

        for (let i = 0; i < outlineItems.length; i++) {
            if (abortRef.current) break;
            setProcessingIndex(i);
            const item = outlineItems[i];

            // 1. 规划检索词 (流式展示词)
            setProcessingPhase('analyzing');
            let sectionQueries: string[] = [];
            try {
                const queryPrompt = `正在撰写《${topic}》之【${item.title}】。请提供3个用于深度检索的关键词，JSON数组格式。`;
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
                sectionQueries = tryParsePartialJson(queryBuffer) || [];
            } catch (e) {}

            // 2. 执行检索 (更新条数)
            setProcessingPhase('searching');
            let sectionContext = "";
            if (sectionQueries.length > 0) {
                try {
                    const searchRes = await searchSemanticBatchGrouped({
                        query_texts: sectionQueries,
                        max_segments_per_query: 5
                    });
                    const results = searchRes.results || [];
                    const refs = results.flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
                    sectionContext = refs.join('\n\n').slice(0, 6000);
                    
                    setSections(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], retrievedCount: refs.length };
                        return next;
                    });
                } catch (e) {}
            }

            // 3. 撰写章节 (流式输出内容)
            setProcessingPhase('writing');
            const writePrompt = `你是一位资深分析师。撰写章节【${item.title}】。\n要求：${item.instruction}\n参考资料：\n${globalContext.slice(0, 1000)}\n\n${sectionContext}\n请用Markdown撰写。`;
            
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
                />
            </div>
            <div className="w-[400px] flex-shrink-0 bg-white shadow-xl z-10 h-full">
                <SharedChatPanel 
                    messages={messages}
                    onSendMessage={handleUserMessage}
                    isGenerating={status !== 'idle' && status !== 'done'}
                    placeholder="输入研究主题..."
                    title="研报助手 Copilot"
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
