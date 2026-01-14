
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
    TrashIcon, CloseIcon, DocumentTextIcon, 
    PhotoIcon, ViewGridIcon, PencilIcon, 
    LinkIcon
} from '../../../../components/icons';

// --- Local Icons for Property Panel ---
const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;

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

interface PropertiesPanelProps {
    element: any;
    onUpdateStyle: (key: string, value: string) => void;
    onUpdateContent: (text: string) => void;
    onUpdateAttribute: (key: string, value: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdateStyle, onUpdateContent, onUpdateAttribute, onDelete, onClose }) => {
    if (!element) return null;
    const parseVal = (val: string) => parseInt(val) || 0;
    const parseFontSize = (val: string) => parseInt(val) || 16;
    
    // Note: The element might be an IMG tag or a DIV wrapper containing an IMG.
    // If we select the wrapper, we want to edit the image inside.
    const isImg = element.tagName === 'IMG' || (element.tagName === 'DIV' && element.hasImgChild);

    return (
        <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">{element.tagName}</span>
                    <span className="text-xs font-bold text-slate-700">属性</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                {(!isImg && element.tagName !== 'HR' && element.tagName !== 'BR') && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><DocumentTextIcon className="w-3 h-3" /> 内容</h4>
                        <textarea 
                            value={element.content || ''}
                            onChange={(e) => onUpdateContent(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 resize-y min-h-[60px]"
                        />
                    </div>
                )}
                
                {isImg && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PhotoIcon className="w-3 h-3" /> 源</h4>
                        <div>
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">URL</label>
                             <input 
                                type="text" 
                                value={element.src || ''} 
                                onChange={(e) => onUpdateAttribute('src', e.target.value)} 
                                className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:border-indigo-500 outline-none bg-slate-50 text-slate-600"
                                placeholder="https://..."
                             />
                        </div>
                    </div>
                )}

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ViewGridIcon className="w-3 h-3" /> 尺寸</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">宽</label>
                            <input type="number" value={parseVal(element.width)} onChange={(e) => onUpdateStyle('width', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:border-indigo-500 outline-none"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">高</label>
                            <input type="number" value={parseVal(element.height)} onChange={(e) => onUpdateStyle('height', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:border-indigo-500 outline-none"/>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PencilIcon className="w-3 h-3" /> 样式</h4>
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1.5 block">颜色</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                            <div className="w-4 h-4 rounded border border-slate-200" style={{backgroundColor: element.color || '#000'}}></div>
                            <input type="color" value={element.color || '#000000'} onChange={(e) => onUpdateStyle('color', e.target.value)} className="w-6 h-6 opacity-0 absolute cursor-pointer"/>
                            <input type="text" value={element.color} onChange={(e) => onUpdateStyle('color', e.target.value)} className="flex-1 text-[10px] outline-none uppercase font-mono text-slate-600"/>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                         <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1.5 block">字号 (px)</label>
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white h-8">
                                <button 
                                    onClick={() => onUpdateStyle('fontSize', `${Math.max(1, parseFontSize(element.fontSize) - 2)}px`)}
                                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-r border-slate-100 active:bg-slate-100"
                                    title="减小字号"
                                >
                                    -
                                </button>
                                <input 
                                    type="number" 
                                    value={parseFontSize(element.fontSize)} 
                                    onChange={(e) => onUpdateStyle('fontSize', `${e.target.value}px`)} 
                                    className="flex-1 w-full text-center text-xs font-bold text-slate-700 outline-none h-full appearance-none"
                                />
                                <button 
                                    onClick={() => onUpdateStyle('fontSize', `${parseFontSize(element.fontSize) + 2}px`)}
                                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors border-l border-slate-100 active:bg-slate-100"
                                    title="增大字号"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="w-1/3">
                             <label className="text-[10px] text-slate-500 font-medium mb-1.5 block">字重</label>
                             <button onClick={() => onUpdateStyle('fontWeight', element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'normal' : 'bold')} className={`w-full h-8 border rounded-lg font-bold text-xs flex items-center justify-center transition-all ${element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                                B
                             </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1.5 block">对齐</label>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            {['left', 'center', 'right', 'justify'].map((align) => (
                                <button key={align} onClick={() => onUpdateStyle('textAlign', align)} className={`flex-1 py-1.5 flex justify-center hover:bg-white transition-colors ${element.textAlign === align ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-400'}`}>
                                    {align === 'left' && <AlignLeftIcon className="w-3.5 h-3.5"/>}
                                    {align === 'center' && <AlignCenterIcon className="w-3.5 h-3.5"/>}
                                    {align === 'right' && <AlignRightIcon className="w-3.5 h-3.5"/>}
                                    {align === 'justify' && <span className="text-[9px] font-bold">≡</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-2">
                     <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PhotoIcon className="w-3 h-3" /> 背景与边框</h4>
                     <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">背景色</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                            <div className="w-4 h-4 rounded border border-slate-200" style={{backgroundColor: element.backgroundColor || 'transparent'}}></div>
                            <input type="color" value={element.backgroundColor || '#ffffff'} onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)} className="w-6 h-6 opacity-0 absolute cursor-pointer"/>
                            <input type="text" value={element.backgroundColor} onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)} className="flex-1 text-[10px] outline-none uppercase font-mono text-slate-600" placeholder="NONE"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">圆角</label>
                            <input type="number" value={parseVal(element.borderRadius)} onChange={(e) => onUpdateStyle('borderRadius', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:border-indigo-500 outline-none"/>
                        </div>
                        <div>
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">不透明度</label>
                             <input type="number" min="0" max="1" step="0.1" value={element.opacity !== undefined ? element.opacity : 1} onChange={(e) => onUpdateStyle('opacity', e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:border-indigo-500 outline-none"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-bold text-xs">
                    <TrashIcon className="w-3.5 h-3.5" /> 删除元素
                </button>
            </div>
        </div>
    );
};

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
    
    // Check if clicked element is part of current selection or its wrapper
    if (selectedEl && (selectedEl === e.target || selectedEl.contains(e.target))) return;

    if (selectedEl && selectedEl !== e.target) deselect();
    
    let target = e.target;
    
    // --- Auto-wrap IMG for resizing ---
    if (target.tagName === 'IMG') {
        if (target.parentElement && target.parentElement.classList.contains('ai-img-wrapper')) {
             target = target.parentElement;
        } else {
             // Create wrapper for the image to enable resizing/selection handles
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             
             // Copy computed positioning styles to wrapper
             const comp = window.getComputedStyle(target);
             const width = target.offsetWidth;
             const height = target.offsetHeight;
             
             wrapper.style.display = comp.display === 'inline' ? 'inline-block' : comp.display;
             wrapper.style.position = comp.position === 'static' ? 'relative' : comp.position;
             wrapper.style.left = comp.left;
             wrapper.style.top = comp.top;
             wrapper.style.right = comp.right;
             wrapper.style.bottom = comp.bottom;
             wrapper.style.margin = comp.margin;
             wrapper.style.transform = comp.transform;
             wrapper.style.zIndex = comp.zIndex;
             wrapper.style.width = width + 'px';
             wrapper.style.height = height + 'px';
             
             // Reset img to fill wrapper
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
    // ---------------------------------------

    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect(); return;
    }
    selectElement(target);
  }, true);

  document.body.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('ai-resizer') || e.target === document.body || e.target === document.documentElement || e.target.id === 'canvas' || e.target === selectedEl) return;
      // Hover effect on wrapper if hovering img inside
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
      
      // If wrapper, get img src
      let imgSrc = selectedEl.getAttribute('src');
      let hasImgChild = false;
      if (selectedEl.classList.contains('ai-img-wrapper')) {
          const img = selectedEl.querySelector('img');
          if (img) {
              imgSrc = img.getAttribute('src');
              hasImgChild = true;
          }
      }

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
          src: imgSrc,
          hasImgChild: hasImgChild,
          opacity: comp.opacity
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
    if (action === 'INSERT_ELEMENT') {
        if (value.type === 'img') {
             // Create Wrapper DIV instead of IMG directly
             const wrapper = document.createElement('div');
             wrapper.className = 'ai-img-wrapper';
             wrapper.style.position = 'absolute';
             wrapper.style.left = '50px';
             wrapper.style.top = '50px';
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
             img.onerror = function() {
                 console.error('Image failed to load');
             }
             img.src = value.src;
        }
        return;
    }
    
    if (!selectedEl) return;
    if (action === 'UPDATE_CONTENT') { selectedEl.innerText = value; pushHistory(); return; }
    if (action === 'UPDATE_STYLE') { Object.assign(selectedEl.style, value); pushHistory(); } 
    else if (action === 'UPDATE_ATTRIBUTE') { 
        if (value.key === 'src' && selectedEl.classList.contains('ai-img-wrapper')) {
            const img = selectedEl.querySelector('img');
            if (img) img.src = value.val;
        } else {
            selectedEl.setAttribute(value.key, value.val); 
        }
        pushHistory(); 
    }
    else if (action === 'DELETE') { selectedEl.remove(); deselect(); pushHistory(); } 
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
             clone.style.transform = 'translate(20px, 20px)';
        }
        selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
        selectElement(clone);
        pushHistory();
    }
    else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        // Only set position relative if it's static, to make z-index work. 
        // But for inserted images (absolute), we keep absolute.
        if (window.getComputedStyle(selectedEl).position === 'static') {
             selectedEl.style.position = 'relative'; 
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
        initialWidth = parseFloat(window.getComputedStyle(selectedEl).width);
        initialHeight = parseFloat(window.getComputedStyle(selectedEl).height);
        
        // Capture initial transform for Top/Left resizing
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
    
    // FIX: Allow dragging if clicking on the selected element OR its children (like img inside wrapper)
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
        let newX = window.initialTransformX;
        let newY = window.initialTransformY;

        // Logic for Resizing
        if (resizeHandle.includes('e')) newWidth = initialWidth + dx;
        if (resizeHandle.includes('s')) newHeight = initialHeight + dy;
        
        if (resizeHandle.includes('w')) {
            newWidth = initialWidth - dx;
            newX += dx;
        }
        if (resizeHandle.includes('n')) {
            newHeight = initialHeight - dy;
            newY += dy;
        }
        
        // Ensure minimum size
        if (newWidth > 10) {
            selectedEl.style.width = \`\${newWidth}px\`;
             // Only update position if we are resizing left/top and size allows it
             if (resizeHandle.includes('w')) {
                 // We need to keep transform sync
             }
        }
        if (newHeight > 10) {
            selectedEl.style.height = \`\${newHeight}px\`;
        }
        
        // Update Transform if N/W resizing
        if (resizeHandle.includes('w') || resizeHandle.includes('n')) {
             // Retrieve existing scale if any
            const currentTransform = selectedEl.style.transform || '';
            let scalePart = '';
            const scaleMatch = currentTransform.match(/scale\\(([^)]+)\\)/);
            if (scaleMatch) scalePart = scaleMatch[0];
            
            // Only update transform if size update was valid (min width check)
            if ((resizeHandle.includes('w') && newWidth > 10) || (resizeHandle.includes('n') && newHeight > 10)) {
                 selectedEl.style.transform = \`translate(\${newX}px, \${newY}px) \${scalePart}\`;
            }
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

export const VisualCanvas = forwardRef<VisualCanvasHandle, VisualCanvasProps>(({ initialHtml, onSave, scale, onScaleChange, onSelectionChange }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Removed duplicate useHistory hook here. State is now fully managed by parent.
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
        deselect: () => sendCommand('DESELECT_FORCE')
    }));

    // Initial Load & External Updates (e.g. from parent undo/redo)
    useEffect(() => {
        if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
        // We trust initialHtml from parent is the source of truth

        const iframe = iframeRef.current;
        if (iframe) {
            const doc = iframe.contentDocument;
            if (doc) {
                // Completely rewrite iframe content when parent state changes externally
                // This handles undo/redo by restoring the exact HTML snapshot
                doc.open();
                let content = initialHtml || '';
                // Ensure wrapper for full height bg
                if (!content.toLowerCase().includes('<html')) {
                     content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><style>html, body { min-height: 100vh; margin: 0; background: white; }</style></head><body>${content}</body></html>`;
                }
                content = content.toLowerCase().includes('</body>') ? content.replace(/<\/body>/i, `${EDITOR_SCRIPT}</body>`) : content + EDITOR_SCRIPT;
                doc.write(content);
                doc.close();
            }
        }
    }, [initialHtml]);

    // Initialize scale to fit screen
    useEffect(() => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            // Target 1600x900
            const scaleX = (clientWidth - 80) / 1600; // -80 for padding
            const scaleY = (clientHeight - 80) / 900;
            const initialScale = Math.min(scaleX, scaleY, 1);
            if (onScaleChange) onScaleChange(Math.max(0.1, initialScale));
        }
    }, []); // Run once on mount

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
                // notify parent to update its history without triggering a re-render cycle back to child immediately
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
    
    // --- Actions Handlers Wrappers for Property Panel ---
    // (Used internally by PropertiesPanel)
    const handleUpdateStyle = (key: string, value: string | number) => {
        sendCommand('UPDATE_STYLE', { [key]: value });
        setSelectedElement((prev: any) => ({ ...prev, [key]: value }));
    };
    
    const handleUpdateContent = (text: string) => {
        sendCommand('UPDATE_CONTENT', text);
        setSelectedElement((prev: any) => ({ ...prev, content: text }));
    };

    const handleUpdateAttribute = (key: string, value: string) => {
        sendCommand('UPDATE_ATTRIBUTE', { key, val: value });
        setSelectedElement((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="flex w-full h-full bg-slate-200 overflow-hidden relative">
            {/* Scrollable Canvas Wrapper */}
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

            {/* Right Properties Panel */}
            {selectedElement && (
                <PropertiesPanel 
                    element={selectedElement}
                    onUpdateStyle={handleUpdateStyle}
                    onUpdateContent={handleUpdateContent}
                    onUpdateAttribute={handleUpdateAttribute}
                    onDelete={() => { sendCommand('DELETE'); setSelectedElement(null); if(onSelectionChange) onSelectionChange(null); }}
                    onClose={() => { sendCommand('DESELECT_FORCE'); setSelectedElement(null); if(onSelectionChange) onSelectionChange(null); }}
                />
            )}
        </div>
    );
});
VisualCanvas.displayName = 'VisualCanvas';
