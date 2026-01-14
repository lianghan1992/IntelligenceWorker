
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
    TrashIcon, CloseIcon, DocumentTextIcon, 
    PhotoIcon, ViewGridIcon, PencilIcon, 
    LinkIcon, RefreshIcon, ArrowIcon
} from '../icons';

// --- Local Icons ---
const BoldIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 11.81C16.36 11.23 17 10.23 17 9c0-2.21-1.79-4-4-4H7v14h7.5c2.09 0 3.5-1.75 3.5-3.88 0-1.63-1.04-3.05-2.4-3.31zM10.5 7.5H13c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-2.5V7.5zm3.5 9H10.5v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>;
const ItalicIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>;
const AlignLeftIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>;
const AlignCenterIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z"/></svg>;
const AlignRightIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>;
const LayerIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>;
const DuplicateIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>;
const SelectIcon = ({className}:{className?:string}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.6z"/></svg>;

// --- Interfaces ---
export interface VisualEditorHandle {
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

export interface VisualEditorProps {
    initialHtml: string;
    onSave: (newHtml: string) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    onSelectionChange?: (element: any) => void;
}

// --- Properties Panel ---
interface PropertiesPanelProps {
    element: any;
    onUpdateStyle: (key: string, value: string) => void;
    onUpdateContent: (text: string) => void;
    onUpdateAttribute: (key: string, value: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdateStyle, onUpdateContent, onUpdateAttribute, onDelete, onClose }) => {
    // Empty State (Persistent Panel)
    if (!element) {
        return (
            <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center z-20">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <SelectIcon className="w-6 h-6 opacity-30" />
                </div>
                <h3 className="font-bold text-slate-600 mb-1">未选择元素</h3>
                <p className="text-xs">请在左侧画布点击选择一个元素以编辑属性</p>
            </div>
        );
    }

    const parseVal = (val: string) => parseInt(val) || 0;
    const isImg = element.tagName === 'IMG' || (element.tagName === 'DIV' && element.hasImgChild);

    return (
        <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">{isImg ? 'IMAGE' : element.tagName}</span>
                    <span className="text-xs font-bold text-slate-700">属性编辑</span>
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
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PhotoIcon className="w-3 h-3" /> 图片源</h4>
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

                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PencilIcon className="w-3 h-3" /> 样式</h4>
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">颜色</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-md p-1 pl-2 bg-white">
                            <div className="w-4 h-4 rounded border border-slate-200" style={{backgroundColor: element.color || '#000'}}></div>
                            <input type="color" value={element.color || '#000000'} onChange={(e) => onUpdateStyle('color', e.target.value)} className="w-6 h-6 opacity-0 absolute cursor-pointer"/>
                            <input type="text" value={element.color} onChange={(e) => onUpdateStyle('color', e.target.value)} className="flex-1 text-[10px] outline-none uppercase font-mono text-slate-600"/>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-medium mb-1 block">字号</label>
                            <input type="number" value={parseVal(element.fontSize)} onChange={(e) => onUpdateStyle('fontSize', `${e.target.value}px`)} className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:border-indigo-500 outline-none"/>
                        </div>
                        <div className="w-1/3">
                             <label className="text-[10px] text-slate-500 font-medium mb-1 block">加粗</label>
                             <button onClick={() => onUpdateStyle('fontWeight', element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'normal' : 'bold')} className={`w-full py-1 border rounded-md font-bold text-xs ${element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700 ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>B</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">对齐</label>
                        <div className="flex border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                            {['left', 'center', 'right', 'justify'].map((align) => (
                                <button key={align} onClick={() => onUpdateStyle('textAlign', align)} className={`flex-1 py-1 flex justify-center hover:bg-white ${element.textAlign === align ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                                    {align === 'left' && <AlignLeftIcon className="w-3 h-3"/>}
                                    {align === 'center' && <AlignCenterIcon className="w-3 h-3"/>}
                                    {align === 'right' && <AlignRightIcon className="w-3 h-3"/>}
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

  function pushUpdate() {
      // Small debounce to avoid flooding
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
             
             target.style.position = 'static';
             target.style.transform = 'none';
             target.style.width = '100%';
             target.style.height = '100%';
             target.style.margin = '0';
             
             if (target.parentNode) {
                 target.parentNode.insertBefore(wrapper, target);
                 wrapper.appendChild(target);
                 target = wrapper;
                 pushUpdate();
             }
        }
    }

    if (target === document.body || target === document.documentElement || target.id === 'canvas') {
        deselect(); return;
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
             pushUpdate(); 
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
                 pushUpdate();
             }
             img.src = value.src;
        }
        return;
    }
    
    if (!selectedEl) return;
    if (action === 'UPDATE_CONTENT') { selectedEl.innerText = value; pushUpdate(); return; }
    if (action === 'UPDATE_STYLE') { Object.assign(selectedEl.style, value); pushUpdate(); } 
    else if (action === 'UPDATE_ATTRIBUTE') { 
        if (value.key === 'src' && selectedEl.classList.contains('ai-img-wrapper')) {
            const img = selectedEl.querySelector('img');
            if (img) img.src = value.val;
        } else {
            selectedEl.setAttribute(value.key, value.val); 
        }
        pushUpdate(); 
    }
    else if (action === 'DELETE') { selectedEl.remove(); deselect(); pushUpdate(); } 
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
        pushUpdate();
    }
    else if (action === 'LAYER') {
        const currentZ = parseInt(window.getComputedStyle(selectedEl).zIndex) || 0;
        selectedEl.style.zIndex = value === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
        if (window.getComputedStyle(selectedEl).position === 'static') {
             selectedEl.style.position = 'relative'; 
        }
        pushUpdate();
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
        pushUpdate();
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
        let newX = window.initialTransformX;
        let newY = window.initialTransformY;

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
        
        if (newWidth > 10) {
            selectedEl.style.width = \`\${newWidth}px\`;
        }
        if (newHeight > 10) {
            selectedEl.style.height = \`\${newHeight}px\`;
        }
        
        if (resizeHandle.includes('w') || resizeHandle.includes('n')) {
            const currentTransform = selectedEl.style.transform || '';
            let scalePart = '';
            const scaleMatch = currentTransform.match(/scale\\([^)]+\\)/);
            if (scaleMatch) scalePart = scaleMatch[0];
            
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
        isDragging = false; isResizing = false; pushUpdate();
    }
  });
})();
</script>
`;

export const VisualEditor = forwardRef<VisualEditorHandle, VisualEditorProps>(({ initialHtml, onSave, scale, onScaleChange, onSelectionChange }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedElement, setSelectedElement] = useState<any>(null);
    const isInternalUpdate = useRef(false);

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

    // Handle initial load of HTML
    useEffect(() => {
        if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
        
        const iframe = iframeRef.current;
        if (iframe) {
            const doc = iframe.contentDocument;
            if (doc) {
                doc.open();
                let content = initialHtml || '';
                // Ensure wrapper for full height bg
                if (!content.toLowerCase().includes('<html')) {
                     content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><style>html, body { min-height: 100vh; margin: 0; background: white; }</style></head><body>${content}</body></html>`;
                }
                // Inject script if not present
                if (!content.includes('window.visualEditorScale')) {
                     content = content.toLowerCase().includes('</body>') ? content.replace(/<\/body>/i, `${EDITOR_SCRIPT}</body>`) : content + EDITOR_SCRIPT;
                }
                doc.write(content);
                doc.close();
            }
        }
    }, [initialHtml]);

    // Update Scale inside iframe
    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ action: 'UPDATE_SCALE', value: scale }, '*');
        }
    }, [scale]);
    
    // Auto-scale fit logic
    useEffect(() => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            // Target 1600x900
            const scaleX = (clientWidth - 80) / 1600; // -80 for padding
            const scaleY = (clientHeight - 80) / 900;
            const initialScale = Math.min(scaleX, scaleY, 1);
            if (onScaleChange) onScaleChange(Math.max(0.1, initialScale));
        }
    }, []);

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
    
    const handleInsertImage = () => {
        const url = prompt("请输入图片 URL:");
        if (url) sendCommand('INSERT_ELEMENT', { type: 'img', src: url });
    };
    
    const handleInsertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    sendCommand('INSERT_ELEMENT', { type: 'img', src: event.target.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    // --- Actions Handlers Wrappers for Property Panel ---
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
    
    // --- Top Toolbar for Insert/Zoom (Since undo/redo removed) ---
    const TopToolbar = () => (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-20 transition-all hover:scale-105">
            <div className="flex items-center gap-2">
                 <button onClick={handleInsertImage} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors">
                     <LinkIcon className="w-3.5 h-3.5" /> 网络图片
                 </button>
                 <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                     <PhotoIcon className="w-3.5 h-3.5" /> 本地上传
                     <input type="file" accept="image/*" onChange={handleInsertUpload} className="hidden" />
                 </label>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-2 text-slate-500">
                <button onClick={() => onScaleChange && onScaleChange(Math.max(0.1, scale - 0.1))} className="hover:text-indigo-600 text-lg font-bold px-1">-</button>
                <span className="text-xs font-mono min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => onScaleChange && onScaleChange(Math.min(3, scale + 0.1))} className="hover:text-indigo-600 text-lg font-bold px-1">+</button>
            </div>
        </div>
    );

    return (
        <div className="flex w-full h-full bg-slate-200 overflow-hidden relative">
            <TopToolbar />
            
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
VisualEditor.displayName = 'VisualEditor';
