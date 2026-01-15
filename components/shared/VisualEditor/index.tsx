
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VisualCanvas, VisualCanvasHandle } from './VisualCanvas';
import { 
    CodeIcon, EyeIcon, DownloadIcon, CheckIcon, PlusIcon, RefreshIcon,
    PencilIcon, PhotoIcon, LinkIcon, DocumentTextIcon, TrashIcon, DuplicateIcon,
    BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, LayerIcon, ArrowIcon
} from '../../../components/icons';
import { generatePdf } from '../../AgentMarketplace/utils/services';
import { toBlob } from 'html-to-image';

// --- Long Press Button Component ---
const RepeatingButton: React.FC<{
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
    title?: string;
}> = ({ onClick, className, children, title }) => {
    const intervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const clickRef = useRef(onClick);

    useEffect(() => { clickRef.current = onClick; }, [onClick]);

    const stop = useCallback(() => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        window.removeEventListener('mouseup', stop);
    }, []);

    const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        clickRef.current();
        timeoutRef.current = window.setTimeout(() => {
            intervalRef.current = window.setInterval(() => { clickRef.current(); }, 100);
        }, 300);
        window.addEventListener('mouseup', stop);
    }, [stop]);
    
    useEffect(() => { return stop; }, [stop]);

    return (
        <button
            className={className}
            onMouseDown={start}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchEnd={stop}
            title={title}
        >
            {children}
        </button>
    );
};

export interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    canvasSize?: { width: number; height: number };
    hideToolbar?: boolean;
}

