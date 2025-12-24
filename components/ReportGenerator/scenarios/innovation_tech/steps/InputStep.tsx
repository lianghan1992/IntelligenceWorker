
import React, { useState, useRef, useEffect } from 'react';
import { 
    PuzzleIcon, SparklesIcon, CloudIcon, DocumentTextIcon, 
    TrashIcon, RefreshIcon, LightningBoltIcon, CheckIcon 
} from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { LlmRetrievalModal } from '../../../ui/LlmRetrievalModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

export const InputStep: React.FC<{
    onStart: (topic: string, materials: string) => void;
    isLoading?: boolean;
    readOnly?: boolean;
    defaultValues?: { topic: string; materials: string };
}> = ({ onStart, isLoading = false, readOnly = false, defaultValues }) => {
    const [topic, setTopic] = useState(defaultValues?.topic || '');
    const [materials, setMaterials] = useState(defaultValues?.materials || '');
    const [referenceFiles, setReferenceFiles] = useState<Array<{ name: string; url: string }>>([]);
    const [vectorSnippets, setVectorSnippets] = useState<Array<{ title: string; content: string }>>([]);
    
    const [isVectorOpen, setIsVectorOpen] = useState(false);
    const [isLlmOpen, setIsLlmOpen] = useState(false);
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
        if (vectorSnippets.length > 0) {
            combined += "\n\n=== 知识库引用 ===\n";
            vectorSnippets.forEach((s, i) => combined += `\n[Ref ${i+1}: ${s.title}]\n${s.content}\n`);
        }
        if (referenceFiles.length > 0) {
            combined += "\n\n=== 附件文件 ===\n";
            referenceFiles.forEach((f, i) => combined += `\n[File ${i+1}: ${f.name}] Link: ${f.url}\n`);
        }
        onStart(topic, combined);
    };

    if (readOnly) {
        return (
            <div className="p-6 bg-slate-50/50">
                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">目标技术</label>
                    <div className="text-lg font-bold text-slate-800">{topic}</div>
                </div>
                {materials && (
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">参考资料摘要</label>
                        <div className="text-sm text-slate-600 line-clamp-3 bg-white p-3 rounded-lg border border-slate-200">
                            {materials}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="space-y-6">
                {/* Topic Input */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        分析目标 <span className="text-red-500">*</span>
                    </label>
                    <input 
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="例如：固态电池电解质技术..."
                        className="w-full text-lg p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm"
                        autoFocus
                    />
                </div>

                {/* Materials Input */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700">补充资料</label>
                        <div className="flex gap-2">
                            <button onClick={() => setIsVectorOpen(true)} className="tool-btn text-emerald-600 bg-emerald-50 border-emerald-100">
                                <PuzzleIcon className="w-3.5 h-3.5" /> 知识库
                            </button>
                            <button onClick={() => setIsLlmOpen(true)} className="tool-btn text-indigo-600 bg-indigo-50 border-indigo-100">
                                <SparklesIcon className="w-3.5 h-3.5" /> AI
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="tool-btn text-blue-600 bg-blue-50 border-blue-100">
                                {isUploading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <CloudIcon className="w-3.5 h-3.5"/>} 本地
                            </button>
                        </div>
                    </div>
                    
                    <textarea 
                        value={materials}
                        onChange={e => setMaterials(e.target.value)}
                        placeholder="在此粘贴技术参数、新闻报道或竞品信息..."
                        className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    />

                    {/* Chips */}
                    {(referenceFiles.length > 0 || vectorSnippets.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {referenceFiles.map((f, i) => (
                                <div key={`f-${i}`} className="chip bg-blue-50 text-blue-700 border-blue-100">
                                    <DocumentTextIcon className="w-3 h-3" /> {f.name}
                                    <button onClick={() => setReferenceFiles(prev => prev.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 hover:text-red-500"/></button>
                                </div>
                            ))}
                            {vectorSnippets.map((s, i) => (
                                <div key={`s-${i}`} className="chip bg-emerald-50 text-emerald-700 border-emerald-100">
                                    <PuzzleIcon className="w-3 h-3" /> {s.title}
                                    <button onClick={() => setVectorSnippets(prev => prev.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 hover:text-red-500"/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button 
                        onClick={handleStart}
                        disabled={!topic.trim() || isLoading}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-base shadow-lg hover:bg-orange-600 hover:shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <LightningBoltIcon className="w-5 h-5" />}
                        {isLoading ? '正在初始化...' : '启动分析引擎'}
                    </button>
                </div>
            </div>

            <style>{`
                .tool-btn { @apply px-2 py-1 rounded-lg text-xs font-bold border transition-all hover:brightness-95 active:scale-95 flex items-center gap-1; }
                .chip { @apply px-2 py-1 rounded-md text-xs font-bold border flex items-center gap-2 animate-in zoom-in; }
            `}</style>

            <VectorSearchModal isOpen={isVectorOpen} onClose={() => setIsVectorOpen(false)} onAddSnippet={s => setVectorSnippets(p => [...p, s])} />
            <LlmRetrievalModal isOpen={isLlmOpen} onClose={() => setIsLlmOpen(false)} onSuccess={f => setReferenceFiles(p => [...p, {name: f.name, url: f.url}])} />
        </div>
    );
};
