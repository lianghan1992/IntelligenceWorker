
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VisualCanvas, VisualCanvasHandle } from './VisualCanvas';
import { 
    CodeIcon, EyeIcon, DownloadIcon, CheckIcon, PlusIcon, RefreshIcon,
    ArrowLeftIcon, PencilIcon, PhotoIcon, LinkIcon, ViewGridIcon, 
    DocumentTextIcon, TrashIcon, DuplicateIcon
} from '../../../../components/icons';
import { generatePdf } from '../../utils/services';
import { toBlob } from 'html-to-image';

// --- Local Icons ---
const UndoIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.7-.71 3.26-1.84 4.38l1.41 1.41c1.55-1.58 2.53-3.75 2.53-6.14 0-4.42-3.58-8-8-8z" transform="scale(-1, 1) translate(-24, 0)"/></svg>
);
const RedoIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.7-.71 3.26-1.84 4.38l1.41 1.41c1.55-1.58 2.53-3.75 2.53-6.14 0-4.42-3.58-8-8-8z"/></svg>
);
const BoldIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 11.81C16.36 11.23 17 10.23 17 9c0-2.21-1.79-4-4-4H7v14h7.5c2.09 0 3.5-1.75 3.5-3.88 0-1.63-1.04-3.05-2.4-3.31zM10.5 7.5H13c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-2.5V7.5zm3.5 9H10.5v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-2.5V7.5zm3.5 9H10.5v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>;
const ItalicIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>;
const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;
const LayerIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>;
const ArrowIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4z"/></svg>;

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center h-screen m-0 p-0 overflow-hidden">
  <div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden shadow-xl flex flex-col">
    <!-- Header -->
    <header class="h-24 px-12 flex items-center border-b border-gray-100 bg-white z-10">
      <div class="flex items-center gap-4">
        <div class="w-2 h-10 bg-indigo-600 rounded-full"></div>
        <h1 class="text-4xl font-bold text-gray-900 tracking-tight">2025 战略规划概览</h1>
      </div>
      <div class="ml-auto text-gray-400 font-mono text-xl">CONFIDENTIAL</div>
    </header>
    
    <!-- Content -->
    <main class="flex-1 p-12 grid grid-cols-2 gap-12">
      <div class="flex flex-col justify-center space-y-8">
         <div class="p-8 bg-indigo-50 rounded-3xl border border-indigo-100">
             <h2 class="text-3xl font-bold text-indigo-900 mb-4">核心目标</h2>
             <p class="text-xl text-indigo-700 leading-relaxed">
                通过技术创新驱动业务增长，实现全场景智能化覆盖，构建行业领先的竞争壁垒。
             </p>
         </div>
         
         <div class="space-y-4">
             <div class="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold">1</div>
                 <div>
                     <h3 class="text-xl font-bold text-gray-800">市场份额增长</h3>
                     <p class="text-gray-500">Target: 25% YoY</p>
                 </div>
             </div>
             <div class="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">2</div>
                 <div>
                     <h3 class="text-xl font-bold text-gray-800">研发投入占比</h3>
                     <p class="text-gray-500">Target: 15% Revenue</p>
                 </div>
             </div>
         </div>
      </div>
      
      <div class="bg-gray-100 rounded-3xl flex items-center justify-center relative overflow-hidden group">
          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Strategy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div class="relative z-10 text-white text-center p-8">
              <div class="text-6xl font-black mb-2">Q4</div>
              <div class="text-2xl font-light tracking-widest uppercase">Key Milestone</div>
          </div>
      </div>
    </main>
  </div>
