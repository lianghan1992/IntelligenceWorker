
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { PPTStage, ChatMessage, PPTData } from './types';

interface CopilotSidebarProps {
    stage: PPTStage;
    setStage: (s: PPTStage) => void;
    history: ChatMessage[];
    setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    data: PPTData;
    setData: React.Dispatch<React.SetStateAction<PPTData>>;
    isLlmActive: boolean;
    setIsLlmActive: (b: boolean) => void;
    activePageIndex: number;
    setActivePageIndex: (n: number) => void;
    onReset: () => void;
}

// --- Helper: Try to parse incomplete JSON for real-time updates ---
// This is a heuristic parser to allow "streaming" feel on the canvas
const tryParsePartialJson = (jsonStr: string) => {
    try {
        // 1. Clean markdown code blocks
        let cleanStr = jsonStr.replace(/```json|```/g, '').trim();
        
        // 2. Simple heuristic to close open brackets/braces to make it valid JSON
        // We count opens and closes and append the difference.
        // Note: This assumes the JSON structure is relatively clean (which LLMs usually provide)
        const openBraces = (cleanStr.match(/{/g) || []).length;
        const closeBraces = (cleanStr.match(/}/g) || []).length;
        const openBrackets = (cleanStr.match(/\[/g) || []).length;
        const closeBrackets = (cleanStr.match(/]/g) || []).length;

        // Naive closing strategy: Close arrays first, then objects
        // (This works for the specific structure of { title: "", pages: [...] })
        for (let i = 0; i < (openBrackets - closeBrackets); i++) cleanStr += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) cleanStr += '}';

        return JSON.parse(cleanStr);
    } catch (e) {
        return null;
    }
};

