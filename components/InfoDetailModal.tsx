import React, { useMemo, useState } from 'react';
import { InfoItem } from '../types';
import { CloseIcon, SparklesIcon, DocumentTextIcon, TimelineIcon } from './icons';

interface InfoDetailModalProps {
    item: InfoItem;
    allItems: InfoItem[]; // Pass all items to find related ones for the storyline
    onClose: () => void;
}

const markdownToHtml = (markdown: string): string => {
    return markdown
        ? markdown.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('')
        : '<p>无内容摘要。</p>';
};

const ContextualStoryline: React.FC<{ currentItem: InfoItem, allItems: InfoItem[] }> = ({ currentItem, allItems }) => {
    // This is a MOCK implementation to demonstrate the UX.
    // A real implementation would involve a dedicated API call.
    const mockTimeline = useMemo(() => {
        const pastItem = allItems.find(i => i.id !== currentItem.id && i.entities?.some(e => currentItem.entities?.includes(e)) && new Date(i.publish_date) < new Date(currentItem.publish_date));
        const futurePrediction = {
            title: "AI预测：该事件可能推动相关标准加速统一",
            date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
        };
        
        const timeline = [];
        if (pastItem) {
            timeline.push({ type: 'past', title: `[相关历史] ${pastItem.title}`, date: new Date(pastItem.publish_date).toLocaleDateString('zh-CN') });
        } else {
            timeline.push({ type: 'past', title: '[相关历史] 蔚来首次提出换电联盟概念', date: '2023-11-20' });
        }
        
        timeline.push({ type: 'current', title: currentItem.title, date: new Date(currentItem.publish_date).toLocaleDateString('zh-CN') });
        timeline.push({ type: 'future', title: `[未来预判] ${futurePrediction.title}`, date: new Date(futurePrediction.date).toLocaleDateString('zh-CN') });

        return timeline;
    }, [currentItem, allItems]);
    
    return (
        <div className="mt-6">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <TimelineIcon className="w-5 h-5 text-blue-600" />
                情境故事线
            </h4>
            <div className="relative border-l-2 border-blue-200 ml-3 pl-6 space-y-6">
                {mockTimeline.map((event, index) => (
                    <div key={index} className="relative">
                        <div className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full border-4 ${event.type === 'current' ? 'bg-blue-500 border-white ring-4 ring-blue-500' : 'bg-white border-blue-500'}`}></div>
                        <p className={`font-semibold ${event.type === 'current' ? 'text-blue-700' : 'text-gray-800'}`}>{event.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const InfoDetailModal: React.FC<InfoDetailModalProps> = ({ item, allItems, onClose }) => {
    const [activeTab, setActiveTab] = useState<'analysis' | 'original'>('analysis');

    const source = {
        name: item.source_name,
        iconUrl: `https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`,
    };
    const [imgError, setImgError] = React.useState(false);

    const contentHtml = useMemo(() => markdownToHtml(item.content), [item.content]);
    const keyTakeaways = useMemo(() => {
        // Mock implementation: take first 2-3 sentences.
        if (!item.content) return ["AI未能提取关键观点。"];
        const sentences = item.content.split('。').filter(s => s.trim());
        return sentences.slice(0, 2).map(s => s.trim() + '。');
    }, [item.content]);

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        {imgError ? (
                             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">{source.name.charAt(0)}</div>
                        ) : (
                             <img src={source.iconUrl} alt={source.name} className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" onError={() => setImgError(true)} />
                        )}
                         <div className="overflow-hidden">
                            <h3 className="text-md font-semibold text-gray-800 truncate">{item.title}</h3>
                            <p className="text-xs text-gray-500">{source.name} - {new Date(item.publish_date || item.created_at).toLocaleString('zh-CN')}</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon className="w-5 h-5" /></button>
                </div>

                <div className="border-b px-6 pt-3">
                    <div className="flex space-x-4">
                        <button onClick={() => setActiveTab('analysis')} className={`py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>AI 分析</button>
                        <button onClick={() => setActiveTab('original')} className={`py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'original' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>原文内容</button>
                    </div>
                </div>

                <div className="flex-1 bg-gray-50 overflow-y-auto p-6 lg:p-8">
                    {activeTab === 'analysis' ? (
                        <div className="animate-in fade-in-0 duration-300">
                             <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                                <SparklesIcon className="w-5 h-5 text-blue-600" />
                                关键观点提取
                            </h4>
                            <div className="space-y-2 text-gray-700 bg-white border p-4 rounded-lg">
                                {keyTakeaways.map((p, i) => <p key={i}>• {p}</p>)}
                            </div>
                            <ContextualStoryline currentItem={item} allItems={allItems} />
                        </div>
                    ) : (
                         <article 
                            className="prose prose-slate max-w-none animate-in fade-in-0 duration-300
                                       prose-h2:font-semibold prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                                       prose-p:leading-relaxed prose-strong:font-semibold"
                            dangerouslySetInnerHTML={{ __html: contentHtml }}
                        />
                    )}
                </div>
                 <div className="px-6 py-3 bg-white border-t flex justify-end">
                     <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                        打开原文链接
                     </a>
                </div>
            </div>
        </div>
    );
};