const VisualEditor: React.FC<VisualEditorProps> = ({ 
    initialHtml, 
    onSave, 
    scale: externalScale = 1,
    onScaleChange,
    canvasSize = { width: 1600, height: 900 },
    hideToolbar = false
}) => {
    const [internalScale, setInternalScale] = useState(externalScale);
    const [selectedElement, setSelectedElement] = useState<any>(null);
    const editorRef = useRef<VisualCanvasHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scale = onScaleChange ? externalScale : internalScale;
    
    const handleScaleChange = (newScale: number) => {
        if (onScaleChange) {
            onScaleChange(newScale);
        } else {
            setInternalScale(newScale);
        }
    };

    useEffect(() => {
        if (!onScaleChange) {
            setInternalScale(externalScale);
        }
    }, [externalScale, onScaleChange]);

    const handleUpdateStyle = (key: string, value: string | number) => {
        editorRef.current?.updateStyle(key, value);
    };

    const handleInsertText = () => {
        editorRef.current?.insertElement('text', '点击编辑文本');
    };

    const handleInsertImage = () => {
        const url = prompt("请输入图片 URL:");
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
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageChange = () => {
        const currentSrc = selectedElement?.src || "";
        const url = prompt("请输入图片 URL:", currentSrc);
        if (url !== null) {
            editorRef.current?.updateAttribute('src', url);
        }
    };

    const isText = selectedElement && (['P','SPAN','H1','H2','H3','H4','H5','H6','DIV','LI'].includes(selectedElement.tagName));
    const isImg = selectedElement && (selectedElement.tagName === 'IMG' || (selectedElement.tagName === 'DIV' && selectedElement.hasImgChild));
    const isBold = selectedElement && (selectedElement.fontWeight === 'bold' || parseInt(selectedElement.fontWeight) >= 700);
    const isItalic = selectedElement && selectedElement.fontStyle === 'italic';
    const align = selectedElement?.textAlign || 'left';
    
    const parseVal = (val: string) => parseInt(val) || 0;
    const parseFontSize = (val: string) => parseInt(val) || 16;

    const Toolbar = () => (
        <div className={`flex items-center gap-1.5 py-1 ${selectedElement ? 'overflow-x-auto no-scrollbar w-full' : 'overflow-visible'}`}>
             {/* Insert Tools */}
            <div className="flex items-center gap-2 flex-shrink-0 mr-2 border-r border-slate-200 pr-2">
                 <button onClick={handleInsertText} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                     <DocumentTextIcon className="w-3.5 h-3.5"/> 插入文本
                 </button>
                 
                 <div className="relative group">
                     <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm">
                         <PhotoIcon className="w-3.5 h-3.5"/> 插入图片
                     </button>
                     <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-100 p-1 hidden group-hover:block z-50">
                         <button onClick={handleInsertImage} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded text-slate-600 flex gap-2 font-medium items-center"><LinkIcon className="w-3.5 h-3.5"/> 网络图片</button>
                         <label className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded text-slate-600 flex gap-2 cursor-pointer font-medium items-center">
                             <PhotoIcon className="w-3.5 h-3.5"/> 本地上传
                             <input 
                                 ref={fileInputRef}
                                 type="file" 
                                 accept="image/*" 
                                 onChange={handleInsertUpload} 
                                 className="hidden" 
                             />
                         </label>
                     </div>
                 </div>
            </div>

            {selectedElement ? (
                <>
                    {/* Element Type */}
                    <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase border border-indigo-100 mr-2 flex-shrink-0">
                        {isImg ? 'IMAGE' : selectedElement.tagName}
                    </div>

                    {/* Scale Group (New Feature) */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 flex-shrink-0 mr-1">
                        <button 
                            onClick={() => editorRef.current?.scaleGroup(0.9)} 
                            className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-600 transition-colors text-[10px] font-bold w-6 text-center"
                            title="整体缩小 (文字/间距)"
                        >
                            A-
                        </button>
                        <span className="text-[9px] text-slate-400 font-bold px-1 select-none">整体缩放</span>
                        <button 
                            onClick={() => editorRef.current?.scaleGroup(1.1)} 
                            className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-600 transition-colors text-[10px] font-bold w-6 text-center"
                            title="整体放大 (文字/间距)"
                        >
                            A+
                        </button>
                    </div>

                    {/* Typography */}
                    {isText && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 flex-shrink-0">
                             <div className="flex items-center bg-white border border-slate-200 rounded px-1 h-7">
                                <RepeatingButton 
                                    onClick={() => handleUpdateStyle('fontSize', `${Math.max(1, parseFontSize(selectedElement.fontSize) - 1)}px`)}
                                    className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-r border-slate-100 font-bold text-xs"
                                >-</RepeatingButton>
                                <input 
                                    type="number" 
                                    value={parseFontSize(selectedElement.fontSize)} 
                                    onChange={(e) => handleUpdateStyle('fontSize', `${e.target.value}px`)}
                                    className="w-8 text-xs font-bold text-slate-700 outline-none text-center h-full appearance-none bg-transparent"
                                />
                                <RepeatingButton 
                                    onClick={() => handleUpdateStyle('fontSize', `${parseFontSize(selectedElement.fontSize) + 1}px`)}
                                    className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-l border-slate-100 font-bold text-xs"
                                >+</RepeatingButton>
                            </div>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => handleUpdateStyle('fontWeight', isBold ? 'normal' : 'bold')} className={`p-1 rounded hover:bg-white ${isBold ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><BoldIcon className="w-3.5 h-3.5"/></button>
                            <button onClick={() => handleUpdateStyle('fontStyle', isItalic ? 'normal' : 'italic')} className={`p-1 rounded hover:bg-white ${isItalic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><ItalicIcon className="w-3.5 h-3.5"/></button>
                            
                            <div className="flex gap-0.5 border border-slate-200 rounded bg-white ml-1">
                                <button onClick={() => handleUpdateStyle('textAlign', 'left')} className={`p-1 hover:text-indigo-600 ${align === 'left' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignLeftIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => handleUpdateStyle('textAlign', 'center')} className={`p-1 hover:text-indigo-600 ${align === 'center' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignCenterIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => handleUpdateStyle('textAlign', 'right')} className={`p-1 hover:text-indigo-600 ${align === 'right' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignRightIcon className="w-3.5 h-3.5"/></button>
                            </div>
                            
                             <div className="relative w-6 h-6 ml-1 cursor-pointer border border-slate-200 rounded overflow-hidden shadow-sm" title="文字颜色">
                                 <div className="absolute inset-0" style={{backgroundColor: selectedElement.color || '#000'}}></div>
                                 <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => handleUpdateStyle('color', e.target.value)} />
                             </div>
                        </div>
                    )}
                    
                    {/* Image Actions */}
                    {isImg && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1 flex-shrink-0">
                             <button onClick={handleImageChange} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium hover:text-indigo-600 text-slate-600 shadow-sm transition-colors">
                                <RefreshIcon className="w-3 h-3"/> 换图
                             </button>
                        </div>
                    )}

                    {/* Dimensions & Background Group */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">W</span>
                            <input type="number" value={parseVal(selectedElement.width)} onChange={(e) => editorRef.current?.updateStyle('width', `${e.target.value}px`)} className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">H</span>
                            <input type="number" value={parseVal(selectedElement.height)} onChange={(e) => editorRef.current?.updateStyle('height', `${e.target.value}px`)} className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                        </div>
                        
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        
                        <div className="relative w-6 h-6 cursor-pointer border border-slate-200 rounded overflow-hidden shadow-sm" title="背景颜色">
                             <div className="absolute inset-0" style={{backgroundColor: selectedElement.backgroundColor || 'transparent'}}></div>
                             <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => editorRef.current?.updateStyle('backgroundColor', e.target.value)} />
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">R</span>
                            <input type="number" value={parseVal(selectedElement.borderRadius)} onChange={(e) => editorRef.current?.updateStyle('borderRadius', `${e.target.value}px`)} className="w-8 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                         </div>
                         
                         <div className="flex items-center gap-1" title="不透明度">
                            <span className="text-[9px] font-bold text-slate-400">O</span>
                            <input type="number" min="0" max="1" step="0.1" value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1} onChange={(e) => editorRef.current?.updateStyle('opacity', e.target.value)} className="w-8 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                         </div>
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1 flex-shrink-0">
                         <button onClick={() => editorRef.current?.changeLayer('up')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="上移一层"><LayerIcon className="w-3.5 h-3.5 rotate-180"/></button>
                         <button onClick={() => editorRef.current?.changeLayer('down')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="下移一层"><LayerIcon className="w-3.5 h-3.5"/></button>
                         <div className="w-px h-4 bg-slate-200 mx-1"></div>
                         <button onClick={() => editorRef.current?.duplicate()} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="复制"><DuplicateIcon className="w-3.5 h-3.5"/></button>
                         <button onClick={() => { editorRef.current?.deleteElement(); setSelectedElement(null); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded" title="删除"><TrashIcon className="w-3.5 h-3.5"/></button>
                    </div>

                    {/* Transform Nudge Group */}
                    <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1 flex-shrink-0">
                        <RepeatingButton onClick={() => editorRef.current?.updateTransform(-5, 0)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded active:bg-blue-100 transition-colors"><ArrowIcon className="w-3 h-3 rotate-180"/></RepeatingButton>
                        <div className="flex flex-col gap-0.5">
                             <RepeatingButton onClick={() => editorRef.current?.updateTransform(0, -5)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded active:bg-blue-100 transition-colors"><ArrowIcon className="w-2.5 h-2.5 -rotate-90"/></RepeatingButton>
                             <RepeatingButton onClick={() => editorRef.current?.updateTransform(0, 5)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded active:bg-blue-100 transition-colors"><ArrowIcon className="w-2.5 h-2.5 rotate-90"/></RepeatingButton>
                        </div>
                        <RepeatingButton onClick={() => editorRef.current?.updateTransform(5, 0)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded active:bg-blue-100 transition-colors"><ArrowIcon className="w-3 h-3"/></RepeatingButton>
                    </div>
                </>
            ) : (
                <div className="text-xs text-slate-400 italic px-2">选择元素进行编辑</div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full bg-transparent relative">
             {/* Toolbar - Only visible if not hidden */}
             {!hideToolbar && (
                 <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0 relative">
                        <Toolbar />
                    </div>
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                            Zoom: {Math.round(scale * 100)}%
                        </span>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => handleScaleChange(Math.max(0.1, scale - 0.1))} className="w-7 h-7 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded text-sm transition-colors">-</button>
                            <button onClick={() => handleScaleChange(Math.min(3, scale + 0.1))} className="w-7 h-7 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded text-sm transition-colors">+</button>
                        </div>
                    </div>
                 </div>
             )}

             <div className="flex-1 relative overflow-hidden flex">
                <VisualCanvas 
                    ref={editorRef}
                    initialHtml={initialHtml}
                    onSave={onSave}
                    scale={scale}
                    onScaleChange={handleScaleChange}
                    onSelectionChange={setSelectedElement}
                    canvasSize={canvasSize}
                />
             </div>
        </div>
    );
};

export default VisualEditor;
