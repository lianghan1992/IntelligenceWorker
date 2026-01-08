
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    TrashIcon, PencilIcon, CheckIcon, PlusIcon, 
    ArrowRightIcon, ChevronDownIcon, ChevronRightIcon 
} from '../icons';

interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
}

// 注入到 iframe 内部的编辑器引擎脚本
// 这个脚本负责处理点击选择、拖拽、双击编辑文本以及与 React 父组件通信
const EDITOR_SCRIPT = `
<script>
(function() {
  let selectedEl = null;
  let isDragging = false;
  let startX, startY, initialTransformX, initialTransformY;

  // 1. 注入编辑器样式
  const style = document.createElement('style');
  style.innerHTML = \`
    .ai-editor-selected { 
      outline: 2px solid #3b82f6 !important; 
      outline-offset: 2px;
      cursor: move !important; 
      z-index: 9999;
    }
    .ai-editor-hover:not(.ai-editor-selected) {
      outline: 1px dashed #93c5fd !important;
    }
    *[contenteditable="true"] {
      cursor: text !important;
      outline: 2px solid #10b981 !important;
    }
  \`;
  document.head.appendChild(style);

  // 2. 交互逻辑: 点击选择
  document.body.addEventListener('click', (e) => {
    // 如果正在编辑文字，允许默认行为
    if (e.target.isContentEditable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 取消之前的选中
    if (selectedEl && selectedEl !== e.target) {
       deselect();
    }

    const target = e.target;
    // 不允许选中 body 或 html
    if (target === document.body || target === document.documentElement) {
        deselect();
        return;
    }

    selectElement(target);
  }, true); // Use capture to ensure we get it first

  // 3. 交互逻辑: 双击编辑文字
  document.body.addEventListener('dblclick', (e) => {
     e.preventDefault();
     e.stopPropagation();
     if (selectedEl) {
         selectedEl.contentEditable = 'true';
         selectedEl.focus();
         // 监听失焦，保存修改
         const onBlur = () => {
             selectedEl.contentEditable = 'false';
             selectedEl.removeEventListener('blur', onBlur);
         };
         selectedEl.addEventListener('blur', onBlur);
     }
  });

  // 辅助函数: 选中元素
  function selectElement(el) {
      selectedEl = el;
      selectedEl.classList.add('ai-editor-selected');
      
      // 获取当前样式发送给父组件
      const comp = window.getComputedStyle(selectedEl);
      window.parent.postMessage({ 
          type: 'SELECTED', 
          tagName: selectedEl.tagName,
          color: comp.color,
          fontSize: comp.fontSize,
          zIndex: comp.zIndex
      }, '*');
  }

  // 辅助函数: 取消选中
  function deselect() {
      if (selectedEl) {
         selectedEl.classList.remove('ai-editor-selected');
         selectedEl.contentEditable = 'false';
         selectedEl = null;
         window.parent.postMessage({ type: 'DESELECT' }, '*');
      }
  }

  // 4. 消息监听: 接收父组件指令
  window.addEventListener('message', (event) => {
    const { action, value } = event.data;
    
    // 获取最新 HTML (Clean up selection first)
    if (action === 'GET_HTML') {
        const wasSelected = selectedEl;
        if (selectedEl) selectedEl.classList.remove('ai-editor-selected');
        
        // Remove contenteditable attributes to clean up
        const editables = document.querySelectorAll('*[contenteditable]');
        editables.forEach(el => el.removeAttribute('contenteditable'));

        const cleanHtml = document.documentElement.outerHTML;
        
        // Restore selection if needed (optional, UX choice)
        if (wasSelected) wasSelected.classList.add('ai-editor-selected');
        
        window.parent.postMessage({ type: 'HTML_RESULT', html: cleanHtml }, '*');
        return;
    }

    if (!selectedEl) return;

    if (action === 'UPDATE_STYLE') {
        Object.assign(selectedEl.style, value);
    } else if (action === 'DELETE') {
        selectedEl.remove();
        deselect();
    } else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.position = 'relative'; // Ensure z-index works
    }
  });

  // 5. 拖拽逻辑 (CSS Transform)
  document.body.addEventListener('mousedown', (e) => {
    if (!selectedEl || e.target !== selectedEl) return;
    if (selectedEl.isContentEditable) return; // Don't drag if editing text

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // 解析当前的 transform
    const transform = selectedEl.style.transform;
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
    const scale = window.parent.visualEditorScale || 1; // 尝试获取外部缩放比例，如果无法获取则默认为1
    
    // 注意：这里我们假设外部有缩放，内部移动量需要除以缩放比例
    // 但由于iframe隔离，直接取client差值通常在视觉上是匹配的，除非iframe自身被scale了
    // 这里的 dx dy 是 iframe 内部的像素，直接映射到 transform 即可
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    selectedEl.style.transform = \`translate(\${initialTransformX + dx}px, \${initialTransformY + dy}px)\`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

})();
</script>
`;

