
import React, { useState, useRef, useEffect } from 'react';
import { 
    PuzzleIcon, SparklesIcon, CloudIcon, DocumentTextIcon, 
    TrashIcon, RefreshIcon, LightningBoltIcon, CheckIcon,
    GlobeIcon, LinkIcon
} from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { LlmRetrievalModal } from '../../../ui/LlmRetrievalModal';
import { UrlCrawlerModal } from '../../../ui/UrlCrawlerModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

export const InputStep: React.FC<{
    onStart: (topic: string, materials: string) => void;
    isLoading?: boolean;
    readOnly?: boolean;
    defaultValues?: { topic: string; materials: string };
}> = ({ onStart, isLoading = false, readOnly = false, defaultValues }) => {
    const [topic, setTopic] = useState(defaultValues?.topic || '');
    const [materials, setMaterials] = useState(defaultValues?.materials || '');
    
    // Resource Collections
    const [referenceFiles, setReferenceFiles] = useState<Array<{ name: string; url: string }>>([]);
    const [vectorSnippets, setVectorSnippets] = useState<Array<{ title: string; content: string }>>([]);
    const [urlArticles, setUrlArticles] = useState<Array<{ title: string; url: string; content: string }>>([]);
    
    // Modals
    const [isVectorOpen, setIsVectorOpen] = useState(false);
    const [isLlmOpen, setIsLlmOpen] = useState(false);
    const [isUrlCrawlerOpen, setIsUrlCrawlerOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (defaultValues) {
            setTopic(defaultValues.topic);
            setMaterials(defaultValues.materials);
        }
    }, [defaultValues]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadStratifyFile(file);
            setReferenceFiles(prev => [...prev, { name: res.filename, url: res.url }]);
        } catch (e) {
            alert('上传失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleStart = () => {
        if (!topic.trim()) return;

        let combined = materials;
        
        if (urlArticles.length > 0) {
            combined += "\n\n=== 网页抓取资料 ===\n";
            urlArticles.forEach((a, i) => combined += `\n[Web Ref ${i+1}: ${a.title}]\nSource: ${a.url}\n${a.content}\n`);
        }
        
        if (vectorSnippets.length > 0) {
            combined += "\n\n=== 知识库引用 ===\n";
            vectorSnippets.forEach((s, i) => combined += `\n[KB Ref ${i+1}: ${s.title}]\n${s.content}\n`);
        }
        
        if (referenceFiles.length > 0) {
            combined += "\n\n=== 附件文件 ===\n";
            referenceFiles.forEach((f, i) => combined += `\n[File ${i+1}: ${f.name}] Link: ${f.url}\n`);
        }
        
        onStart(topic, combined);
    };

    if (readOnly) {
        return (
            <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">目标技术</label>
                    <div className="text-lg font-bold text-slate-800">{topic}</div>
                </div>
                {(materials || urlArticles.length > 0 || vectorSnippets.length > 0) && (
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">参考资料摘要</label>
                        <div className="text-sm text-slate-600 line-clamp-3 bg-white p-3 rounded-lg border border-slate-200">
                            {materials.substring(0, 200)}... (包含 {urlArticles.length + vectorSnippets.length + referenceFiles.length} 个附加引用)
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-8">
                {/* 1. Topic Input */}
                <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-orange-100 focus-within:border-orange-300 transition-all">
                    <div className="px-4 py-2 border-b border-slate-50">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Target Technology
                        </label>
                    </div>
                    <input 
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="例如：固态电池电解质技术、小米SU7 800V平台..."
                        className="w-full text-lg p-4 bg-transparent border-none focus:ring-0 outline-none placeholder:text-slate-300 text-slate-800 font-bold"
                        autoFocus
                    />
                </div>

                {/* 2. Context Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-300 transition-all">
                    {/* Toolbar */}
                    <div className="bg-slate-50/80 backdrop-blur-sm p-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mr-2 ml-2">Add Context:</span>
                        
                        <button onClick={() => setIsVectorOpen(true)} className="tool-btn text-emerald-700 bg-white border-emerald-100 hover:border-emerald-300 hover:text-emerald-800">
                            <PuzzleIcon className="w-3.5 h-3.5" /> 知识库
                        </button>
                        
                        <button onClick={() => setIsLlmOpen(true)} className="tool-btn text-indigo-700 bg-white border-indigo-100 hover:border-indigo-300 hover:text-indigo-800">
                            <SparklesIcon className="w-3.5 h-3.5" /> AI 检索
                        </button>
                        
                        <button onClick={() => setIsUrlCrawlerOpen(true)} className="tool-btn text-blue-700 bg-white border-blue-100 hover:border-blue-300 hover:text-blue-800">
                            <GlobeIcon className="w-3.5 h-3.5" /> 文章链接
                        </button>
                        
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="tool-btn text-slate-700 bg-white border-slate-200 hover:border-slate-300 hover:text-slate-900">
                            {isUploading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <CloudIcon className="w-3.5 h-3.5"/>} 本地文件
                        </button>
                    </div>
                    
                    {/* Text Area */}
                    <textarea 
                        value={materials}
                        onChange={e => setMaterials(e.target.value)}
                        placeholder="在此粘贴技术参数、新闻报道、竞品数据等补充文本..."
                        className="w-full h-32 p-5 text-sm bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-600 placeholder:text-slate-300 leading-relaxed"
                    />

                    {/* Chips Area */}
                    {(referenceFiles.length > 0 || vectorSnippets.length > 0 || urlArticles.length > 0) && (
                        <div className="px-5 pb-5 flex flex-wrap gap-2 animate-in fade-in">
                            {urlArticles.map((a, i) => (
                                <div key={`url-${i}`} className="chip bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300">
                                    <GlobeIcon className="w-3.5 h-3.5 opacity-70" />
                                    <span className="truncate max-w-[150px]" title={a.title}>{a.title}</span>
                                    <button onClick={() => setUrlArticles(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500 rounded-full p-0.5 transition-colors"><TrashIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                            {vectorSnippets.map((s, i) => (
                                <div key={`snip-${i}`} className="chip bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300">
                                    <PuzzleIcon className="w-3.5 h-3.5 opacity-70" />
                                    <span className="truncate max-w-[150px]" title={s.title}>{s.title}</span>
                                    <button onClick={() => setVectorSnippets(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500 rounded-full p-0.5 transition-colors"><TrashIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                            {referenceFiles.map((f, i) => (
                                <div key={`file-${i}`} className="chip bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-400">
                                    <DocumentTextIcon className="w-3.5 h-3.5 opacity-70" />
                                    <span className="truncate max-w-[150px]" title={f.name}>{f.name}</span>
                                    <button onClick={() => setReferenceFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500 rounded-full p-0.5 transition-colors"><TrashIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Action Button */}
                <div className="pt-2">
                    <button 
                        onClick={handleStart}
                        disabled={!topic.trim() || isLoading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-orange-600 hover:shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                    >
                        {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <LightningBoltIcon className="w-5 h-5 group-hover:animate-pulse" />}
                        {isLoading ? '正在初始化...' : '启动分析引擎'}
                    </button>
                </div>
            </div>

            <style>{`
                .tool-btn { @apply px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:shadow-sm active:scale-95 flex items-center gap-1.5 shadow-sm; }
                .chip { @apply px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 animate-in zoom-in shadow-sm transition-all; }
            `}</style>

            <VectorSearchModal 
                isOpen={isVectorOpen} 
                onClose={() => setIsVectorOpen(false)} 
                onAddSnippet={s => setVectorSnippets(p => [...p, s])} 
            />
            <LlmRetrievalModal 
                isOpen={isLlmOpen} 
                onClose={() => setIsLlmOpen(false)} 
                onSuccess={f => setReferenceFiles(p => [...p, {name: f.name, url: f.url}])} 
            />
            <UrlCrawlerModal
                isOpen={isUrlCrawlerOpen}
                onClose={() => setIsUrlCrawlerOpen(false)}
                onSuccess={(articles) => setUrlArticles(prev => [...prev, ...articles])}
            />
        </div>
    );
};
