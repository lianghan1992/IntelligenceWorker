
import React, { useState, useRef } from 'react';
import { 
    BrainIcon, DocumentTextIcon, PuzzleIcon, SparklesIcon, 
    TrashIcon, PlusIcon, ArrowRightIcon 
} from '../../icons';
import { VectorSearchModal } from '../ui/VectorSearchModal';
import { uploadStratifyFile } from '../../../api/stratify';

export const ContextCollector: React.FC<{
    onStart: (idea: string, context: any) => void;
    isProcessing: boolean;
}> = ({ onStart, isProcessing }) => {
    const [idea, setIdea] = useState('');
    const [files, setFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
    const [snippets, setSnippets] = useState<Array<{ title: string; content: string }>>([]);
    
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadStratifyFile(file);
            setFiles(prev => [...prev, { name: res.filename, url: res.url, type: res.type }]);
        } catch (e) {
            alert('上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddSnippet = (s: { title: string; content: string }) => {
        setSnippets(prev => [...prev, s]);
    };

    return (
        <div className="flex-1 flex flex-col items-center p-8 md:p-16 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                <header className="text-center space-y-4">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">收集报告上下文</h2>
                    <p className="text-slate-500 font-medium">输入核心想法，并关联参考资料（文件或情报库片段）以增强 AI 的分析深度。</p>
                </header>

                <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-2xl shadow-slate-200/50 p-2 focus-within:border-indigo-500 transition-all">
                    <textarea 
                        value={idea}
                        onChange={e => setIdea(e.target.value)}
                        placeholder="在此描述您的报告需求..."
                        className="w-full h-48 p-6 text-lg border-none focus:ring-0 outline-none resize-none text-slate-800"
                    />

                    {/* Content Tray */}
                    {(files.length > 0 || snippets.length > 0) && (
                        <div className="px-6 py-4 bg-slate-50 rounded-2xl mx-2 mb-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 group">
                                    <DocumentTextIcon className="w-4 h-4 text-blue-500" />
                                    <span className="max-w-[120px] truncate">{f.name}</span>
                                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><TrashIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                            {snippets.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 group">
                                    <PuzzleIcon className="w-4 h-4 text-emerald-500" />
                                    <span className="max-w-[120px] truncate">{s.title}</span>
                                    <button onClick={() => setSnippets(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><TrashIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl">
                        <div className="flex items-center gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.csv" />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="上传本地文档 (PDF/Word/Images)"
                            >
                                <DocumentTextIcon className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={() => setIsVectorModalOpen(true)}
                                className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="检索情报库片段"
                            >
                                <PuzzleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <button 
                            onClick={() => onStart(idea, { files, vector_snippets: snippets })}
                            disabled={!idea.trim() || isProcessing || isUploading}
                            className="px-10 py-3.5 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <BrainIcon className="w-5 h-5" />}
                            立即构思
                        </button>
                    </div>
                </div>
            </div>

            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={handleAddSnippet}
            />
        </div>
    );
};
