
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
    TrashIcon, CloseIcon,
    PhotoIcon, PencilIcon, 
    LinkIcon, RefreshIcon,
    LayerIcon, DuplicateIcon, ArrowIcon,
    BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
    PlusIcon, DocumentTextIcon 
} from '../icons';

export interface VisualCanvasHandle {
    updateStyle: (key: string, value: string | number) => void;
    updateContent: (text: string) => void;
    updateAttribute: (key: string, value: string) => void;
    insertElement: (type: 'img' | 'text', value: string) => void;
    updateTransform: (dx: number, dy: number, scale?: number) => void;
    scaleGroup: (factor: number) => void;
    changeLayer: (direction: 'up' | 'down') => void;
    duplicate: () => void;
    deleteElement: () => void;
    deselect: () => void;
    getCanvasNode: () => HTMLElement | null;
}

export interface VisualCanvasProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    onContentChange?: (newHtml: string) => void;
    scale: number;
    onScaleChange?: (scale: number) => void;
    onSelectionChange?: (element: any) => void;
    canvasSize: { width: number; height: number };
}

export interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    canvasSize?: { width: number; height: number };
    hideToolbar?: boolean;
}

// --- Editor Interaction Script ---
const EDITOR_SCRIPT = `
<script>
(function() {
  let selectedEl = null;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = null;
  let startX = 0, startY = 0;
  let startTranslateX = 0, startTranslateY = 0;
  let startWidth = 0, startHeight = 0;

  window.visualEditorScale = 1;

  const style = document.createElement('style');
  style.innerHTML = \`
    html, body { min-height: 100vh !important; margin: 0; background-color: #ffffff; }
    .ai-editor-selected { outline: 2px solid #3b82f6 !important; outline-offset: 0px; cursor: move !important; z-index: 2147483647 !important; position: relative; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
    .ai-editor-hover:not(.ai-editor-selected) { outline: 1px dashed #93c5fd !important; cursor: pointer !important; }
    *[contenteditable="true"] { 
        cursor: text !important; 
        outline: 2px dashed #10b981 !important; 
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); 
        user-select: text !important; 
        -webkit-user-select: text !important;
    }
    .ai-resizer { position: absolute; width: 10px; height: 10px; background: white; border: 1px solid #3b82f6; z-index: 2147483647; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .ai-r-nw { top: -5px; left: -5px; cursor: nw-resize; }
    .ai-r-n  { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
    .ai-r-ne { top: -5px; right: -5px; cursor: ne-resize; }
    .ai-r-e  { top: 50%; right: -5px; margin-top: -5px; cursor: e-resize; }
    .ai-r-se { bottom: -5px; right: -5px; cursor: se-resize; }
    .ai-r-s  { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
    .ai-r-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
    .ai-r-w  { top: 50%; left: -5px; margin-top: -5px; cursor: w-resize; }
  \`;
  document.head.appendChild(style);

  function getTransform(el) {
      const style = window.getComputedStyle(el);
      const matrix = new WebKitCSSMatrix(style.transform);
      return { x: matrix.m41, y: matrix.m42 }; 
  }

  function pushHistory() {
      setTimeout(() => {
        if (selectedEl) {
             const comp = window.getComputedStyle(selectedEl);
             sendSelection(selectedEl, comp);
        }
        const wasSelected = selectedEl;
        deselect(true); 
        const cleanHtml = document.documentElement.outerHTML;
        if (wasSelected) selectElement(wasSelected);
        window.parent.postMessage({ type: 'HISTORY_UPDATE', html: cleanHtml }, '*');
      }, 20);
  }

  function createResizers(el) {
      removeResizers();
      if (el.isContentEditable) return;
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

  document.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('ai-resizer')) {
          e.preventDefault(); e.stopPropagation();
          isResizing = true;
          resizeHandle = e.target.dataset.handle;
          startX = e.clientX;
          startY = e.clientY;
          if (selectedEl) {
              const rect = selectedEl.getBoundingClientRect();
              const comp = window.getComputedStyle(selectedEl);
              startWidth = parseFloat(comp.width) || rect.width;
              startHeight = parseFloat(comp.height) || rect.height;
          }
          return;
      }
      if (selectedEl && e.target === selectedEl) {
          if (selectedEl.isContentEditable) return;
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const t = getTransform(selectedEl);
          startTranslateX = t.x;
          startTranslateY = t.y;
          e.preventDefault(); 
      }
  });

  window.addEventListener('mousemove', (e) => {
      const scale = window.visualEditorScale || 1;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      if (isResizing && selectedEl) {
          e.preventDefault();
          if (selectedEl.style.maxWidth) selectedEl.style.maxWidth = 'none';
          if (selectedEl.style.maxHeight) selectedEl.style.maxHeight = 'none';
          selectedEl.style.flexShrink = '0';
          
          if (resizeHandle.includes('e')) selectedEl.style.width = Math.max(10, startWidth + dx) + 'px';
          if (resizeHandle.includes('s')) selectedEl.style.height = Math.max(10, startHeight + dy) + 'px';
      }

      if (isDragging && selectedEl) {
          e.preventDefault();
          const currentStyle = selectedEl.style.transform || '';
          let currentScale = 1;
          const scaleMatch = currentStyle.match(/scale\\(([^)]+)\\)/);
          if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);
          selectedEl.style.transform = \`translate(\${startTranslateX + dx}px, \${startTranslateY + dy}px) scale(\${currentScale})\`;
      }
  });

  window.addEventListener('mouseup', () => {
      if (isDragging || isResizing) {
          isDragging = false; isResizing = false; pushHistory();
      }
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-resizer')) return;
    if (selectedEl && selectedEl.contains(e.target) && selectedEl.isContentEditable) return;
    e.stopPropagation();

    if (selectedEl === e.target) return;
    if (selectedEl && selectedEl !== e.target) deselect();
    
    let target = e.target;
    if (target.tagName === 'IMG') {
        if (target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
             target = target.parentElement;
        } else {
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             const comp = window.getComputedStyle(target);
             wrapper.style.cssText = comp.cssText;
             wrapper.style.display = comp.display === 'inline' ? 'inline-block' : comp.display;
             wrapper.style.width = target.offsetWidth + 'px';
             wrapper.style.height = target.offsetHeight + 'px';
             wrapper.style.position = comp.position === 'static' ? 'relative' : comp.position;
             target.style.position = 'static'; target.style.transform = 'none';
             target.style.width = '100%'; target.style.height = '100%'; target.style.margin = '0';
             if (target.parentNode) {
                 target.parentNode.insertBefore(wrapper, target);
                 wrapper.appendChild(target);
                 target = wrapper;
                 pushHistory();
             }
        }
    }
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect(); return;
    }
    e.preventDefault(); 
    selectElement(target);
  }, true);

  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     let target = e.target;
     if (target.classList.contains('ai-img-wrapper') || target.classList.contains('ai-resizer')) return;

     if (!target.isContentEditable) {
         removeResizers();
         target.contentEditable = 'true';
         target.focus();
         if (target !== selectedEl) selectElement(target);
         const onBlur = () => {
             target.contentEditable = 'false';
             target.removeEventListener('blur', onBlur);
             createResizers(target);
             pushHistory(); 
         };
         target.addEventListener('blur', onBlur);
     }
  });
  
  function sendSelection(el, comp) {
      let imgSrc = el.getAttribute('src');
      let hasImgChild = false;
      if (el.classList.contains('ai-img-wrapper')) {
          const img = el.querySelector('img');
          if (img) { imgSrc = img.getAttribute('src'); hasImgChild = true; }
      }
      window.parent.postMessage({ 
          type: 'SELECTED', 
          tagName: el.tagName,
          content: el.innerText,
          color: comp.color,
          fontSize: comp.fontSize,
          fontWeight: comp.fontWeight,
          textAlign: comp.textAlign,
          width: comp.width,
          height: comp.height,
          display: comp.display,
          backgroundColor: comp.backgroundColor,
          borderRadius: comp.borderRadius,
          src: imgSrc,
          hasImgChild: hasImgChild,
          opacity: comp.opacity,
          zIndex: comp.zIndex
      }, '*');
  }

  function selectElement(el) {
      if (selectedEl && selectedEl !== el) deselect();
      selectedEl = el;
      selectedEl.classList.remove('ai-editor-hover');
      selectedEl.classList.add('ai-editor-selected');
      createResizers(selectedEl);
      sendSelection(selectedEl, window.getComputedStyle(selectedEl));
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

  function scaleElementRecursive(el, factor) {
      const style = window.getComputedStyle(el);
      const fs = parseFloat(style.fontSize);
      if (fs) el.style.fontSize = (fs * factor) + 'px';
      // Basic padding scaling
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(p => {
          const v = parseFloat(style[p]);
          if(v) el.style[p] = (v * factor) + 'px';
      });
      Array.from(el.children).forEach(child => scaleElementRecursive(child, factor));
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

    if (action === 'INSERT_ELEMENT') {
        if (value.type === 'img') {
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             wrapper.style.position = 'absolute'; wrapper.style.left = '100px'; wrapper.style.top = '100px'; wrapper.style.zIndex = '50';
             const img = document.createElement('img');
             img.onload = function() {
                 let w = this.naturalWidth; let h = this.naturalHeight;
                 if (w > 400) { const r = 400 / w; w = 400; h = h * r; }
                 wrapper.style.width = w + 'px'; wrapper.style.height = h + 'px';
                 img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; img.style.display = 'block';
                 wrapper.appendChild(img);
                 (document.getElementById('canvas') || document.body).appendChild(wrapper);
                 selectElement(wrapper);
                 pushHistory();
             }
             img.src = value.src;
        } else if (value.type === 'text') {
             const div = document.createElement('div');
             div.innerText = value.value || '双击编辑文本';
             div.style.position = 'absolute'; div.style.left = '100px'; div.style.top = '100px';
             div.style.fontSize = '24px'; div.style.fontWeight = 'bold'; div.style.color = '#333'; div.style.zIndex = '50';
             div.className = 'font-sans';
             (document.getElementById('canvas') || document.body).appendChild(div);
             selectElement(div);
             pushHistory();
        }
        return;
    }
    
    if (!selectedEl) return;
    
    if (action === 'SCALE_GROUP') { scaleElementRecursive(selectedEl, value); pushHistory(); }
    else if (action === 'UPDATE_CONTENT') { selectedEl.innerText = value; pushHistory(); }
    else if (action === 'UPDATE_STYLE') { 
        Object.entries(value).forEach(([k, v]) => {
            const prop = k.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            selectedEl.style.setProperty(prop, String(v), 'important');
        });
        pushHistory(); 
    } 
    else if (action === 'UPDATE_ATTRIBUTE') { 
        if (value.key === 'src' && selectedEl.classList.contains('ai-img-wrapper')) {
            const img = selectedEl.querySelector('img');
            if (img) img.src = value.val;
        } else { selectedEl.setAttribute(value.key, value.val); }
        pushHistory(); 
    }
    else if (action === 'DELETE') { selectedEl.remove(); deselect(); pushHistory(); } 
    else if (action === 'DUPLICATE') {
        const clone = selectedEl.cloneNode(true);
        const top = parseFloat(getComputedStyle(clone).top) || 0;
        const left = parseFloat(getComputedStyle(clone).left) || 0;
        clone.style.top = (top + 20) + 'px'; clone.style.left = (left + 20) + 'px';
        selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
        selectElement(clone);
        pushHistory();
    }
    else if (action === 'LAYER') {
        const z = parseInt(getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.setProperty('z-index', (value === 'up' ? z + 1 : Math.max(0, z - 1)).toString(), 'important');
        if (getComputedStyle(selectedEl).position === 'static') selectedEl.style.setProperty('position', 'relative', 'important');
        pushHistory();
    }
    else if (action === 'UPDATE_TRANSFORM') {
        const t = getTransform(selectedEl);
        const newX = t.x + (value.dx || 0);
        const newY = t.y + (value.dy || 0);
        const currentStyle = selectedEl.style.transform || '';
        let currentScale = 1;
        const scaleMatch = currentStyle.match(/scale\\(([^)]+)\\)/);
        if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);
        const newScale = value.scale !== undefined ? value.scale : currentScale;
        selectedEl.style.transform = \`translate(\${newX}px, \${newY}px) scale(\${newScale})\`;
        selectElement(selectedEl);
        pushHistory();
    }
    else if (action === 'DESELECT_FORCE') { deselect(); }
  });
})();
</script>
`;

