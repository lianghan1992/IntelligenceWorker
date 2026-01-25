
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PPTData, PPTStage, PPTPageData, SharedGeneratorProps } from './types';
import { generateBatchPdf, generatePdf, getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { searchSemanticSegments } from '../../api/intelligence';
import { getWalletBalance } from '../../api/user'; // Import wallet balance check
import { 
    SparklesIcon, DownloadIcon, RefreshIcon, ViewGridIcon, 
    PencilIcon, CheckIcon, DocumentTextIcon, ChevronRightIcon, CodeIcon,
    PlayIcon, ServerIcon, ArrowRightIcon, CloseIcon, LightBulbIcon
} from '../icons';
import { Step2Outline } from './Step2Outline';
import { tryParsePartialJson } from './Step1Collect'; 
import { KnowledgeTools } from './KnowledgeTools';
import { marked } from 'marked';
import { AGENTS } from '../../agentConfig';

interface MainCanvasProps extends SharedGeneratorProps {
    stage: PPTStage;
    data: PPTData;
    activePageIndex: number;
    setActivePageIndex: (i: number) => void;
    isLlmActive: boolean;
    setStage?: (stage: PPTStage) => void; 
    setData?: React.Dispatch<React.SetStateAction<PPTData>>;
}

// --- Helper: Simple HTML Syntax Highlighter ---
const highlightHtmlStream = (code: string) => {
    if (!code) return '';
    let output = '';
    let cursor = 0;

    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    while (cursor < code.length) {
        const tagStart = code.indexOf('<', cursor);
        
        if (tagStart === -1) {
            output += escape(code.slice(cursor));
            break;
        }

        if (tagStart > cursor) {
            output += escape(code.slice(cursor, tagStart));
        }

        const tagEnd = code.indexOf('>', tagStart);
        
        if (tagEnd === -1) {
            output += escape(code.slice(tagStart));
            break;
        }

        const tagContent = code.slice(tagStart, tagEnd + 1);
        
        if (tagContent.startsWith('<!--')) {
            output += `<span class="text-slate-500">${escape(tagContent)}</span>`;
        } else {
            let safeTag = escape(tagContent);
            // Tags
            safeTag = safeTag.replace(/^(&lt;\/?[a-zA-Z0-9-]+)/, '<span class="text-pink-400 font-bold">$1</span>');
            // Attributes
            safeTag = safeTag.replace(/(\s)([a-zA-Z0-9-]+)(=)/g, '$1<span class="text-sky-300">$2</span><span class="text-white">$3</span>');
            // Strings
            safeTag = safeTag.replace(/(".*?")/g, '<span class="text-emerald-300">$1</span>');
            
            output += safeTag;
        }

        cursor = tagEnd + 1;
    }
    
    return output;
};

// --- Helper: Scaled Slide Renderer ---
const ScaledSlide: React.FC<{ html: string; width: number; height: number }> = ({ html, width, height }) => {
    const BASE_WIDTH = 1600;
    const BASE_HEIGHT = 900;
    
    // Fallback to reasonable defaults if width/height are 0 (e.g. initial render)
    const safeWidth = width || 800;
    const safeHeight = height || 600;
    
    // Calculate scale to fit the container while maintaining aspect ratio
    // If width/height are effectively 0, default to 1 to avoid invisible transform
    const scale = (safeWidth > 0 && safeHeight > 0) 
        ? Math.min(safeWidth / BASE_WIDTH, safeHeight / BASE_HEIGHT) * 0.95
        : 0.5;

    return (
        <div 
            style={{ 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f1f5f9',
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}
        >
            <div 
                style={{ 
                    width: BASE_WIDTH, 
                    height: BASE_HEIGHT, 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'center center',
                    background: 'white',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    flexShrink: 0 
                }}
            >
                <iframe 
                    srcDoc={html}
                    className="w-full h-full border-none pointer-events-none select-none"
                    title="Slide Preview"
                    sandbox="allow-scripts" 
                />
            </div>
        </div>
    );
};

// --- Helper: Strict HTML Extractor ---
const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*/i);
    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        let clean = cleanText.substring(codeBlockMatch.index + codeBlockMatch[0].length);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section|<head|<body/i);
    if (rawStart !== -1) {
        let clean = cleanText.substring(rawStart);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    return '';
};

