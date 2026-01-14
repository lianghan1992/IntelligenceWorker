
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
    TrashIcon, CloseIcon, DocumentTextIcon, 
    PhotoIcon, ViewGridIcon, PencilIcon, 
    LinkIcon, RefreshIcon,
} from '../icons';

// --- Icons ---
const BoldIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 11.81C16.36 11.23 17 10.23 17 9c0-2.21-1.79-4-4-4H7v14h7.5c2.09 0 3.5-1.75 3.5-3.88 0-1.63-1.04-3.05-2.4-3.31zM10.5 7.5H13c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-2.5V7.5zm3.5 9H10.5v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-2.5V7.5zm3.5 9H10.5v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>;
const ItalicIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>;
const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;
const LayerIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>;
const DuplicateIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>;
const ArrowIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4z"/></svg>;

// --- Editor Interaction Script ---
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
    .ai-editor-selected { outline: 2px solid #3b82f6 !important; outline-offset: 0px; cursor: move !important; z-index: 2147483647 !important; position: relative; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
    .ai-editor-hover:not(.ai-editor-selected) { outline: 1px dashed #93c5fd !important; cursor: pointer !important; }
    *[contenteditable="true"] { cursor: text !important; outline: 2px solid #10b981 !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
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

    if (selectedEl && selectedEl !== e.target) {
        deselect();
    }
    
    let target = e.target;
    
    if (target.tagName === 'IMG') {
        if (target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
             target = target.parentElement;
        } else {
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             
             const comp = window.getComputedStyle(target);
             const width = target.offsetWidth;
             const height = target.offsetHeight;
             
             wrapper.style.display = comp.display === 'inline' ? 'inline-block' : comp.display;
             wrapper.style.position = comp.position === 'static' ? 'relative' : comp.position;
             wrapper.style.left = comp.left; wrapper.style.top = comp.top;
             wrapper.style.right = comp.right; wrapper.style.bottom = comp.bottom;
             wrapper.style.margin = comp.margin;
             wrapper.style.transform = comp.transform;
             wrapper.style.zIndex = comp.zIndex;
             wrapper.style.width = width + 'px';
             wrapper.style.height = height + 'px';
             
             target.style.position = 'static';
             target.style.transform = 'none';
             target.style.width = '100%';
             target.style.height = '100%';
             target.style.margin = '0';
             
             if (target.parentNode) {
                 target.parentNode.insertBefore(wrapper, target);
                 wrapper.appendChild(target);
                 target = wrapper;
                 pushHistory();
             }
        }
    }
    
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect();
        return;
    }
    selectElement(target);
  }, true);

  document.body.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('ai-resizer') || e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas' || e.target === selectedEl) return;
      let target = e.target;
      if (target.tagName === 'IMG' && target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
           target = target.parentElement;
      }
      target.classList.add('ai-editor-hover');
  });
  
  document.body.addEventListener('mouseout', (e) => { 
      let target = e.target;
      if (target.tagName === 'IMG' && target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
           target = target.parentElement;
      }
      target.classList.remove('ai-editor-hover'); 
  });

  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     if (selectedEl && !e.target.classList.contains('ai-resizer') && !selectedEl.classList.contains('ai-img-wrapper')) {
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
  
  function sendSelection(el, comp) {
      let imgSrc = el.getAttribute('src');
      let hasImgChild = false;
      if (el.classList.contains('ai-img-wrapper')) {
          const img = el.querySelector('img');
          if (img) {
              imgSrc = img.getAttribute('src');
              hasImgChild = true;
          }
      }
      
      let contentText = el.innerText;

      window.parent.postMessage({ 
          type: 'SELECTED', 
          tagName: el.tagName,
          content: contentText,
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
      
      const comp = window.getComputedStyle(selectedEl);
      sendSelection(selectedEl, comp);
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

    if (action === 'INSERT_ELEMENT') {
        if (value.type === 'img') {
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             wrapper.style.position = 'absolute';
             wrapper.style.left = '100px';
             wrapper.style.top = '100px';
             wrapper.style.zIndex = '50';
             
             const img = document.createElement('img');
             img.onload = function() {
                 let w = this.naturalWidth;
                 let h = this.naturalHeight;
                 if (w > 400) {
                     const ratio = 400 / w;
                     w = 400;
                     h = h * ratio;
                 }
                 wrapper.style.width = w + 'px'; 
                 wrapper.style.height = h + 'px';
                 img.style.width = '100%';
                 img.style.height = '100%';
                 img.style.objectFit = 'cover';
                 img.style.display = 'block';
                 wrapper.appendChild(img);
                 const canvas = document.getElementById('canvas') || document.body;
                 canvas.appendChild(wrapper);
                 selectElement(wrapper);
                 pushHistory();
             }
             img.src = value.src;
        }
        return;
    }
    
    if (!selectedEl) return;
    
    if (action === 'UPDATE_CONTENT') { 
        selectedEl.innerText = value; 
        pushHistory(); 
    }
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
        } else {
            selectedEl.setAttribute(value.key, value.val); 
        }
        pushHistory(); 
    }
    else if (action === 'DELETE') { 
        selectedEl.remove(); 
        deselect(); 
        pushHistory(); 
    } 
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
             const top = parseFloat(clone.style.top) || 0;
             const left = parseFloat(clone.style.left) || 0;
             clone.style.top = (top + 20) + 'px';
             clone.style.left = (left + 20) + 'px';
        }
        selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
        selectElement(clone);
        pushHistory();
    }
    else if (action === 'LAYER') {
        const style = window.getComputedStyle(selectedEl);
        const currentZ = style.zIndex === 'auto' ? 0 : parseInt(style.zIndex);
        const newZ = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        
        selectedEl.style.setProperty('z-index', newZ.toString(), 'important');
        
        if (style.position === 'static') {
            selectedEl.style.setProperty('position', 'relative', 'important');
        }
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

  document.body.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('ai-resizer')) {
        if (!selectedEl) return;
        isResizing = true;
        resizeHandle = e.target.dataset.handle;
        startX = e.clientX;
        startY = e.clientY;
        const comp = window.getComputedStyle(selectedEl);
        initialWidth = parseFloat(comp.width);
        initialHeight = parseFloat(comp.height);
        
        const transform = selectedEl.style.transform || '';
        const match = transform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
        if (match) {
            window.initialTransformX = parseFloat(match[1]);
            window.initialTransformY = parseFloat(match[2]);
        } else {
            window.initialTransformX = 0;
            window.initialTransformY = 0;
        }
        
        e.stopPropagation(); e.preventDefault();
        return;
    }
    
    if (!selectedEl) return;
    const isSelfOrChild = selectedEl === e.target || selectedEl.contains(e.target);
    if (!isSelfOrChild && e.target !== selectedEl) return;
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
        
        if (resizeHandle.includes('w')) {
             newWidth = initialWidth - dx;
        }
        if (resizeHandle.includes('n')) {
             newHeight = initialHeight - dy;
        }
        
        if (newWidth > 10) {
            selectedEl.style.setProperty('width', newWidth + 'px', 'important');
            selectedEl.style.setProperty('min-width', '0px', 'important');
            selectedEl.style.setProperty('max-width', 'none', 'important');
        }
        if (newHeight > 10) {
            selectedEl.style.setProperty('height', newHeight + 'px', 'important');
            selectedEl.style.setProperty('min-height', '0px', 'important');
            selectedEl.style.setProperty('max-height', 'none', 'important');
        }
        
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