export const VisualCanvas = forwardRef<VisualCanvasHandle, VisualCanvasProps>(({ initialHtml, onSave, scale, onScaleChange, onSelectionChange, canvasSize }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);

    useImperativeHandle(ref, () => ({
        updateStyle: (key, value) => sendCommand('UPDATE_STYLE', { [key]: value }),
        updateContent: (text) => sendCommand('UPDATE_CONTENT', text),
        updateAttribute: (key, value) => sendCommand('UPDATE_ATTRIBUTE', { key, val: value }),
        insertElement: (type, value) => sendCommand('INSERT_ELEMENT', { type, [type === 'img' ? 'src' : 'value']: value }),
        updateTransform: (dx, dy, scaleVal) => sendCommand('UPDATE_TRANSFORM', { dx, dy, scale: scaleVal }),
        changeLayer: (direction) => sendCommand('LAYER', direction),
        duplicate: () => sendCommand('DUPLICATE'),
        deleteElement: () => sendCommand('DELETE'),
        deselect: () => sendCommand('DESELECT_FORCE'),
        scaleGroup: (factor) => sendCommand('SCALE_GROUP', factor),
        getCanvasNode: () => {
            const doc = iframeRef.current?.contentDocument;
            return doc ? (doc.getElementById('canvas') || doc.body) : null;
        }
    }));

    useEffect(() => {
        if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
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

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'SELECTED') {
                if (onSelectionChange) onSelectionChange(e.data);
            }
            else if (e.data.type === 'DESELECT') {
                if (onSelectionChange) onSelectionChange(null);
            }
            else if (e.data.type === 'HISTORY_UPDATE') {
                isInternalUpdate.current = true;
                let cleanHtml = e.data.html.replace(EDITOR_SCRIPT.trim(), '');
                onSave(cleanHtml);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onSave, onSelectionChange]);

    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ action: 'UPDATE_SCALE', value: scale }, '*');
        }
    }, [scale]);

    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
            let style = doc.getElementById('dynamic-canvas-size');
            if (!style) {
                style = doc.createElement('style');
                style.id = 'dynamic-canvas-size';
                doc.head.appendChild(style);
            }
            style.innerHTML = `#canvas { width: ${canvasSize.width}px !important; height: ${canvasSize.height}px !important; max-width: none !important; max-height: none !important; }`;
        }
    }, [canvasSize]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.altKey && onScaleChange) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            onScaleChange(Math.min(Math.max(0.1, scale + delta), 3));
        }
    }, [scale, onScaleChange]);

    const sendCommand = (action: string, value?: any) => {
        if (iframeRef.current?.contentWindow) iframeRef.current.contentWindow.postMessage({ action, value }, '*');
    };

    return (
        <div className="flex w-full h-full bg-[#0f172a] overflow-hidden relative">
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-auto flex items-center justify-center p-10 no-scrollbar"
                onWheel={handleWheel}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                 <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                 <div 
                    style={{ 
                        width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'center center',
                        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                        transition: 'transform 0.1s ease-out'
                    }}
                    className="bg-white flex-shrink-0"
                >
                    <iframe ref={iframeRef} className="w-full h-full border-none bg-white" title="Visual Editor" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                </div>
            </div>
        </div>
    );
});
VisualCanvas.displayName = 'VisualCanvas';

