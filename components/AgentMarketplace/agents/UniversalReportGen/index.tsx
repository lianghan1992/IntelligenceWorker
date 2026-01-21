
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

// Robust Parsing Helper: Handles JSON, Markdown, or Plain Text
const parseOutlineFromText = (text: string): { title: string; instruction: string }[] => {
    const cleanText = text.trim();
    if (!cleanText) return [];

    // 1. Try JSON first (Backwards compatibility)
    try {
        const jsonMatch = cleanText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i) || cleanText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        // Ignore JSON errors, proceed to Markdown parsing
    }

    // 2. Try Markdown Headers (## Title)
    // Matches lines starting with "## " or "1. " as titles
    const sections: { title: string; instruction: string }[] = [];
    const lines = cleanText.split('\n');
    let currentTitle = '';
    let currentDesc = '';

    const pushSection = () => {
        if (currentTitle) {
            sections.push({ 
                title: currentTitle.replace(/\*\*/g, '').trim(), 
                instruction: currentDesc.trim() || currentTitle 
            });
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();
        // Detect headers: ## Title or **Chapter 1:** or 1. Title
        const isHeader = trimmed.startsWith('## ') || trimmed.match(/^\d+\.\s+/) || (trimmed.startsWith('**') && trimmed.endsWith('**'));

        if (isHeader) {
            pushSection();
            // Clean up title
            currentTitle = trimmed
                .replace(/^##\s*/, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/^\*\*/, '')
                .replace(/\*\*$/, '')
                .replace(/:$/, '')
                .trim();
            currentDesc = '';
        } else {
            if (currentTitle) {
                currentDesc += line + '\n';
            }
        }
    }
    pushSection();

    // 3. Fallback: If no structure found, treat entire text as one section
    if (sections.length === 0) {
        return [{ 
            title: "深度分析报告", 
            instruction: cleanText.slice(0, 500) // First 500 chars as instruction context
        }];
    }

    return sections;
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
        const planLogId = addLog('正在构建深度分析研究思路...', 'plan');
        
        // Updated Prompt to request Markdown instead of JSON for better stability
        const planPrompt = `
你是一个专业的研报架构师。请根据主题【${query}】和以下背景资料，设计一个深度研究报告的大纲。
背景资料：
${context}

要求：
1. 分为 4-6 个核心章节。
2. **请直接使用 Markdown 格式输出**，不要使用 JSON。
3. 章节标题使用二级标题 (## 标题)。
4. 在每个标题下，简要描述该章节的写作重点和分析逻辑。

示例输出格式：
## 第一章：行业背景
分析当前市场环境...

## 第二章：技术架构
详解核心技术原理...
`;
        
        // Create an empty message for streaming response
        const planMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, {
            id: planMsgId,
            role: 'assistant',
            content: '正在规划研究思路...\n\n', // Initial placeholder
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

            // Use robust parser
            const parsedOutline = parseOutlineFromText(planBuffer);
            
            if (parsedOutline && parsedOutline.length > 0) {
                setOutline(parsedOutline);
                updateLogStatus(planLogId, 'done');
                
                // Start Writing Phase
                startWritingProcess(parsedOutline, context);
            } else {
                throw new Error("未能生成有效的大纲结构。");
            }
        } catch (e: any) {
             setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'system',
                content: `❌ **生成中断**\n\n原因: ${e.message}\n\n建议尝试重新输入主题，或检查网络连接。`, 
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
