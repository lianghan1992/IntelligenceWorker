
import React, { useState } from 'react';
import { CloseIcon, LinkIcon, RefreshIcon, CheckCircleIcon, ShieldExclamationIcon, PlusIcon, GlobeIcon, ClockIcon } from '../../icons';

interface WebCrawlerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddContent: (content: string) => void;
}

interface QueueItem {
    id: string;
    url: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    title?: string;
    content?: string;
}

export const WebCrawlerModal: React.FC<WebCrawlerModalProps> = ({ isOpen, onClose, onAddContent }) => {
    const [inputUrls, setInputUrls] = useState('');
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleStart = async () => {
        const urls = inputUrls.split('\n').map(u => u.trim()).filter(u => u);
        if (urls.length === 0) return;

        // Initialize queue
        const newItems: QueueItem[] = urls.map(url => ({
            id: Math.random().toString(36).substr(2, 9),
            url,
            status: 'pending'
        }));
        setQueue(newItems);
        setIsProcessing(true);

        // Simulate processing one by one
        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];
            
            // Set Loading
            setQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'loading' } : p));
            
            // Mock API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Random success/fail for demo (mostly success)
            const isSuccess = Math.random() > 0.2;
            
            setQueue(prev => prev.map(p => p.id === item.id ? {
                ...p,
                status: isSuccess ? 'success' : 'error',
                title: isSuccess ? `Parsed Content from ${new URL(item.url).hostname}` : undefined,
                content: isSuccess ? `[Mock Extracted Content for ${item.url}]\nThis is a simulated markdown extraction result...` : undefined
            } : p));
        }

        setIsProcessing(false);
    };

    const handleConfirm = () => {
        const successfulContent = queue
            .filter(item => item.status === 'success' && item.content)
            .map(item => `--- Source: ${item.url} ---\n${item.content}`)
            .join('\n\n');
            
        if (successfulContent) {
            onAddContent(successfulContent);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 ring-1 ring-white/20">
                
                {/* Left Panel: Input */}
                <div className="w-5/12 bg-white p-8 flex flex-col border-r border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <GlobeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">从网页提取参考资料</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">使用 JINA Reader 将外部文章转化为 Markdown 上下文</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">输入文章链接 (每行一个)</label>
                        <textarea 
                            value={inputUrls}
                            onChange={e => setInputUrls(e.target.value)}
                            placeholder="https://example.com/article/1&#10;https://techcrunch.com/2024/..."
                            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-300 leading-relaxed"
                            disabled={isProcessing}
                        />
                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !inputUrls.trim()}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <LinkIcon className="w-4 h-4"/>}
                            {isProcessing ? '正在提取...' : '开始批量加载'}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Queue */}
                <div className="flex-1 bg-slate-50 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">抓取队列 ({queue.length})</h4>
                        {queue.length > 0 && (
                            <button onClick={() => setQueue([])} disabled={isProcessing} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                                清空
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {queue.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                    <ClockIcon className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-sm font-medium">待解析的链接将在此处显示进度</p>
                            </div>
                        ) : (
                            queue.map((item) => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:border-blue-200">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            item.status === 'pending' ? 'bg-slate-300' :
                                            item.status === 'loading' ? 'bg-blue-500 animate-pulse' :
                                            item.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                        }`}></div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-slate-700 truncate max-w-[300px]">{item.title || item.url}</span>
                                            {item.status === 'success' && <span className="text-[10px] text-green-600 font-medium">Ready to import</span>}
                                            {item.status === 'error' && <span className="text-[10px] text-red-500 font-medium">Failed to parse</span>}
                                            {item.status === 'loading' && <span className="text-[10px] text-blue-500 font-medium">Processing...</span>}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {item.status === 'loading' && <RefreshIcon className="w-4 h-4 text-blue-500 animate-spin" />}
                                        {item.status === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                        {item.status === 'error' && <ShieldExclamationIcon className="w-5 h-5 text-red-500" />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-white transition-colors">
                            取消
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isProcessing || !queue.some(i => i.status === 'success')}
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                        >
                            加入参考资料 ({queue.filter(i => i.status === 'success').length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
