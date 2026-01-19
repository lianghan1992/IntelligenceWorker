
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

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

// --- Editor Interaction Script ---
const EDITOR_SCRIPT = `
<script>
(function() {
  // --- State ---
  let selectedEl = null;
  let isDragging = false;
  let isResizing = false;
  let isEditing = false; // Explicit editing mode flag
  let resizeHandle = null;
  
  // Dragging Coords
  let startX = 0, startY = 0;
  let startTranslateX = 0, startTranslateY = 0;
  
  // Resizing Coords
  let startWidth = 0, startHeight = 0;
  let startLeft = 0, startTop = 0; 
  let originalRect = null;

  window.visualEditorScale = 1;

  // --- Styles ---
  const style = document.createElement('style');
  style.innerHTML = \`
    html, body { min-height: 100vh !important; margin: 0; background-color: #ffffff; }
    
    /* Selection Box */
    .ai-editor-selected { 
        outline: 2px solid #3b82f6 !important; 
        outline-offset: 0px; 
    }
    
    /* Hover Effect */
    .ai-editor-hover:not(.ai-editor-selected) { 
        outline: 1px dashed #93c5fd !important; 
        cursor: pointer !important; 
    }
    
    /* Editing State - Clean look, native cursor */
    .ai-editor-editing {
        outline: 2px dashed #22c55e !important;
        cursor: text !important;
        user-select: text !important;
        -webkit-user-select: text !important;
    }

    /* Dragging Cursor */
    .ai-editor-selected:not(.ai-editor-editing) {
        cursor: move !important;
        user-select: none !important;
    }
    
    /* Resizer Handles */
    .ai-resizer { 
        position: absolute; 
        width: 10px; 
        height: 10px; 
        background: white; 
        border: 1px solid #3b82f6; 
        z-index: 2147483647 !important; /* Resizers always on top */
        box-shadow: 0 1px 2px rgba(0,0,0,0.1); 
        border-radius: 2px;
    }
    
    .ai-r-nw { top: -6px; left: -6px; cursor: nw-resize; }
    .ai-r-n  { top: -6px; left: 50%; margin-left: -5px; cursor: n-resize; }
    .ai-r-ne { top: -6px; right: -6px; cursor: ne-resize; }
    .ai-r-e  { top: 50%; right: -6px; margin-top: -5px; cursor: e-resize; }
    .ai-r-se { bottom: -6px; right: -6px; cursor: se-resize; }
    .ai-r-s  { bottom: -6px; left: 50%; margin-left: -5px; cursor: s-resize; }
    .ai-r-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
    .ai-r-w  { top: 50%; left: -6px; margin-top: -5px; cursor: w-resize; }

    /* Img Wrapper Helper */
    .ai-img-wrapper {
        display: inline-block;
        vertical-align: top;
    }
    .ai-img-wrapper img {
        width: 100% !important;
        height: 100% !important;
        object-fit: fill !important; /* Allow free ratio resizing */
        pointer-events: none; /* Prevent browser image drag */
    }
  \`;
  document.head.appendChild(style);

  // --- Helpers ---
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
        const wasEditing = isEditing;
        
        // Temp cleanup
        if (selectedEl) {
             selectedEl.classList.remove('ai-editor-selected');
             selectedEl.classList.remove('ai-editor-editing');
             selectedEl.removeAttribute('contenteditable');
        }
        removeResizers();
        
        const cleanHtml = document.documentElement.outerHTML;
        
        // Restore
        if (wasSelected) {
            selectElement(wasSelected);
            if (wasEditing) enterEditMode(wasSelected);
        }
        
        window.parent.postMessage({ type: 'HISTORY_UPDATE', html: cleanHtml }, '*');
      }, 20);
  }

  function createResizers(el) {
      removeResizers();
      // Do not add resizers in text edit mode
      if (isEditing) return;
      
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handles.forEach(h => {
          const div = document.createElement('div');
          div.className = 'ai-resizer ai-r-' + h;
          div.dataset.handle = h;
          div.addEventListener('mousedown', startResizing);
          el.appendChild(div);
      });
  }

  function removeResizers() {
      document.querySelectorAll('.ai-resizer').forEach(r => r.remove());
  }

  // --- Actions ---

  function startResizing(e) {
      e.preventDefault(); 
      e.stopPropagation();
      
      isResizing = true;
      resizeHandle = e.target.dataset.handle;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = selectedEl.getBoundingClientRect();
      const style = window.getComputedStyle(selectedEl);
      const transform = getTransform(selectedEl);
      
      startWidth = parseFloat(style.width) || rect.width;
      startHeight = parseFloat(style.height) || rect.height;
      startTranslateX = transform.x;
      startTranslateY = transform.y;
      
      if (style.display === 'inline') {
          selectedEl.style.display = 'inline-block';
      }
      
      if (style.width === 'auto') selectedEl.style.width = rect.width + 'px';
      if (style.height === 'auto') selectedEl.style.height = rect.height + 'px';
  }

  function enterEditMode(el) {
      if (!['P','SPAN','H1','H2','H3','H4','H5','H6','DIV','LI'].includes(el.tagName)) return;
      
      isEditing = true;
      el.contentEditable = 'true';
      el.classList.add('ai-editor-editing');
      removeResizers(); 
      el.focus();
  }

  function exitEditMode() {
      if (!isEditing || !selectedEl) return;
      
      isEditing = false;
      selectedEl.contentEditable = 'false';
      selectedEl.classList.remove('ai-editor-editing');
      createResizers(selectedEl); 
      pushHistory();
  }

  // --- Global Event Listeners ---

  document.addEventListener('mousedown', (e) => {
      if (isResizing) return;

      if (isEditing) {
          if (selectedEl && selectedEl.contains(e.target)) {
              return;
          }
          exitEditMode();
      }

      if (selectedEl && selectedEl.contains(e.target)) {
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

      // --- RESIZING LOGIC ---
      if (isResizing && selectedEl) {
          e.preventDefault();
          
          selectedEl.style.maxWidth = 'none';
          selectedEl.style.maxHeight = 'none';
          selectedEl.style.flexShrink = '0';
          
          let newW = startWidth;
          let newH = startHeight;
          let newTx = startTranslateX;
          let newTy = startTranslateY;

          if (resizeHandle.includes('e')) {
               newW = Math.max(10, startWidth + dx);
          } else if (resizeHandle.includes('w')) {
               newW = Math.max(10, startWidth - dx);
               newTx = startTranslateX + dx; 
          }

          if (resizeHandle.includes('s')) {
               newH = Math.max(10, startHeight + dy);
          } else if (resizeHandle.includes('n')) {
               newH = Math.max(10, startHeight - dy);
               newTy = startTranslateY + dy;
          }

          selectedEl.style.width = newW + 'px';
          selectedEl.style.height = newH + 'px';
          
          if (resizeHandle.includes('w') || resizeHandle.includes('n')) {
              selectedEl.style.transform = \`translate(\${newTx}px, \${newTy}px)\`;
          }
      }

      // --- DRAGGING LOGIC ---
      if (isDragging && selectedEl) {
          e.preventDefault();
          selectedEl.style.transform = \`translate(\${startTranslateX + dx}px, \${startTranslateY + dy}px)\`;
      }
  });

  window.addEventListener('mouseup', () => {
      if (isDragging) {
          isDragging = false;
          pushHistory();
      }
      if (isResizing) {
          isResizing = false;
          pushHistory();
      }
  });

  // --- Selection & Double Click ---
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-resizer')) return;
    if (isEditing) {
        e.stopPropagation();
        return;
    }
    e.stopPropagation();

    if (e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas') {
        deselect();
        return;
    }
    
    let target = e.target;
    
    if (target.tagName === 'IMG') {
        if (target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
             target = target.parentElement;
        } else {
             // Create Wrapper
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             
             const comp = window.getComputedStyle(target);
             const w = target.offsetWidth;
             const h = target.offsetHeight;

             wrapper.style.cssText = comp.cssText;
             wrapper.style.display = comp.display === 'inline' ? 'inline-block' : comp.display;
             wrapper.style.width = w + 'px';
             wrapper.style.height = h + 'px';
             
             target.style.width = '100%';
             target.style.height = '100%';
             target.style.margin = '0';
             target.style.transform = 'none';
             target.style.position = 'static';
             
             if (target.parentNode) {
                 target.parentNode.insertBefore(wrapper, target);
                 wrapper.appendChild(target);
                 target = wrapper;
                 pushHistory();
             }
        }
    }
    
    if (selectedEl !== target) {
        selectElement(target);
    }
    e.preventDefault(); 
  }, true);

  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     if (selectedEl && !selectedEl.classList.contains('ai-img-wrapper')) {
         enterEditMode(selectedEl);
     }
  });

  // --- Hover UX ---
  document.body.addEventListener('mouseover', (e) => {
      if (isResizing || isDragging || isEditing) return;
      if (e.target.classList.contains('ai-resizer') || e.target === document.body || e.target.id === 'canvas' || e.target === selectedEl) return;
      
      let target = e.target;
      if (target.tagName === 'IMG' && target.parentElement?.classList.contains('ai-img-wrapper')) {
          target = target.parentElement;
      }
      target.classList.add('ai-editor-hover');
  });
  
  document.body.addEventListener('mouseout', (e) => { 
      let target = e.target;
      if (target.tagName === 'IMG' && target.parentElement?.classList.contains('ai-img-wrapper')) {
          target = target.parentElement;
      }
      target.classList.remove('ai-editor-hover'); 
  });

  // --- Core Functions ---

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
      
      const comp = window.getComputedStyle(selectedEl);
      sendSelection(selectedEl, comp);
  }

  function deselect(temporary = false) {
      if (selectedEl) {
         if (isEditing) exitEditMode();
         selectedEl.classList.remove('ai-editor-selected');
         removeResizers();
         if (!temporary) {
             selectedEl = null;
             window.parent.postMessage({ type: 'DESELECT' }, '*');
         }
      }
  }

  // --- Recursive Scale Logic ---
  function scaleElementRecursive(el, factor) {
      if (!el || el.nodeType !== 1) return;
      const style = window.getComputedStyle(el);
      
      const scaleProp = (prop) => {
          const val = style.getPropertyValue(prop);
          if (val && val.endsWith('px')) {
              const num = parseFloat(val);
              if (!isNaN(num) && num !== 0) {
                   el.style.setProperty(prop, (num * factor) + 'px');
              }
          }
      };

      scaleProp('font-size');
      scaleProp('line-height');
      scaleProp('padding-top');
      scaleProp('padding-bottom');
      scaleProp('padding-left');
      scaleProp('padding-right');
      scaleProp('margin-top');
      scaleProp('margin-bottom');
      scaleProp('margin-left');
      scaleProp('margin-right');
      scaleProp('gap');

      Array.from(el.children).forEach(child => scaleElementRecursive(child, factor));
  }

  // --- Message Listener ---
  window.addEventListener('message', (event) => {
    const { action, value } = event.data;
    if (action === 'UPDATE_SCALE') { window.visualEditorScale = value; return; }
    
    if (action === 'GET_HTML') {
        const wasSelected = selectedEl;
        if (selectedEl) deselect(true);
        // Clean editables
        document.querySelectorAll('*[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        document.querySelectorAll('.ai-editor-editing').forEach(el => el.classList.remove('ai-editor-editing'));
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
             wrapper.style.width = '400px'; // Set default width
             wrapper.style.height = '300px'; // Set default height
             wrapper.style.zIndex = '50';
             
             const img = document.createElement('img');
             img.src = value.src;
             img.style.width = '100%';
             img.style.height = '100%';
             img.style.objectFit = 'fill';
             
             wrapper.appendChild(img);
             const canvas = document.getElementById('canvas') || document.body;
             canvas.appendChild(wrapper);
             selectElement(wrapper);
             pushHistory();
        } else if (value.type === 'text') {
             const div = document.createElement('div');
             div.innerText = value.value || 'New Text';
             div.style.position = 'absolute';
             div.style.left = '100px'; div.style.top = '100px';
             div.style.fontSize = '24px';
             div.style.color = '#000';
             div.style.zIndex = '50';
             const canvas = document.getElementById('canvas') || document.body;
             canvas.appendChild(div);
             selectElement(div);
             pushHistory();
        }
        return;
    }
    
    if (!selectedEl) return;
    
    if (action === 'SCALE_GROUP') {
        const factor = value;
        scaleElementRecursive(selectedEl, factor);
        pushHistory();
    }
    else if (action === 'UPDATE_STYLE') { 
        Object.entries(value).forEach(([k, v]) => {
            const prop = k.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            selectedEl.style.setProperty(prop, String(v), 'important');
        });
        pushHistory(); 
    }
    else if (action === 'LAYER') {
        const style = window.getComputedStyle(selectedEl);
        if (style.position === 'static') {
            selectedEl.style.setProperty('position', 'relative', 'important');
        }
        let currentZ = 0;
        if (style.zIndex !== 'auto') {
            const parsed = parseInt(style.zIndex, 10);
            if (!isNaN(parsed)) currentZ = parsed;
        }
        const newZ = value === 'up' ? currentZ + 1 : currentZ - 1;
        selectedEl.style.setProperty('z-index', newZ.toString(), 'important');
        pushHistory();
    }
    else if (action === 'UPDATE_TRANSFORM') {
         const t = getTransform(selectedEl);
         const nx = t.x + (value.dx || 0);
         const ny = t.y + (value.dy || 0);
         selectedEl.style.transform = \`translate(\${nx}px, \${ny}px)\`;
         pushHistory();
    }
    else if (action === 'DELETE') { selectedEl.remove(); deselect(); pushHistory(); }
    else if (action === 'DESELECT_FORCE') { deselect(); }
    else if (action === 'DUPLICATE') {
        const clone = selectedEl.cloneNode(true);
        const currentTransform = clone.style.transform || '';
        const match = currentTransform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
        if (match) {
             const x = parseFloat(match[1]) + 20;
             const y = parseFloat(match[2]) + 20;
             clone.style.transform = \`translate(\${x}px, \${y}px)\`;
        }
        selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
        selectElement(clone);
        pushHistory();
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
            if (!doc) return null;
            return doc.getElementById('canvas') || doc.body;
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

    return (
        <div className="flex w-full h-full bg-[#f1f5f9] overflow-hidden relative">
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-auto flex items-center justify-center p-10 no-scrollbar"
                onWheel={handleWheel}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                 <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
                 <div 
                    style={{ 
                        width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'center center',
                        boxShadow: '0 0 50px rgba(0,0,0,0.1)',
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
