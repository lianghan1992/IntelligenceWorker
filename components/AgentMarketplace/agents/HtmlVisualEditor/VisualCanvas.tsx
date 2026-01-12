
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    TrashIcon, ArrowRightIcon, PlusIcon, RefreshIcon, 
    CheckIcon, CloseIcon, CubeIcon, DocumentTextIcon, 
    PhotoIcon, ViewGridIcon, PencilIcon, DownloadIcon,
    GlobeIcon, LinkIcon
} from '../../../../components/icons';

export interface VisualCanvasProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    onContentChange?: (newHtml: string) => void;
    scale: number;
    onScaleChange?: (scale: number) => void;
}

// ... (Retain all existing Icon components: UndoIcon, RedoIcon, GripVerticalIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, BoldIcon, ItalicIcon, UnderlineIcon, DuplicateIcon, CornerIcon, ShadowIcon, LayerIcon)
const UndoIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.7-.71 3.26-1.84 4.38l1.41 1.41c1.55-1.58 2.53-3.75 2.53-6.14 0-4.42-3.58-8-8-8z" transform="scale(-1, 1) translate(-24, 0)"/>
    </svg>
);
const RedoIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.7-.71 3.26-1.84 4.38l1.41 1.41c1.55-1.58 2.53-3.75 2.53-6.14 0-4.42-3.58-8-8-8z"/>
    </svg>
);
const GripVerticalIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M9.5 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5-13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
    </svg>
);
const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;
const BoldIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 11.81C16.36 11.23 17 10.23 17 9c0-2.21-1.79-4-4-4H7v14h7.5c2.09 0 3.5-1.75 3.5-3.88 0-1.63-1.04-3.05-2.4-3.31zM10.5 7.5H13c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-2.5V7.5zm3.5 9H10.5v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>;
const ItalicIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>;
const UnderlineIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>;
const DuplicateIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>;
const CornerIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M21 15h-2v2c0 1.65-1.35 3-3 3H8v2h8c2.76 0 5-2.24 5-5v-2zM3 15h2v2c0 1.65 1.35 3 3 3h4v2H8c-2.76 0-5-2.24-5-5v-2zM3 9h2V7c0-1.65 1.35-3-3-3h4V2H8c-2.76 0-5 2.24-5 5v2zM21 9h-2V7c0-1.65-1.35-3-3-3h-4V2h4c2.76 0 5 2.24 5 5v2z"/></svg>;
const ShadowIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm2 16h14V5H5v14z M8 8h8v8H8V8z" opacity="0.5"/><path d="M22 22H2V2h20v20zM4 20h16V4H4v16z"/></svg>;
const LayerIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>;

// ... (Retain useHistory hook and PropertiesPanel component as is) ...
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
        setCurrentIndex(prev => prev + 1 >= 50 ? 49 : prev + 1);
    }, [currentIndex]);
    useEffect(() => { setCurrentIndex(history.length - 1); }, [history.length]);
    const undo = useCallback(() => setCurrentIndex(prev => Math.max(0, prev - 1)), []);
    const redo = useCallback(() => setCurrentIndex(prev => Math.min(history.length - 1, prev + 1)), [history.length]);
    const reset = useCallback((newState: T) => { setHistory([newState]); setCurrentIndex(0); }, []);
    return { state, pushState, undo, redo, canUndo: currentIndex > 0, canRedo: currentIndex < history.length - 1, reset };
}

