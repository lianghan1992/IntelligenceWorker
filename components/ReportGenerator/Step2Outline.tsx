
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { ViewGridIcon, CheckIcon } from '../icons';
import { ChatMessage } from './types';

interface Step2OutlineProps {
    history: ChatMessage[];
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onLlmStatusChange: (isActive: boolean) => void;
    onStreamingUpdate: (msg: ChatMessage | null) => void;
    onConfirm: (outline: StratifyOutline) => void;
}

const extractCompletedPages = (jsonStr: string): any[] => {
    try {
        const pagesStartMatch = jsonStr.match(/"pages"\s*:\s*\[/);
        if (!pagesStartMatch || typeof pagesStartMatch.index === 'undefined') return [];
        const arrayStartIndex = pagesStartMatch.index + pagesStartMatch[0].length;
        const arrayContent = jsonStr.slice(arrayStartIndex);
        
        let balance = 0, objectStartIndex = -1, foundObjects: any[] = [];
        for (let i = 0; i < arrayContent.length; i++) {
            const char = arrayContent[i];
            if (char === '{') {
                if (balance === 0) objectStartIndex = i;
                balance++;
            } else if (char === '}') {
                balance--;
                if (balance === 0 && objectStartIndex !== -1) {
                    const objStr = arrayContent.substring(objectStartIndex, i + 1);
                    try {
                        const obj = JSON.parse(objStr);
                        if (obj.title) foundObjects.push(obj);
                    } catch (e) {}
                    objectStartIndex = -1;
                }
            }
        }
        return foundObjects;
    } catch (e) { return []; }
};

export const Step2Outline: React.FC<Step2OutlineProps> = ({ history, onHistoryUpdate, onLlmStatusChange, onStreamingUpdate, onConfirm }) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const lastProcessedLen = useRef(0);

    const runLlm = async (currentHistory: ChatMessage[]) => {
        onLlmStatusChange(true);
        onStreamingUpdate({ role: 'assistant', content: '', reasoning: '' });
        
        let accumulatedText = '', accumulatedReasoning = '';
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: currentHistory.map(m => ({ role: m.role, content: m.content })),
                stream: true
            }, (data) => {
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                if (data.content) accumulatedText += data.content;

                // 实时同步到左侧聊天面板
                onStreamingUpdate({ 
                    role: 'assistant', 
                    content: accumulatedText.includes('{') ? "正在规划大纲结构..." : accumulatedText, 
                    reasoning: accumulatedReasoning 
                });

                // 实时解析右侧大纲预览
                const pages = extractCompletedPages(accumulatedText);
                const titleMatch = accumulatedText.match(/"title"\s*:\s*"(.*?)"/);
                if (pages.length > 0 || titleMatch) {
                    setOutline({ title: titleMatch ? titleMatch[1] : '报告大纲', pages });
                }
            }, () => {
                onLlmStatusChange(false);
                const finalMsg: ChatMessage = { 
                    role: 'assistant', 
                    content: "大纲已根据您的要求重新规划，请确认或继续提出修改意见。", 
                    reasoning: accumulatedReasoning 
                };
                onHistoryUpdate([...currentHistory, finalMsg]);
                onStreamingUpdate(null);
            }, (err) => {
                onLlmStatusChange(false);
                onStreamingUpdate(null);
                alert('生成失败: ' + err.message);
            });
        } catch (e) { 
            onLlmStatusChange(false);
            onStreamingUpdate(null);
        }
    };

    // 监听历史记录，如果最后一条是 user 发出的，则触发生成
    useEffect(() => {
        if (history.length > lastProcessedLen.current) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'user') {
                runLlm(history);
            }
            lastProcessedLen.current = history.length;
        }
    }, [history]);

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                        {outline?.title || (outline === null ? '等待输入主题...' : '正在生成中...')}
                    </h2>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{outline?.pages.length || 0} SECTIONS PLANNED</p>
                </div>
                <button 
                    onClick={() => outline && onConfirm(outline)}
                    disabled={!outline || outline.pages.length === 0}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                    确认并开始创作 <CheckIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-4">
                    {outline ? outline.pages.map((page, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex gap-5 animate-in slide-in-from-bottom-2">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center font-black text-indigo-600">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-base mb-1 truncate">{page.title}</h4>
                                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{page.content}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-300">
                            <ViewGridIcon className="w-12 h-12 animate-pulse" />
                            <p className="text-sm font-bold">请在左侧对话框输入您的想法...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
