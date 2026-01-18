
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, UserIcon, ServerIcon, RefreshIcon, 
    ArrowRightIcon, PuzzleIcon, DocumentTextIcon 
} from '../../../../components/icons';
import { streamChatCompletions, getPrompts } from '../../../../api/stratify';
import { searchSemanticSegments } from '../../../../api/intelligence';
import { TOOLS } from './tools';
import VisualEditor from '../../../shared/VisualEditor';
import { marked } from 'marked';

// --- Types ---
interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    tool_calls?: any[];
    tool_call_id?: string; // For tool role messages
    uiComponent?: React.ReactNode; // For Client-side tools (Generative UI)
}

const SCENARIO_ID = 'autonomous-tech-analysis'; // Virtual ID for fetching prompts
// Updated model as requested
const DEFAULT_MODEL = 'openrouter@xiaomi/mimo-v2-flash:free';

export default function AutonomousTechAnalysis() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState("You are an advanced technical analyst agent.");
    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Initialize: Fetch System Prompt
    useEffect(() => {
        const init = async () => {
            try {
                // Try to fetch prompts from backend, fallback to default if not found
                const prompts = await getPrompts({ scenario_id: SCENARIO_ID });
                if (prompts && prompts.length > 0) {
                    setSystemPrompt(prompts[0].content);
                }
            } catch (e) {
                console.warn("Using default prompt, failed to fetch from API.");
            }
            
            setMessages([{
                id: 'init',
                role: 'assistant',
                content: '你好，我是你的全自动技术分析助手。我可以查阅知识库，并为你生成可视化报告。请告诉我你想分析什么？'
            }]);
        };
        init();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // 2. The Core Loop
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        await processTurn([...messages, userMsg]);
    };

    const processTurn = async (history: Message[]) => {
        try {
            // Prepare messages for API (strip UI fields)
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...history.map(m => ({
                    role: m.role,
                    content: m.content || '', // Ensure content is string
                    tool_calls: m.tool_calls,
                    tool_call_id: m.tool_call_id
                }))
            ];

            let assistantMsgContent = '';
            // Fix: Use an object to track tool calls by index to handle fragmentation correctly
            let toolCallsMap: Record<number, any> = {};
            
            // Placeholder for streaming response
            const responseMsgId = crypto.randomUUID();
            setMessages(prev => [...prev, { id: responseMsgId, role: 'assistant', content: '' }]);

            await streamChatCompletions({
                model: DEFAULT_MODEL, 
                messages: apiMessages,
                tools: TOOLS,
                tool_choice: 'auto',
                stream: true
            }, (chunk) => {
                if (chunk.content) assistantMsgContent += chunk.content;
                
                // Enhanced accumulation logic for fragmented tool calls
                if (chunk.tool_calls) {
                     chunk.tool_calls.forEach((tc: any) => {
                        const idx = tc.index || 0;
                        if (!toolCallsMap[idx]) {
                            toolCallsMap[idx] = { 
                                index: idx,
                                id: tc.id || '',
                                type: tc.type || 'function',
                                function: { name: '', arguments: '' }
                            };
                        }
                        
                        if (tc.id) toolCallsMap[idx].id = tc.id;
                        if (tc.function?.name) toolCallsMap[idx].function.name = tc.function.name;
                        if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
                     });
                }

                // Update UI
                setMessages(prev => prev.map(m => 
                    m.id === responseMsgId 
                    ? { ...m, content: assistantMsgContent } 
                    : m
                ));
            });

            // Convert map back to array
            const toolCallsBuffer = Object.values(toolCallsMap);

            // 3. Handle Tool Execution (Post-Stream)
            if (toolCallsBuffer.length > 0) {
                // Update the message to formally include tool_calls
                const finalAssistantMsg: Message = { 
                    id: responseMsgId, 
                    role: 'assistant', 
                    content: assistantMsgContent,
                    tool_calls: toolCallsBuffer
                };
                
                // Fix state to ensure history is correct
                const newHistory = [...history, finalAssistantMsg];
                setMessages(newHistory);

                // Execute Tools
                for (const toolCall of toolCallsBuffer) {
                    const functionName = toolCall.function.name;
                    const argumentsStr = toolCall.function.arguments;
                    
                    let args: any = {};
                    let result = '';
                    let uiComponent = undefined;

                    try {
                        // Attempt to parse JSON arguments
                        if (!argumentsStr) throw new Error("Empty arguments");
                        args = JSON.parse(argumentsStr);
                    } catch (e) {
                         console.error("Tool Argument Parse Error:", e, argumentsStr);
                         result = `Error: Invalid JSON arguments from model. Raw: ${argumentsStr}`;
                         // Add error message to history and skip execution
                         const errorMsg: Message = {
                            id: crypto.randomUUID(),
                            role: 'tool',
                            content: result,
                            tool_call_id: toolCall.id,
                         };
                         newHistory.push(errorMsg);
                         setMessages(prev => [...prev, errorMsg]);
                         continue; 
                    }

                    if (functionName === 'search_knowledge_base') {
                        // --- SERVER API CALL ---
                        setIsLoading(true); // Keep loading state
                        try {
                            const res = await searchSemanticSegments({
                                query_text: args.query,
                                start_date: args.start_date,
                                end_date: args.end_date,
                                limit: 5
                            });
                            result = JSON.stringify(res.items?.map(i => ({ title: i.title, content: i.content, date: i.publish_date })) || []);
                        } catch (e: any) {
                            result = `Error: ${e.message}`;
                        }
                    } else if (functionName === 'render_visual_report') {
                        // --- CLIENT UI RENDER ---
                        result = "Report rendered successfully to user.";
                        uiComponent = (
                            <div className="h-[500px] w-full border border-slate-200 rounded-xl overflow-hidden my-4 shadow-lg">
                                <VisualEditor 
                                    initialHtml={args.html_content} 
                                    onSave={() => {}} 
                                    scale={0.6}
                                    hideToolbar={true} // View-only initially
                                />
                            </div>
                        );
                    }

                    // Append Tool Output to History
                    const toolMsg: Message = {
                        id: crypto.randomUUID(),
                        role: 'tool',
                        content: result,
                        tool_call_id: toolCall.id,
                        uiComponent: uiComponent
                    };
                    
                    newHistory.push(toolMsg);
                    setMessages(prev => [...prev, toolMsg]);
                }

                // 4. Recursive Call (Feed tool outputs back to LLM)
                await processTurn(newHistory);
            }

        } catch (e) {
            console.error("Agent Loop Error", e);
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', content: `Error: ${e}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Header / Info */}
            <div className="absolute top-4 right-4 z-10 opacity-50 hover:opacity-100 transition-opacity">
                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-1 rounded border border-slate-300 font-mono">
                    Model: {DEFAULT_MODEL}
                </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-indigo-600 text-white' : 
                            msg.role === 'tool' ? 'bg-slate-200 text-slate-500' : 'bg-white border border-slate-200 text-indigo-600 shadow-sm'
                        }`}>
                            {msg.role === 'user' ? <UserIcon className="w-5 h-5"/> : 
                             msg.role === 'tool' ? <ServerIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
                        </div>

                        {/* Content */}
                        <div className={`flex flex-col max-w-[80%] space-y-2`}>
                            {/* Text Bubble */}
                            {msg.content && (
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 
                                    msg.role === 'tool' ? 'bg-slate-100 text-slate-600 font-mono text-xs rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none'
                                }`}>
                                    {msg.role === 'tool' ? (
                                        <div className="flex items-center gap-2 mb-1 opacity-70">
                                            <PuzzleIcon className="w-3 h-3"/>
                                            <span className="font-bold">System Tool Output</span>
                                        </div>
                                    ) : null}
                                    <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} />
                                </div>
                            )}

                            {/* Tool Call Indicators (What the AI *wants* to do) */}
                            {msg.tool_calls?.map((tc, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 bg-white/50 px-3 py-2 rounded-lg border border-slate-200 self-start">
                                    <PuzzleIcon className="w-3 h-3 text-indigo-500"/>
                                    <span>调用工具: </span>
                                    <code className="bg-slate-100 px-1 rounded text-indigo-600">{tc.function.name}</code>
                                </div>
                            ))}

                            {/* Generative UI Components (The result of client tools) */}
                            {msg.uiComponent && (
                                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {msg.uiComponent}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                             <RefreshIcon className="w-5 h-5 animate-spin"/>
                        </div>
                        <div className="text-sm text-slate-400 self-center">正在思考...</div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="max-w-4xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="输入您的指令，例如：'搜索小米汽车最新的电池技术，并生成一份分析报告'..."
                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none shadow-inner"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md"
                    >
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