export interface VisualCanvasHandle {
    updateStyle: (key: string, value: string | number) => void;
    updateContent: (text: string) => void;
    updateAttribute: (key: string, value: string) => void;
    insertElement: (type: 'img', value: string) => void;
    updateTransform: (dx: number, dy: number, scale?: number) => void;
    changeLayer: (direction: 'up' | 'down') => void;
    duplicate: () => void;
    deleteElement: () => void;
    deselect: () => void;
}

export interface VisualCanvasProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    onContentChange?: (newHtml: string) => void;
    scale: number;
    onScaleChange?: (scale: number) => void;
    onSelectionChange?: (element: any) => void;
}

export const VisualEditor = forwardRef<VisualCanvasHandle, VisualCanvasProps>(({ initialHtml, onSave, scale, onScaleChange, onSelectionChange }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);
    const [selectedElement, setSelectedElement] = useState<any>(null);

    useImperativeHandle(ref, () => ({
        updateStyle: (key, value) => sendCommand('UPDATE_STYLE', { [key]: value }),
        updateContent: (text) => sendCommand('UPDATE_CONTENT', text),
        updateAttribute: (key, value) => sendCommand('UPDATE_ATTRIBUTE', { key, val: value }),
        insertElement: (type, src) => sendCommand('INSERT_ELEMENT', { type, src }),
        updateTransform: (dx, dy, scaleVal) => sendCommand('UPDATE_TRANSFORM', { dx, dy, scale: scaleVal }),
        changeLayer: (direction) => sendCommand('LAYER', direction),
        duplicate: () => sendCommand('DUPLICATE'),
        deleteElement: () => sendCommand('DELETE'),
        deselect: () => sendCommand('DESELECT_FORCE')
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
                setSelectedElement(e.data);
                if (onSelectionChange) onSelectionChange(e.data);
            }
            else if (e.data.type === 'DESELECT') {
                setSelectedElement(null);
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

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.altKey && onScaleChange) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001; 
            const newScale = Math.min(Math.max(0.1, scale + delta), 3);
            onScaleChange(newScale);
        }
    }, [scale, onScaleChange]);

    const sendCommand = (action: string, value?: any) => {
        if (iframeRef.current?.contentWindow) iframeRef.current.contentWindow.postMessage({ action, value }, '*');
    };

    const isText = selectedElement && (['P','SPAN','H1','H2','H3','H4','H5','H6','DIV'].includes(selectedElement.tagName));
    const isImg = selectedElement && (selectedElement.tagName === 'IMG' || (selectedElement.tagName === 'DIV' && selectedElement.hasImgChild));
    const isBold = selectedElement && (selectedElement.fontWeight === 'bold' || parseInt(selectedElement.fontWeight) >= 700);
    const isItalic = selectedElement && selectedElement.fontStyle === 'italic';
    const align = selectedElement?.textAlign || 'left';
    const parseVal = (val: string) => parseInt(val) || 0;
    const parseFontSize = (val: string) => parseInt(val) || 16;
    
    // --- Contextual Toolbar ---
    const Toolbar = () => (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {selectedElement ? (
                <>
                    <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase border border-indigo-100 mr-2">
                        {isImg ? 'IMAGE' : selectedElement.tagName}
                    </div>

                    {isText && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                             <div className="flex items-center bg-white border border-slate-200 rounded px-1 h-7">
                                <button onClick={() => sendCommand('UPDATE_STYLE', { fontSize: `${Math.max(1, parseFontSize(selectedElement.fontSize) - 2)}px` })} className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-r border-slate-100 font-bold text-xs">-</button>
                                <input type="number" value={parseFontSize(selectedElement.fontSize)} onChange={(e) => sendCommand('UPDATE_STYLE', { fontSize: `${e.target.value}px` })} className="w-8 text-xs font-bold text-slate-700 outline-none text-center h-full appearance-none bg-transparent" />
                                <button onClick={() => sendCommand('UPDATE_STYLE', { fontSize: `${parseFontSize(selectedElement.fontSize) + 2}px` })} className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-l border-slate-100 font-bold text-xs">+</button>
                            </div>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => sendCommand('UPDATE_STYLE', { fontWeight: isBold ? 'normal' : 'bold' })} className={`p-1 rounded hover:bg-white ${isBold ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><BoldIcon className="w-3.5 h-3.5"/></button>
                            <button onClick={() => sendCommand('UPDATE_STYLE', { fontStyle: isItalic ? 'normal' : 'italic' })} className={`p-1 rounded hover:bg-white ${isItalic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><ItalicIcon className="w-3.5 h-3.5"/></button>
                            <div className="flex gap-0.5 border border-slate-200 rounded bg-white ml-1">
                                <button onClick={() => sendCommand('UPDATE_STYLE', { textAlign: 'left' })} className={`p-1 hover:text-indigo-600 ${align === 'left' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignLeftIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => sendCommand('UPDATE_STYLE', { textAlign: 'center' })} className={`p-1 hover:text-indigo-600 ${align === 'center' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignCenterIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => sendCommand('UPDATE_STYLE', { textAlign: 'right' })} className={`p-1 hover:text-indigo-600 ${align === 'right' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><AlignRightIcon className="w-3.5 h-3.5"/></button>
                            </div>
                             <div className="relative w-6 h-6 ml-1 cursor-pointer border border-slate-200 rounded overflow-hidden shadow-sm" title="文字颜色">
                                 <div className="absolute inset-0" style={{backgroundColor: selectedElement.color || '#000'}}></div>
                                 <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => sendCommand('UPDATE_STYLE', { color: e.target.value })} />
                             </div>
                        </div>
                    )}
                    
                    {isImg && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                             <button onClick={() => {
                                 const url = prompt("请输入新图片 URL:", selectedElement?.src || "");
                                 if (url) sendCommand('UPDATE_ATTRIBUTE', { key: 'src', val: url });
                             }} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium hover:text-indigo-600 text-slate-600 shadow-sm transition-colors">
                                <RefreshIcon className="w-3 h-3"/> 换图
                             </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">W</span>
                            <input type="number" value={parseVal(selectedElement.width)} onChange={(e) => sendCommand('UPDATE_STYLE', { width: `${e.target.value}px` })} className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">H</span>
                            <input type="number" value={parseVal(selectedElement.height)} onChange={(e) => sendCommand('UPDATE_STYLE', { height: `${e.target.value}px` })} className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                        </div>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <div className="relative w-6 h-6 cursor-pointer border border-slate-200 rounded overflow-hidden shadow-sm" title="背景颜色">
                             <div className="absolute inset-0" style={{backgroundColor: selectedElement.backgroundColor || 'transparent'}}></div>
                             <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => sendCommand('UPDATE_STYLE', { backgroundColor: e.target.value })} />
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">R</span>
                            <input type="number" value={parseVal(selectedElement.borderRadius)} onChange={(e) => sendCommand('UPDATE_STYLE', { borderRadius: `${e.target.value}px` })} className="w-8 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">O</span>
                            <input type="number" step="0.1" min="0" max="1" value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1} onChange={(e) => sendCommand('UPDATE_STYLE', { opacity: e.target.value })} className="w-8 border border-slate-200 rounded px-1 py-0.5 text-xs outline-none text-center" />
                         </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                         <button onClick={() => sendCommand('LAYER', 'up')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="上移一层"><LayerIcon className="w-3.5 h-3.5 rotate-180"/></button>
                         <button onClick={() => sendCommand('LAYER', 'down')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="下移一层"><LayerIcon className="w-3.5 h-3.5"/></button>
                         <div className="w-px h-4 bg-slate-200 mx-1"></div>
                         <button onClick={() => sendCommand('DUPLICATE')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded" title="复制"><DuplicateIcon className="w-3.5 h-3.5"/></button>
                         <button onClick={() => { sendCommand('DELETE'); setSelectedElement(null); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded" title="删除"><TrashIcon className="w-3.5 h-3.5"/></button>
                    </div>

                    <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
                        <button onClick={() => sendCommand('UPDATE_TRANSFORM', { dx: -10, dy: 0 })} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-3 h-3 rotate-180"/></button>
                        <div className="flex flex-col gap-0.5">
                             <button onClick={() => sendCommand('UPDATE_TRANSFORM', { dx: 0, dy: -10 })} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-2.5 h-2.5 -rotate-90"/></button>
                             <button onClick={() => sendCommand('UPDATE_TRANSFORM', { dx: 0, dy: 10 })} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-2.5 h-2.5 rotate-90"/></button>
                        </div>
                        <button onClick={() => sendCommand('UPDATE_TRANSFORM', { dx: 10, dy: 0 })} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><ArrowIcon className="w-3 h-3"/></button>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-400 mr-2">插入:</span>
                     <div className="relative group">
                         <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm">
                             <PhotoIcon className="w-3.5 h-3.5"/> 图片
                         </button>
                         <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-100 p-1 hidden group-hover:block z-50">
                             <button onClick={() => {
                                 const url = prompt("请输入图片 URL:");
                                 if (url) sendCommand('INSERT_ELEMENT', { type: 'img', src: url });
                             }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded text-slate-600 flex gap-2 font-medium items-center"><LinkIcon className="w-3.5 h-3.5"/> 网络图片</button>
                             <label className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded text-slate-600 flex gap-2 cursor-pointer font-medium items-center">
                                 <PhotoIcon className="w-3.5 h-3.5"/> 本地上传
                                 <input 
                                     type="file" 
                                     accept="image/*" 
                                     onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                if (event.target?.result) sendCommand('INSERT_ELEMENT', { type: 'img', src: event.target.result as string });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                        e.target.value = '';
                                     }} 
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
        <div className="flex w-full h-full bg-slate-200 overflow-hidden relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/50 p-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                 <Toolbar />
            </div>

            <div 
                ref={containerRef}
                className="flex-1 relative overflow-auto flex items-center justify-center p-10"
                onWheel={handleWheel}
            >
                 <div 
                    style={{ 
                        width: '1600px', height: '900px', 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'center center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
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
VisualEditor.displayName = 'VisualEditor';