interface PropertiesPanelProps {
    element: any;
    onUpdateStyle: (key: string, value: string) => void;
    onUpdateContent: (text: string) => void;
    onUpdateAttribute: (key: string, value: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdateStyle, onUpdateContent, onUpdateAttribute, onDelete, onClose }) => {
    if (!element) return null;
    const parseVal = (val: string) => parseInt(val) || 0;
    const isImg = element.tagName === 'IMG';

    return (
        <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">{element.tagName}</span>
                    <span className="text-sm font-bold text-slate-700">属性编辑</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {(!isImg && element.tagName !== 'HR' && element.tagName !== 'BR') && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><DocumentTextIcon className="w-3.5 h-3.5" /> 文本内容</h4>
                        <textarea 
                            value={element.content || ''}
                            onChange={(e) => onUpdateContent(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 resize-y min-h-[80px]"
                        />
                    </div>
                )}
                
                {isImg && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PhotoIcon className="w-3.5 h-3.5" /> 图片源</h4>
                        <div>
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">图片 URL</label>
                             <input 
                                type="text" 
                                value={element.src || ''} 
                                onChange={(e) => onUpdateAttribute('src', e.target.value)} 
                                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:border-indigo-500 outline-none bg-slate-50 text-slate-600"
                                placeholder="https://..."
                             />
                        </div>
                    </div>
                )}

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ViewGridIcon className="w-3.5 h-3.5" /> 布局与尺寸</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">宽度 (px)</label>
                            <input type="number" value={parseVal(element.width)} onChange={(e) => onUpdateStyle('width', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">高度 (px)</label>
                            <input type="number" value={parseVal(element.height)} onChange={(e) => onUpdateStyle('height', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"/>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" /> 字体排版</h4>
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">文字颜色</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                            <div className="w-5 h-5 rounded border border-slate-200" style={{backgroundColor: element.color || '#000'}}></div>
                            <input type="color" value={element.color || '#000000'} onChange={(e) => onUpdateStyle('color', e.target.value)} className="w-8 h-8 opacity-0 absolute cursor-pointer"/>
                            <input type="text" value={element.color} onChange={(e) => onUpdateStyle('color', e.target.value)} className="flex-1 text-xs outline-none uppercase font-mono text-slate-600"/>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">字号 (px)</label>
                            <input type="number" value={parseVal(element.fontSize)} onChange={(e) => onUpdateStyle('fontSize', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none"/>
                        </div>
                        <div className="w-1/3">
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">加粗</label>
                             <button onClick={() => onUpdateStyle('fontWeight', element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'normal' : 'bold')} className={`w-full py-1.5 border rounded-md font-bold text-sm ${element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>B</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">对齐方式</label>
                        <div className="flex border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                            {['left', 'center', 'right', 'justify'].map((align) => (
                                <button key={align} onClick={() => onUpdateStyle('textAlign', align)} className={`flex-1 py-1.5 flex justify-center hover:bg-white ${element.textAlign === align ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                                    {align === 'left' && <AlignLeftIcon className="w-4 h-4"/>}
                                    {align === 'center' && <AlignCenterIcon className="w-4 h-4"/>}
                                    {align === 'right' && <AlignRightIcon className="w-4 h-4"/>}
                                    {align === 'justify' && <span className="text-[10px] font-bold">≡</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PhotoIcon className="w-3.5 h-3.5" /> 外观样式</h4>
                     <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">背景颜色</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                            <div className="w-5 h-5 rounded border border-slate-200" style={{backgroundColor: element.backgroundColor || 'transparent'}}></div>
                            <input type="color" value={element.backgroundColor || '#ffffff'} onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)} className="w-8 h-8 opacity-0 absolute cursor-pointer"/>
                            <input type="text" value={element.backgroundColor} onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)} className="flex-1 text-xs outline-none uppercase font-mono text-slate-600" placeholder="TRANSPARENT"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">圆角 (px)</label>
                            <input type="number" value={parseVal(element.borderRadius)} onChange={(e) => onUpdateStyle('borderRadius', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none"/>
                        </div>
                        <div>
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">不透明度</label>
                             <input type="number" min="0" max="1" step="0.1" value={element.opacity !== undefined ? element.opacity : 1} onChange={(e) => onUpdateStyle('opacity', e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm">
                    <TrashIcon className="w-4 h-4" /> 删除元素
                </button>
            </div>
        </div>
    );
};

// ... (Retain FloatingToolbar component as is) ...
const FloatingToolbar: React.FC<any> = ({ element, onUpdateStyle, onUpdateTransform, onUpdateAttribute, onInsertElement, onLayerChange, onDuplicate, onDelete }) => {
    // ... (Existing implementation content) ...
    // Note: Reusing the exact same implementation as provided previously in context or assume it's imported/reused.
    // For brevity in this diff, assuming the previous implementation is maintained.
    const tagName = element.tagName;
    const isText = tagName === 'P' || tagName === 'SPAN' || tagName === 'H1' || tagName === 'H2' || tagName === 'H3' || tagName === 'H4' || tagName === 'H5' || tagName === 'H6' || (tagName === 'DIV' && element.content?.trim().length > 0);
    const isImg = tagName === 'IMG';
    const currentScale = element.scale || 1;
    
    const isBold = element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700;
    const isItalic = element.fontStyle === 'italic';
    const align = element.textAlign || 'left';
    const hasRadius = parseInt(element.borderRadius) > 0;
    const hasShadow = element.boxShadow && element.boxShadow !== 'none';

    // Dragging Logic
    const [position, setPosition] = useState({ x: 0, y: -80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{x: number, y: number} | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        e.stopPropagation();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && dragStartRef.current) {
                const newX = e.clientX - dragStartRef.current.x;
                const newY = e.clientY - dragStartRef.current.y;
                setPosition({ x: newX, y: newY });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleImageChange = () => {
        const url = prompt("请输入图片 URL:", element.src || "");
        if (url !== null) {
            onUpdateAttribute('src', url);
        }
    };
    
    // Simple wrapper for tool btn
    const ToolBtn = ({ onClick, active, children, title, className }: any) => (
        <button 
            onClick={onClick}
            className={`p-2.5 rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} ${className || ''}`}
            title={title}
        >
            {children}
        </button>
    );
    const Separator = () => <div className="w-px h-8 bg-slate-200 mx-2"></div>;

    return (
        <div 
            className="absolute z-50 flex flex-col items-center select-none"
            style={{ 
                left: `calc(50% + ${position.x}px)`, 
                top: `calc(32px + ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
        >
            <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 p-3 flex items-center gap-1 animate-in fade-in slide-in-from-top-2 min-w-max ring-1 ring-black/5">
                <div className="p-2 mr-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors" onMouseDown={handleMouseDown}><GripVerticalIcon className="w-5 h-5" /></div>
                <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest mr-2 border border-slate-200">{tagName}</div>
                <Separator />
                <div className="flex items-center gap-1">
                    <div className="relative group p-2.5 hover:bg-slate-100 rounded-xl cursor-pointer" title="文字颜色">
                         <div className="w-5 h-5 rounded-full border-2 border-slate-200 shadow-sm" style={{ backgroundColor: element.color || '#000' }}></div>
                         <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => onUpdateStyle('color', e.target.value)} />
                    </div>
                    <div className="relative group p-2.5 hover:bg-slate-100 rounded-xl cursor-pointer" title="背景颜色">
                         <div className="w-5 h-5 rounded-md border-2 border-slate-200 shadow-sm" style={{ backgroundColor: element.backgroundColor || 'transparent' }}></div>
                         <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)} />
                    </div>
                    <Separator />
                    {isText && (
                        <>
                            <ToolBtn active={isBold} onClick={() => onUpdateStyle('fontWeight', isBold ? 'normal' : 'bold')} title="加粗"><BoldIcon className="w-5 h-5" /></ToolBtn>
                            <ToolBtn active={isItalic} onClick={() => onUpdateStyle('fontStyle', isItalic ? 'normal' : 'italic')} title="斜体"><ItalicIcon className="w-5 h-5" /></ToolBtn>
                            <Separator />
                        </>
                    )}
                     {isImg && (
                        <>
                            <ToolBtn className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold px-4" title="更换当前图片" onClick={handleImageChange}><RefreshIcon className="w-4 h-4" /></ToolBtn>
                            <Separator />
                        </>
                    )}
                    <ToolBtn active={hasRadius} onClick={() => onUpdateStyle('borderRadius', hasRadius ? '0' : '16px')} title="圆角"><CornerIcon className="w-5 h-5" /></ToolBtn>
                    <ToolBtn active={hasShadow} onClick={() => onUpdateStyle('boxShadow', hasShadow ? 'none' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)')} title="阴影"><ShadowIcon className="w-5 h-5" /></ToolBtn>
                </div>
                <Separator />
                <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 rounded-xl mx-1 p-1">
                    <button onClick={() => onUpdateTransform(0, 0, Math.max(0.2, currentScale - 0.1))} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors text-sm font-mono">-</button>
                    <span className="text-xs text-slate-600 w-10 text-center font-mono font-bold select-none">{Math.round(currentScale * 100)}%</span>
                    <button onClick={() => onUpdateTransform(0, 0, Math.min(5, currentScale + 0.1))} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors text-sm font-mono">+</button>
                </div>
                <Separator />
                <ToolBtn onClick={() => onLayerChange('up')} title="上移一层"><LayerIcon className="w-5 h-5 text-slate-500 transform rotate-180"/></ToolBtn>
                <ToolBtn onClick={() => onLayerChange('down')} title="下移一层"><LayerIcon className="w-5 h-5 text-slate-500"/></ToolBtn>
                <ToolBtn onClick={onDuplicate} title="复制"><DuplicateIcon className="w-5 h-5 text-indigo-500"/></ToolBtn>
                <ToolBtn onClick={onDelete} title="删除"><TrashIcon className="w-5 h-5 text-red-500"/></ToolBtn>
            </div>
        </div>
    );
};

// ... (Retain EDITOR_SCRIPT) ...
const EDITOR_SCRIPT = `
<script>
(function() {
  let selectedEl = null;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = null;
  let startX, startY;
  // Initialize with window props if needed
  
  window.visualEditorScale = 1;

  const style = document.createElement('style');
  style.innerHTML = \`
    html, body { min-height: 100vh !important; margin: 0; background-color: #ffffff; }
    .ai-editor-selected { outline: 2px solid #3b82f6 !important; outline-offset: 0px; cursor: move !important; z-index: 9999; position: relative; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
    .ai-editor-hover:not(.ai-editor-selected) { outline: 1px dashed #93c5fd !important; cursor: pointer !important; }
    *[contenteditable="true"] { cursor: text !important; outline: 2px solid #10b981 !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
    .ai-resizer { position: absolute; width: 8px; height: 8px; background: white; border: 1px solid #3b82f6; z-index: 10000; border-radius: 50%; }
    .ai-r-nw { top: -4px; left: -4px; cursor: nw-resize; }
    .ai-r-n  { top: -4px; left: 50%; margin-left: -4px; cursor: n-resize; }
    .ai-r-ne { top: -4px; right: -4px; cursor: ne-resize; }
    .ai-r-e  { top: 50%; right: -4px; margin-top: -4px; cursor: e-resize; }
    .ai-r-se { bottom: -4px; right: -4px; cursor: se-resize; }
    .ai-r-s  { bottom: -4px; left: 50%; margin-left: -4px; cursor: s-resize; }
    .ai-r-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
    .ai-r-w  { top: 50%; left: -4px; margin-top: -4px; cursor: w-resize; }
  \`;
  document.head.appendChild(style);

  function pushHistory() {
      setTimeout(() => {
        if (!selectedEl) return;
        const wasSelected = selectedEl;
        deselect(true);
        const cleanHtml = document.documentElement.outerHTML;
        selectElement(wasSelected);
        window.parent.postMessage({ type: 'HISTORY_UPDATE', html: cleanHtml }, '*');
      }, 50);
  }

  function createResizers(el) {
      removeResizers();
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handles.forEach(h => {
          const div = document.createElement('div');
          div.className = 'ai-resizer ai-r-' + h;
          div.dataset.handle = h;
          el.appendChild(div);
      });
  }

  function removeResizers() {
      document.querySelectorAll('.ai-resizer').forEach(r => r.remove());
  }

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-resizer')) return;
    if (e.target.isContentEditable) return;
    e.preventDefault(); e.stopPropagation();
    if (selectedEl === e.target) return;
    if (selectedEl && selectedEl !== e.target) deselect();
    const target = e.target;
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect(); return;
    }
    selectElement(target);
  }, true);

  document.body.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('ai-resizer') || e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas' || e.target === selectedEl) return;
      e.target.classList.add('ai-editor-hover');
  });
  document.body.addEventListener('mouseout', (e) => { e.target.classList.remove('ai-editor-hover'); });

  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     if (selectedEl && !e.target.classList.contains('ai-resizer')) {
         removeResizers();
         selectedEl.contentEditable = 'true';
         selectedEl.focus();
         const onBlur = () => {
             selectedEl.contentEditable = 'false';
             selectedEl.removeEventListener('blur', onBlur);
             createResizers(selectedEl);
             pushHistory(); 
         };
         selectedEl.addEventListener('blur', onBlur);
     }
  });

  function selectElement(el) {
      if (selectedEl && selectedEl !== el) deselect();
      selectedEl = el;
      selectedEl.classList.remove('ai-editor-hover');
      selectedEl.classList.add('ai-editor-selected');
      createResizers(selectedEl);
      
      const transform = selectedEl.style.transform || '';
      let currentScale = 1;
      const scaleMatch = transform.match(/scale\\(([^)]+)\\)/);
      if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);

      const comp = window.getComputedStyle(selectedEl);
      window.parent.postMessage({ 
          type: 'SELECTED', 
          tagName: selectedEl.tagName,
          content: selectedEl.innerText,
          color: comp.color,
          fontSize: comp.fontSize,
          fontWeight: comp.fontWeight,
          textAlign: comp.textAlign,
          width: comp.width,
          height: comp.height,
          display: comp.display,
          backgroundColor: comp.backgroundColor,
          borderRadius: comp.borderRadius,
      }, '*');
  }

  function deselect(temporary = false) {
      if (selectedEl) {
         selectedEl.classList.remove('ai-editor-selected');
         selectedEl.contentEditable = 'false';
         removeResizers();
         if (!temporary) {
             selectedEl = null;
             window.parent.postMessage({ type: 'DESELECT' }, '*');
         }
      }
  }

  window.addEventListener('message', (event) => {
    const { action, value } = event.data;
    if (action === 'UPDATE_SCALE') { window.visualEditorScale = value; return; }
    if (action === 'GET_HTML') {
        const wasSelected = selectedEl;
        if (selectedEl) deselect(true);
        const editables = document.querySelectorAll('*[contenteditable]');
        editables.forEach(el => el.removeAttribute('contenteditable'));
        removeResizers();
        const cleanHtml = document.documentElement.outerHTML;
        if (wasSelected) selectElement(wasSelected);
        window.parent.postMessage({ type: 'HTML_RESULT', html: cleanHtml }, '*');
        return;
    }
    // ... existing insert/update handlers ...
    if (action === 'INSERT_ELEMENT') {
        if (value.type === 'img') {
             const img = document.createElement('img');
             img.src = value.src;
             img.style.width = '300px'; 
             img.style.height = 'auto';
             img.style.display = 'block';
             img.style.position = 'relative'; 
             if (selectedEl && selectedEl.parentNode) {
                 selectedEl.parentNode.insertBefore(img, selectedEl.nextSibling);
             } else {
                 const canvas = document.getElementById('canvas');
                 if (canvas) canvas.appendChild(img);
                 else document.body.appendChild(img);
             }
             selectElement(img);
             pushHistory();
        }
        return;
    }
    
    if (!selectedEl) return;
    if (action === 'UPDATE_CONTENT') { selectedEl.innerText = value; pushHistory(); return; }
    if (action === 'UPDATE_STYLE') { Object.assign(selectedEl.style, value); pushHistory(); } 
    else if (action === 'UPDATE_ATTRIBUTE') { selectedEl.setAttribute(value.key, value.val); pushHistory(); }
    else if (action === 'DELETE') { selectedEl.remove(); deselect(); pushHistory(); } 
    else if (action === 'DUPLICATE') {
        const clone = selectedEl.cloneNode(true);
        const currentTransform = clone.style.transform || '';
        const match = currentTransform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
        if (match) {
             const x = parseFloat(match[1]) + 20;
             const y = parseFloat(match[2]) + 20;
             const scaleMatch = currentTransform.match(/scale\\(([^)]+)\\)/);
             const scalePart = scaleMatch ? \`scale(\${scaleMatch[1]})\` : '';
             clone.style.transform = \`translate(\${x}px, \${y}px) \${scalePart}\`;
        } else {
             clone.style.transform = 'translate(20px, 20px)';
        }
        selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
        selectElement(clone);
        pushHistory();
    }
    else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.position = 'relative'; 
        pushHistory();
    }
    else if (action === 'UPDATE_TRANSFORM') {
        const currentTransform = selectedEl.style.transform || '';
        let currentScale = 1;
        let currentX = 0;
        let currentY = 0;
        const scaleMatch = currentTransform.match(/scale\\(([^)]+)\\)/);
        if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);
        const translateMatch = currentTransform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
        if (translateMatch) {
            currentX = parseFloat(translateMatch[1]);
            currentY = parseFloat(translateMatch[2]);
        }
        const newX = currentX + (value.dx || 0);
        const newY = currentY + (value.dy || 0);
        const newScale = value.scale !== undefined ? value.scale : currentScale;
        selectedEl.style.transform = \`translate(\${newX}px, \${newY}px) scale(\${newScale})\`;
        selectElement(selectedEl);
        pushHistory();
    }
    else if (action === 'DESELECT_FORCE') {
        deselect();
    }
  });

  // Editor Mouse Down - Handle drag logic
  document.body.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('ai-resizer')) {
        if (!selectedEl) return;
        isResizing = true;
        resizeHandle = e.target.dataset.handle;
        startX = e.clientX;
        startY = e.clientY;
        initialWidth = parseFloat(window.getComputedStyle(selectedEl).width);
        initialHeight = parseFloat(window.getComputedStyle(selectedEl).height);
        e.stopPropagation(); e.preventDefault();
        return;
    }
    if (!selectedEl || e.target !== selectedEl) return;
    if (selectedEl.isContentEditable) return; 
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const transform = selectedEl.style.transform || '';
    const match = transform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
    if (match) {
        window.initialTransformX = parseFloat(match[1]);
        window.initialTransformY = parseFloat(match[2]);
    } else {
        window.initialTransformX = 0;
        window.initialTransformY = 0;
    }
  });

  window.addEventListener('mousemove', (e) => {
    const scale = window.visualEditorScale || 1; 
    if (isResizing && selectedEl) {
        e.preventDefault();
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        let newWidth = initialWidth;
        let newHeight = initialHeight;
        if (resizeHandle.includes('e')) newWidth = initialWidth + dx;
        if (resizeHandle.includes('s')) newHeight = initialHeight + dy;
        if (resizeHandle.includes('w')) newWidth = initialWidth - dx; 
        if (resizeHandle.includes('n')) newHeight = initialHeight - dy;
        if (newWidth > 10) selectedEl.style.width = \`\${newWidth}px\`;
        if (newHeight > 10) selectedEl.style.height = \`\${newHeight}px\`;
        return;
    }
    if (!isDragging || !selectedEl) return;
    e.preventDefault();
    const dx = (e.clientX - startX) / scale; 
    const dy = (e.clientY - startY) / scale;
    const currentTransform = selectedEl.style.transform || '';
    let scalePart = '';
    const scaleMatch = currentTransform.match(/scale\\([^)]+\\)/);
    if (scaleMatch) scalePart = scaleMatch[0];
    selectedEl.style.transform = \`translate(\${(window.initialTransformX || 0) + dx}px, \${(window.initialTransformY || 0) + dy}px) \${scalePart}\`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging || isResizing) {
        isDragging = false; isResizing = false; pushHistory();
    }
  });
})();
</script>
`;

export const VisualCanvas: React.FC<VisualCanvasProps> = ({ initialHtml, onSave, scale, onScaleChange }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { state: htmlContent, pushState: setHtmlContent, undo, redo, canUndo, canRedo, reset } = useHistory(initialHtml);
    const isInternalUpdate = useRef(false);
    const [selectedElement, setSelectedElement] = useState<any>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // Initial Load & External Updates
    useEffect(() => {
        if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
        if (htmlContent !== initialHtml) { reset(initialHtml); }

        const iframe = iframeRef.current;
        if (iframe) {
            const doc = iframe.contentDocument;
            if (doc) {
                doc.open();
                let content = initialHtml || '';
                // Ensure wrapper for full height bg
                if (!content.toLowerCase().includes('<html')) {
                     content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><style>html, body { min-height: 100vh; margin: 0; background: white; }</style></head><body>${content}</body></html>`;
                }
                content = content.toLowerCase().includes('</body>') ? content.replace(/<\/body>/i, `${EDITOR_SCRIPT}</body>`) : content + EDITOR_SCRIPT;
                doc.write(content);
                doc.close();
            }
        }
    }, [initialHtml]);

    // Initialize scale to fit screen
    useEffect(() => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            // Target 1600x900
            const scaleX = (clientWidth - 80) / 1600; // -80 for padding
            const scaleY = (clientHeight - 80) / 900;
            const initialScale = Math.min(scaleX, scaleY, 1);
            if (onScaleChange) onScaleChange(Math.max(0.1, initialScale));
        }
    }, []); // Run once on mount

    // Handle Messages from Iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'SELECTED') setSelectedElement(e.data);
            else if (e.data.type === 'DESELECT') setSelectedElement(null);
            else if (e.data.type === 'HISTORY_UPDATE') {
                isInternalUpdate.current = true;
                let cleanHtml = e.data.html.replace(EDITOR_SCRIPT.trim(), '');
                setHtmlContent(cleanHtml);
                onSave(cleanHtml);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onSave, setHtmlContent]);

    // Update Scale inside iframe
    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ action: 'UPDATE_SCALE', value: scale }, '*');
        }
    }, [scale]);

    // --- Zoom Interaction ---
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.altKey && onScaleChange) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001; // Scale factor
            const newScale = Math.min(Math.max(0.1, scale + delta), 3);
            onScaleChange(newScale);
        }
    }, [scale, onScaleChange]);

    const sendCommand = (action: string, value?: any) => {
        if (iframeRef.current?.contentWindow) iframeRef.current.contentWindow.postMessage({ action, value }, '*');
    };
    
    // --- Actions (Handlers for Property Panel) ---
    const handleUpdateStyle = (key: string, value: string | number) => {
        sendCommand('UPDATE_STYLE', { [key]: value });
        setSelectedElement((prev: any) => ({ ...prev, [key]: value }));
    };
    
    const handleUpdateContent = (text: string) => {
        sendCommand('UPDATE_CONTENT', text);
        setSelectedElement((prev: any) => ({ ...prev, content: text }));
    };

    const handleUpdateAttribute = (key: string, value: string) => {
        sendCommand('UPDATE_ATTRIBUTE', { key, val: value });
        setSelectedElement((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleInsertElement = (type: 'img', value: string) => {
        sendCommand('INSERT_ELEMENT', { type, src: value });
    };
    
    const handleUpdateTransform = (deltaX: number, deltaY: number, scaleVal?: number) => {
        sendCommand('UPDATE_TRANSFORM', { dx: deltaX, dy: deltaY, scale: scaleVal });
    };

    return (
        <div className="flex w-full h-full bg-slate-200 overflow-hidden relative">
            
            {/* Scrollable Canvas Wrapper */}
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-auto flex items-center justify-center p-10"
                onWheel={handleWheel}
            >
                 <div 
                    style={{ 
                        width: '1600px', height: '900px', 
                        transform: `scale(${scale})`, 
                        // Center origin usually feels better for simple scaling, 
                        // but pointer-based zoom (advanced) would need transform-origin manipulation.
                        // Simple center scale is what's requested by logic flow (Alt+Scroll to zoom).
                        transformOrigin: 'center center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                        transition: 'transform 0.1s ease-out'
                    }}
                    className="bg-white flex-shrink-0"
                >
                    <iframe ref={iframeRef} className="w-full h-full border-none bg-white" title="Visual Editor" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                </div>
                
                {/* Floating HUD - Only if selected */}
                {selectedElement && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white rounded-full shadow-2xl border border-white/10 px-4 py-2 flex items-center gap-4 z-40 animate-in fade-in slide-in-from-top-2 select-none">
                         <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{selectedElement.tagName}</span>
                         <div className="h-4 w-px bg-white/10"></div>
                         <div className="flex gap-2">
                             <button onClick={() => sendCommand('LAYER', 'up')} className="p-1 hover:text-indigo-400 transition-colors" title="上移一层">↑</button>
                             <button onClick={() => sendCommand('LAYER', 'down')} className="p-1 hover:text-indigo-400 transition-colors" title="下移一层">↓</button>
                         </div>
                         <div className="h-4 w-px bg-white/10"></div>
                         <button onClick={() => { sendCommand('DELETE'); setSelectedElement(null); }} className="p-1 text-red-400 hover:text-red-300 transition-colors" title="删除元素"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                )}
            </div>

            {/* Right Properties Panel */}
            {selectedElement && (
                <PropertiesPanel 
                    element={selectedElement}
                    onUpdateStyle={(k, v) => { sendCommand('UPDATE_STYLE', { [k]: v }); setSelectedElement((prev:any) => ({ ...prev, [k]: v })); }}
                    onUpdateContent={(t) => { sendCommand('UPDATE_CONTENT', t); setSelectedElement((prev:any) => ({ ...prev, content: t })); }}
                    onUpdateAttribute={(k, v) => { sendCommand('UPDATE_ATTRIBUTE', { key: k, val: v }); setSelectedElement((prev:any) => ({ ...prev, [k]: v })); }}
                    onDelete={() => { sendCommand('DELETE'); setSelectedElement(null); }}
                    onClose={() => { sendCommand('DESELECT_FORCE'); setSelectedElement(null); }}
                />
            )}
        </div>
    );
};