</body>
</html>`;

// --- Custom Hook for History ---
function useHistory<T>(initialState: T) {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const state = history[currentIndex];

    const pushState = useCallback((newState: T) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, currentIndex + 1);
            if (newHistory[newHistory.length - 1] === newState) return prev;
            if (newHistory.length > 50) newHistory.shift();
            return [...newHistory, newState];
        });
    }, [currentIndex]);
    
    useEffect(() => {
        setCurrentIndex(history.length - 1);
    }, [history]);

    const undo = useCallback(() => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    }, []);

    const redo = useCallback(() => {
        setCurrentIndex(prev => Math.min(history.length - 1, prev + 1));
    }, [history.length]);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return { state, pushState, undo, redo, canUndo, canRedo };
}

interface HtmlVisualEditorProps {
    onBack?: () => void;
}

const HtmlVisualEditor: React.FC<HtmlVisualEditorProps> = ({ onBack }) => {
    const { state: htmlContent, pushState: setHtmlContent, undo, redo, canUndo, canRedo } = useHistory(DEFAULT_TEMPLATE);
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [scale, setScale] = useState(0.8);
    const [selection, setSelection] = useState<any>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 900 });
    const editorRef = useRef<VisualCanvasHandle>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            } else if (e.key === 'Delete' && selection) {
                editorRef.current?.deleteElement();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, selection]);

    const handleSyncCode = (newHtml: string) => {
        setHtmlContent(newHtml);
    };

    const handleInsertImage = () => {
        const url = prompt("请输入新图片 URL:");
        if (url) {
            editorRef.current?.insertElement('img', url);
        }
    };
    
    const handleInsertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    editorRef.current?.insertElement('img', event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleImageChange = () => {
        const currentSrc = selection.src || "";
        const url = prompt("请输入图片 URL:", currentSrc);
        if (url !== null) {
            editorRef.current?.updateAttribute('src', url);
        }
    };

    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const blob = await generatePdf(htmlContent, `design_${new Date().toISOString().slice(0,10)}`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `design_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('PDF 生成失败，请重试。');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    // --- Image Export Logic ---
    const handleDownloadImage = async () => {
        const node = editorRef.current?.getCanvasNode();
        if (!node) return;
        
        // Temporarily deselect to hide handlers
        editorRef.current?.deselect();
        // Give a small tick for UI update (remove handles)
        await new Promise(r => setTimeout(r, 50));

        try {
            const blob = await toBlob(node, {
                cacheBust: true,
                style: { margin: '0' } // Ensure no extra margin
            });
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `design_${new Date().toISOString().slice(0,10)}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch(e) {
             console.error("Image generation failed", e);
             alert('生成图片失败，请检查是否使用了跨域图片资源。');
        }
    };

    const handleCopyImage = async () => {
        const node = editorRef.current?.getCanvasNode();
        if (!node) return;
        
        editorRef.current?.deselect();
        await new Promise(r => setTimeout(r, 50));

        try {
            const blob = await toBlob(node, { cacheBust: true });
            if (blob) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                alert('图片已复制到剪贴板');
            }
        } catch(e) {
            console.error(e);
            alert('复制失败，请检查跨域图片或浏览器权限。');
        }
    };

    // Helper data for toolbar state
    const isText = selection && (['P','SPAN','H1','H2','H3','H4','H5','H6','DIV'].includes(selection.tagName));
    const isImg = selection && (selection.tagName === 'IMG' || (selection.tagName === 'DIV' && selection.hasImgChild));
    const isBold = selection && (selection.fontWeight === 'bold' || parseInt(selection.fontWeight) >= 700);
    const isItalic = selection && selection.fontStyle === 'italic';
    const align = selection?.textAlign || 'left';
    
    const parseVal = (val: string) => parseInt(val) || 0;
    const parseFontSize = (val: string) => parseInt(val) || 16;

    // Integrated Toolbar Component
    const Toolbar = () => (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {selection ? (
                <>
                    {/* Element Type Badge */}
                    <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase border border-indigo-100 mr-2">
                        {isImg ? 'IMAGE' : selection.tagName}
                    </div>

                    {/* Typography Group */}
                    {isText && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                             <div className="flex items-center bg-white border border-slate-200 rounded px-1 h-7">
                                <button 
                                    onClick={() => editorRef.current?.updateStyle('fontSize', `${Math.max(1, parseFontSize(selection.fontSize) - 2)}px`)}
                                    className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-r border-slate-100 font-bold text-xs"
                                >-</button>
                                <input 
                                    type="number" 
                                    value={parseFontSize(selection.fontSize)} 
                                    onChange={(e) => editorRef.current?.updateStyle('fontSize', `${e.target.value}px`)}
                                    className="w-8 text-xs font-bold text-slate-700 outline-none text-center h-full appearance-none bg-transparent"
                                />
                                <button 
                                    onClick={() => editorRef.current?.updateStyle('fontSize', `${parseFontSize(selection.fontSize) + 2}px`)}
                                    className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-l border-slate-100 font-bold text-xs"
                                >+</button>
                            </div>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => editorRef.current?.updateStyle('fontWeight', isBold ? 'normal' : 'bold')} className={`p-1 rounded hover:bg-white ${isBold ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><BoldIcon className="w-3.5 h-3.5"/></button>
                            <button onClick={() => editorRef.current?.updateStyle('fontStyle', isItalic ? 'normal' : 'italic')} className={`p-1 rounded hover:bg-white ${isItalic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><ItalicIcon className="w-3.5 h-3.5"/></button>
                            
                            <div className="flex gap-0.5 border border-slate-200 rounded bg-white ml-1">
                                <button onClick={() => editorRef.current?.updateStyle('textAlign', 'left')} className={`p-1 hover:text-indigo-600 ${align === 'left' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignLeftIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => editorRef.current?.updateStyle('textAlign', 'center')} className={`p-1 hover:text-indigo-600 ${align === 'center' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignCenterIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => editorRef.current?.updateStyle('textAlign', 'right')} className={`p-1 hover:text-indigo-600 ${align === 'right' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignRightIcon className="w-3.5 h-3.5"/></button>
                            </div>
                            
                             <div className="relative w-6 h-6 ml-1 cursor-pointer border border-slate-200 rounded overflow-hidden shadow-sm" title="文字颜色">
                                 <div className="absolute inset-0" style={{backgroundColor: selection.color || '#000'}}></div>
                                 <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => editorRef.current?.updateStyle('color', e.target.value)} />
                             </div>
                        </div>
                    )}
                    
                    {/* Image Actions */}
                    {isImg && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                             <button onClick={handleImageChange} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium hover:text-indigo-600 text-slate-600 shadow-sm transition-colors">
                                <RefreshIcon className="w-3 h-3"/> 换图
                             </button>
                        </div>
                    )}

                    {/* Dimensions & Background Group */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">W</span>
                            <input type="number" value={parseVal(selection.width)} onChange={(e) => editorRef.current?.updateStyle('width', `${e.target.value}px`)} className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">H</span>
                            <input type="number" value={parseVal(selection.height)} onChange={(e) => editorRef.current?.updateStyle('height', `${e.target.value}px`)} className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                        </div>
                        
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        
                        <div className="relative w-6 h-6 cursor-pointer border border-slate-200 rounded overflow-hidden shadow-sm" title="背景颜色">
                             <div className="absolute inset-0" style={{backgroundColor: selection.backgroundColor || 'transparent'}}></div>
                             <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => editorRef.current?.updateStyle('backgroundColor', e.target.value)} />
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">R</span>
                            <input type="number" value={parseVal(selection.borderRadius)} onChange={(e) => editorRef.current?.updateStyle('borderRadius', `${e.target.value}px`)} className="w-8 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                         </div>
                         
                         {/* Opacity */}
                         <div className="flex items-center gap-1" title="不透明度">
                            <span className="text-[9px] font-bold text-slate-400">O</span>
                            <input type="number" min="0" max="1" step="0.1" value={selection.opacity !== undefined ? selection.opacity : 1} onChange={(e) => editorRef.current?.updateStyle('opacity', e.target.value)} className="w-8 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                         </div>
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                         <button onClick={() => editorRef.current?.changeLayer('up')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="上移一层"><LayerIcon className="w-3.5 h-3.5 rotate-180"/></button>
                         <button onClick={() => editorRef.current?.changeLayer('down')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="下移一层"><LayerIcon className="w-3.5 h-3.5"/></button>
                         <div className="w-px h-4 bg-slate-200 mx-1"></div>
                         <button onClick={() => editorRef.current?.duplicate()} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="复制"><DuplicateIcon className="w-3.5 h-3.5"/></button>
                         <button onClick={() => { editorRef.current?.deleteElement(); setSelection(null); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded" title="删除"><TrashIcon className="w-3.5 h-3.5"/></button>
                    </div>

                    {/* Transform Nudge Group */}
                    <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                        <button onClick={() => editorRef.current?.updateTransform(-10, 0)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-3 h-3 rotate-180"/></button>
                        <div className="flex flex-col gap-0.5">
                             <button onClick={() => editorRef.current?.updateTransform(0, -10)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-2.5 h-2.5 -rotate-90"/></button>
                             <button onClick={() => editorRef.current?.updateTransform(0, 10)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-2.5 h-2.5 rotate-90"/></button>
                        </div>
                        <button onClick={() => editorRef.current?.updateTransform(10, 0)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-3 h-3"/></button>
                    </div>
                </>
            ) : (
                /* Insert Tools (No Selection) */
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-400 mr-2">插入:</span>
                     <div className="relative group">
                         <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm">
                             <PhotoIcon className="w-3.5 h-3.5"/> 图片
                         </button>
                         <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-100 p-1 hidden group-hover:block z-50">
                             <button onClick={handleInsertImage} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded text-slate-600 flex gap-2 font-medium items-center"><LinkIcon className="w-3.5 h-3.5"/> 网络图片</button>
                             <label className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded text-slate-600 flex gap-2 cursor-pointer font-medium items-center">
                                 <PhotoIcon className="w-3.5 h-3.5"/> 本地上传
                                 <input 
                                     type="file" 
                                     accept="image/*" 
                                     onChange={handleInsertUpload} 
                                     className="hidden" 
                                 />
                             </label>
                         </div>
                     </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Merged Header & Toolbar */}
            <div className="h-16 px-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-between shadow-sm z-20 flex-shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    {/* Back Button */}
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors group"
                        title="返回集市"
                    >
                        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    {/* Title */}
                    <div className="flex items-center gap-2 mr-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <PencilIcon className="w-4 h-4" />
                        </div>
                        <h1 className="text-base font-bold text-slate-800 hidden lg:block">HTML 视觉设计</h1>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* View Mode */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg flex-shrink-0">
                        <button 
                            onClick={() => setViewMode('visual')}
                            className={`p-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="可视化"
                        >
                            <EyeIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('code')}
                            className={`p-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="源码"
                        >
                            <CodeIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Toolbar (Only in Visual Mode) */}
                    {viewMode === 'visual' && (
                        <div className="flex-1 ml-4 overflow-hidden border-l border-slate-100 pl-4 h-full flex items-center">
                            <Toolbar />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-slate-100 ml-2">
                    {/* Canvas Size Inputs */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm mr-2">
                        <input 
                            type="number" 
                            value={canvasSize.width} 
                            onChange={e => setCanvasSize(p => ({...p, width: parseInt(e.target.value) || 100}))}
                            className="w-10 text-xs font-mono text-center outline-none border-r border-slate-100"
                            title="画布宽度"
                        />
                        <span className="text-[9px] text-slate-400">x</span>
                        <input 
                            type="number" 
                            value={canvasSize.height} 
                            onChange={e => setCanvasSize(p => ({...p, height: parseInt(e.target.value) || 100}))}
                            className="w-10 text-xs font-mono text-center outline-none"
                            title="画布高度"
                        />
                    </div>

                    {/* Zoom & Undo/Redo Group */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                         <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-slate-50 rounded text-slate-500 disabled:opacity-30 transition-all"><UndoIcon className="w-3.5 h-3.5" /></button>
                         <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-slate-50 rounded text-slate-500 disabled:opacity-30 transition-all"><RedoIcon className="w-3.5 h-3.5" /></button>
                         <div className="w-px h-4 bg-slate-200 mx-1"></div>
                         <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="text-slate-400 hover:text-indigo-600 px-1 font-mono text-sm font-bold">-</button>
                         <span className="text-xs font-bold text-slate-600 w-8 text-center select-none">{Math.round(scale * 100)}%</span>
                         <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="text-slate-400 hover:text-indigo-600 px-1 font-mono text-sm font-bold">+</button>
                    </div>

                    {/* Export Actions */}
                    <div className="flex items-center gap-1">
                        <button onClick={handleCopyImage} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="复制图片到剪贴板">
                            <DuplicateIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={handleDownloadImage} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="下载图片">
                            <PhotoIcon className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-indigo-600 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ml-1"
                        >
                            {isDownloadingPdf ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">导出 PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'visual' ? (
                    <VisualCanvas 
                        ref={editorRef}
                        initialHtml={htmlContent} 
                        onSave={handleSyncCode}
                        onContentChange={handleSyncCode}
                        scale={scale}
                        onScaleChange={setScale}
                        onSelectionChange={setSelection}
                        canvasSize={canvasSize}
                    />
                ) : (
                    <div className="w-full h-full bg-[#1e1e1e] flex flex-col">
                        <textarea 
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            className="flex-1 w-full bg-transparent text-gray-300 font-mono text-sm p-6 resize-none focus:outline-none custom-scrollbar-dark leading-relaxed"
                            spellCheck={false}
                            placeholder="在此粘贴 HTML 代码..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default HtmlVisualEditor;