// --- Thinking Component (Light Theme) ---
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isStreaming && isExpanded && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    if (!content) return null;

    return (
        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    <div 
                        ref={scrollRef}
                        className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar border-l-2 border-indigo-200 pl-3 italic"
                    >
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
    stage, setStage, history, setHistory, data, setData, 
    isLlmActive, setIsLlmActive, activePageIndex, setActivePageIndex, onReset
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage, isLlmActive]);

    // --- Core Logic: Generate or Refine Outline ---
    const runOutlineGeneration = async (userPromptText: string, isRefinement: boolean) => {
        setIsLlmActive(true);
        
        // 1. Construct Context
        const contextMessages = isRefinement 
            ? history.map(m => ({ role: m.role, content: m.content })) 
            : []; 

        const systemMsg = { 
            role: 'system', 
            content: `You are an expert presentation outline generator. 
            User Input: "${userPromptText}".
            
            Task: Create or Refine a hierarchical outline for a presentation/report.
            Output Format: STRICT JSON ONLY. No markdown code blocks. No conversational filler.
            Structure: { "title": "...", "pages": [ { "title": "...", "content": "Brief summary of key points..." }, ... ] }
            
            If this is a refinement request, modify the existing outline based on the user's feedback. Keep the JSON structure.`
        };

        const apiMessages = [
            systemMsg,
            ...contextMessages,
            { role: 'user', content: userPromptText }
        ];

        // 2. Prepare UI State
        const assistantMsgId = Date.now().toString();
        // Placeholder message
        setHistory(prev => [
            ...prev, 
            { role: 'assistant', content: '', reasoning: '', id: assistantMsgId } 
        ]);

        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            // 3. Call Stream API
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600"); 
            const modelToUse = `${prompt.channel_code}@${prompt.model_id}`;

            await streamChatCompletions({
                model: modelToUse, 
                messages: apiMessages,
                stream: true
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;

                // A. Update Chat History (Text updates)
                setHistory(prev => {
                    const newHistory = [...prev];
                    const lastIdx = newHistory.length - 1;
                    newHistory[lastIdx] = {
                        ...newHistory[lastIdx],
                        reasoning: accumulatedReasoning,
                        content: accumulatedContent
                    };
                    return newHistory;
                });

                // B. Real-time Canvas Update (Partial JSON Parsing)
                // We try to parse the accumulation to update the right side dynamically
                if (accumulatedContent.trim().startsWith('{') || accumulatedContent.includes('"pages":')) {
                    const partialOutline = tryParsePartialJson(accumulatedContent);
                    if (partialOutline && partialOutline.pages && Array.isArray(partialOutline.pages)) {
                        setData(prev => ({
                            ...prev,
                            // Only update title if present in partial
                            topic: partialOutline.title || prev.topic,
                            outline: partialOutline
                        }));
                        
                        // Switch to outline stage immediately once we have some data to show
                        if (stage === 'collect') {
                            setStage('outline');
                        }
                    }
                }
            });

            // 4. Final Post-Process (Ensure Clean JSON)
            try {
                const jsonStr = accumulatedContent.replace(/```json|```/g, '').trim();
                const parsedOutline = JSON.parse(jsonStr);
                
                if (parsedOutline.title && Array.isArray(parsedOutline.pages)) {
                    setData(prev => ({
                        ...prev,
                        topic: parsedOutline.title,
                        outline: parsedOutline
                    }));
                    
                    if (stage === 'collect') setStage('outline');
                }
            } catch (e) {
                console.error("Final Parse Error", e);
                // Don't show error in chat if we have partial data on screen
            }

        } catch (e) {
            console.error("Generation Error", e);
            setHistory(prev => [...prev, { role: 'assistant', content: "网络连接不稳定，请重试。" }]);
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Handlers ---

    const handleSend = async () => {
        if (!input.trim() || isLlmActive) return;
        const userInput = input;
        setInput('');

        // 1. Add User Message
        setHistory(prev => [...prev, { role: 'user', content: userInput }]);

        // 2. Dispatch Logic
        if (stage === 'collect') {
            await runOutlineGeneration(userInput, false);
        } else if (stage === 'outline') {
            await runOutlineGeneration(`Update the outline based on this feedback: ${userInput}`, true);
        } else {
            setHistory(prev => [...prev, { role: 'assistant', content: '当前阶段主要关注内容生成，如需调整大纲结构，请点击上方“返回修改”按钮。' }]);
        }
    };

    // --- Renderers ---

    const renderMessageContent = (msg: ChatMessage) => {
        // Heuristic: If content looks like the JSON outline, hide it and show a UI card instead
        const trimmed = msg.content.trim();
        // Check for JSON-like structure (starts with { or code block) AND contains "pages" key
        const isJsonOutline = (trimmed.startsWith('{') && trimmed.includes('"pages"')) || 
                              (trimmed.startsWith('```') && trimmed.includes('"pages"'));

        if (msg.role === 'assistant' && isJsonOutline) {
            // Check if it's the last message and still streaming (show different status)
            const isLastAndActive = isLlmActive && history[history.length - 1] === msg;
            
            return (
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLastAndActive ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                        {isLastAndActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <CheckCircleIcon className="w-4 h-4" />}
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-800">
                            {isLastAndActive ? '正在规划大纲结构...' : '大纲构建完成'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            {isLastAndActive ? 'AI 正在实时更新右侧画布' : '请在右侧查看完整大纲并确认'}
                        </div>
                    </div>
                </div>
            );
        }
        
        return <div className="whitespace-pre-wrap">{msg.content}</div>;
    };

    const renderChatBubbles = () => (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
            {history.filter(m => !m.hidden).map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                        max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm border
                        ${msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm border-indigo-600' 
                            : 'bg-white text-slate-700 border-slate-200 rounded-tl-sm'
                        }
                    `}>
                        {/* Thinking Block */}
                        {msg.role === 'assistant' && msg.reasoning && (
                            <ThinkingBlock 
                                content={msg.reasoning} 
                                isStreaming={isLlmActive && i === history.length - 1} 
                            />
                        )}
                        
                        {/* Content or UI Placeholder */}
                        {renderMessageContent(msg)}
                    </div>
                </div>
            ))}
             {history.length === 0 && (
                <div className="mt-20 text-center text-slate-400 px-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <SparklesIcon className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-slate-700 mb-2">AI 研报助手</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        请输入您的研报主题，我将为您进行深度思考，并构建专业的分析框架。
                    </p>
                    <div className="mt-8 flex flex-wrap gap-2 justify-center">
                        {['小米汽车 SU7 竞品分析', '2024 固态电池技术趋势', '中国新能源汽车出海报告'].map(t => (
                            <button key={t} onClick={() => { setInput(t); }} className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full text-xs text-slate-600 transition-colors shadow-sm">
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] border-r border-slate-200">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight text-sm">Auto Insight</span>
                </div>
                <button onClick={onReset} className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors px-2 py-1 hover:bg-slate-100 rounded-md">
                    重置
                </button>
            </div>

            {/* Dynamic Content Area */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                {renderChatBubbles()}

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200 z-20 flex-shrink-0">
                    <div className="relative shadow-sm rounded-xl">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={stage === 'collect' ? "输入研报主题..." : "输入修改意见 (如: 增加市场规模章节)..."}
                            className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            disabled={isLlmActive}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLlmActive}
                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-slate-300 shadow-sm"
                        >
                            {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                        AI 生成内容仅供参考，请核实重要数据。
                    </p>
                </div>
            </div>
        </div>
    );
};
