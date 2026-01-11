
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTPageData } from './types';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../api/stratify'; 
import { 
    RefreshIcon, DownloadIcon, ChevronRightIcon, 
    ChevronLeftIcon, CheckIcon, CodeIcon, BrainIcon,
    PlayIcon, LightningBoltIcon, SparklesIcon
} from '../icons';
import { VisualEditor } from './VisualEditor';

interface Step4FinalizeProps {
    topic: string;
    pages: PPTPageData[];
    onBackToCompose: () => void;
    onUpdatePages: (newPages: PPTPageData[]) => void;
    onLlmStatusChange?: (isActive: boolean) => void;
    onStreamingUpdate?: (msg: any) => void;
    sessionId?: string; 
    onRefreshSession?: () => void; 
    checkProAccess: () => boolean; // Added
}

const DEFAULT_STABLE_MODEL = "xiaomi/mimo-v2-flash:free";
const HTML_GENERATION_MODEL = "google/gemini-3-flash-preview";
const PROMPT_ID_HTML = "14920b9c-604f-4066-bb80-da7a47b65572";

const extractStreamingHtml = (rawText: string): string => {
    return rawText.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
};

const GuidePanel: React.FC = () => (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-5 text-white shadow-2xl z-20 animate-in slide-in-from-right-10 fade-in duration-700 hidden xl:block">
        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
            <LightningBoltIcon className="w-4 h-4 text-yellow-400" />
            <h3 className="font-bold text-sm tracking-wide">操作指南</h3>
        </div>
        
        <div className="space-y-4">
            <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">基础交互</h4>
                <ul className="text-xs space-y-2 text-slate-300">
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>单击选中元素，弹出工具栏</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>双击文字可直接输入修改</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>按住鼠标拖拽调整位置</li>
                </ul>
            </div>
            {/* ... shortcuts omitted for brevity ... */}
            <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-slate-500 italic">
                    提示：使用工具栏中的放大/缩小功能调整元素尺寸，而非文字大小，以保持布局完美。
                </p>
            </div>
        </div>
    </div>
);

