
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    PuzzleIcon, BrainIcon, SparklesIcon, LightningBoltIcon,
    ServerIcon, ClockIcon, RefreshIcon, DocumentTextIcon,
    TrashIcon, CloudIcon, CheckCircleIcon, ShieldExclamationIcon,
    GlobeIcon, LinkIcon
} from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { LlmRetrievalModal } from '../../../ui/LlmRetrievalModal';
import { UrlCrawlerModal } from '../../../ui/UrlCrawlerModal';
import { getScenarioFiles, getScenarios, uploadStratifyFile } from '../../../../../api/stratify';
import { checkGeminiCookieValidity } from '../../../../../api/intelligence';
import { StratifyScenarioFile } from '../../../../../types';

const formatModelName = (model?: string) => {
    if (!model) return 'Auto (System Default)';
    let name = model.includes('@') ? model.split('@')[1] : model;
    if (name.includes('/')) name = name.split('/')[1];
    return name.replace(':free', '').replace(':beta', '');
};

// Phase Mapping
const PHASE_LABELS: Record<string, string> = {
    '00_analyze_input': '意图分析',
    '01_Role_ProtocolSetup': '角色初始化',
    '02_DataIngestion': '知识库注入',
    '03_TriggerGeneration_step1': '技术路线分析',
    '03_TriggerGeneration_step2': '潜在风险识别',
    '03_TriggerGeneration_step3': '解决方案推荐',
    '03_TriggerGeneration_step4': '引用溯源',
    '04_Markdown2Html': '视觉渲染引擎'
};

interface AttachedFile {
    name: string;
    url: string;
    type?: string;
    tokens: number; // Add token tracking
}

