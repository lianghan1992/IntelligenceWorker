
import React, { useState, useRef } from 'react';
import { 
    CloudIcon, SearchIcon, LinkIcon, CloseIcon, CheckIcon, 
    TrashIcon, RefreshIcon, DocumentTextIcon, GlobeIcon 
} from '../icons';
import { fetchJinaReader } from '../../api/intelligence';

interface KnowledgeToolsProps {
    onUpdateReference: (content: string, sourceName: string) => void;
    currentReferences: string;
}

interface ReferenceItem {
    id: string;
    type: 'file' | 'search' | 'url';
    name: string;
    status: 'processing' | 'done' | 'error';
    content?: string;
}

export const KnowledgeTools: React.FC<KnowledgeToolsProps> = ({ onUpdateReference, currentReferences }) => {
    const [items, setItems] = useState<ReferenceItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isUrlOpen, setIsUrlOpen] = useState(false);
    
    // Inputs
    const [searchKeyword, setSearchKeyword] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addReferenceItem = (type: 'file' | 'search' | 'url', name: string): string => {
        const id = crypto.randomUUID();
        setItems(prev => [...prev, { id, type, name, status: 'processing' }]);
        return id;
    };

    const updateItemStatus = (id: string, status: 'done' | 'error', content?: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, status, content } : item));
        if (status === 'done' && content) {
            onUpdateReference(content, ""); // Append happens in parent logic usually, but here we invoke callback
        }
    };

    const removeItem = (id: string) => {
        // Note: Currently we only remove visually from the list. 
        // Removing actual content from the appended string is complex without structural storage in parent.
        // For V1, we assume append-only or warn user.
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // --- 1. File Upload Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const id = addReferenceItem('file', file.name);

        try {
            // Simple text reader for now. 
            // PDF/Docx would require heavier libs (pdf.js/mammoth) which we skip for this frontend-only implementation.
            const text = await file.text();
            const formattedContent = `\n\n--- 引用文档: ${file.name} ---\n${text}\n--- 文档结束 ---\n`;
            updateItemStatus(id, 'done', formattedContent);
        } catch (err) {
            console.error(err);
            updateItemStatus(id, 'error');
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- 2. Jina Pseudo-Search Logic ---
    const handleSearch = async () => {
        if (!searchKeyword.trim()) return;
        const keyword = searchKeyword.trim();
        setIsSearchOpen(false);
        setSearchKeyword('');
        
        const id = addReferenceItem('search', `搜索: ${keyword}`);
        
        try {
            // 1. Fetch Google Results via Jina
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
            const listMarkdown = await fetchJinaReader(googleUrl);
            
            // 2. Extract Links (Heuristic regex for markdown links)
            // Matches [Title](url)
            const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
            const links: string[] = [];
            let match;
            while ((match = linkRegex.exec(listMarkdown)) !== null) {
                const url = match[2];
                // Filter garbage
                if (!url.includes('google.com') && !url.includes('jina.ai') && links.length < 5) { // Limit to top 5 for speed
                    links.push(url);
                }
            }

            if (links.length === 0) {
                throw new Error("未找到有效链接");
            }

            // 3. Concurrent Fetch Details
            const details = await Promise.all(links.map(async (link) => {
                try {
                    const content = await fetchJinaReader(link);
                    return `### 来源: ${link}\n${content.slice(0, 2000)}...`; // Truncate to save tokens
                } catch (e) {
                    return null;
                }
            }));

            const validDetails = details.filter(Boolean);
            const combined = `\n\n--- 联网搜索报告: ${keyword} ---\n${validDetails.join('\n\n')}\n--- 搜索结束 ---\n`;
            
            updateItemStatus(id, 'done', combined);
        } catch (e) {
            console.error(e);
            updateItemStatus(id, 'error');
        }
    };

    // --- 3. URL Import Logic ---
    const handleUrlImport = async () => {
        if (!urlInput.trim()) return;
        const urls = urlInput.split('\n').filter(u => u.trim());
        setIsUrlOpen(false);
        setUrlInput('');

        const id = addReferenceItem('url', `解析 ${urls.length} 个链接`);

        try {
            const results = await Promise.all(urls.map(async (url) => {
                try {
                    const content = await fetchJinaReader(url.trim());
                    return `### 外部链接: ${url}\n${content.slice(0, 3000)}`;
                } catch (e) {
                    return `### 外部链接 (失败): ${url}`;
                }
            }));
            
            const combined = `\n\n--- URL 引用集合 ---\n${results.join('\n\n')}\n--- 引用结束 ---\n`;
            updateItemStatus(id, 'done', combined);
        } catch (e) {
            updateItemStatus(id, 'error');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* File Upload Card */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col gap-2"
                >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CloudIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm">上传参考文档</h4>
                        <p className="text-xs text-slate-400 mt-1">支持 .md, .txt, .csv (PDF 仅限文本)</p>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".md,.txt,.csv,.json,.pdf"
                    />
                </button>

                {/* Search Card */}
                <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all text-left flex flex-col gap-2"
                >
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <SearchIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm">智能联网搜索</h4>
                        <p className="text-xs text-slate-400 mt-1">Jina 驱动 · 自动聚合 TOP10 结果</p>
                    </div>
                </button>

                {/* URL Card */}
                <button 
                    onClick={() => setIsUrlOpen(true)}
                    className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left flex flex-col gap-2"
                >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LinkIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm">引用外部链接</h4>
                        <p className="text-xs text-slate-400 mt-1">解析公众号、新闻等 URL 内容</p>
                    </div>
                </button>
            </div>

            {/* Status List */}
            {items.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm space-y-1 mb-6">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">已添加的知识上下文</h5>
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                                {item.status === 'processing' ? (
                                    <RefreshIcon className="w-4 h-4 text-indigo-500 animate-spin" />
                                ) : item.status === 'done' ? (
                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                    <CloseIcon className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`font-medium ${item.status === 'error' ? 'text-red-500 line-through' : 'text-slate-700'}`}>
                                    {item.name}
                                </span>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <GlobeIcon className="w-5 h-5 text-purple-600"/> 智能联网搜索
                        </h3>
                        <input 
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            placeholder="输入关键词 (e.g. 比亚迪出海战略)"
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none mb-4"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSearchOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold">取消</button>
                            <button onClick={handleSearch} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 shadow-md">开始搜索</button>
                        </div>
                    </div>
                </div>
            )}

            {isUrlOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-indigo-600"/> 批量引用链接
                        </h3>
                        <textarea 
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="请输入 URL，每行一个..."
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4 h-32 resize-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsUrlOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold">取消</button>
                            <button onClick={handleUrlImport} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md">开始解析</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