export const Step4Finalize: React.FC<Step4FinalizeProps> = ({ 
    topic, 
    pages: initialPages, 
    onBackToCompose,
    onUpdatePages,
    onLlmStatusChange,
    sessionId,
    onRefreshSession,
    checkProAccess
}) => {
    const [pages, setPages] = useState<PPTPageData[]>(initialPages);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.6); 

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const baseWidth = 1600;
                const baseHeight = 900;
                const wRatio = (clientWidth - 300) / baseWidth; 
                const hRatio = (clientHeight - 100) / baseHeight;
                setScale(Math.min(wRatio, hRatio));
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    
    const generateHtml = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.html || page.isGenerating) return;

        onLlmStatusChange?.(true);
        const newPagesStart = [...pages];
        newPagesStart[idx] = { ...page, isGenerating: true };
        setPages(newPagesStart);
        onUpdatePages(newPagesStart); 

        try {
            const prompt = await getPromptDetail(PROMPT_ID_HTML);
            const userPrompt = `主题: ${topic}\n内容:\n${page.content}`;
            let accumulatedText = '';
            
            await streamChatCompletions({
                model: HTML_GENERATION_MODEL,
                messages: [
                    { role: 'system', content: prompt.content },
                    { role: 'user', content: userPrompt }
                ],
                stream: true,
                enable_billing: true
            }, (data) => {
                if (data.content) accumulatedText += data.content;
            }, () => {
                const finalHtml = extractStreamingHtml(accumulatedText);
                const finalPages = [...pages];
                finalPages[idx] = { ...finalPages[idx], html: finalHtml, isGenerating: false };
                setPages(finalPages);
                onUpdatePages(finalPages);
                onLlmStatusChange?.(false);
                if (onRefreshSession) onRefreshSession();
            }, (err) => {
                onLlmStatusChange?.(false);
            }, sessionId); 
        } catch (e) {
            onLlmStatusChange?.(false);
        }
    }, [pages, topic, onLlmStatusChange, onUpdatePages, sessionId, onRefreshSession]);

    useEffect(() => {
        const isBusy = pages.some(p => p.isGenerating);
        if (isBusy) return;
        const nextIdx = pages.findIndex(p => !p.html);
        if (nextIdx !== -1) {
            generateHtml(nextIdx);
        }
    }, [pages, generateHtml]);

    const activePage = pages[activeIdx];
    const allRendered = pages.every(p => p.html && !p.isGenerating);

    const handleExport = async () => {
        if (!checkProAccess()) return;

        setIsExporting(true);
        try {
             const pdfPages = pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);
            const blob = await generateBatchPdf(pdfPages);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}_presentation.pdf`;
            a.click();
        } catch(e) { alert('导出失败'); } finally { setIsExporting(false); }
    };

    const handlePageUpdate = (newHtml: string) => {
        const newPages = [...pages];
        newPages[activeIdx] = { ...newPages[activeIdx], html: newHtml };
        setPages(newPages);
        onUpdatePages(newPages);
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-white overflow-hidden relative font-sans">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-indigo-600/20 blur-[120px] pointer-events-none"></div>

             <div className="px-8 py-4 flex justify-between items-center z-10 bg-[#0f172a]/80 backdrop-blur-sm border-b border-white/5">
                 <div>
                     <h2 className="text-xl font-black tracking-tight">{topic}</h2>
                     <p className="text-xs font-mono text-indigo-300 mt-1 uppercase tracking-widest flex items-center gap-2">
                        FINAL RENDER OUTPUT 
                        <span className="w-1 h-1 bg-white rounded-full"></span>
                        VISUAL EDITOR ACTIVE
                     </p>
                 </div>
                 <div className="flex gap-4">
                     <button onClick={onBackToCompose} className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-bold transition-all">返回大纲</button>
                     <button 
                        onClick={handleExport}
                        disabled={!allRendered || isExporting}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                     >
                         {isExporting ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <SparklesIcon className="w-4 h-4 group-hover:scale-110 transition-transform"/>} 
                         升级并导出 PDF
                     </button>
                 </div>
             </div>

             <div className="flex-1 flex items-center justify-center relative z-0 overflow-hidden" ref={containerRef}>
                 <button 
                    onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                    disabled={activeIdx === 0}
                    className="absolute left-8 p-4 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-all disabled:opacity-0 z-30"
                 >
                     <ChevronLeftIcon className="w-6 h-6" />
                 </button>

                 <div className="w-full h-full flex items-center justify-center p-4 relative">
                     {activePage && activePage.html ? (
                         <div className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-white/10" style={{ width: '100%', height: '100%' }}>
                            <VisualEditor 
                                initialHtml={activePage.html} 
                                onSave={handlePageUpdate}
                                scale={scale} 
                            />
                         </div>
                     ) : (
                         <div className="w-[800px] aspect-video flex flex-col items-center justify-center text-slate-300 bg-slate-900 rounded-xl border border-white/10">
                             <div className="relative">
                                 <div className="absolute inset-0 bg-indigo-50 blur-xl opacity-20 animate-pulse"></div>
                                 <BrainIcon className="w-16 h-16 relative z-10" />
                             </div>
                             <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">Rendering Pixel Perfect Slide...</p>
                         </div>
                     )}
                 </div>

                 <GuidePanel />

                 <button 
                    onClick={() => setActiveIdx(Math.min(pages.length - 1, activeIdx + 1))}
                    disabled={activeIdx === pages.length - 1}
                    className="absolute right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-all disabled:opacity-0 z-30"
                 >
                     <ChevronRightIcon className="w-6 h-6" />
                 </button>
             </div>

             <div className="h-32 bg-[#020617] border-t border-white/5 flex items-center px-8 gap-4 overflow-x-auto custom-scrollbar-dark z-10">
                 {pages.map((p, i) => (
                     <div 
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`
                            flex-shrink-0 w-40 aspect-video rounded border cursor-pointer transition-all relative overflow-hidden group
                            ${activeIdx === i ? 'border-indigo-500 ring-2 ring-indigo-500/50 opacity-100 scale-105' : 'border-white/10 opacity-50 hover:opacity-80'}
                        `}
                     >
                         {p.html ? (
                             <iframe srcDoc={p.html} className="w-full h-full pointer-events-none bg-white scale-[0.2] origin-top-left w-[500%] h-[500%]" tabIndex={-1} />
                         ) : (
                             <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                 <RefreshIcon className="w-4 h-4 text-slate-600 animate-spin" />
                             </div>
                         )}
                         <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded backdrop-blur-sm">
                             {i + 1}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};
