
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTPageData, SharedGeneratorProps } from './types';
import { streamChatCompletions, getPromptDetail, generateBatchPdf, generatePdf } from '../../api/stratify'; 
import { getWalletBalance } from '../../api/user'; // Import wallet balance check
import { 
    RefreshIcon, DownloadIcon, ChevronRightIcon, 
    ChevronLeftIcon, CheckIcon, CodeIcon, BrainIcon,
    PlayIcon, LightningBoltIcon, CloseIcon
} from '../icons';
import VisualEditor from '../shared/VisualEditor';
import { AGENTS } from '../../agentConfig'; // Import AGENTS

interface Step4FinalizeProps extends SharedGeneratorProps {
    topic: string;
    pages: PPTPageData[];
    onBackToCompose: () => void;
    onUpdatePages: (newPages: PPTPageData[]) => void;
    onLlmStatusChange?: (isActive: boolean) => void;
    onStreamingUpdate?: (msg: any) => void;
}

// 默认兜底值，仅在 API 获取失败时使用
const HTML_GENERATION_MODEL = "google/gemini-3-flash-preview";
const PROMPT_ID_HTML = "14920b9c-604f-4066-bb80-da7a47b65572";

const extractStreamingHtml = (rawText: string): string => {
    return rawText.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
};

const GuidePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 p-5 text-white shadow-2xl z-20 animate-in slide-in-from-right-10 fade-in duration-700 hidden xl:block">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
                <LightningBoltIcon className="w-4 h-4 text-yellow-400" />
                <h3 className="font-bold text-sm tracking-wide">操作指南</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
        
        <div className="space-y-4">
            <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">基础交互</h4>
                <ul className="text-xs space-y-2 text-slate-300">
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>单击选中元素，弹出工具栏</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>双击文字可直接输入修改</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>按住鼠标拖拽调整位置</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>选中图片拖拽边缘可缩放</li>
                </ul>
            </div>

            <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">快捷键</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white/10 rounded px-2 py-1.5 flex justify-between items-center">
                        <span className="text-slate-300">删除</span>
                        <kbd className="font-mono bg-black/20 px-1 rounded">Del</kbd>
                    </div>
                    <div className="bg-white/10 rounded px-2 py-1.5 flex justify-between items-center">
                        <span className="text-slate-300">取消</span>
                        <kbd className="font-mono bg-black/20 px-1 rounded">Esc</kbd>
                    </div>
                </div>
            </div>

            <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-slate-500 italic">
                    提示：所有修改会自动保存。
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
    onHandleInsufficientBalance
}) => {
    const [pages, setPages] = useState<PPTPageData[]>(initialPages);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isExportingSingle, setIsExportingSingle] = useState(false);
    const [isExportingAll, setIsExportingAll] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.6); // Default scale
    const [showGuide, setShowGuide] = useState(true);

    // Load guide visibility preference
    useEffect(() => {
        const isClosed = localStorage.getItem('ai_report_guide_closed');
        if (isClosed === 'true') {
            setShowGuide(false);
        }
    }, []);

    const handleCloseGuide = () => {
        setShowGuide(false);
        localStorage.setItem('ai_report_guide_closed', 'true');
    };

    // Auto-calculate scale based on container size
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const baseWidth = 1600;
                const baseHeight = 900;
                // Leave enough padding for UI panels
                const wRatio = (clientWidth - 300) / baseWidth; 
                const hRatio = (clientHeight - 100) / baseHeight;
                setScale(Math.min(wRatio, hRatio));
            }
        };
        
        // Initial calc
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    
    // HTML Generation
    const generateHtml = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.html || page.isGenerating) return;

        // --- Pre-check Balance ---
        try {
            const wallet = await getWalletBalance();
            if (wallet.balance <= 0) {
                if (onHandleInsufficientBalance) onHandleInsufficientBalance();
                return;
            }
        } catch(e) {
            console.warn("Failed to check balance before finalize", e);
        }

        onLlmStatusChange?.(true);
        const newPagesStart = [...pages];
        newPagesStart[idx] = { ...page, isGenerating: true };
        setPages(newPagesStart);
        onUpdatePages(newPagesStart); 

        try {
            const prompt = await getPromptDetail(PROMPT_ID_HTML);
            
            // ⚡️ DYNAMIC MODEL SELECTION: 
            // 优先使用 Prompt 配置中的 channel 和 model，否则回退到 hardcoded constant
            let modelToUse = HTML_GENERATION_MODEL;
            if (prompt.channel_code && prompt.model_id) {
                modelToUse = `${prompt.channel_code}@${prompt.model_id}`;
            }

            const userPrompt = `主题: ${topic}\n内容:\n${page.content}`;
            let accumulatedText = '';
            
            await streamChatCompletions({
                model: modelToUse,
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
                // Refresh billing after done
                if (onRefreshSession) onRefreshSession();
            }, (err) => {
                onLlmStatusChange?.(false);
                throw err; // Propagate to catch
            }, sessionId, AGENTS.REPORT_GENERATOR); // Added AGENTS.REPORT_GENERATOR
        } catch (e: any) {
            onLlmStatusChange?.(false);
            if (e.message === 'INSUFFICIENT_BALANCE' && onHandleInsufficientBalance) {
                onHandleInsufficientBalance();
                // Mark current page as not generating so user can retry later
                const errorPages = [...pages];
                errorPages[idx] = { ...pages[idx], isGenerating: false };
                setPages(errorPages);
                onUpdatePages(errorPages);
            }
        }
    }, [pages, topic, onLlmStatusChange, onUpdatePages, sessionId, onRefreshSession, onHandleInsufficientBalance]);

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

    const handleExportSingle = async () => {
        if (!activePage?.html) return;
        setIsExportingSingle(true);
        try {
            // FIX: Pass fixed dimensions 1600x900
            const blob = await generatePdf(activePage.html, `${topic}_page_${activeIdx + 1}`, { width: 1600, height: 900 });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}_page_${activeIdx + 1}.pdf`;
            a.click();
        } catch(e) { alert('导出失败'); } finally { setIsExportingSingle(false); }
    };

    const handleExportAll = async () => {
        setIsExportingAll(true);
        try {
             const pdfPages = pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);
            // FIX: Pass fixed dimensions 1600x900
            const blob = await generateBatchPdf(pdfPages, { width: 1600, height: 900 });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}_presentation.pdf`;
            a.click();
        } catch(e) { alert('导出失败'); } finally { setIsExportingAll(false); }
    };

    const handlePageUpdate = (newHtml: string) => {
        const newPages = [...pages];
        newPages[activeIdx] = { ...newPages[activeIdx], html: newHtml };
        setPages(newPages);
        onUpdatePages(newPages);
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-white overflow-hidden relative font-sans">
             {/* Background Glow */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-indigo-600/20 blur-[120px] pointer-events-none"></div>

             {/* Header */}
             <div className="px-8 py-4 flex justify-between items-center z-10 bg-[#0f172a]/80 backdrop-blur-sm border-b border-white/5">
                 <div>
                     <h2 className="text-xl font-black tracking-tight">{topic}</h2>
                     <p className="text-xs font-mono text-indigo-300 mt-1 uppercase tracking-widest flex items-center gap-2">
                        FINAL RENDER OUTPUT 
                        <span className="w-1 h-1 bg-white rounded-full"></span>
                        VISUAL EDITOR ACTIVE
                     </p>
                 </div>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-medium bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        实时自动保存
                     </div>
                     <button onClick={onBackToCompose} className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-bold transition-all">
                        返回
                     </button>
                     <div className="flex bg-indigo-900/50 rounded-xl p-1 border border-white/10">
                        <button 
                            onClick={handleExportSingle}
                            disabled={!activePage?.html || isExportingSingle}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-indigo-600/50 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isExportingSingle ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5"/>} 导出单页PDF
                        </button>
                        <div className="w-px bg-white/10 my-1"></div>
                        <button 
                            onClick={handleExportAll}
                            disabled={!allRendered || isExportingAll}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-500 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:bg-indigo-800"
                        >
                            {isExportingAll ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5"/>} 导出完整PDF
                        </button>
                     </div>
                 </div>
             </div>

             {/* Main Stage */}
             <div className="flex-1 flex items-center justify-center relative z-0 overflow-hidden" ref={containerRef}>
                 {/* Removed previous and next buttons from here as requested */}

                 {/* Slide Container / Visual Editor */}
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

                 {/* Right Guide Panel (HUD) - Conditionally Rendered */}
                 {showGuide && <GuidePanel onClose={handleCloseGuide} />}
             </div>

             {/* Filmstrip Footer */}
             <div className="h-32 bg-[#020617] border-t border-white/5 flex items-center px-8 gap-4 overflow-x-auto custom-scrollbar-dark z-10">
                 {pages.map((p, i) => (
                     <div 
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`
                            flex-shrink-0 w-44 aspect-video rounded border cursor-pointer transition-all relative overflow-hidden group
                            ${activeIdx === i ? 'border-indigo-500 ring-2 ring-indigo-500/50 opacity-100 scale-105' : 'border-white/10 opacity-50 hover:opacity-80'}
                        `}
                     >
                         {p.html ? (
                             // Fixed Iframe Scaling for Thumbnail
                             <div className="w-full h-full relative bg-white">
                                 <div className="absolute top-0 left-0 w-[1600px] h-[900px] origin-top-left transform scale-[0.11]">
                                     <iframe 
                                         srcDoc={p.html} 
                                         className="w-full h-full border-none pointer-events-none select-none" 
                                         tabIndex={-1} 
                                     />
                                 </div>
                                 {/* Overlay to catch clicks */}
                                 <div className="absolute inset-0 bg-transparent"></div>
                             </div>
                         ) : (
                             <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                 <RefreshIcon className="w-4 h-4 text-slate-600 animate-spin" />
                             </div>
                         )}
                         <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded backdrop-blur-sm z-10">
                             {i + 1}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};
