
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon 
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

// --- Thinking Component ---
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when streaming
    useEffect(() => {
        if (isStreaming && isExpanded && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    if (!content) return null;

    return (
        <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/50 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
            >
                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    <div 
                        ref={scrollRef}
                        className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar border-l-2 border-indigo-200 pl-2"
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
        
        // 1. Construct History Context
        // If refinement, we include previous history. If new, we start fresh-ish context.
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
        setHistory(prev => [
            ...prev, 
            { role: 'assistant', content: '', reasoning: '', id: assistantMsgId } // Add placeholder
        ]);

        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            // 3. Call Stream API
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600"); // Outline Prompt (Or use default model)
            const modelToUse = `${prompt.channel_code}@${prompt.model_id}`;

            await streamChatCompletions({
                model: modelToUse, 
                messages: apiMessages,
                stream: true
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;

                // Update the last message in history
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
            });

            // 4. Post-Process (Parse JSON)
            try {
                // Remove potential markdown blocks if LLM ignores instructions
                const jsonStr = accumulatedContent.replace(/```json|```/g, '').trim();
                const parsedOutline = JSON.parse(jsonStr);
                
                if (parsedOutline.title && Array.isArray(parsedOutline.pages)) {
                    setData(prev => ({
                        ...prev,
                        topic: parsedOutline.title,
                        outline: parsedOutline
                    }));
                    
                    // Switch to outline stage if not already, to show the result on the right
                    if (stage === 'collect') {
                        setStage('outline');
                    }
                    
                    // Update the chat message to look cleaner (optional: hide raw JSON, show summary)
                    setHistory(prev => {
                        const newHistory = [...prev];
                        const lastIdx = newHistory.length - 1;
                        newHistory[lastIdx].content = isRefinement 
                            ? `已根据您的意见更新大纲：**${parsedOutline.title}** (共 ${parsedOutline.pages.length} 页)。\n请在右侧确认大纲结构。`
                            : `大纲已生成：**${parsedOutline.title}**。\n请在右侧查看完整结构，如有需要可直接告诉我调整意见（例如：“删除第三章”、“增加市场分析页”）。`;
                        return newHistory;
                    });
                }
            } catch (e) {
                console.error("JSON Parse Error", e);
                setHistory(prev => [...prev, { role: 'assistant', content: "生成的内容格式有误，请重试。" }]);
            }

        } catch (e) {
            console.error("Generation Error", e);
            setHistory(prev => [...prev, { role: 'assistant', content: "服务连接失败，请稍后再试。" }]);
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Handlers ---

    const handleSend = async () => {
        if (!input.trim() || isLlmActive) return;
        const userInput = input;
        setInput('');

        // 1. Add User Message to UI
        setHistory(prev => [...prev, { role: 'user', content: userInput }]);

        // 2. Dispatch Logic
        if (stage === 'collect') {
            // Initial Generation
            await runOutlineGeneration(userInput, false);
        } else if (stage === 'outline') {
            // Refinement
            await runOutlineGeneration(`Update the outline based on this feedback: ${userInput}`, true);
        } else {
            // Chat during Compose/Finalize (Simple Chat)
            setHistory(prev => [...prev, { role: 'assistant', content: '进入生成阶段后，暂不支持大纲级别的结构调整。' }]);
        }
    };

    // --- Renderers ---

    const renderChatBubbles = () => (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar-dark" ref={scrollRef}>
            {history.filter(m => !m.hidden).map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                        max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm
                        ${msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
                        }
                    `}>
                        {/* Render Thinking Block for Assistant */}
                        {msg.role === 'assistant' && msg.reasoning && (
                            <ThinkingBlock 
                                content={msg.reasoning} 
                                isStreaming={isLlmActive && i === history.length - 1} 
                            />
                        )}
                        
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                </div>
            ))}
             {history.length === 0 && (
                <div className="mt-20 text-center text-slate-500 px-6">
                    <SparklesIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">请输入您的研报主题，AI 将进行深度思考并构建大纲。</p>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {['小米汽车 SU7 竞品分析', '固态电池技术趋势', '2024 新能源出海报告'].map(t => (
                            <button key={t} onClick={() => { setInput(t); /* auto trigger logic if needed */ }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 border border-slate-700 transition-colors">
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#0f172a]">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-700/50 flex items-center justify-between bg-[#0f172a] shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-slate-100 tracking-tight">AI Co-Pilot</span>
                </div>
                <button onClick={onReset} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                    重置
                </button>
            </div>

            {/* Dynamic Content Area */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                
                {/* Always render ChatBubbles */}
                {renderChatBubbles()}

                {/* Input Area */}
                <div className="p-4 bg-[#0f172a] border-t border-slate-700/50 z-20 flex-shrink-0">
                    <div className="relative">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={stage === 'collect' ? "输入研报主题..." : "输入修改意见..."}
                            className="w-full bg-slate-800 text-white placeholder:text-slate-500 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner"
                            disabled={isLlmActive}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLlmActive}
                            className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-slate-700"
                        >
                            {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
