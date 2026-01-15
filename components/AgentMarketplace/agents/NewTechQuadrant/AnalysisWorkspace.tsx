
import React, { useState, useEffect, useRef } from 'react';
import { TechItem } from './index';
import { ArticlePublic, StratifyPrompt } from '../../../../types';
import { 
    DatabaseIcon, BrainIcon, DocumentTextIcon, CodeIcon, PlayIcon, 
    CheckCircleIcon, RefreshIcon, CheckIcon, ExternalLinkIcon,
    DownloadIcon, PencilIcon, LinkIcon, SparklesIcon, TrendingUpIcon,
    PlusIcon, ChartIcon, CloseIcon
} from '../../../../components/icons';
import { generatePdf } from '../../utils/services';
import { VisualEditor } from '../../../ReportGenerator/VisualEditor'; 

interface AnalysisWorkspaceProps {
    articles: ArticlePublic[];
    techList: TechItem[];
    setTechList: React.Dispatch<React.SetStateAction<TechItem[]>>;
    onOpenSelection: () => void;
    isExtracting: boolean;
    isGenerating: boolean;
    onStartGeneration: () => void;
    onRedo?: (id: string, instruction: string) => Promise<void>; // Added onRedo prop
    prompts?: StratifyPrompt[];
}

// URL Cleaner Helper
const cleanUrl = (url?: string) => {
    if (!url) return '';
    let clean = url.trim();
    const mdMatch = clean.match(/\[.*?\]\((.*?)\)/);
    if (mdMatch) {
        clean = mdMatch[1];
    } else {
        clean = clean.replace(/[<>\[\]\(\)]/g, '');
    }
    if (clean && !clean.startsWith('http') && !clean.startsWith('//')) {
        return 'https://' + clean;
    }
    return clean;
};