export const VisualEditor: React.FC<VisualEditorProps> = ({ initialHtml, onSave, scale = 1 }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [selectedElement, setSelectedElement] = useState<{
        tagName: string;
        color: string;
        fontSize: string;
        zIndex: string;
    } | null>(null);

    // Communicate scale to iframe window if possible (tricky cross-origin, but same origin here)
    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            // @ts-ignore
            iframeRef.current.contentWindow.visualEditorScale = scale;
        }
    }, [scale]);

    // Initial Load
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                // Inject the content + script
                doc.write(initialHtml + EDITOR_SCRIPT);
                doc.close();
            }
        }
    }, [initialHtml]);

    // Message Listener
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'SELECTED') {
                setSelectedElement({
                    tagName: e.data.tagName,
                    color: e.data.color,
                    fontSize: e.data.fontSize,
                    zIndex: e.data.zIndex
                });
            } else if (e.data.type === 'DESELECT') {
                setSelectedElement(null);
            } else if (e.data.type === 'HTML_RESULT') {
                // Strip the injected script before saving
                let cleanHtml = e.data.html;
                const scriptStart = cleanHtml.indexOf('<script>');
                // Simple heuristic to remove the appended script. 
                // A better way is using DOMParser but regex is faster for this specific appended block.
                cleanHtml = cleanHtml.replace(EDITOR_SCRIPT.trim(), '');
                // Also remove the specific injected style tag if present (optional)
                
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

    const requestSave = () => {
        sendCommand('GET_HTML');
    };

    // --- Toolbar Actions ---
    const handleColorChange = (color: string) => sendCommand('UPDATE_STYLE', { color });
    const handleFontSizeChange = (delta: number) => {
        if (!selectedElement) return;
        const currentSize = parseInt(selectedElement.fontSize) || 16;
        sendCommand('UPDATE_STYLE', { fontSize: `${currentSize + delta}px` });
        setSelectedElement(prev => prev ? { ...prev, fontSize: `${currentSize + delta}px` } : null);
    };
    const handleDelete = () => {
        sendCommand('DELETE');
        setSelectedElement(null);
    };
    const handleLayer = (direction: 'up' | 'down') => sendCommand('LAYER', direction);

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Floating Toolbar */}
            {selectedElement && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{selectedElement.tagName}</span>
                    </div>

                    {/* Font Size */}
                    <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200">
                        <button onClick={() => handleFontSizeChange(-2)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-600 font-bold">-</button>
                        <span className="text-xs w-8 text-center font-mono">{parseInt(selectedElement.fontSize)}</span>
                        <button onClick={() => handleFontSizeChange(2)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-600 font-bold">+</button>
                    </div>

                    {/* Color Palette */}
                    <div className="flex items-center gap-1">
                        {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'].map(c => (
                            <button
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform shadow-sm"
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* Layers */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleLayer('up')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="置于顶层">
                            <ArrowRightIcon className="w-4 h-4 -rotate-90" />
                        </button>
                        <button onClick={() => handleLayer('down')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="置于底层">
                             <ArrowRightIcon className="w-4 h-4 rotate-90" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* Delete */}
                    <button onClick={handleDelete} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="删除元素 (Del)">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-200 flex items-center justify-center">
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
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
                
                {/* Save Prompt Overlay (Optional, if we want manual save trigger outside toolbar) */}
                <div className="absolute bottom-6 right-6">
                    <button 
                        onClick={requestSave}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-lg transition-all active:scale-95"
                    >
                        <CheckIcon className="w-5 h-5" /> 保存修改
                    </button>
                </div>
            </div>
        </div>
    );
};
