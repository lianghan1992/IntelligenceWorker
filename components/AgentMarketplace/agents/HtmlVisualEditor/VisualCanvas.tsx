
import React, { useEffect, useRef, useState } from 'react';
import { 
    TrashIcon, ArrowRightIcon, PlusIcon, RefreshIcon, 
    CheckIcon, CloseIcon, CubeIcon, DocumentTextIcon, 
    PhotoIcon, ViewGridIcon, PencilIcon
} from '../../../../components/icons';

interface VisualCanvasProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    onContentChange?: (newHtml: string) => void; 
}

// 模拟图标组件，用于属性面板
const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;

// --- 右侧属性面板组件 ---
interface PropertiesPanelProps {
    element: any;
    onUpdateStyle: (key: string, value: string) => void;
    onUpdateContent: (text: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdateStyle, onUpdateContent, onDelete, onClose }) => {
    if (!element) return null;

    // Helper to parse "px" values to numbers for inputs
    const parseVal = (val: string) => parseInt(val) || 0;

    return (
        <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">
                        {element.tagName}
                    </span>
                    <span className="text-sm font-bold text-slate-700">属性编辑</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                
                {/* 1. 内容编辑 (仅针对含文本的元素) */}
                {(element.tagName !== 'IMG' && element.tagName !== 'HR' && element.tagName !== 'BR') && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <DocumentTextIcon className="w-3.5 h-3.5" /> 文本内容
                        </h4>
                        <textarea 
                            value={element.content || ''}
                            onChange={(e) => onUpdateContent(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 resize-y min-h-[80px]"
                            placeholder="输入文本内容..."
                        />
                    </div>
                )}

                <div className="h-px bg-slate-100"></div>

                {/* 2. 布局与位置 */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ViewGridIcon className="w-3.5 h-3.5" /> 布局与尺寸
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">宽度 (W)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={parseVal(element.width)} 
                                    onChange={(e) => onUpdateStyle('width', `${e.target.value}px`)}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"
                                />
                                <span className="absolute right-2 top-1.5 text-xs text-slate-400">px</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">高度 (H)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={parseVal(element.height)} 
                                    onChange={(e) => onUpdateStyle('height', `${e.target.value}px`)}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"
                                />
                                <span className="absolute right-2 top-1.5 text-xs text-slate-400">px</span>
                            </div>
                        </div>
                    </div>
                    <div>
                         <label className="text-[10px] text-slate-500 font-medium mb-1 block">Display</label>
                         <select 
                            value={element.display || 'block'} 
                            onChange={(e) => onUpdateStyle('display', e.target.value)}
                            className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white focus:border-indigo-500 outline-none"
                         >
                             <option value="block">Block (块级)</option>
                             <option value="inline-block">Inline Block</option>
                             <option value="flex">Flex (弹性布局)</option>
                             <option value="grid">Grid (网格)</option>
                             <option value="inline">Inline (行内)</option>
                         </select>
                    </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                {/* 3. 字体排版 */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <PencilIcon className="w-3.5 h-3.5" /> 字体排版
                    </h4>
                    
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">颜色</label>
                            <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                                <div className="w-4 h-4 rounded border border-slate-200" style={{backgroundColor: element.color}}></div>
                                <input 
                                    type="text" 
                                    value={element.color} 
                                    onChange={(e) => onUpdateStyle('color', e.target.value)}
                                    className="w-full text-xs outline-none uppercase font-mono text-slate-600"
                                />
                            </div>
                         </div>
                         <div className="w-12 pt-5">
                            <button 
                                onClick={() => onUpdateStyle('fontWeight', element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'normal' : 'bold')}
                                className={`w-full h-[34px] border rounded-md flex items-center justify-center font-bold font-serif transition-colors ${element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                B
                            </button>
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">大小 (px)</label>
                             <input 
                                type="number" 
                                value={parseVal(element.fontSize)} 
                                onChange={(e) => onUpdateStyle('fontSize', `${e.target.value}px`)}
                                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">对齐</label>
                            <div className="flex border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                                {['left', 'center', 'right'].map((align) => (
                                    <button 
                                        key={align}
                                        onClick={() => onUpdateStyle('textAlign', align)}
                                        className={`flex-1 py-1.5 flex justify-center hover:bg-white transition-colors ${element.textAlign === align ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        {align === 'left' && <AlignLeftIcon className="w-4 h-4"/>}
                                        {align === 'center' && <AlignCenterIcon className="w-4 h-4"/>}
                                        {align === 'right' && <AlignRightIcon className="w-4 h-4"/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                {/* 4. 外观样式 */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <CubeIcon className="w-3.5 h-3.5" /> 外观样式
                    </h4>
                    
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">背景颜色</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                            <div className="w-4 h-4 rounded border border-slate-200" style={{backgroundColor: element.backgroundColor}}></div>
                            <input 
                                type="text" 
                                value={element.backgroundColor} 
                                onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                className="w-full text-xs outline-none uppercase font-mono text-slate-600"
                                placeholder="TRANSPARENT"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">圆角 (Radius)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={parseVal(element.borderRadius)} 
                                    onChange={(e) => onUpdateStyle('borderRadius', `${e.target.value}px`)}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"
                                />
                                <span className="absolute right-2 top-1.5 text-xs text-slate-400">px</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">内边距 (Padding)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={parseVal(element.padding)} 
                                    onChange={(e) => onUpdateStyle('padding', `${e.target.value}px`)}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none pl-2"
                                />
                                <span className="absolute right-2 top-1.5 text-xs text-slate-400">px</span>
                            </div>
                        </div>
                    </div>

                    <div>
                         <label className="text-[10px] text-slate-500 font-medium mb-1 block">边框 (Border)</label>
                         <div className="flex gap-2">
                             <div className="w-16 relative">
                                <input 
                                    type="number" 
                                    value={parseVal(element.borderWidth)} 
                                    onChange={(e) => onUpdateStyle('borderWidth', `${e.target.value}px`)}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 outline-none"
                                />
                                <span className="absolute right-1 top-1.5 text-xs text-slate-400">px</span>
                             </div>
                             <div className="flex-1 border border-slate-200 rounded-md bg-white flex items-center px-2">
                                <div className="w-3 h-3 rounded-full border border-slate-300 mr-2" style={{backgroundColor: element.borderColor}}></div>
                                <input 
                                    type="text" 
                                    value={element.borderColor} 
                                    onChange={(e) => onUpdateStyle('borderColor', e.target.value)}
                                    className="w-full text-xs outline-none font-mono text-slate-600"
                                    placeholder="Color"
                                />
                             </div>
                             <select 
                                value={element.borderStyle || 'solid'}
                                onChange={(e) => onUpdateStyle('borderStyle', e.target.value)}
                                className="w-20 border border-slate-200 rounded-md text-xs bg-white focus:border-indigo-500 outline-none"
                             >
                                 <option value="solid">Solid</option>
                                 <option value="dashed">Dashed</option>
                                 <option value="dotted">Dotted</option>
                                 <option value="none">None</option>
                             </select>
                         </div>
                    </div>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button 
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm"
                >
                    <TrashIcon className="w-4 h-4" /> 删除元素
                </button>
            </div>
        </div>
    );
};

// 注入到 iframe 内部的编辑器引擎脚本
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
  
  // Initialize scale
  window.visualEditorScale = 1;

  // 1. Inject Editor Styles (Includes Resizer Styles)
  const style = document.createElement('style');
  style.innerHTML = \`
    html, body {
        min-height: 100vh !important;
        margin: 0;
        background-color: #ffffff;
    }
    
    .ai-editor-selected { 
      outline: 2px solid #3b82f6 !important; 
      outline-offset: 0px;
      cursor: move !important; 
      z-index: 9999;
      position: relative; /* Ensure resizers position correctly */
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
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

    /* Resizer Handles */
    .ai-resizer {
        position: absolute;
        width: 8px;
        height: 8px;
        background: white;
        border: 1px solid #3b82f6;
        z-index: 10000;
        border-radius: 50%;
    }
    .ai-resizer:hover { background: #3b82f6; }
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

  // --- Helper: Push History ---
  function pushHistory() {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (!selectedEl) return;
        
        // Cleanup selection markers before serializing
        const wasSelected = selectedEl;
        deselect(true); // temporary deselect, keep var

        const cleanHtml = document.documentElement.outerHTML;
        
        // Restore selection visual
        selectElement(wasSelected);

        window.parent.postMessage({ type: 'HISTORY_UPDATE', html: cleanHtml }, '*');
      }, 50);
  }

  // --- Resizer Logic ---
  function createResizers(el) {
      // Remove existing resizers first
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
      const existing = document.querySelectorAll('.ai-resizer');
      existing.forEach(r => r.remove());
  }

  // 2. Interaction: Click to Select
  document.body.addEventListener('click', (e) => {
    // If clicking a resizer, ignore selection logic
    if (e.target.classList.contains('ai-resizer')) return;
    if (e.target.isContentEditable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Check if clicking same element
    if (selectedEl === e.target) return;

    if (selectedEl && selectedEl !== e.target) {
       deselect();
    }

    const target = e.target;
    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect();
        return;
    }

    selectElement(target);
  }, true);

  // Hover Effects
  document.body.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('ai-resizer')) return;
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
     if (selectedEl && !e.target.classList.contains('ai-resizer')) {
         // Remove drag handles while editing text
         removeResizers();
         selectedEl.contentEditable = 'true';
         selectedEl.focus();
         const onBlur = () => {
             selectedEl.contentEditable = 'false';
             selectedEl.removeEventListener('blur', onBlur);
             // Re-add handles
             createResizers(selectedEl);
             pushHistory(); 
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
              selectedEl = null; // Clear ref immediately
              window.parent.postMessage({ type: 'DESELECT' }, '*');
              pushHistory(); 
          }
      }
      if (e.key === 'Escape') {
          deselect();
      }
  });

  function selectElement(el) {
      if (selectedEl && selectedEl !== el) deselect();
      
      selectedEl = el;
      selectedEl.classList.remove('ai-editor-hover');
      selectedEl.classList.add('ai-editor-selected');
      
      // Add resize handles
      createResizers(selectedEl);
      
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
          content: selectedEl.innerText,
          color: comp.color,
          fontSize: comp.fontSize,
          fontWeight: comp.fontWeight,
          textAlign: comp.textAlign,
          letterSpacing: comp.letterSpacing,
          width: comp.width,
          height: comp.height,
          display: comp.display,
          backgroundColor: comp.backgroundColor,
          borderRadius: comp.borderRadius,
          padding: comp.padding,
          borderWidth: comp.borderWidth,
          borderColor: comp.borderColor,
          borderStyle: comp.borderStyle,
          zIndex: comp.zIndex,
          scale: currentScale,
      }, '*');
  }

  function deselect(temporary = false) {
      if (selectedEl) {
         selectedEl.classList.remove('ai-editor-selected');
         selectedEl.contentEditable = 'false';
         removeResizers(); // Clean handles
         if (!temporary) {
             selectedEl = null;
             window.parent.postMessage({ type: 'DESELECT' }, '*');
         }
      }
  }

  // 4. Message Listener (Parent -> Iframe)
  window.addEventListener('message', (event) => {
    const { action, value } = event.data;
    
    if (action === 'UPDATE_SCALE') {
        window.visualEditorScale = value;
        return;
    }

    if (action === 'GET_HTML') {
        const wasSelected = selectedEl;
        if (selectedEl) deselect(true);
        const editables = document.querySelectorAll('*[contenteditable]');
        editables.forEach(el => el.removeAttribute('contenteditable'));
        
        // Ensure no resizers
        removeResizers();

        const cleanHtml = document.documentElement.outerHTML;
        
        if (wasSelected) selectElement(wasSelected);
        window.parent.postMessage({ type: 'HTML_RESULT', html: cleanHtml }, '*');
        return;
    }

    if (!selectedEl) return;

    // --- Content Update ---
    if (action === 'UPDATE_CONTENT') {
        selectedEl.innerText = value;
        pushHistory();
        return;
    }

    // --- Style Updates ---
    if (action === 'UPDATE_STYLE') {
        Object.assign(selectedEl.style, value);
        pushHistory(); 
    } 
    else if (action === 'UPDATE_TRANSFORM') {
        const currentTransform = selectedEl.style.transform || '';
        let translatePart = 'translate(0px, 0px)';
        const translateMatch = currentTransform.match(/translate\\((.*)px,\\s*(.*)px\\)/);
        if (translateMatch) translatePart = translateMatch[0];
        selectedEl.style.transform = \`\${translatePart} scale(\${value})\`;
        pushHistory();
    }
    else if (action === 'RESET_STYLE') {
        selectedEl.style = ''; // Reset all inline styles
        createResizers(selectedEl); // Re-add resizers if needed
        pushHistory();
    }
    else if (action === 'DELETE') {
        selectedEl.remove();
        deselect();
        pushHistory();
    } 
    else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        selectedEl.style.position = 'relative'; 
        pushHistory();
    }
  });

  // 5. Drag & Resize Logic
  document.body.addEventListener('mousedown', (e) => {
    // Check if resizing
    if (e.target.classList.contains('ai-resizer')) {
        if (!selectedEl) return;
        isResizing = true;
        resizeHandle = e.target.dataset.handle;
        startX = e.clientX;
        startY = e.clientY;
        const rect = selectedEl.getBoundingClientRect();
        // Store logical dimensions (without scale effects if possible, but getComputedStyle handles it)
        initialWidth = parseFloat(window.getComputedStyle(selectedEl).width);
        initialHeight = parseFloat(window.getComputedStyle(selectedEl).height);
        e.stopPropagation();
        e.preventDefault();
        return;
    }

    if (!selectedEl || e.target !== selectedEl) return;
    if (selectedEl.isContentEditable) return; 

    // Start Drag
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
    const scale = window.visualEditorScale || 1; 

    if (isResizing && selectedEl) {
        e.preventDefault();
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        
        let newWidth = initialWidth;
        let newHeight = initialHeight;

        // Simple resizing logic (width/height only for now)
        if (resizeHandle.includes('e')) newWidth = initialWidth + dx;
        if (resizeHandle.includes('s')) newHeight = initialHeight + dy;
        if (resizeHandle.includes('w')) newWidth = initialWidth - dx; // Note: simplified, better with translate adjustment
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

    selectedEl.style.transform = \`translate(\${initialTransformX + dx}px, \${initialTransformY + dy}px) \${scalePart}\`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        pushHistory(); // Save after operation ends
    }
  });

})();
</script>
`;

export const VisualCanvas: React.FC<VisualCanvasProps> = ({ initialHtml, onSave, onContentChange }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    
    // --- Key Fix: Prevent re-rendering iframe on internal updates ---
    // Track if the current update request comes from the iframe itself (e.g., drag event)
    const isInternalUpdate = useRef(false);
    
    const [selectedElement, setSelectedElement] = useState<any>(null);

    // Auto fit scale logic
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const baseWidth = 1600;
                const baseHeight = 900;
                const wRatio = (clientWidth - 40) / baseWidth; 
                const hRatio = (clientHeight - 40) / baseHeight;
                const newScale = Math.min(wRatio, hRatio);
                
                setScale(newScale);

                if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({ action: 'UPDATE_SCALE', value: newScale }, '*');
                }
            }
        };
        
        window.addEventListener('resize', updateScale);
        setTimeout(updateScale, 100);
        setTimeout(updateScale, 500);
        
        return () => window.removeEventListener('resize', updateScale);
    }, [selectedElement]); 

    // Load Content
    useEffect(() => {
        // If this update was triggered by the iframe itself (via history update), do NOT reload the iframe.
        // This prevents the "flash" and loss of selection state.
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        const iframe = iframeRef.current;
        if (iframe) {
            const doc = iframe.contentDocument;
            if (doc) {
                doc.open();
                let content = initialHtml || '';
                // Ensure basic structure
                if (!content.toLowerCase().includes('<html')) {
                     content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>html, body { min-height: 100vh; margin: 0; background: white; }</style></head><body>${content}</body></html>`;
                }
                // Inject script
                if (content.toLowerCase().includes('</body>')) {
                    content = content.replace(/<\/body>/i, `${EDITOR_SCRIPT}</body>`);
                } else {
                     content += EDITOR_SCRIPT;
                }
                try {
                    doc.write(content);
                    doc.close();
                } catch (err) {
                    console.error("VisualEditor: Failed to render content", err);
                }
            }
        }
    }, [initialHtml]);

    // Handle Messages from Iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'SELECTED') {
                setSelectedElement(e.data);
            } else if (e.data.type === 'DESELECT') {
                setSelectedElement(null);
            } else if (e.data.type === 'HTML_RESULT') {
                let cleanHtml = e.data.html;
                cleanHtml = cleanHtml.replace(EDITOR_SCRIPT.trim(), '');
                onSave(cleanHtml);
            } else if (e.data.type === 'HISTORY_UPDATE') {
                // IMPORTANT: Mark this as an internal update so the subsequent prop change doesn't reload iframe
                isInternalUpdate.current = true;
                
                let cleanHtml = e.data.html;
                cleanHtml = cleanHtml.replace(EDITOR_SCRIPT.trim(), '');
                if (onContentChange) onContentChange(cleanHtml);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onSave, onContentChange]);

    const sendCommand = (action: string, value?: any) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ action, value }, '*');
        }
    };

    // --- Panel Handlers ---
    // When panel updates style, it's also an "internal-like" flow: 
    // Parent UI -> Iframe DOM -> Iframe History -> Parent State.
    // The `useEffect` guard above handles the loop back.
    const handleUpdateStyle = (key: string, value: string | number) => {
        sendCommand('UPDATE_STYLE', { [key]: value });
        // Optimistic update for UI panel
        setSelectedElement((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleUpdateContent = (text: string) => {
        sendCommand('UPDATE_CONTENT', text);
        setSelectedElement((prev: any) => ({ ...prev, content: text }));
    };

    const handleDelete = () => {
        sendCommand('DELETE');
        setSelectedElement(null);
    };

    return (
        <div className="flex w-full h-full relative overflow-hidden bg-slate-200">
            
            {/* Main Canvas Area */}
            <div 
                ref={containerRef} 
                className="flex-1 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300"
            >
                {/* Floating Toolbar (保留用于快速操作) */}
                {selectedElement && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-200 px-4 py-2 flex items-center gap-4 z-40 animate-in fade-in slide-in-from-top-4 select-none">
                         <span className="text-xs font-bold text-slate-500 uppercase">{selectedElement.tagName}</span>
                         <div className="h-4 w-px bg-slate-200"></div>
                         <div className="flex gap-2">
                             <button onClick={() => sendCommand('LAYER', 'up')} className="text-slate-500 hover:text-indigo-600" title="上移一层">
                                 <ArrowRightIcon className="w-4 h-4 -rotate-90"/>
                             </button>
                             <button onClick={() => sendCommand('LAYER', 'down')} className="text-slate-500 hover:text-indigo-600" title="下移一层">
                                 <ArrowRightIcon className="w-4 h-4 rotate-90"/>
                             </button>
                         </div>
                         <div className="h-4 w-px bg-slate-200"></div>
                         <button onClick={handleDelete} className="text-red-500 hover:text-red-600" title="删除">
                             <TrashIcon className="w-4 h-4"/>
                         </button>
                    </div>
                )}

                {/* Canvas */}
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
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms" 
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

            {/* Right Properties Panel */}
            {selectedElement && (
                <PropertiesPanel 
                    element={selectedElement}
                    onUpdateStyle={handleUpdateStyle}
                    onUpdateContent={handleUpdateContent}
                    onDelete={handleDelete}
                    onClose={() => { sendCommand('DESELECT_FORCE'); setSelectedElement(null); }}
                />
            )}
        </div>
    );
};
