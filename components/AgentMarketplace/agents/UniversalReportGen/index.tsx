
import React, { useState, useRef, useCallback } from 'react';
import { streamChatCompletions, createSession, updateSession } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { SharedChatPanel, ChatMessage } from '../../../../components/shared/ChatPanel';
import { ReportCanvas, ResearchLog, ReportSection } from './ReportCanvas';

interface UniversalReportGenProps {
    onBack: () => void;
}

// Config
const MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free"; 
const AGENT_ID = AGENTS.UNIVERSAL_REPORT_GEN;

// Enhanced JSON Helper to handle markdown code blocks
const extractJsonArray = (text: string): any[] | null => {
    if (!text) return null;
    let clean = text.trim();
    
    // 1. Remove markdown code blocks if present
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = clean.match(codeBlockRegex);
    if (match) {
        clean = match[1].trim();
    }
    
    // 2. Find first [ and last ] to locate array
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    
    if (start === -1 || end === -1 || start >= end) return null;
    
    try {
        const jsonStr = clean.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parse Error", e);
        return null;
    }
};

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
    
    // Session
    const [sessionId, setSessionId] = useState<string | null>(null);
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

        // Add User Message
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        // If idle, start the whole process
        if (status === 'idle') {
            setTopic(text);
            startResearchProcess(text);
        } else {
            setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: '当前版本暂不支持中途插话修改，请等待报告生成完毕。', 
                timestamp: Date.now() 
            }]);
        }
    };

    const startResearchProcess = async (query: string) => {
        setStatus('researching');
        abortRef.current = false;
        
        // 1. Research Phase
        const searchLogId = addLog(`正在检索关于 "${query}" 的核心资料...`, 'search');
        
        let context = "";
        try {
            const searchRes = await searchSemanticBatchGrouped({
                query_texts: [query, `${query} 市场规模`, `${query} 技术趋势`],
                max_segments_per_query: 5
            });
            updateLogStatus(searchLogId, 'done');
            
            const items = searchRes.results?.[0]?.items || [];
            const refs = items.flatMap((art: any) => art.segments.map((seg: any) => seg.content));
            context = refs.join('\n\n').slice(0, 5000); // Limit context
            
            if (refs.length > 0) {
                 const readLogId = addLog(`已阅读 ${refs.length} 条相关情报片段`, 'read');
                 setTimeout(() => updateLogStatus(readLogId, 'done'), 800);
            }
        } catch (e) {
            console.error("Search failed", e);
            updateLogStatus(searchLogId, 'done'); // Continue anyway
        }

        // 2. Planning Phase
        setStatus('planning');
        const planLogId = addLog('正在构建深度分析大纲...', 'plan');
        
        const planPrompt = `
你是一个专业的研报架构师。请根据主题【${query}】和以下背景资料，设计一个深度研究报告的研究思路。
背景资料：
${context}

要求：
1. 分为 4-6 个核心章节。
2. 输出纯 JSON 数组格式，不要包含任何 markdown 格式代码块，只返回 JSON：[{"title": "...", "instruction": "..."}]。
`;
        
        // Create an empty message for streaming response
        const planMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, {
            id: planMsgId,
            role: 'assistant',
            content: '正在规划研究思路...',
            isThinking: true,
            timestamp: Date.now()
        }]);

        let planBuffer = "";
        try {
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [{ role: 'user', content: planPrompt }],
                stream: true,
                temperature: 0.3
            }, (data) => {
                if (data.content) {
                    planBuffer += data.content;
                    // Stream updates to chat UI so user sees progress
                    setMessages(prev => prev.map(m => m.id === planMsgId ? { ...m, content: planBuffer } : m));
                }
            });
            
            // Mark thinking as done
            setMessages(prev => prev.map(m => m.id === planMsgId ? { ...m, isThinking: false } : m));

            const parsedOutline = extractJsonArray(planBuffer);
            if (parsedOutline && Array.isArray(parsedOutline)) {
                setOutline(parsedOutline);
                updateLogStatus(planLogId, 'done');
                
                // Start Writing Phase
                startWritingProcess(parsedOutline, context);
            } else {
                console.error("Failed to parse outline:", planBuffer);
                throw new Error("大纲生成格式错误，无法解析 JSON。");
            }
        } catch (e: any) {
             setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: `大纲生成遇到问题: ${e.message}。请重试。`, 
                timestamp: Date.now() 
            }]);
            setStatus('idle');
        }
    };

    const startWritingProcess = async (outlineItems: { title: string; instruction: string }[], context: string) => {
        setStatus('generating');
        
        // Initialize sections
        const initialSections = outlineItems.map(item => ({ title: item.title, content: '' }));
        setSections(initialSections);

        for (let i = 0; i < outlineItems.length; i++) {
            if (abortRef.current) break;
            
            const item = outlineItems[i];
            const writePrompt = `
你是一位资深行业分析师。正在撰写报告【${topic}】的章节。
当前章节：【${item.title}】
写作要求：${item.instruction}
参考资料：
${context}

请撰写本章节内容。使用 Markdown 格式。字数 300-600 字。
`;
            let sectionContent = "";
            
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [{ role: 'user', content: writePrompt }],
                stream: true,
                temperature: 0.4
            }, (data) => {
                if (data.content) {
                    sectionContent += data.content;
                    setSections(prev => {
                        const newSecs = [...prev];
                        newSecs[i] = { ...newSecs[i], content: sectionContent };
                        return newSecs;
                    });
                }
            });
        }
        
        setStatus('done');
        setMessages(prev => [...prev, { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: '报告已生成完毕！您可以在左侧预览。', 
            timestamp: Date.now() 
        }]);
    };

    return (
        <div className="flex h-full w-full bg-[#f8fafc]">
            {/* Left: Visualization Canvas */}
            <div className="flex-1 overflow-hidden border-r border-slate-200 relative">
                <ReportCanvas 
                    status={status}
                    logs={logs}
                    outline={outline}
                    sections={sections}
                    topic={topic}
                />
            </div>

            {/* Right: Chat Panel */}
            <div className="w-[400px] flex-shrink-0 bg-white shadow-xl z-10 h-full">
                <SharedChatPanel 
                    messages={messages}
                    onSendMessage={handleUserMessage}
                    isGenerating={status === 'researching' || status === 'planning'}
                    placeholder="输入研究主题..."
                    title="研报助手 Copilot"
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;
