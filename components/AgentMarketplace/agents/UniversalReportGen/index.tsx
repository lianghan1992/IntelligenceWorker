
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

// 模型配置
const PLANNING_MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free"; 
const QUERY_MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free";
const WRITING_MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";

const UniversalReportGen: React.FC<UniversalReportGenProps> = ({ onBack }) => {
    // --- 状态 ---
    const [status, setStatus] = useState<'idle' | 'researching' | 'planning' | 'waiting_confirmation' | 'generating' | 'done'>('idle');
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init',
        role: 'assistant',
        content: '我是您的万能研报助手。请告诉我您想研究的主题，我将为您全自动生成深度报告。',
        timestamp: Date.now()
    }]);
    
    // 数据
    const [topic, setTopic] = useState('');
    const [globalContext, setGlobalContext] = useState('');
    const [outline, setOutline] = useState<{ title: string; instruction: string }[]>([]);
    const [sections, setSections] = useState<ReportSection[]>([]);
    
    // 执行进度控制
    const [processingIndex, setProcessingIndex] = useState<number>(-1);
    const [processingPhase, setProcessingPhase] = useState<'analyzing' | 'searching' | 'writing'>('analyzing');
    
    const abortRef = useRef(false);

    // --- 辅助动作 ---
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
                content: '当前流程进行中，请在结束后再进行新的对话。', 
                timestamp: Date.now() 
            }]);
        }
    };

    // 1. 规划研究思路 (流式解析 JSON)
    const startPlanningProcess = async (query: string) => {
        setStatus('researching');
        setOutline([]);
        setSections([]);
        setProcessingIndex(-1);
        
        // A. 初始全局背景检索
        try {
            const searchRes = await searchSemanticBatchGrouped({
                query_texts: [query, `${query} 核心现状`, `${query} 未来趋势`],
                max_segments_per_query: 4
            });
            const items = (searchRes.results || []).flatMap((r: any) => (r.items || []).flatMap((art: any) => art.segments.map((seg: any) => seg.content)));
            setGlobalContext(items.join('\n\n').slice(0, 8000));
        } catch (e) {
            console.error("Global search failed");
        }

        // B. 流式规划思路
        setStatus('planning');
        const planPrompt = `你是一个专业的研报架构师。请针对主题【${query}】规划深度研究思路。
要求：4-6个章节。必须输出 JSON 格式（不要Markdown代码块）：
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
                    // 【流式解析核心】：实时尝试解析 JSON 数组
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
                content: '我已经流式规划好了研究思路，请在左侧预览。确认无误后点击“开始分章节撰写”。', 
                timestamp: Date.now() 
            }]);
        } catch (e) {
            setStatus('idle');
        }
    };

    // 2. 分章节撰写 (严格顺序：搜-写 循环)
    const handleConfirmOutline = () => {
        if (outline.length === 0) return;
        startWritingLoop();
    };

    const startWritingLoop = async () => {
        setStatus('generating');
        // 初始化所有章节的占位，但内容为空
        const initialSections = outline.map(item => ({ title: item.title, content: '', queries: [], retrievedCount: 0 }));
        setSections(initialSections);

        // --- 核心逻辑：严格按索引 i 顺序执行，不写完 i 绝不进入 i+1 ---
        for (let i = 0; i < outline.length; i++) {
            if (abortRef.current) break;
            
            const chapter = outline[i];
            setProcessingIndex(i); // 视觉锚点移动到第 i 章

            // 【第一步】：流式规划本章检索词
            setProcessingPhase('analyzing');
            let queries: string[] = [];
            try {
                const queryPrompt = `正在撰写《${topic}》。当前章节：【${chapter.title}】。请生成 3-5 个用于检索该章节细节的关键词。
仅返回 JSON 数组，如：["关键词1", "关键词2"]`;
                
                let queryBuffer = "";
                await streamChatCompletions({
                    model: QUERY_MODEL_ID,
                    messages: [{ role: 'user', content: queryPrompt }],
                    stream: true,
                    temperature: 0.1
                }, (d) => {
                    if (d.content) {
                        queryBuffer += d.content;
                        // 【流式解析词】：实时将解析到的词同步到界面
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
            } catch (e) {
                console.error(`Chapter ${i} query generation failed`);
            }

            // 【第二步】：执行检索 (同步等待，更新命中数)
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
                } catch (e) {
                    console.error(`Chapter ${i} retrieval failed`);
                }
            }

            // 【第三步】：流式撰写章节正文
            setProcessingPhase('writing');
            const writePrompt = `你是一位资深分析师。撰写章节【${chapter.title}】。\n分析重点：${chapter.instruction}\n参考资料：\n${chapterContext || globalContext}\n请用 Markdown 撰写，500-800 字。`;

            let contentBuffer = "";
            await streamChatCompletions({
                model: WRITING_MODEL_ID,
                messages: [{ role: 'user', content: writePrompt }],
                stream: true,
                temperature: 0.3
            }, (data) => {
                if (data.content) {
                    contentBuffer += data.content;
                    // 【流式渲染正文】：实时更新第 i 章的内容
                    setSections(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], content: contentBuffer };
                        return next;
                    });
                }
            });
            
            // 只有当上述内容全部完成后，循环才会进入 i + 1
        }

        setProcessingIndex(-1);
        setStatus('done');
        setMessages(prev => [...prev, { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: '✅ 报告全部章节已按序生成完毕！', 
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