export const InputCollector: React.FC<{
    scenarioId: string;
    initialTech: string;
    initialMaterials: string;
    isProcessing: boolean;
    onStart: (data: { targetTech: string; materials: string; attachments?: any[] }) => void;
}> = ({ scenarioId, initialTech, initialMaterials, isProcessing, onStart }) => {
    const [targetTech, setTargetTech] = useState(initialTech);
    const [manualMaterials, setManualMaterials] = useState(initialMaterials);
    
    // Attachments State
    const [referenceFiles, setReferenceFiles] = useState<AttachedFile[]>([]);
    const [vectorSnippets, setVectorSnippets] = useState<Array<{ title: string; content: string }>>([]);
    const [urlAttachments, setUrlAttachments] = useState<AttachedFile[]>([]);

    // Modals
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    const [isLlmModalOpen, setIsLlmModalOpen] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Config State
    const [files, setFiles] = useState<StratifyScenarioFile[]>([]);
    const [defaultModel, setDefaultModel] = useState<string>('Loading...');
    const [isConfigLoading, setIsConfigLoading] = useState(false);
    const [geminiStatus, setGeminiStatus] = useState<{ valid: boolean } | null>(null);

    // --- Token Calculation ---
    const totalTokens = useMemo(() => {
        // Simple Heuristic: 1.5 chars per token for text
        const textTokens = Math.ceil((targetTech.length + manualMaterials.length) / 1.5);
        
        // Vector Snippets
        const snippetTokens = vectorSnippets.reduce((acc, s) => acc + Math.ceil(s.content.length / 1.5), 0);
        
        // Files & URLs (Pre-calculated when added)
        const fileTokens = referenceFiles.reduce((acc, f) => acc + f.tokens, 0);
        const urlTokens = urlAttachments.reduce((acc, u) => acc + u.tokens, 0);

        return textTokens + snippetTokens + fileTokens + urlTokens;
    }, [targetTech, manualMaterials, vectorSnippets, referenceFiles, urlAttachments]);


    useEffect(() => { setTargetTech(initialTech); }, [initialTech]);

    useEffect(() => {
        const loadConfig = async () => {
            setIsConfigLoading(true);
            try {
                const scenarios = await getScenarios();
                const currentScenario = scenarios.find(s => s.id === scenarioId || s.name === scenarioId);
                setDefaultModel(currentScenario?.default_model || 'System Default');
                const scenarioFiles = await getScenarioFiles(scenarioId);
                setFiles(scenarioFiles);
            } catch (e) {
                console.error("Failed to load scenario config", e);
            } finally {
                setIsConfigLoading(false);
            }
        };
        loadConfig();
    }, [scenarioId]);

    useEffect(() => {
        const modelsToCheck = [defaultModel, ...files.map(f => f.model)].filter(Boolean);
        const hasGeminiCookie = modelsToCheck.some(m => m?.startsWith('gemini_cookie@'));
        if (hasGeminiCookie) {
            checkGeminiCookieValidity().then(setGeminiStatus).catch(() => setGeminiStatus({ valid: false }));
        } else {
            setGeminiStatus(null);
        }
    }, [defaultModel, files]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadStratifyFile(file);
            // Local files: estimate tokens based on size (rough approx for PDF/Text) or 0 if unknown
            // Here assuming 1KB approx 300 tokens for text files, simplified
            const estTokens = file.type.includes('text') || file.name.endsWith('.md') 
                ? Math.ceil(file.size / 3) 
                : 0; // Binary files treated as 0 for now (images handled separately by vision model)
            
            setReferenceFiles(prev => [...prev, { name: res.filename, url: res.url, type: res.type, tokens: estTokens }]);
        } catch (e) {
            alert('文件上传失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleStart = () => {
        if (!targetTech.trim()) return;

        let combinedMaterials = manualMaterials;
        if (vectorSnippets.length > 0) {
            combinedMaterials += "\n\n--- 知识库检索参考 ---\n";
            vectorSnippets.forEach((s, i) => combinedMaterials += `\n[Reference ${i + 1}: ${s.title}]\n${s.content}\n`);
        }

        // Construct attachments array for API
        const attachments = [
            ...referenceFiles.map(f => ({ type: 'file' as const, url: f.url })),
            ...urlAttachments.map(u => ({ type: 'file' as const, url: u.url }))
        ];

        onStart({ targetTech, materials: combinedMaterials, attachments });
    };

    const visiblePhases = useMemo(() => {
        const order = ['03_TriggerGeneration_step1', '03_TriggerGeneration_step2', '03_TriggerGeneration_step3', '04_Markdown2Html'];
        return order.map(key => {
            const file = files.find(f => f.name.includes(key));
            return { key, label: PHASE_LABELS[key] || key, model: file?.model || null };
        });
    }, [files]);

    return (
        <div className="flex-1 bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-6 md:p-12 min-h-full flex flex-col items-center">
                
                <div className="text-center mb-10 w-full max-w-3xl">
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                        技术评估 <span className="text-indigo-600">Agent</span>
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base font-medium">输入目标技术，Agent 将自动调用知识库，并结合多模态附件进行深度对标。</p>
                </div>

                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8 space-y-6">
                        {/* Target Tech */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"></span>
                                    Target Technology (评估目标)
                                </label>
                            </div>
                            <textarea 
                                value={targetTech}
                                onChange={e => setTargetTech(e.target.value)}
                                placeholder="请输入具体的技术名称..."
                                className="w-full h-32 p-5 text-sm md:text-base text-slate-600 placeholder:text-slate-300 border-none resize-none focus:ring-0 outline-none leading-relaxed bg-transparent"
                            />
                        </div>

                        {/* Materials */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 focus-within:ring-4 focus-within:ring-emerald-100 transition-all">
                            <div className="p-3 border-b border-slate-50 bg-slate-50/50 rounded-t-xl flex justify-between items-center flex-wrap gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>
                                    Context & Data (参考资料)
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsUrlModalOpen(true)} className="input-tool-btn"><GlobeIcon className="w-3.5 h-3.5" /> 文章 URL</button>
                                    <button onClick={() => setIsVectorModalOpen(true)} className="input-tool-btn"><PuzzleIcon className="w-3.5 h-3.5" /> 知识库检索</button>
                                    <button onClick={() => setIsLlmModalOpen(true)} className="input-tool-btn"><SparklesIcon className="w-3.5 h-3.5" /> AI 检索</button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()} className="input-tool-btn">
                                        {isUploading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <CloudIcon className="w-3.5 h-3.5" />}
                                        {isUploading ? '上传中...' : '上传文档'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col h-full">
                                <textarea 
                                    value={manualMaterials}
                                    onChange={e => setManualMaterials(e.target.value)}
                                    placeholder="在此处粘贴相关技术参数或竞品分析资料..."
                                    className="w-full h-32 p-5 text-sm md:text-base text-slate-600 border-none resize-none focus:ring-0 outline-none leading-relaxed bg-transparent"
                                />
                                
                                {(urlAttachments.length > 0 || referenceFiles.length > 0 || vectorSnippets.length > 0) && (
                                    <div className="px-5 pb-4 flex flex-wrap gap-2 animate-in fade-in">
                                        {urlAttachments.map((file, i) => (
                                            <div key={file.url || `url-${i}`} className="chip bg-blue-50 text-blue-700 border-blue-100">
                                                <LinkIcon className="w-3 h-3" />
                                                <span className="max-w-[120px] truncate" title={file.name}>{file.name}</span>
                                                <span className="text-[10px] opacity-60">({file.tokens}t)</span>
                                                <button onClick={() => setUrlAttachments(prev => prev.filter(item => item.url !== file.url))}><TrashIcon className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        {referenceFiles.map((file, i) => (
                                            <div key={file.url || `file-${i}`} className="chip bg-indigo-50 text-indigo-700 border-indigo-100">
                                                <DocumentTextIcon className="w-3 h-3" />
                                                <span className="max-w-[120px] truncate" title={file.name}>{file.name}</span>
                                                {file.tokens > 0 && <span className="text-[10px] opacity-60">({file.tokens}t)</span>}
                                                <button onClick={() => setReferenceFiles(prev => prev.filter(item => item.url !== file.url))}><TrashIcon className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        {vectorSnippets.map((snip, i) => (
                                            <div key={`snip-${i}`} className="chip bg-emerald-50 text-emerald-700 border-emerald-100">
                                                <PuzzleIcon className="w-3 h-3" />
                                                <span className="max-w-[120px] truncate" title={snip.title}>{snip.title}</span>
                                                <button onClick={() => setVectorSnippets(prev => prev.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Token Capacity Counter (Simplified) */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Token Usage (Estimated)</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">
                                        {totalTokens.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">Tokens</span>
                                </div>
                            </div>
                            {/* Visual Bar only, no blocking logic */}
                            <div className="flex flex-col items-end w-48">
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: '100%' }}></div>
                                </div>
                                <span className="text-[10px] text-slate-400 mt-2 font-medium">当前上下文总量</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><ServerIcon className="w-4 h-4 text-indigo-500"/> 模型配置</h3>
                                {isConfigLoading && <RefreshIcon className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Default Model</span>
                                    <div className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border border-slate-200 break-all">{formatModelName(defaultModel)}</div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phase Overrides</span>
                                    {visiblePhases.map((phase, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                                            <span className="text-slate-600 font-medium flex items-center gap-1.5"><div className={`w-1 h-1 rounded-full ${phase.model ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>{phase.label}</span>
                                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${phase.model ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 italic'}`}>{phase.model ? formatModelName(phase.model) : 'Default'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !targetTech.trim()}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"
                        >
                            <LightningBoltIcon className="w-5 h-5" />
                            <span>启动分析引擎</span>
                        </button>
                    </div>
                </div>
            </div>

            <UrlCrawlerModal 
                isOpen={isUrlModalOpen} 
                onClose={() => setIsUrlModalOpen(false)} 
                onSuccess={files => setUrlAttachments(prev => [...prev, ...files])} 
            />
            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={s => setVectorSnippets(prev => [...prev, s])} 
            />
            <LlmRetrievalModal 
                isOpen={isLlmModalOpen} 
                onClose={() => setIsLlmModalOpen(false)} 
                onSuccess={file => setReferenceFiles(prev => [...prev, { ...file, tokens: 0 }])} 
            />
            
            <style>{`
                .input-tool-btn { @apply flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-xs font-bold text-slate-600 transition-all shadow-sm active:scale-95; }
                .chip { @apply flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm animate-in fade-in zoom-in-95; }
            `}</style>
        </div>
    );
};
