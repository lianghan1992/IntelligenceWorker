
import React, { useState, useRef, useCallback } from 'react';
import { streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { SharedChatPanel, ChatMessage } from '../../../../components/shared/ChatPanel';
import { ReportCanvas, ReportSection } from './ReportCanvas';
import { tryParsePartialJson } from '../../../ReportGenerator/Step1Collect';

interface UniversalReportGenProps {
    onBack: () => void;
}

// 模型配置 - 使用更稳定的模型以避免空响应
const PLANNING_MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free"; 
const QUERY_MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";
const WRITING_MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";

const UniversalReportGen: React.FC<UniversalReportGenProps> = ({ onBack }) => {
    // --- 状态 ---
    const [status, setStatus] = useState<'idle' | 'researching' | 'planning' | 'waiting_confirmation' | 'generating' | 'done'>('idle');
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init',
        role: 'assistant',
        content: '我是您的万能研报助手。请告诉我您想研究的主题，我将为您流式规划思路、按序检索并撰写深度长文。',
        timestamp: Date.now()
    }]);
    
    const [topic, setTopic] = useState('');
    const [globalContext, setGlobalContext] = useState('');
    const [outline, setOutline] = useState<{ title: string; instruction: string }[]>([]);
    const [sections, setSections] = useState<ReportSection[]>([]);
    
    // 串行控制状态
    const [processingIndex, setProcessingIndex] = useState<number>(-1);
    
    const abortRef = useRef(false);

    // --- 消息处理 ---
    const handleUserMessage = async (text: string) => {
        if (!text.trim() || status !== 'idle') return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        
        setTopic(text);
        startReasoningFlow(text);
    };

    // 1. 流式规划研究思路 (JSON 实时解析)
    const startReasoningFlow = async (query: string) => {
        setStatus('researching');
        setOutline([]);
        setSections([]);
        
        // A. 全局检索
        try {
            const searchRes = await searchSemanticBatchGrouped({
                query_texts: [query, `${query} 核心现状`, `${query} 趋势`],
                max_segments_per_query: 4
            });
            const items = (searchRes.results || []).flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
            setGlobalContext(items.join('\n\n').slice(0, 6000));
        } catch (e) { console.error("Search failed", e); }

        // B. 流式输出思路
        setStatus('planning');
        const planPrompt = `你是一个专业的研报架构师。请针对主题【${query}】规划深度研究思路。
要求：4-6个章节。必须输出 JSON 格式（不要包含代码块标记）：
{
  "title": "最终报告标题",
  "pages": [
    { "title": "章节名称", "instruction": "本章分析重点" }
  ]
}`;

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
            
            setStatus('waiting_confirmation');
            setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: '研究思路已为您规划完毕。请在左侧预览，满意请点击“确认并开始撰写”。', 
                timestamp: Date.now() 
            }]);
        } catch (e) {
            setStatus('idle');
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '规划失败，请重试。', timestamp: Date.now() }]);
        }
    };

    // 2. 确认思路后启动【严格串行】撰写循环
    const handleConfirmOutline = () => {
        if (outline.length === 0) return;
        startStrictSequentialLoop();
    };

    const startStrictSequentialLoop = async () => {
        setStatus('generating');
        abortRef.current = false;
        
        // 初始化章节状态为 pending
        const initialSections: ReportSection[] = outline.map(item => ({ 
            title: item.title, 
            content: '', 
            queries: [], 
            retrievedCount: 0,
            status: 'pending' 
        }));
        setSections(initialSections);

        // --- 严格的 for 循环 + await Promise 模式 ---
        for (let i = 0; i < outline.length; i++) {
            if (abortRef.current) break;
            
            const chapter = outline[i];
            setProcessingIndex(i); 

            // 更新状态：Analyzing
            setSections(prev => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'analyzing' };
                return next;
            });

            // 【步骤 A】：流式规划检索词
            let queries: string[] = [];
            try {
                const queryPrompt = `正在编写《${topic}》。章节：【${chapter.title}】。
请提供 3-5 个深度检索词。仅返回 JSON 数组，如：["词1", "词2"]`;
                
                let queryBuffer = "";
                await new Promise<void>((resolve) => {
                    streamChatCompletions({
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
                    }, () => resolve(), () => resolve()); // Always resolve
                });
                queries = tryParsePartialJson(queryBuffer) || [];
            } catch (e) {
                console.error(`Chapter ${i} query gen failed`);
            }

            // 【步骤 B】：执行检索
            setSections(prev => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'searching' };
                return next;
            });

            let chapterContext = "";
            if (queries.length > 0) {
                try {
                    const searchRes = await searchSemanticBatchGrouped({
                        query_texts: queries,
                        max_segments_per_query: 6
                    });
                    const items = (searchRes.results || []).flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
                    chapterContext = items.join('\n\n').slice(0, 6000);
                    
                    setSections(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], retrievedCount: items.length };
                        return next;
                    });
                } catch (e) { console.error("Search failed"); }
            }

            // 【步骤 C】：流式撰写正文
            setSections(prev => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'writing' };
                return next;
            });

            await new Promise<void>((resolve) => {
                const writePrompt = `你是一位专家。撰写章节【${chapter.title}】。
分析重点：${chapter.instruction}
参考情报：
${chapterContext || globalContext || "无特定情报，请基于通用知识撰写。"}

请使用 Markdown 撰写，严禁废话，要求字数 800+ 字。`;

                let contentBuffer = "";
                let hasError = false;

                streamChatCompletions({
                    model: WRITING_MODEL_ID,
                    messages: [{ role: 'user', content: writePrompt }],
                    stream: true,
                    temperature: 0.3
                }, (data) => {
                    if (data.content) {
                        contentBuffer += data.content;
                        setSections(prev => {
                            const next = [...prev];
                            // 确保只更新当前章
                            if (next[i]) next[i] = { ...next[i], content: contentBuffer };
                            return next;
                        });
                    }
                }, () => {
                    // Done Callback
                    setSections(prev => {
                        const next = [...prev];
                        if (next[i]) {
                             // 如果内容为空，标记为错误，避免界面“消失”
                             if (!contentBuffer.trim()) {
                                 next[i] = { ...next[i], status: 'error', content: '> ⚠️ 生成失败：模型未返回内容。' };
                             } else {
                                 next[i] = { ...next[i], status: 'completed' };
                             }
                        }
                        return next;
                    });
                    resolve();
                }, (err) => {
                    hasError = true;
                    setSections(prev => {
                        const next = [...prev];
                        if (next[i]) next[i] = { ...next[i], status: 'error', content: contentBuffer + '\n\n> ⚠️ 生成中断：' + err.message };
                        return next;
                    });
                    resolve();
                });
            });
        }

        setProcessingIndex(-1);
        setStatus('done');
        setMessages(prev => [...prev, { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: '✅ 报告已按章节顺序全部生成完毕。', 
            timestamp: Date.now() 
        }]);
    };

    return (
        <div className="flex h-full w-full bg-[#f8fafc]">
            <div className="flex-1 overflow-hidden border-r border-slate-200 relative">
                <ReportCanvas 
                    status={status}
                    outline={outline}
                    sections={sections}
                    topic={topic}
                    processingIndex={processingIndex}
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