// Config Constants
const DEFAULT_STABLE_MODEL = "xiaomi/mimo-v2-flash:free";
const HTML_GENERATION_MODEL = "google/gemini-3-flash-preview";

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive, setStage, setData, sessionId, onRefreshSession, onHandleInsufficientBalance
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const activePage = data.pages[activePageIndex];
    const editorScrollRef = useRef<HTMLDivElement>(null);
    const codeScrollRef = useRef<HTMLPreElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [genModel, setGenModel] = useState<string>('');
    const [showVisualEditorHint, setShowVisualEditorHint] = useState(false);

    const hasHtml = !!activePage?.html;
    const isGenerating = !!activePage?.isGenerating;

    // Monitor container size for scaling
    useEffect(() => {
        if (!containerRef.current) return;
        
        const updateSize = () => {
            if(containerRef.current) {
                // Ensure valid dimensions before setting
                if (containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
                    setContainerSize({ 
                        width: containerRef.current.clientWidth, 
                        height: containerRef.current.clientHeight 
                    });
                }
            }
        };

        // Immediate update
        updateSize();

        // Delayed updates to allow layout to settle (fixes "small card" issue)
        const t1 = setTimeout(updateSize, 50);
        const t2 = setTimeout(updateSize, 200);

        const ro = new ResizeObserver(updateSize);
        ro.observe(containerRef.current);
        
        return () => {
            ro.disconnect();
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [activePageIndex, isGenerating, hasHtml]);

    const handleEnterFinalize = () => {
        if (setStage) {
            // Dismiss hint permanently on click
            localStorage.setItem('has_seen_visual_editor_hint', 'true');
            setShowVisualEditorHint(false);
            setStage('finalize');
        }
    };

    const handleExportSingle = async () => {
        if (!activePage?.html) return;
        setIsExporting(true);
        try {
            // Pass strict dimensions
            const blob = await generatePdf(activePage.html, `${data.topic}_page_${activePageIndex + 1}`, { width: 1600, height: 900 });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.topic}_page_${activePageIndex + 1}.pdf`;
            a.click();
        } catch(e) { alert('导出失败'); } finally { setIsExporting(false); }
    };

    const handleExportAll = async () => {
        setIsExporting(true);
        try {
             const pdfPages = data.pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);
            
            if (pdfPages.length === 0) return;
            
            // Pass strict dimensions
            const blob = await generateBatchPdf(pdfPages, { width: 1600, height: 900 });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.topic}_presentation.pdf`;
            a.click();
        } catch(e) { alert('导出失败'); } finally { setIsExporting(false); }
    };

    // --- Onboarding Hint Logic ---
    useEffect(() => {
        const hasReadyHtml = data.pages.some(p => !!p.html);
        if (hasReadyHtml && !localStorage.getItem('has_seen_visual_editor_hint')) {
            // Delay slightly to ensure UI is ready
            const timer = setTimeout(() => setShowVisualEditorHint(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [data.pages]);

    const handleDismissHint = () => {
        setShowVisualEditorHint(false);
        localStorage.setItem('has_seen_visual_editor_hint', 'true');
    };

    // Robust display content for streaming text
    const displayContent = useMemo(() => {
        if (!activePage) return '';
        const raw = activePage.content || '';
        
        // If it starts with JSON structure, try to parse partial
        // The side effect update happens in Step1Collect, here we just read
        return raw; 
    }, [activePage?.content]);
    
    // --- MANUAL EDIT HANDLER ---
    const handleContentEdit = (newContent: string) => {
        if (!setData) return;
        setData(prev => {
            const newPages = [...prev.pages];
            newPages[activePageIndex] = { ...newPages[activePageIndex], content: newContent };
            return { ...prev, pages: newPages };
        });
    };

    // Auto-scroll effect for text editor (only when generating and NOT user editing actively)
    // We disable auto-scroll if user is typing to prevent jumping
    useEffect(() => {
        if (activePage?.isGenerating && !activePage.html && editorScrollRef.current) {
            editorScrollRef.current.scrollTop = editorScrollRef.current.scrollHeight;
        }
    }, [displayContent, activePage?.isGenerating, activePage?.html]);

    // Auto-scroll effect for code view
    useEffect(() => {
        if (activePage?.isGenerating && activePage.html && codeScrollRef.current && codeScrollRef.current.parentElement) {
             codeScrollRef.current.parentElement.scrollTop = codeScrollRef.current.parentElement.scrollHeight;
        }
    }, [activePage?.html, activePage?.isGenerating]);


    const hasReadyHtmlForButtons = data.pages.some(p => !!p.html);

    // --- Trigger Generation via Sidebar ---
    // Instead of local generation, we use a hidden trigger or rely on user using the chat.
    // However, to support "Click to start", we can simulate a user request to the sidebar if needed.
    // But Step1Collect (Sidebar) owns the LLM logic.
    // For now, we direct user to the sidebar.

    // --- Views ---

    if (stage === 'collect') {
        const handleUpdateReference = (newContent: string) => {
            if (setData) {
                setData(prev => ({
                    ...prev,
                    referenceMaterials: (prev.referenceMaterials || '') + newContent
                }));
            }
        };

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700 bg-slate-50 h-full overflow-y-auto custom-scrollbar relative">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border border-slate-200">
                    <SparklesIcon className="w-16 h-16 text-indigo-500" />
                </div>
                <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Auto Insight Canvas</h1>
                <p className="text-slate-500 max-w-md text-lg mb-10">
                    请在左侧输入研究主题，AI 将为您自动构建逻辑架构。
                </p>
                
                {/* Knowledge Augmentation Tools */}
                <div className="w-full max-w-4xl border-t border-slate-200 pt-10">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">知识增强 (Knowledge Augmentation)</h3>
                    <KnowledgeTools 
                        onUpdateReference={handleUpdateReference}
                        currentReferences={data.referenceMaterials}
                    />
                </div>
            </div>
        );
    }

    if (stage === 'outline') {
        return (
            <Step2Outline 
                topic={data.topic} 
                outlineData={data.outline} 
                setData={setData} // Pass setData for editing capability
                onConfirm={() => {
                    if (data.outline && setData && setStage) {
                        setData(prev => ({ 
                            ...prev, 
                            pages: prev.outline!.pages.map(p => ({ 
                                title: p.title, 
                                summary: p.content, 
                                content: '', 
                                isGenerating: false 
                            }))
                        }));
                        setStage('compose');
                        setActivePageIndex(0);
                    }
                }}
            />
        );
    }

    if (!activePage) return <div className="p-10 text-center">Loading...</div>;

    const hasContent = !!displayContent || isGenerating;

    return (
        <div className="flex h-full overflow-hidden bg-slate-100">
            {/* Left Rail: Thumbnails */}
            <div className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white z-10">
                 <div className="p-4 border-b border-slate-100">
                     <h3 className="font-bold text-slate-800 text-sm truncate" title={data.topic}>{data.topic}</h3>
                     <p className="text-xs text-slate-400 mt-1">{data.pages.length} Pages</p>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {data.pages.map((p, idx) => (
                         <div 
                            key={idx}
                            onClick={() => setActivePageIndex(idx)}
                            className={`
                                group relative p-2 rounded-lg border-2 cursor-pointer transition-all
                                ${activePageIndex === idx ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}
                            `}
                         >
                             {/* Thumbnail Preview */}
                             <div className="aspect-[16/9] bg-slate-100 rounded border border-slate-200 mb-2 overflow-hidden relative flex items-center justify-center">
                                 {p.html && !p.isGenerating ? (
                                     <div className="w-full h-full relative overflow-hidden bg-white">
                                         <div className="absolute top-0 left-0 w-[1600px] h-[900px] origin-top-left transform scale-[0.135]">
                                             <iframe srcDoc={p.html} className="w-full h-full border-none pointer-events-none" tabIndex={-1} />
                                         </div>
                                     </div>
                                 ) : p.isGenerating && p.html ? (
                                     <div className="w-full h-full bg-[#1e1e1e] p-2 text-[5px] font-mono text-slate-300 overflow-hidden leading-tight opacity-90 break-all whitespace-pre-wrap">
                                         <span dangerouslySetInnerHTML={{ __html: highlightHtmlStream(p.html.slice(-500)) }}></span>
                                         <div className="absolute bottom-1 right-1">
                                             <RefreshIcon className="w-3 h-3 animate-spin text-white"/>
                                         </div>
                                     </div>
                                 ) : p.content ? (
                                     <div className="p-2 text-[5px] text-slate-400 leading-tight overflow-hidden text-left h-full w-full select-none bg-white">
                                        {p.content.startsWith('{') ? 'Content Generating...' : p.content.slice(0, 300)}
                                     </div>
                                 ) : (
                                     <span className="text-[10px] text-slate-300">{idx+1}</span>
                                 )}
                                 
                                 {p.isGenerating && !p.html && (
                                     <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                         <RefreshIcon className="w-4 h-4 text-indigo-500 animate-spin"/>
                                     </div>
                                 )}
                             </div>
                             
                             <div className="flex items-center gap-2">
                                 <span className={`text-xs font-bold w-4 ${activePageIndex === idx ? 'text-indigo-600' : 'text-slate-400'}`}>{idx + 1}</span>
                                 <span className="text-xs text-slate-600 truncate flex-1">{p.title}</span>
                                 {p.html && !p.isGenerating && <CheckIcon className="w-3 h-3 text-green-500" />}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm flex-shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Page {activePageIndex + 1} • 
                            {hasHtml && !isGenerating ? <span className="text-green-600 flex items-center gap-1"><CheckIcon className="w-3 h-3"/> HTML Preview</span> : 
                             isGenerating && hasHtml ? <span className="text-blue-600 flex items-center gap-1"><CodeIcon className="w-3 h-3"/> Generating HTML...</span> :
                             'Content Editor'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {hasReadyHtmlForButtons && (
                            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-2 relative">
                                 
                                 {/* Export Buttons Group */}
                                 <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                                     <button 
                                        onClick={handleExportSingle}
                                        disabled={!activePage?.html || isExporting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                                        title="导出当前页 PDF"
                                    >
                                        {isExporting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5"/>}
                                        <span>导出单页</span>
                                    </button>
                                    <div className="w-px bg-slate-300 my-1 mx-1"></div>
                                    <button 
                                        onClick={handleExportAll}
                                        disabled={isExporting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                                        title="导出完整 PDF"
                                    >
                                        {isExporting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DocumentTextIcon className="w-3.5 h-3.5"/>}
                                        <span>导出全部</span>
                                    </button>
                                 </div>

                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                
                                <div className="relative">
                                    <button 
                                        onClick={handleEnterFinalize} 
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 ml-2"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5"/>
                                        <span>可视化精修</span>
                                    </button>

                                    {showVisualEditorHint && (
                                        <div className="absolute top-full right-0 mt-3 z-50 w-64 animate-in fade-in slide-in-from-top-2 duration-500">
                                            <div className="relative bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700">
                                                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-yellow-400 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                                                        <SparklesIcon className="w-3.5 h-3.5" /> 全新功能
                                                    </h4>
                                                    <button onClick={handleDismissHint} className="text-slate-400 hover:text-white transition-colors">
                                                        <CloseIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                                    觉得排版不够完美？<br/>
                                                    点击这里进入<strong>可视化精修</strong>模式，像编辑 PPT 一样自由拖拽、修改元素！
                                                </p>
                                                <div className="flex justify-end">
                                                    <button onClick={handleDismissHint} className="text-[10px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors">知道了</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="flex-1 overflow-hidden bg-slate-100 flex items-center justify-center p-4 md:p-8 relative">
                    <div 
                        ref={containerRef}
                        className={`w-full h-full flex flex-col justify-center transition-all duration-500`}
                    >
                        {/* 1. HTML View */}
                        {hasHtml && !isGenerating ? (
                            <ScaledSlide html={activePage.html!} width={containerSize.width} height={containerSize.height} />
                        ) : hasHtml && isGenerating ? (
                            /* 2. Streaming Code View */
                            <div className="w-full max-w-[1200px] h-full max-h-[800px] bg-[#1e1e1e] rounded-xl shadow-2xl border border-slate-700 p-0 overflow-hidden flex flex-col relative mx-auto animate-in fade-in zoom-in-95 duration-300">
                                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-black/20">
                                    <div className="flex items-center gap-2 text-green-400 font-mono text-xs">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span>Compiling HTML Slide...</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-6 font-mono text-xs custom-scrollbar-dark relative">
                                    <pre ref={codeScrollRef} className="whitespace-pre-wrap break-all leading-relaxed text-slate-400">
                                         <span dangerouslySetInnerHTML={{ __html: highlightHtmlStream(activePage.html!) }}></span>
                                         <span className="inline-block w-2 h-4 bg-slate-400 ml-1 animate-pulse align-middle"></span>
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            /* 3. Text Editor / Empty State */
                            <div className="w-full max-w-[900px] h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h1 className="text-xl font-bold text-slate-900 leading-tight truncate">{activePage.title}</h1>
                                    <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">可直接编辑</span>
                                </div>
                                <div className="flex-1 relative">
                                    <textarea
                                        value={displayContent}
                                        onChange={(e) => handleContentEdit(e.target.value)}
                                        className="w-full h-full p-8 md:px-12 resize-none outline-none text-slate-700 leading-relaxed font-mono text-sm custom-scrollbar bg-transparent"
                                        placeholder="AI 正在撰写内容... (或在此处手动输入)"
                                        spellCheck={false}
                                    />
                                    {isGenerating && (
                                        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-indigo-500 animate-pulse text-xs font-bold bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-indigo-100">
                                            <SparklesIcon className="w-3.5 h-3.5" />
                                            <span>AI Writing...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
