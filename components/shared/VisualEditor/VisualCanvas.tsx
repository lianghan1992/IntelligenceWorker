
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
  let selectedEl = null;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = null;
  
  // Dragging state
  let startX = 0, startY = 0;
  let startTranslateX = 0, startTranslateY = 0;
  
  // Resizing state
  let startWidth = 0, startHeight = 0;
  let startLeft = 0, startTop = 0; // For absolute positioning calculations (if needed) or transform calc

  window.visualEditorScale = 1;

  const style = document.createElement('style');
  style.innerHTML = \`
    html, body { min-height: 100vh !important; margin: 0; background-color: #ffffff; }
    
    /* Selection Outline */
    .ai-editor-selected { 
        outline: 2px solid #3b82f6 !important; 
        outline-offset: 0px; 
        position: relative; 
        z-index: 1000 !important;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); 
    }
    
    /* Cursor depends on state */
    .ai-editor-selected:not([contenteditable="true"]) {
        cursor: move !important;
    }
    
    .ai-editor-hover:not(.ai-editor-selected) { 
        outline: 1px dashed #93c5fd !important; 
        cursor: pointer !important; 
    }
    
    /* Editing Text State */
    *[contenteditable="true"] { 
        cursor: text !important; 
        outline: 2px dashed #10b981 !important; 
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); 
        user-select: text !important; 
        -webkit-user-select: text !important;
    }
    
    /* Resizer Handles */
    .ai-resizer { 
        position: absolute; 
        width: 10px; 
        height: 10px; 
        background: white; 
        border: 1px solid #3b82f6; 
        z-index: 2001 !important; 
        box-shadow: 0 1px 2px rgba(0,0,0,0.2); 
    }
    .ai-resizer:hover { background: #eff6ff; transform: scale(1.2); }
    
    .ai-r-nw { top: -6px; left: -6px; cursor: nw-resize; }
    .ai-r-n  { top: -6px; left: 50%; margin-left: -5px; cursor: n-resize; }
    .ai-r-ne { top: -6px; right: -6px; cursor: ne-resize; }
    .ai-r-e  { top: 50%; right: -6px; margin-top: -5px; cursor: e-resize; }
    .ai-r-se { bottom: -6px; right: -6px; cursor: se-resize; }
    .ai-r-s  { bottom: -6px; left: 50%; margin-left: -5px; cursor: s-resize; }
    .ai-r-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
    .ai-r-w  { top: 50%; left: -6px; margin-top: -5px; cursor: w-resize; }
  \`;
  document.head.appendChild(style);

  function getTransform(el) {
      const style = window.getComputedStyle(el);
      const matrix = new WebKitCSSMatrix(style.transform);
      return { x: matrix.m41, y: matrix.m42, scaleX: matrix.a, scaleY: matrix.d }; 
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
      // Don't add resizers if editing text content
      if (el.isContentEditable) return;
      
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handles.forEach(h => {
          const div = document.createElement('div');
          div.className = 'ai-resizer ai-r-' + h;
          div.dataset.handle = h;
          // Prevent resizing event from bubbling to selection click
          div.addEventListener('mousedown', startResizing);
          el.appendChild(div);
      });
  }

  function removeResizers() {
      document.querySelectorAll('.ai-resizer').forEach(r => r.remove());
  }
  
  function startResizing(e) {
      e.preventDefault(); e.stopPropagation();
      isResizing = true;
      resizeHandle = e.target.dataset.handle;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = selectedEl.getBoundingClientRect();
      const style = window.getComputedStyle(selectedEl);
      
      startWidth = parseFloat(style.width) || rect.width;
      startHeight = parseFloat(style.height) || rect.height;
      
      const t = getTransform(selectedEl);
      startTranslateX = t.x;
      startTranslateY = t.y;
      
      // Force inline elements to behave like blocks for resizing
      if (style.display === 'inline') {
          selectedEl.style.display = 'inline-block';
      }
      
      // Ensure we have a defined width/height to start with if auto
      if (style.width === 'auto') selectedEl.style.width = rect.width + 'px';
      if (style.height === 'auto') selectedEl.style.height = rect.height + 'px';
  }

  // --- Global Mouse Down ---
  document.addEventListener('mousedown', (e) => {
      if (isResizing) return;
      
      // 1. Text Editing Fix: If clicking into an editable element, DO NOT prevent default.
      // This allows the browser to place the caret and handle selection naturally.
      if (selectedEl && selectedEl.contains(e.target) && selectedEl.isContentEditable) {
          return; 
      }
      
      // Check if clicking inside current selected element to start Drag
      if (selectedEl && selectedEl.contains(e.target)) {
          // If content editable, we already returned above.
          
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
          
          // Disable max constraints during resize for flexibility
          selectedEl.style.maxWidth = 'none';
          selectedEl.style.maxHeight = 'none';
          selectedEl.style.flexShrink = '0';
          
          let newW = startWidth;
          let newH = startHeight;
          let newX = startTranslateX;
          let newY = startTranslateY;

          // East / West (Width)
          if (resizeHandle.includes('e')) {
               newW = Math.max(10, startWidth + dx);
          } else if (resizeHandle.includes('w')) {
               newW = Math.max(10, startWidth - dx);
               newX = startTranslateX + dx;
          }

          // South / North (Height)
          if (resizeHandle.includes('s')) {
               newH = Math.max(10, startHeight + dy);
          } else if (resizeHandle.includes('n')) {
               newH = Math.max(10, startHeight - dy);
               newY = startTranslateY + dy;
          }

          // Apply dimensions
          if (resizeHandle.includes('w') || resizeHandle.includes('e')) selectedEl.style.width = newW + 'px';
          if (resizeHandle.includes('n') || resizeHandle.includes('s')) selectedEl.style.height = newH + 'px';
          
          // Apply position adjustment for N/W resizing (requires Transform)
          // Note: This assumes the element uses transform for positioning.
          // If it uses top/left, we would update those instead.
          // For this editor, we primarily drive dragging via Transform.
          if (resizeHandle.includes('w') || resizeHandle.includes('n')) {
              selectedEl.style.transform = \`translate(\${newX}px, \${newY}px)\`;
          }
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

  // --- Click Selection ---
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-resizer')) return;
    
    // If clicking inside editable text, do nothing (keep focus)
    if (selectedEl && selectedEl.contains(e.target) && selectedEl.isContentEditable) {
        return;
    }
    
    e.stopPropagation();

    // Deselect if clicking canvas background or root
    if (e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas') {
        deselect();
        return;
    }
    
    // If clicking a new element (even inside selected), select the new target
    if (selectedEl !== e.target) {
        if (selectedEl) deselect();
        
        let target = e.target;
        // Auto-wrap IMG logic
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
        selectElement(target);
    }
    e.preventDefault(); 
  }, true);

  // --- Hover Effects ---
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

  // --- Double Click Text Editing ---
  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     
     let target = selectedEl || e.target;
     
     if (target.classList.contains('ai-img-wrapper') || target.classList.contains('ai-resizer')) return;

     // Ensure we select it first if not already
     if (target !== selectedEl) selectElement(target);

     if (!target.isContentEditable) {
         removeResizers(); // Hide handles while editing
         target.contentEditable = 'true';
         target.focus(); // CRITICAL FIX: Explicitly focus
         
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

  function scaleElementRecursive(el, factor) {
      const style = window.getComputedStyle(el);
      const fs = parseFloat(style.fontSize);
      if (fs) el.style.fontSize = (fs * factor) + 'px';
      
      const pt = parseFloat(style.paddingTop); if(pt) el.style.paddingTop = (pt * factor) + 'px';
      const pb = parseFloat(style.paddingBottom); if(pb) el.style.paddingBottom = (pb * factor) + 'px';
      const pl = parseFloat(style.paddingLeft); if(pl) el.style.paddingLeft = (pl * factor) + 'px';
      const pr = parseFloat(style.paddingRight); if(pr) el.style.paddingRight = (pr * factor) + 'px';

      if (style.lineHeight.endsWith('px')) {
          const lh = parseFloat(style.lineHeight);
          if (lh) el.style.lineHeight = (lh * factor) + 'px';
      }
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
        } else if (value.type === 'text') {
             const div = document.createElement('div');
             div.innerText = value.value || '双击编辑文本';
             div.style.position = 'absolute';
             div.style.left = '100px';
             div.style.top = '100px';
             div.style.fontSize = '24px';
             div.style.fontWeight = 'bold';
             div.style.color = '#333';
             div.style.zIndex = '50';
             div.className = 'font-sans'; 
             
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
        const currentZ = parseInt(style.zIndex) || 0;
        const newZ = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.setProperty('z-index', newZ.toString(), 'important');
        if (style.position === 'static') selectedEl.style.setProperty('position', 'relative', 'important');
        pushHistory();
    }
    else if (action === 'UPDATE_TRANSFORM') {
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