// --- Visual Editor Wrapper ---
export const VisualEditor: React.FC<VisualEditorProps> = ({ initialHtml, onSave, scale: initialScale = 0.8, onScaleChange, canvasSize = {width:1600, height:900}, hideToolbar }) => {
    const editorRef = useRef<VisualCanvasHandle>(null);
    const [selection, setSelection] = useState<any>(null);
    const [scale, setScale] = useState(initialScale);
    
    // Sync scale state if prop changes
    useEffect(() => {
        if (initialScale !== undefined) setScale(initialScale);
    }, [initialScale]);
    
    const handleScaleChange = (s: number) => {
        setScale(s);
        if (onScaleChange) onScaleChange(s);
    };

    const isText = selection && (['P','SPAN','H1','H2','H3','H4','H5','H6','DIV'].includes(selection.tagName));
    const isImg = selection && (selection.tagName === 'IMG' || (selection.tagName === 'DIV' && selection.hasImgChild));
    const isBold = selection && (selection.fontWeight === 'bold' || parseInt(selection.fontWeight) >= 700);
    const isItalic = selection && selection.fontStyle === 'italic';
    const align = selection?.textAlign || 'left';
    
    const parseVal = (val: string) => parseInt(val) || 0;
    const parseFontSize = (val: string) => parseInt(val) || 16;
    
    const Toolbar = () => (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-xl border border-slate-200 rounded-2xl p-1.5 flex items-center gap-2 animate-in fade-in zoom-in-95 z-50">
            {/* Type Badge */}
            <div className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg border border-indigo-100">
                {isImg ? 'IMAGE' : selection.tagName}
            </div>

            {isText && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <button onClick={() => editorRef.current?.updateStyle('fontSize', `${parseFontSize(selection.fontSize) - 2}px`)} className="p-1 hover:bg-slate-100 rounded text-xs font-bold text-slate-500">-</button>
                    <span className="text-xs font-mono font-bold w-6 text-center">{parseFontSize(selection.fontSize)}</span>
                    <button onClick={() => editorRef.current?.updateStyle('fontSize', `${parseFontSize(selection.fontSize) + 2}px`)} className="p-1 hover:bg-slate-100 rounded text-xs font-bold text-slate-500">+</button>
                    
                    <button onClick={() => editorRef.current?.updateStyle('fontWeight', isBold ? 'normal' : 'bold')} className={`p-1 rounded ${isBold ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}><BoldIcon className="w-3.5 h-3.5"/></button>
                    <button onClick={() => editorRef.current?.updateStyle('fontStyle', isItalic ? 'normal' : 'italic')} className={`p-1 rounded ${isItalic ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}><ItalicIcon className="w-3.5 h-3.5"/></button>
                    
                    <div className="flex gap-0.5 bg-slate-50 rounded p-0.5 ml-1">
                        <button onClick={() => editorRef.current?.updateStyle('textAlign', 'left')} className={`p-0.5 rounded ${align === 'left' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><AlignLeftIcon className="w-3 h-3"/></button>
                        <button onClick={() => editorRef.current?.updateStyle('textAlign', 'center')} className={`p-0.5 rounded ${align === 'center' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><AlignCenterIcon className="w-3 h-3"/></button>
                        <button onClick={() => editorRef.current?.updateStyle('textAlign', 'right')} className={`p-0.5 rounded ${align === 'right' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><AlignRightIcon className="w-3 h-3"/></button>
                    </div>

                    <div className="relative w-5 h-5 ml-1 rounded-full border border-slate-200 overflow-hidden cursor-pointer" title="文字颜色">
                        <div className="absolute inset-0" style={{backgroundColor: selection.color || '#000'}}></div>
                        <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => editorRef.current?.updateStyle('color', e.target.value)} />
                    </div>
                </div>
            )}

            {isImg && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <button onClick={() => { const url = prompt("输入新图片地址:", selection.src); if(url) editorRef.current?.updateAttribute('src', url); }} className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                        <RefreshIcon className="w-3 h-3"/> 换图
                    </button>
                </div>
            )}

            {/* Layout */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                 <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-300">BG</span>
                    <div className="relative w-5 h-5 rounded border border-slate-200 overflow-hidden cursor-pointer">
                        <div className="absolute inset-0" style={{backgroundColor: selection.backgroundColor || 'transparent'}}></div>
                        <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => editorRef.current?.updateStyle('backgroundColor', e.target.value)} />
                    </div>
                 </div>
                 <div className="flex items-center gap-1 ml-1">
                    <span className="text-[9px] font-bold text-slate-300">R</span>
                    <input type="number" value={parseVal(selection.borderRadius)} onChange={(e) => editorRef.current?.updateStyle('borderRadius', `${e.target.value}px`)} className="w-8 bg-slate-50 border border-slate-200 rounded px-1 text-xs text-center outline-none" />
                 </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                 <button onClick={() => editorRef.current?.changeLayer('up')} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="上移"><LayerIcon className="w-3.5 h-3.5 rotate-180"/></button>
                 <button onClick={() => editorRef.current?.changeLayer('down')} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="下移"><LayerIcon className="w-3.5 h-3.5"/></button>
                 <button onClick={() => editorRef.current?.duplicate()} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="复制"><DuplicateIcon className="w-3.5 h-3.5"/></button>
                 <button onClick={() => { editorRef.current?.deleteElement(); setSelection(null); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><TrashIcon className="w-3.5 h-3.5"/></button>
            </div>
            
            <button onClick={() => { editorRef.current?.deselect(); setSelection(null); }} className="ml-1 p-1 text-slate-300 hover:text-slate-500"><CloseIcon className="w-3.5 h-3.5"/></button>
        </div>
    );

    return (
        <div className="w-full h-full relative group">
            <VisualCanvas 
                ref={editorRef}
                initialHtml={initialHtml}
                onSave={onSave}
                scale={scale}
                onScaleChange={handleScaleChange}
                onSelectionChange={setSelection}
                canvasSize={canvasSize}
            />
            {selection && !hideToolbar && <Toolbar />}
            
            {/* Scale Indicator if hovering */}
            <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {Math.round(scale * 100)}%
            </div>
        </div>
    );
};
