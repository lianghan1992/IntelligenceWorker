
import React, { useEffect, useRef, useState } from 'react';
import { 
    TrashIcon, ArrowRightIcon, PlusIcon, RefreshIcon
} from '../../../../components/icons';

interface VisualCanvasProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
}

// Injected Script logic
const EDITOR_SCRIPT = `
<script>
(function() {
  let selectedEl = null;
  let isDragging = false;
  let startX, startY, initialTransformX, initialTransformY;
  
  // Initialize scale
  window.visualEditorScale = 1;

  // 1. Inject Editor Styles
  const style = document.createElement('style');
  style.innerHTML = \`
    .ai-editor-selected { 
      outline: 2px solid #3b82f6 !important; 
      outline-offset: 2px;
      cursor: move !important; 
      z-index: 9999;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
    }
    .ai-editor-hover:not(.ai-editor-selected) {
      outline: 1px dashed #93c5fd !important;
      cursor: pointer !important;
    }
    *[contenteditable="true"] {
      cursor: text !important;
      outline: 2px solid #10b981 !important;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
    }
    /* Prevent selection of root containers */
    body, html, #canvas {
        min-height: 100%;
    }
  \`;
  document.head.appendChild(style);

  // 2. Interaction: Click to Select
  document.body.addEventListener('click', (e) => {
    if (e.target.isContentEditable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedEl && selectedEl !== e.target) {
       deselect();
    }

    const target = e.target;
    // Block selection of root nodes
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect();
        return;
    }

    selectElement(target);
  }, true);

  // Hover Effects
  document.body.addEventListener('mouseover', (e) => {
      if (e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas') return;
      if (e.target === selectedEl) return;
      e.target.classList.add('ai-editor-hover');
  });

  document.body.addEventListener('mouseout', (e) => {
      e.target.classList.remove('ai-editor-hover');
  });

  // 3. Interaction: Double Click to Edit Text
  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault();
     e.stopPropagation();
     if (selectedEl) {
         selectedEl.contentEditable = 'true';
         selectedEl.focus();
         const onBlur = () => {
             selectedEl.contentEditable = 'false';
             selectedEl.removeEventListener('blur', onBlur);
         };
         selectedEl.addEventListener('blur', onBlur);
     }
  });
  
  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
      if (!selectedEl) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
          if (!selectedEl.isContentEditable) {
              selectedEl.remove();
              deselect();
          }
      }
      if (e.key === 'Escape') {
          deselect();
      }
  });

  function selectElement(el) {
      if (selectedEl) deselect();
      
      selectedEl = el;
      selectedEl.classList.remove('ai-editor-hover');
      selectedEl.classList.add('ai-editor-selected');
      
      const transform = selectedEl.style.transform || '';
      let currentScale = 1;
      const scaleMatch = transform.match(/scale\\(([^)]+)\\)/);
      if (scaleMatch) {
          currentScale = parseFloat(scaleMatch[1]);
      }

      const comp = window.getComputedStyle(selectedEl);
      window.parent.postMessage({ 
          type: 'SELECTED', 
          tagName: selectedEl.tagName,
          color: comp.color,
          fontSize: comp.fontSize,
          zIndex: comp.zIndex,
          textAlign: comp.textAlign,
          fontWeight: comp.fontWeight,
          scale: currentScale,
          width: comp.width,
          height: comp.height,
          letterSpacing: comp.letterSpacing
      }, '*');
  }

  function deselect() {
      if (selectedEl) {
         selectedEl.classList.remove('ai-editor-selected');
         selectedEl.contentEditable = 'false';
         selectedEl = null;
         window.parent.postMessage({ type: 'DESELECT' }, '*');
      }
  }

  // 4. Message Listener (Parent -> Iframe)
  window.addEventListener('message', (event) => {
    const { action, value } = event.data;
    
    // --- Scale Update Fix ---
    if (action === 'UPDATE_SCALE') {
        window.visualEditorScale = value;
        return;
    }

    if (action === 'GET_HTML') {
        const wasSelected = selectedEl;
        if (selectedEl) selectedEl.classList.remove('ai-editor-selected');
        const editables = document.querySelectorAll('*[contenteditable]');
        editables.forEach(el => el.removeAttribute('contenteditable'));
        const cleanHtml = document.documentElement.outerHTML;
        if (wasSelected) wasSelected.classList.add('ai-editor-selected');
        window.parent.postMessage({ type: 'HTML_RESULT', html: cleanHtml }, '*');
        return;
    }

    if (!selectedEl) return;

    if (action === 'UPDATE_STYLE') {
        Object.assign(selectedEl.style, value);
    } 
    else if (action === 'UPDATE_TRANSFORM') {
        const currentTransform = selectedEl.style.transform || '';
        let translatePart = 'translate(0px, 0px)';
        const translateMatch = currentTransform.match(/translate\\([^)]+\\)/);
        if (translateMatch) translatePart = translateMatch[0];
        selectedEl.style.transform = \`\${translatePart} scale(\${value})\`;
    }
    else if (action === 'RESET_STYLE') {
        selectedEl.style.transform = '';
        selectedEl.style.color = '';
        selectedEl.style.fontSize = '';
        selectedEl.style.fontWeight = '';
        selectedEl.style.textAlign = '';
        selectedEl.style.width = '';
        selectedEl.style.height = '';
        selectedEl.style.letterSpacing = '';
    }
    else if (action === 'DELETE') {
        selectedEl.remove();
        deselect();
    } 
    else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.position = 'relative'; 
    }
  });

  // 5. Drag Logic
  document.body.addEventListener('mousedown', (e) => {
    if (!selectedEl || e.target !== selectedEl) return;
    if (selectedEl.isContentEditable) return; 

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const transform = selectedEl.style.transform || '';
    const match = transform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
    if (match) {
        initialTransformX = parseFloat(match[1]);
        initialTransformY = parseFloat(match[2]);
    } else {
        initialTransformX = 0;
        initialTransformY = 0;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !selectedEl) return;
    e.preventDefault();
    
    // Use local scale variable safely
    const scale = window.visualEditorScale || 1; 
    
    const dx = (e.clientX - startX) / scale; 
    const dy = (e.clientY - startY) / scale;
    
    const currentTransform = selectedEl.style.transform || '';
    let scalePart = '';
    const scaleMatch = currentTransform.match(/scale\\([^)]+\\)/);
    if (scaleMatch) scalePart = scaleMatch[0];

    selectedEl.style.transform = \`translate(\${initialTransformX + dx}px, \${initialTransformY + dy}px) \${scalePart}\`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

})();
</script>
`;

