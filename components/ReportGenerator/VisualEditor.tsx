
import React, { useEffect, useRef, useState } from 'react';
import { 
    TrashIcon, PencilIcon, CheckIcon, PlusIcon, 
    ArrowRightIcon, ChevronDownIcon, ChevronRightIcon,
    RefreshIcon
} from '../icons';

interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
}

// 注入到 iframe 内部的编辑器引擎脚本
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
  \`;
  document.head.appendChild(style);

  // 2. 交互逻辑: 点击选择
  document.body.addEventListener('click', (e) => {
    if (e.target.isContentEditable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedEl && selectedEl !== e.target) {
       deselect();
    }

    const target = e.target;
    // 禁止选中根节点
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect();
        return;
    }

    selectElement(target);
  }, true);

  // Hover 效果
  document.body.addEventListener('mouseover', (e) => {
      if (e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas') return;
      if (e.target === selectedEl) return;
      e.target.classList.add('ai-editor-hover');
  });

  document.body.addEventListener('mouseout', (e) => {
      e.target.classList.remove('ai-editor-hover');
  });

  // 3. 交互逻辑: 双击编辑文字
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
  
  // 键盘快捷键监听
  document.addEventListener('keydown', (e) => {
      if (!selectedEl) return;
      // Delete 键删除
      if (e.key === 'Delete' || e.key === 'Backspace') {
          if (!selectedEl.isContentEditable) {
              selectedEl.remove();
              deselect();
          }
      }
      // Esc 键取消选中
      if (e.key === 'Escape') {
          deselect();
      }
  });

  // 辅助函数: 选中元素
  function selectElement(el) {
      if (selectedEl) deselect();
      
      selectedEl = el;
      selectedEl.classList.remove('ai-editor-hover');
      selectedEl.classList.add('ai-editor-selected');
      
      // 解析当前 transform 中的 scale
      const transform = selectedEl.style.transform || '';
      let currentScale = 1;
      const scaleMatch = transform.match(/scale\\(([^)]+)\\)/);
      if (scaleMatch) {
          currentScale = parseFloat(scaleMatch[1]);
      }

      // 获取样式发送给父组件
      const comp = window.getComputedStyle(selectedEl);
      window.parent.postMessage({ 
          type: 'SELECTED', 
          tagName: selectedEl.tagName,
          color: comp.color,
          fontSize: comp.fontSize,
          zIndex: comp.zIndex,
          textAlign: comp.textAlign,
          fontWeight: comp.fontWeight,
          scale: currentScale
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

  // 4. 消息监听: 接收父组件指令
  window.addEventListener('message', (event) => {
    const { action, value } = event.data;
    
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
        // 专门处理 transform，因为拖拽和缩放共享这个属性
        const currentTransform = selectedEl.style.transform || '';
        // 提取现有的 translate
        let translatePart = 'translate(0px, 0px)';
        const translateMatch = currentTransform.match(/translate\\([^)]+\\)/);
        if (translateMatch) translatePart = translateMatch[0];
        
        // 组合新的 scale
        selectedEl.style.transform = \`\${translatePart} scale(\${value})\`;
    }
    else if (action === 'RESET_STYLE') {
        selectedEl.style.transform = '';
        selectedEl.style.color = '';
        selectedEl.style.fontSize = '';
        selectedEl.style.fontWeight = '';
        selectedEl.style.textAlign = '';
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

  // 5. 拖拽逻辑 (只处理 Translate)
  document.body.addEventListener('mousedown', (e) => {
    if (!selectedEl || e.target !== selectedEl) return;
    if (selectedEl.isContentEditable) return; 

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // 解析当前的 translate
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
    const scale = window.parent.visualEditorScale || 1; 
    
    const dx = (e.clientX - startX) / scale; // 修正外部缩放带来的位移偏差
    const dy = (e.clientY - startY) / scale;
    
    // 保持当前的 scale 不变
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

export const VisualEditor: React.FC<VisualEditorProps> = ({ initialHtml, onSave, scale = 1 }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [selectedElement, setSelectedElement] = useState<{
        tagName: string;
        color: string;
        fontSize: string;
        scale: number;
        textAlign: string;
        fontWeight: string;
    } | null>(null);

    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            // @ts-ignore
            iframeRef.current.contentWindow.visualEditorScale = scale;
        }
    }, [scale]);

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

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'SELECTED') {
                setSelectedElement({
                    tagName: e.data.tagName,
                    color: e.data.color,
                    fontSize: e.data.fontSize,
                    scale: e.data.scale || 1,
                    textAlign: e.data.textAlign,
                    fontWeight: e.data.fontWeight
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

    const requestSave = () => sendCommand('GET_HTML');

    // Actions
    const handleColor = (color: string) => sendCommand('UPDATE_STYLE', { color });
    
    const handleFontSize = (delta: number) => {
        if (!selectedElement) return;
        const current = parseInt(selectedElement.fontSize) || 16;
        const newVal = `${current + delta}px`;
        sendCommand('UPDATE_STYLE', { fontSize: newVal });
        setSelectedElement({ ...selectedElement, fontSize: newVal });
    };

    const handleScale = (delta: number) => {
        if (!selectedElement) return;
        const current = selectedElement.scale || 1;
        const newVal = Math.max(0.2, Math.min(3.0, parseFloat((current + delta).toFixed(1)))); // Limit scale 0.2x to 3.0x
        sendCommand('UPDATE_TRANSFORM', newVal);
        setSelectedElement({ ...selectedElement, scale: newVal });
    };

    const handleAlign = (align: 'left' | 'center' | 'right') => {
        sendCommand('UPDATE_STYLE', { textAlign: align });
        if(selectedElement) setSelectedElement({ ...selectedElement, textAlign: align });
    };

    const handleBold = () => {
        if (!selectedElement) return;
        const isBold = selectedElement.fontWeight === 'bold' || parseInt(selectedElement.fontWeight) >= 700;
        const newVal = isBold ? 'normal' : 'bold';
        sendCommand('UPDATE_STYLE', { fontWeight: newVal });
        setSelectedElement({ ...selectedElement, fontWeight: newVal });
    };

    const handleReset = () => {
        sendCommand('RESET_STYLE');
        if(selectedElement) setSelectedElement({ ...selectedElement, scale: 1, fontSize: '', fontWeight: 'normal', textAlign: 'left' });
    };

    const handleDelete = () => {
        sendCommand('DELETE');
        setSelectedElement(null);
    };

    const handleLayer = (dir: 'up' | 'down') => sendCommand('LAYER', dir);

    return (
        <div className="relative w-full h-full flex flex-col">
            
            {/* Extended Floating Toolbar */}
            {selectedElement && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 p-2.5 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 select-none ring-1 ring-black/5">
                    
                    {/* 1. Meta Info */}
                    <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">{selectedElement.tagName}</span>
                    </div>

                    {/* 2. Text Style Group */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-0.5">
                        {/* Font Size */}
                        <div className="flex items-center">
                            <button onClick={() => handleFontSize(-2)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold hover:shadow-sm text-xs">A-</button>
                            <span className="text-[10px] w-6 text-center font-mono text-slate-400">{parseInt(selectedElement.fontSize)}</span>
                            <button onClick={() => handleFontSize(2)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold hover:shadow-sm text-xs">A+</button>
                        </div>
                        
                        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                        
                        {/* Bold */}
                        <button 
                            onClick={handleBold} 
                            className={`w-7 h-7 flex items-center justify-center rounded font-serif font-bold text-xs transition-colors ${selectedElement.fontWeight === 'bold' || parseInt(selectedElement.fontWeight) >= 700 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white text-slate-500'}`}
                        >
                            B
                        </button>

                        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

                        {/* Align */}
                        <div className="flex items-center gap-0.5">
                            <button onClick={() => handleAlign('left')} className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-400 ${selectedElement.textAlign === 'left' ? 'text-indigo-600 bg-white shadow-sm' : ''}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>
                            </button>
                            <button onClick={() => handleAlign('center')} className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-400 ${selectedElement.textAlign === 'center' ? 'text-indigo-600 bg-white shadow-sm' : ''}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* 3. Scale Group */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-0.5">
                        <button onClick={() => handleScale(-0.1)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded text-slate-500 hover:shadow-sm" title="缩小">
                            <div className="w-3 h-0.5 bg-current"></div>
                        </button>
                        <span className="text-[10px] w-8 text-center font-mono text-slate-400">{Math.round(selectedElement.scale * 100)}%</span>
                        <button onClick={() => handleScale(0.1)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded text-slate-500 hover:shadow-sm" title="放大">
                            <PlusIcon className="w-3 h-3" />
                        </button>
                    </div>

                    {/* 4. Color Group */}
                    <div className="flex items-center gap-1 px-1">
                        {['#000000', '#2563EB', '#DC2626', '#F59E0B'].map(c => (
                            <button
                                key={c}
                                onClick={() => handleColor(c)}
                                className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-sm"
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* 5. Actions Group */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleLayer('up')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="上移一层">
                            <ArrowRightIcon className="w-3.5 h-3.5 -rotate-90" />
                        </button>
                        <button onClick={() => handleLayer('down')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="下移一层">
                             <ArrowRightIcon className="w-3.5 h-3.5 rotate-90" />
                        </button>
                         <button onClick={handleReset} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="重置样式">
                            <RefreshIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button onClick={handleDelete} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="删除元素 (Del)">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Canvas Container */}
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
                
                {/* Save Prompt (Bottom Right) */}
                <div className="absolute bottom-8 right-8 z-50">
                    <button 
                        onClick={requestSave}
                        className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 ring-4 ring-white/20"
                    >
                        <CheckIcon className="w-5 h-5" /> 确认修改
                    </button>
                </div>
            </div>
        </div>
    );
};
