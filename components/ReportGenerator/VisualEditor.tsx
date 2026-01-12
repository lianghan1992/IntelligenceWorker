
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    TrashIcon, ArrowRightIcon, PlusIcon, RefreshIcon, 
    CheckIcon, CloseIcon, CubeIcon, DocumentTextIcon, 
    PhotoIcon, ViewGridIcon, PencilIcon, DownloadIcon
} from '../icons';
import { generatePdf } from '../../api/stratify';

interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
}

// --- Icons ---
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

const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;

// --- 历史记录 Hook ---
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

// --- 属性编辑面板 ---
interface PropertiesPanelProps {
    element: any;
    onUpdateStyle: (key: string, value: string) => void;
    onUpdateContent: (text: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdateStyle, onUpdateContent, onDelete, onClose }) => {
    if (!element) return null;
    const parseVal = (val: string) => parseInt(val) || 0;

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
                {(element.tagName !== 'IMG' && element.tagName !== 'HR' && element.tagName !== 'BR') && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><DocumentTextIcon className="w-3.5 h-3.5" /> 文本内容</h4>
                        <textarea 
                            value={element.content || ''}
                            onChange={(e) => onUpdateContent(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 resize-y min-h-[80px]"
                        />
                    </div>
                )}
                <div className="h-px bg-slate-100"></div>
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ViewGridIcon className="w-3.5 h-3.5" /> 布局与尺寸</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">宽度</label>
                            <input type="number" value={parseVal(element.width)} onChange={(e) => onUpdateStyle('width', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">高度</label>
                            <input type="number" value={parseVal(element.height)} onChange={(e) => onUpdateStyle('height', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"/>
                        </div>
                    </div>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" /> 字体排版</h4>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">颜色</label>
                            <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                                <div className="w-4 h-4 rounded border" style={{backgroundColor: element.color}}></div>
                                <input type="text" value={element.color} onChange={(e) => onUpdateStyle('color', e.target.value)} className="w-full text-xs outline-none uppercase font-mono text-slate-600"/>
                            </div>
                        </div>
                        <div className="w-12 pt-5">
                            <button onClick={() => onUpdateStyle('fontWeight', element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'normal' : 'bold')} className={`w-full h-[34px] border rounded-md flex items-center justify-center font-bold ${element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}>B</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">大小 (px)</label>
                            <input type="number" value={parseVal(element.fontSize)} onChange={(e) => onUpdateStyle('fontSize', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none"/>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">对齐</label>
                            <div className="flex border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                                {['left', 'center', 'right'].map((align) => (
                                    <button key={align} onClick={() => onUpdateStyle('textAlign', align)} className={`flex-1 py-1.5 flex justify-center hover:bg-white ${element.textAlign === align ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                                        {align === 'left' && <AlignLeftIcon className="w-4 h-4"/>}
                                        {align === 'center' && <AlignCenterIcon className="w-4 h-4"/>}
                                        {align === 'right' && <AlignRightIcon className="w-4 h-4"/>}
                                    </button>
                                ))}
                            </div>
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

// --- 编辑器交互脚本 (支持 Resize) ---
const EDITOR_SCRIPT = `
<script>
(function() {
  let selectedEl = null;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = null;
  let startX, startY;
  let initialTransformX = 0, initialTransformY = 0;
  let initialWidth = 0, initialHeight = 0;
  
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
    if (!selectedEl) return;
    if (action === 'UPDATE_CONTENT') { selectedEl.innerText = value; pushHistory(); return; }
    if (action === 'UPDATE_STYLE') { Object.assign(selectedEl.style, value); pushHistory(); } 
    else if (action === 'DELETE') { selectedEl.remove(); deselect(); pushHistory(); } 
    else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.position = 'relative'; 
        pushHistory();
    }
  });

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

export const VisualEditor: React.FC<VisualEditorProps> = ({ initialHtml, onSave, scale = 1 }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
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
                if (!content.toLowerCase().includes('<html')) {
                     content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><style>html, body { min-height: 100vh; margin: 0; background: white; }</style></head><body>${content}</body></html>`;
                }
                content = content.toLowerCase().includes('</body>') ? content.replace(/<\/body>/i, `${EDITOR_SCRIPT}</body>`) : content + EDITOR_SCRIPT;
                doc.write(content);
                doc.close();
            }
        }
    }, [initialHtml]);

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

    const sendCommand = (action: string, value?: any) => {
        if (iframeRef.current?.contentWindow) iframeRef.current.contentWindow.postMessage({ action, value }, '*');
    };

    const handleExportPagePdf = async () => {
        setIsExportingPdf(true);
        try {
            const blob = await generatePdf(htmlContent, 'slide_export');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `page_export_${new Date().getTime()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) { alert('PDF 导出失败'); }
        finally { setIsExportingPdf(false); }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-100 rounded-sm overflow-hidden relative">
            
            {/* Top Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-white rounded text-slate-500 disabled:opacity-30 transition-all shadow-none hover:shadow-sm" title="撤销 (Ctrl+Z)"><UndoIcon className="w-4 h-4" /></button>
                        <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-white rounded text-slate-500 disabled:opacity-30 transition-all shadow-none hover:shadow-sm" title="重做 (Ctrl+Y)"><RedoIcon className="w-4 h-4" /></button>
                    </div>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                        Zoom: {Math.round(scale * 100)}%
                    </span>
                </div>

                <div className="flex items-center gap-3">
                     <button 
                        onClick={handleExportPagePdf}
                        disabled={isExportingPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                     >
                         {isExportingPdf ? <RefreshIcon className="w-3 h-3 animate-spin"/> : <DownloadIcon className="w-3 h-3" />}
                         导出本页 PDF
                     </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative overflow-hidden flex">
                <div className="flex-1 flex items-center justify-center bg-slate-200 relative overflow-hidden">
                     <div 
                        style={{ 
                            width: '1600px', height: '900px', 
                            transform: `scale(${scale})`, transformOrigin: 'center center',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                        }}
                        className="bg-white"
                    >
                        <iframe ref={iframeRef} className="w-full h-full border-none bg-white" title="Visual Editor" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                    </div>
                    
                    {/* Floating HUD */}
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
                        onDelete={() => { sendCommand('DELETE'); setSelectedElement(null); }}
                        onClose={() => setSelectedElement(null)}
                    />
                )}
            </div>
        </div>
    );
};