export const VisualCanvas: React.FC<VisualCanvasProps> = ({ initialHtml, onSave }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [selectedElement, setSelectedElement] = useState<{
        tagName: string;
        color: string;
        fontSize: string;
        scale: number;
        textAlign: string;
        fontWeight: string;
        width: string;
        height: string;
        letterSpacing: string;
    } | null>(null);

    // Auto fit scale logic
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const baseWidth = 1600;
                const baseHeight = 900;
                // Leave some padding
                const wRatio = (clientWidth - 60) / baseWidth; 
                const hRatio = (clientHeight - 60) / baseHeight;
                const newScale = Math.min(wRatio, hRatio);
                
                setScale(newScale);

                // Safe Cross-Origin Communication for Scale
                if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({ action: 'UPDATE_SCALE', value: newScale }, '*');
                }
            }
        };
        
        window.addEventListener('resize', updateScale);
        // Initial delays to handle layout shifts
        setTimeout(updateScale, 100);
        setTimeout(updateScale, 500);
        
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Load Content
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(initialHtml + EDITOR_SCRIPT);
                doc.close();
            }
        }
    }, [initialHtml]);

    // Handle Messages from Iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'SELECTED') {
                setSelectedElement({
                    tagName: e.data.tagName,
                    color: e.data.color,
                    fontSize: e.data.fontSize,
                    scale: e.data.scale || 1,
                    textAlign: e.data.textAlign,
                    fontWeight: e.data.fontWeight,
                    width: e.data.width,
                    height: e.data.height,
                    letterSpacing: e.data.letterSpacing || '0px'
                });
            } else if (e.data.type === 'DESELECT') {
                setSelectedElement(null);
            } else if (e.data.type === 'HTML_RESULT') {
                let cleanHtml = e.data.html;
                cleanHtml = cleanHtml.replace(EDITOR_SCRIPT.trim(), '');
                onSave(cleanHtml);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onSave]);

    const sendCommand = (action: string, value?: any) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ action, value }, '*');
        }
    };

    // --- Toolbar Actions ---
    const handleColor = (color: string) => sendCommand('UPDATE_STYLE', { color });
    const handleFontSize = (delta: number) => {
        if (!selectedElement) return;
        const current = parseInt(selectedElement.fontSize) || 16;
        sendCommand('UPDATE_STYLE', { fontSize: `${current + delta}px` });
    };
    const handleScaleItem = (delta: number) => {
        if (!selectedElement) return;
        const current = selectedElement.scale || 1;
        sendCommand('UPDATE_TRANSFORM', Math.max(0.2, Math.min(3.0, current + delta)));
    };
    const handleDimension = (prop: 'width' | 'height', delta: number) => {
        if (!selectedElement) return;
        const current = parseInt(selectedElement[prop]) || 0;
        sendCommand('UPDATE_STYLE', { [prop]: `${Math.max(1, current + delta)}px` });
    };
    const handleLetterSpacing = (delta: number) => {
        if (!selectedElement) return;
        const current = parseFloat(selectedElement.letterSpacing) || 0;
        sendCommand('UPDATE_STYLE', { letterSpacing: `${(current + delta).toFixed(1)}px` });
    };
    const handleAlign = (align: 'left' | 'center' | 'right') => sendCommand('UPDATE_STYLE', { textAlign: align });
    const handleBold = () => {
        if (!selectedElement) return;
        const isBold = parseInt(selectedElement.fontWeight) >= 700 || selectedElement.fontWeight === 'bold';
        sendCommand('UPDATE_STYLE', { fontWeight: isBold ? 'normal' : 'bold' });
    };
    const handleDelete = () => {
        sendCommand('DELETE');
        setSelectedElement(null);
    };
    const handleLayer = (dir: 'up' | 'down') => sendCommand('LAYER', dir);
    const handleReset = () => sendCommand('RESET_STYLE');

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center relative bg-slate-200 overflow-hidden">
            
            {/* Floating Toolbar (HUD) */}
            {selectedElement && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-2 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4 select-none ring-1 ring-black/5 overflow-x-auto max-w-[95vw] custom-scrollbar">
                    
                    {/* Tag Name */}
                    <div className="flex items-center gap-2 pr-2 border-r border-slate-200 flex-shrink-0">
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">{selectedElement.tagName}</span>
                    </div>

                    {/* Text Style Group */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-0.5 flex-shrink-0">
                        <div className="flex items-center">
                            <button onClick={() => handleFontSize(-2)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold hover:shadow-sm text-[10px]">A-</button>
                            <button onClick={() => handleFontSize(2)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold hover:shadow-sm text-[10px]">A+</button>
                        </div>
                        <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                        <button onClick={handleBold} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded font-serif font-bold text-[10px] text-slate-500 hover:shadow-sm">B</button>
                        <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                        <div className="flex items-center">
                             <button onClick={() => handleLetterSpacing(-0.5)} className="w-5 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold text-[9px]">AV-</button>
                             <button onClick={() => handleLetterSpacing(0.5)} className="w-5 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold text-[9px]">AV+</button>
                        </div>
                        <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                         <div className="flex items-center gap-0.5">
                            <button onClick={() => handleAlign('left')} className="w-5 h-6 flex items-center justify-center rounded hover:bg-white text-slate-400 text-[10px]">L</button>
                            <button onClick={() => handleAlign('center')} className="w-5 h-6 flex items-center justify-center rounded hover:bg-white text-slate-400 text-[10px]">C</button>
                        </div>
                    </div>

                    {/* Scale Group */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-0.5 flex-shrink-0">
                        <button onClick={() => handleScaleItem(-0.1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 hover:shadow-sm" title="缩小">-</button>
                        <button onClick={() => handleScaleItem(0.1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 hover:shadow-sm" title="放大">+</button>
                    </div>

                     {/* Dimension Group */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-0.5 flex-shrink-0">
                        <span className="text-[8px] font-bold text-slate-400 px-1">W</span>
                        <button onClick={() => handleDimension('width', -10)} className="w-5 h-6 hover:bg-white rounded text-slate-500 text-[10px]">-</button>
                        <button onClick={() => handleDimension('width', 10)} className="w-5 h-6 hover:bg-white rounded text-slate-500 text-[10px]">+</button>
                    </div>

                    {/* Color Group */}
                    <div className="flex items-center gap-1 px-1 flex-shrink-0">
                        {['#000000', '#2563EB', '#DC2626', '#F59E0B', '#10B981', '#FFFFFF'].map(c => (
                            <button
                                key={c}
                                onClick={() => handleColor(c)}
                                className={`w-4 h-4 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-sm ${c === '#FFFFFF' ? 'ring-1 ring-slate-200' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0"></div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleLayer('up')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="上移">↑</button>
                        <button onClick={() => handleLayer('down')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="下移">↓</button>
                        <button onClick={handleReset} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="重置"><RefreshIcon className="w-3 h-3"/></button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0"></div>

                    <button onClick={handleDelete} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors flex-shrink-0" title="删除">
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Iframe Canvas Container */}
            <div 
                style={{ 
                    width: '1600px', 
                    height: '900px', 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'center center',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}
                className="bg-white"
            >
                <iframe 
                    ref={iframeRef}
                    className="w-full h-full border-none bg-white"
                    title="Visual Editor"
                    sandbox="allow-scripts"
                />
            </div>
            
            {/* Sync Trigger */}
            <div className="absolute bottom-6 right-6">
                <button 
                     onClick={() => sendCommand('GET_HTML')}
                     className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                    <ArrowRightIcon className="w-5 h-5"/> 同步代码
                </button>
            </div>
        </div>
    );
};
