
import React, { useState, useRef } from 'react';
import { 
    PuzzleIcon, SparklesIcon, CloudIcon, DocumentTextIcon, 
    TrashIcon, RefreshIcon, LightningBoltIcon, GlobeIcon 
} from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { LlmRetrievalModal } from '../../../ui/LlmRetrievalModal';
import { WebCrawlerModal } from '../../../ui/WebCrawlerModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

export const InputStep: React.FC<{
    onStart: (topic: string, materials: string) => void;
}> = ({ onStart }) => {
    const [topic, setTopic] = useState('');
    const [materials, setMaterials] = useState('');
    const [referenceFiles, setReferenceFiles] = useState<Array<{ name: string; url: string }>>([]);
    const [vectorSnippets, setVectorSnippets] = useState<Array<{ title: string; content: string }>>([]);
    
    const [isVectorOpen, setIsVectorOpen] = useState(false);
    const [isLlmOpen, setIsLlmOpen] = useState(false);
    const [isWebOpen, setIsWebOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        // 拼接所有上下文
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

    const handleAddWebContent = (content: string) => {
        setMaterials(prev => prev + (prev ? "\n\n" : "") + content);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 flex justify-center p-6 md:p-12">
            <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-3xl font-black text-slate-900">定义分析目标</h1>
                    <p className="text-slate-500">输入新技术名称，并提供相关背景资料以获得更精准的四象限画像。</p>
                </div>

                {/* 1. 核心技术输入 */}
                <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative group focus-within:ring-2 ring-orange-100 transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Target Technology
                        </label>
                    </div>
                    <input 
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="例如：固态电池电解质技术、800V 高压快充平台..."
                        className="w-full text-xl font-bold text-slate-800 placeholder:text-slate-300 border-none outline-none bg-transparent"
                        autoFocus
                    />
                </div>

                {/* 2. 资料补充 */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-2 items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">补充情报资料</label>
                        <div className="flex gap-2">
                            <button onClick={() => setIsVectorOpen(true)} className="input-tool-btn text-emerald-600 bg-emerald-50 border-emerald-100">
                                <PuzzleIcon className="w-3.5 h-3.5" /> 知识库
                            </button>
                            <button onClick={() => setIsLlmOpen(true)} className="input-tool-btn text-indigo-600 bg-indigo-50 border-indigo-100">
                                <SparklesIcon className="w-3.5 h-3.5" /> AI 检索
                            </button>
                            <button onClick={() => setIsWebOpen(true)} className="input-tool-btn text-blue-600 bg-blue-50 border-blue-100">
                                <GlobeIcon className="w-3.5 h-3.5" /> 网页抓取
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="input-tool-btn text-slate-600 bg-slate-50 border-slate-200">
                                {isUploading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <CloudIcon className="w-3.5 h-3.5"/>} 本地文件
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-2">
                        <textarea 
                            value={materials}
                            onChange={e => setMaterials(e.target.value)}
                            placeholder="在此粘贴技术参数、新闻报道或竞品信息..."
                            className="w-full h-40 p-4 text-sm text-slate-600 placeholder:text-slate-300 border-none outline-none resize-none bg-transparent"
                        />
                        
                        {/* Chips */}
                        {(referenceFiles.length > 0 || vectorSnippets.length > 0) && (
                            <div className="flex flex-wrap gap-2 px-4 pb-4">
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
                </div>

                <button 
                    onClick={handleStart}
                    disabled={!topic.trim()}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-orange-600 hover:shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <LightningBoltIcon className="w-5 h-5" /> 启动分析引擎
                </button>
            </div>

            <style>{`
                .input-tool-btn { @apply px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:brightness-95 active:scale-95 flex items-center gap-1.5; }
                .chip { @apply px-2 py-1 rounded-md text-xs font-bold border flex items-center gap-2 animate-in zoom-in; }
            `}</style>

            <VectorSearchModal isOpen={isVectorOpen} onClose={() => setIsVectorOpen(false)} onAddSnippet={s => setVectorSnippets(p => [...p, s])} />
            <LlmRetrievalModal isOpen={isLlmOpen} onClose={() => setIsLlmOpen(false)} onSuccess={f => setReferenceFiles(p => [...p, {name: f.name, url: f.url}])} />
            <WebCrawlerModal isOpen={isWebOpen} onClose={() => setIsWebOpen(false)} onAddContent={handleAddWebContent} />
        </div>
    );
};