// --- Redo Modal Component ---
const RedoModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (instruction: string) => void;
    isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [instruction, setInstruction] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-purple-600" />
                        AI 重绘 / 修改
                    </h3>
                    <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">修改建议</label>
                    <textarea 
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="例如：请把背景改为深蓝色科技风格；或者字体调大一点；或者把第二象限的图表换成流程图..."
                        className="w-full h-32 p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none shadow-sm placeholder:text-slate-400"
                        autoFocus
                    />
                    
                    <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                        提示：AI 将基于现有 HTML 结构和您的建议重新生成代码。
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={() => onConfirm(instruction)} 
                        disabled={isLoading || !instruction.trim()}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <SparklesIcon className="w-4 h-4"/>}
                        开始重绘
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({ 
    articles, techList, setTechList, onOpenSelection, 
    isExtracting, isGenerating, onStartGeneration, onRedo, prompts 
}) => {
    const [activeTechId, setActiveTechId] = useState<string | null>(null);
    const [scale, setScale] = useState(1.0); 
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Redo State
    const [isRedoModalOpen, setIsRedoModalOpen] = useState(false);
    const [isRedoing, setIsRedoing] = useState(false);
    
    const editorContainerRef = useRef<HTMLDivElement>(null);
    
    const activeItem = techList.find(t => t.id === activeTechId);

    // Auto-select first item
    useEffect(() => {
        if (techList.length > 0 && !activeTechId) {
            setActiveTechId(techList[0].id);
        }
    }, [techList, activeTechId]);

    // Auto-fit scale logic
    useEffect(() => {
        const calculateScale = () => {
            if (activeItem?.analysisState === 'done' && editorContainerRef.current) {
                const { clientWidth, clientHeight } = editorContainerRef.current;
                const BASE_WIDTH = 1600;
                const BASE_HEIGHT = 900;
                const availableWidth = clientWidth - 80; 
                const availableHeight = clientHeight - 56 - 80; 
                
                if (availableWidth > 0 && availableHeight > 0) {
                    const wRatio = availableWidth / BASE_WIDTH;
                    const hRatio = availableHeight / BASE_HEIGHT;
                    const fitScale = Math.min(wRatio, hRatio) * 0.95;
                    setScale(Math.max(0.1, fitScale));
                }
            }
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        const timer = setTimeout(calculateScale, 100);
        return () => {
            window.removeEventListener('resize', calculateScale);
            clearTimeout(timer);
        };
    }, [activeItem?.analysisState, activeItem?.id]);

    const handleToggleSelection = (id: string) => {
        setTechList(prev => prev.map(t => t.id === id ? { ...t, isSelected: !t.isSelected } : t));
    };

    const handleToggleAll = () => {
        const allSelected = techList.every(t => t.isSelected);
        setTechList(prev => prev.map(t => ({ ...t, isSelected: !allSelected })));
    };

    const handleHtmlUpdate = (newHtml: string) => {
        if (activeTechId) {
            setTechList(prev => prev.map(t => t.id === activeTechId ? { ...t, htmlContent: newHtml } : t));
        }
    };
    
    const handleDownload = async () => {
         if (activeItem?.htmlContent) {
             setIsDownloading(true);
             try {
                 const blob = await generatePdf(activeItem.htmlContent, activeItem.name, { width: 1600, height: 900 });
                 const url = window.URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `${activeItem.name}_report.pdf`;
                 a.click();
                 window.URL.revokeObjectURL(url);
             } catch(e) {
                 alert('PDF 生成失败');
             } finally {
                 setIsDownloading(false);
             }
         }
    };

    const handleRedoConfirm = async (instruction: string) => {
        if (!activeTechId || !onRedo) return;
        setIsRedoing(true);
        try {
            await onRedo(activeTechId, instruction);
            setIsRedoModalOpen(false);
        } catch (e) {
            alert('重绘请求失败');
        } finally {
            setIsRedoing(false);
        }
    };
    
    const handleCopyContent = (e: React.MouseEvent, content: string, label: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopyFeedback(`已复制${label}`);
        setTimeout(() => setCopyFeedback(null), 2000);
    };
    
    const selectedCount = techList.filter(t => t.isSelected).length;
    const processingCount = techList.filter(t => ['analyzing', 'generating_html'].includes(t.analysisState)).length;

    return (
        <div className="flex h-full overflow-hidden relative">
            {copyFeedback && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2">
                    {copyFeedback}
                </div>
            )}

            {/* Left Sidebar */}
            <div className="w-[450px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10 shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-indigo-600"/>
                            识别清单 ({techList.length})
                        </h3>
                        <button 
                            onClick={onOpenSelection} 
                            disabled={isExtracting}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                        >
                            <PlusIcon className="w-3.5 h-3.5" /> 添加/分析文章
                        </button>
                    </div>

                    {isExtracting && (
                        <div className="mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100 animate-pulse">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 mb-1">
                                <RefreshIcon className="w-4 h-4 animate-spin"/>
                                正在分析文章提取技术点...
                            </div>
                            <div className="h-1.5 w-full bg-indigo-200 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-1/2 animate-[progress_2s_infinite]"></div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                         <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800">
                             <input 
                                 type="checkbox" 
                                 checked={techList.length > 0 && techList.every(t => t.isSelected)}
                                 onChange={handleToggleAll}
                                 className="rounded text-indigo-600 focus:ring-indigo-500"
                             />
                             全选
                         </label>
                         
                         <button 
                            onClick={onStartGeneration}
                            disabled={selectedCount === 0 || isGenerating || isExtracting}
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                         >
                            {isGenerating ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <SparklesIcon className="w-3.5 h-3.5"/>}
                            {isGenerating ? `生成中 (${processingCount})...` : `开始深度分析 (${selectedCount})`}
                         </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/30">
                    {techList.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 text-sm">
                            {isExtracting ? (
                                <div className="flex flex-col items-center gap-2">
                                    <RefreshIcon className="w-8 h-8 text-indigo-300 animate-spin"/>
                                    <p>AI 正在阅读文章并提取技术点...</p>
                                </div>
                            ) : (
                                <>
                                    <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-slate-300"/>
                                    暂无识别到的技术点<br/>
                                    请点击上方添加文章进行分析
                                </>
                            )}
                        </div>
                    ) : (
                        techList.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setActiveTechId(item.id)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                                    activeTechId === item.id 
                                        ? 'bg-white border-indigo-500 ring-1 ring-indigo-500/20 shadow-md' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={item.isSelected}
                                            onChange={() => handleToggleSelection(item.id)}
                                            disabled={isGenerating || item.analysisState === 'done'}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold text-sm truncate pr-2 flex-1 ${activeTechId === item.id ? 'text-indigo-700' : 'text-slate-800'}`}>{item.name}</h4>
                                            {item.analysisState === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">{item.field}</span>
                                            {item.sourceArticleTitle && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={item.sourceArticleTitle}>源: {item.sourceArticleTitle}</span>}
                                        </div>

                                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mb-2">
                                            <div 
                                                className="mb-1 line-clamp-2 transition-all cursor-text"
                                                title="双击复制内容"
                                                onDoubleClick={(e) => handleCopyContent(e, item.description, '技术描述')}
                                            >
                                                <span className="font-bold text-slate-700 select-none mr-1">技术描述:</span>
                                                {item.description}
                                            </div>
                                            <div 
                                                className="line-clamp-2 transition-all cursor-text"
                                                title="双击复制内容"
                                                onDoubleClick={(e) => handleCopyContent(e, item.status, '行业应用')}
                                            >
                                                <span className="font-bold text-slate-700 select-none mr-1">行业应用:</span>
                                                {item.status}
                                            </div>
                                        </div>
                                        
                                        <div className="pt-1 border-t border-slate-50 flex items-center justify-between text-[10px]">
                                             <div className="font-mono flex items-center gap-1.5">
                                                {item.analysisState === 'idle' && <span className="text-slate-400">待分析</span>}
                                                {item.analysisState === 'analyzing' && <span className="text-indigo-500 font-bold flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 深度分析中...</span>}
                                                {item.analysisState === 'generating_html' && <span className="text-purple-500 font-bold flex items-center gap-1"><CodeIcon className="w-3 h-3 animate-pulse"/> HTML 生成中...</span>}
                                                {item.analysisState === 'done' && <span className="text-green-600 font-bold flex items-center gap-1">已完成</span>}
                                                {item.analysisState === 'error' && <span className="text-red-500 font-bold">处理失败</span>}
                                             </div>
                                             {item.original_url && <a href={cleanUrl(item.original_url)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-blue-400 hover:text-blue-600"><ExternalLinkIcon className="w-3 h-3"/></a>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Workspace */}
            <div className="flex-1 bg-[#0f172a] relative overflow-hidden flex flex-col">
                {!activeItem ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <ChartIcon className="w-16 h-16 mb-4 text-slate-500" />
                        <p>请在左侧选择一项技术查看详情或开始分析</p>
                    </div>
                ) : (
                    <>
                         {activeItem.analysisState === 'done' && activeItem.htmlContent ? (
                             <div className="flex flex-col h-full w-full">
                                 {/* Toolbar (Dark) */}
                                 <div className="h-14 px-6 bg-[#1e293b] border-b border-slate-700 flex justify-between items-center shadow-sm z-20 flex-shrink-0">
                                     <div className="flex items-center gap-2 text-white font-bold">
                                         <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                         {activeItem.name} - 分析报告
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button 
                                            onClick={() => setIsRedoModalOpen(true)}
                                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                                         >
                                             <SparklesIcon className="w-3.5 h-3.5" /> AI 重绘
                                         </button>
                                         <button 
                                             onClick={handleDownload}
                                             disabled={isDownloading}
                                             className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                         >
                                             {isDownloading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <DownloadIcon className="w-3.5 h-3.5" />} 
                                             {isDownloading ? '导出中...' : '导出 PDF'}
                                         </button>
                                     </div>
                                 </div>
                                 
                                 {/* Editor Area */}
                                 <div className="flex-1 bg-[#0f172a] relative overflow-hidden w-full" ref={editorContainerRef}>
                                     <div className="w-full h-full flex items-center justify-center">
                                         <VisualEditor 
                                             initialHtml={activeItem.htmlContent}
                                             onSave={handleHtmlUpdate}
                                             scale={scale}
                                             onScaleChange={setScale}
                                             canvasSize={{ width: 1600, height: 900 }}
                                         />
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             // Processing / Idle View
                             <div className="flex flex-col h-full p-8 overflow-y-auto custom-scrollbar">
                                 <div className="max-w-3xl mx-auto w-full space-y-6">
                                     {/* Header Card */}
                                     <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                                         <div className="flex items-center gap-4 mb-6">
                                             <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                 <DatabaseIcon className="w-8 h-8" />
                                             </div>
                                             <div>
                                                 <h2 className="text-2xl font-extrabold text-slate-800">{activeItem.name}</h2>
                                                 <div className="flex items-center gap-2 mt-1">
                                                     <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">{activeItem.field}</span>
                                                     {activeItem.sourceArticleTitle && <span className="text-xs text-slate-400">Ref: {activeItem.sourceArticleTitle}</span>}
                                                 </div>
                                             </div>
                                         </div>

                                         <div className="space-y-6">
                                             <div>
                                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">技术描述</h4>
                                                 <p className="text-sm text-slate-700 leading-loose bg-slate-50 p-4 rounded-xl border border-slate-100 select-text">
                                                     {activeItem.description}
                                                 </p>
                                             </div>
                                             
                                             <div>
                                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">行业应用</h4>
                                                 <p className="text-sm text-slate-700 leading-loose bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 select-text">
                                                     {activeItem.status}
                                                 </p>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Logs Terminal */}
                                     {(activeItem.analysisState !== 'idle' || (activeItem.logs && activeItem.logs.length > 0)) && (
                                         <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-700 shadow-xl overflow-hidden">
                                             <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">
                                                 <CodeIcon className="w-4 h-4" /> System Logs
                                             </div>
                                             <div className="font-mono text-xs text-green-400 space-y-2 max-h-60 overflow-y-auto custom-scrollbar-dark">
                                                 {activeItem.logs?.map((log, i) => (
                                                     <div key={i} className="break-all opacity-90 animate-in fade-in slide-in-from-left-2">
                                                         <span className="text-slate-500 mr-2">{'>'}</span> {log}
                                                     </div>
                                                 ))}
                                                 {['analyzing', 'generating_html'].includes(activeItem.analysisState) && (
                                                     <div className="animate-pulse text-indigo-400">_ Processing...</div>
                                                 )}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         )}
                    </>
                )}
            </div>

            <RedoModal 
                isOpen={isRedoModalOpen} 
                onClose={() => setIsRedoModalOpen(false)}
                onConfirm={handleRedoConfirm}
                isLoading={isRedoing}
            />
        </div>
    );
};
