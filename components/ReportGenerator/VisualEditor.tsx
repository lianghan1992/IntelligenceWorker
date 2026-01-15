
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
    TrashIcon, CloseIcon,
    PhotoIcon, PencilIcon, 
    LinkIcon, RefreshIcon,
    LayerIcon, DuplicateIcon, ArrowIcon,
    BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
    PlusIcon // Using PlusIcon for zoom in / scale up
} from '../icons';

export interface VisualCanvasHandle {
    updateStyle: (key: string, value: string | number) => void;
    updateContent: (text: string) => void;
    updateAttribute: (key: string, value: string) => void;
    insertElement: (type: 'img', value: string) => void;
    updateTransform: (dx: number, dy: number, scale?: number) => void;
    scaleGroup: (factor: number) => void; // New method
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

interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    canvasSize?: { width: number; height: number };
    hideToolbar?: boolean;
}

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

// --- Editor Interaction Script (Updated) ---
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

  // --- Resize Mouse Down ---
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
      
      // Start Drag
      if (selectedEl && e.target === selectedEl && !selectedEl.isContentEditable) {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const t = getTransform(selectedEl);
          startTranslateX = t.x;
          startTranslateY = t.y;
          e.preventDefault(); 
      }
  });

  // --- Global Mouse Move ---
  window.addEventListener('mousemove', (e) => {
      const scale = window.visualEditorScale || 1;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      if (isResizing && selectedEl) {
          e.preventDefault();
          
          // Simple width/height resizing for E/S/SE handles. 
          // For other handles (W, N, etc), it often requires changing left/top which interacts with flow layout.
          // We limit to size adjustment for now.
          if (resizeHandle.includes('e')) {
               selectedEl.style.width = Math.max(10, startWidth + dx) + 'px';
               selectedEl.style.maxWidth = 'none'; // Ensure resizing works
          }
          if (resizeHandle.includes('s')) {
               selectedEl.style.height = Math.max(10, startHeight + dy) + 'px';
               selectedEl.style.maxHeight = 'none';
          }
          if (resizeHandle.includes('w')) {
               // Negative logic for width, tricky with static positioning, let's just support right/bottom for now
               // or we could use transform scale? No, user expects dimension change.
               selectedEl.style.width = Math.max(10, startWidth - dx) + 'px';
          }
          // Note: Full resizing logic (changing top/left) is complex with standard flow layout. 
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
          isDragging = false;
          isResizing = false;
          pushHistory();
      }
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-resizer')) return;
    if (e.target.isContentEditable) return;
    
    // Clicking selected element does nothing (keeps selection)
    if (selectedEl === e.target) return;

    // Deselect previous
    if (selectedEl && selectedEl !== e.target) {
        deselect();
    }
    
    let target = e.target;
    
    // Auto-wrap IMG
    if (target.tagName === 'IMG') {
        if (target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
             target = target.parentElement;
        } else {
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             const comp = window.getComputedStyle(target);
             wrapper.style.cssText = comp.cssText; // Copy all styles
             wrapper.style.display = comp.display === 'inline' ? 'inline-block' : comp.display;
             wrapper.style.width = target.offsetWidth + 'px';
             wrapper.style.height = target.offsetHeight + 'px';
             wrapper.style.position = comp.position === 'static' ? 'relative' : comp.position;
             
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
    
    // Deselect if background
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect();
        return;
    }
    
    e.preventDefault(); e.stopPropagation();
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

  // Double Click Text Editing
  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     
     // Allow selecting child elements deeply
     if (!selectedEl || !selectedEl.contains(e.target)) return;
     
     // If selected element is a wrapper or container, try to find a text node target
     let target = e.target;
     // Prevent editing wrappers
     if (target.classList.contains('ai-img-wrapper') || target.classList.contains('ai-resizer')) return;

     if (!target.isContentEditable) {
         removeResizers();
         target.contentEditable = 'true';
         target.focus();
         // Select logic when editing
         if (target !== selectedEl) selectElement(target);

         const onBlur = () => {
             target.contentEditable = 'false';
             target.removeEventListener('blur', onBlur);
             createResizers(target); // restore handles
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

  // --- SCALE GROUP LOGIC ---
  function scaleElementRecursive(el, factor) {
      const style = window.getComputedStyle(el);
      
      // Font Size
      const fs = parseFloat(style.fontSize);
      if (fs) el.style.fontSize = (fs * factor) + 'px';
      
      // Padding
      const pt = parseFloat(style.paddingTop); if(pt) el.style.paddingTop = (pt * factor) + 'px';
      const pb = parseFloat(style.paddingBottom); if(pb) el.style.paddingBottom = (pb * factor) + 'px';
      const pl = parseFloat(style.paddingLeft); if(pl) el.style.paddingLeft = (pl * factor) + 'px';
      const pr = parseFloat(style.paddingRight); if(pr) el.style.paddingRight = (pr * factor) + 'px';

      // Line Height (if px)
      if (style.lineHeight.endsWith('px')) {
          const lh = parseFloat(style.lineHeight);
          if (lh) el.style.lineHeight = (lh * factor) + 'px';
      }
      
      // Children
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
        // ... (Insert Logic kept same) ...
        if (value.type === 'img') {
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             wrapper.style.position = 'absolute';
             wrapper.style.left = '100px';
             wrapper.style.top = '100px';
             wrapper.style.zIndex = '50';
             const img = document.createElement('img');
             img.onload = function() {
                 let w = this.naturalWidth; let h = this.naturalHeight;
                 if (w > 400) { const ratio = 400 / w; w = 400; h = h * ratio; }
                 wrapper.style.width = w + 'px'; wrapper.style.height = h + 'px';
                 img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; img.style.display = 'block';
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
    
    if (action === 'SCALE_GROUP') {
        // New: Scale tree
        const factor = value; // 1.1 or 0.9
        scaleElementRecursive(selectedEl, factor);
        pushHistory();
    }
    else if (action === 'UPDATE_CONTENT') { 
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
        // ... (duplicate logic same)
        selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
        selectElement(clone);
        pushHistory();
    }
    else if (action === 'LAYER') {
        // ... (layer logic same)
        const style = window.getComputedStyle(selectedEl);
        const currentZ = parseInt(style.zIndex) || 0;
        const newZ = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.setProperty('z-index', newZ.toString(), 'important');
        if (style.position === 'static') selectedEl.style.setProperty('position', 'relative', 'important');
        pushHistory();
    }
    else if (action === 'UPDATE_TRANSFORM') {
        // ... (transform logic same)
        const currentTransform = selectedEl.style.transform || '';
        let currentScale = 1; let currentX = 0; let currentY = 0;
        const scaleMatch = currentTransform.match(/scale\\(([^)]+)\\)/);
        if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);
        const translateMatch = currentTransform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
        if (translateMatch) { currentX = parseFloat(translateMatch[1]); currentY = parseFloat(translateMatch[2]); }
        
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
})();
</script>
`;

export const VisualCanvas = forwardRef<VisualCanvasHandle, VisualCanvasProps>(({ initialHtml, onSave, scale, onScaleChange, onSelectionChange, canvasSize }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);
    const [selectedElement, setSelectedElement] = useState<any>(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        updateStyle: (key, value) => sendCommand('UPDATE_STYLE', { [key]: value }),
        updateContent: (text) => sendCommand('UPDATE_CONTENT', text),
        updateAttribute: (key, value) => sendCommand('UPDATE_ATTRIBUTE', { key, val: value }),
        insertElement: (type, src) => sendCommand('INSERT_ELEMENT', { type, src }),
        updateTransform: (dx, dy, scaleVal) => sendCommand('UPDATE_TRANSFORM', { dx, dy, scale: scaleVal }),
        changeLayer: (direction) => sendCommand('LAYER', direction),
        duplicate: () => sendCommand('DUPLICATE'),
        deleteElement: () => sendCommand('DELETE'),
        deselect: () => sendCommand('DESELECT_FORCE'),
        scaleGroup: (factor) => sendCommand('SCALE_GROUP', factor), // New
        getCanvasNode: () => {
            const doc = iframeRef.current?.contentDocument;
            if (!doc) return null;
            return doc.getElementById('canvas') || doc.body;
        }
    }));

    // Initial Load & External Updates
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

    // Handle Messages from Iframe
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

    // Update Scale inside iframe
    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ action: 'UPDATE_SCALE', value: scale }, '*');
        }
    }, [scale]);

    // Update Canvas Size in Iframe
    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
            let style = doc.getElementById('dynamic-canvas-size');
            if (!style) {
                style = doc.createElement('style');
                style.id = 'dynamic-canvas-size';
                doc.head.appendChild(style);
            }
            style.innerHTML = `
                #canvas { 
                    width: ${canvasSize.width}px !important; 
                    height: ${canvasSize.height}px !important;
                    max-width: none !important;
                    max-height: none !important;
                }
            `;
        }
    }, [canvasSize]);

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

    return (
        <div className="flex w-full h-full bg-[#0f172a] overflow-hidden relative">
            {/* Scrollable Canvas Wrapper */}
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-auto flex items-center justify-center p-10 no-scrollbar"
                onWheel={handleWheel}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                 <style>{`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
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

export const VisualEditor: React.FC<VisualEditorProps> = ({ 
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
