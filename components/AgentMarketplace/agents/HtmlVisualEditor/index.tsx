
import React, { useState, useEffect } from 'react';
import VisualEditor from '../../../../components/shared/VisualEditor';
import { 
    DownloadIcon, RefreshIcon, ArrowLeftIcon, 
    PencilIcon, ClipboardIcon, TrashIcon
} from '../../../../components/icons';
import { generatePdf } from '../../utils/services';

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center h-screen m-0 p-0 overflow-hidden">
  <div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden shadow-xl flex flex-col border-[12px] border-white box-border">
    <header class="h-24 px-12 flex items-center border-b border-gray-100 bg-white z-10">
      <div class="flex items-center gap-4">
        <div class="w-2 h-10 bg-indigo-600 rounded-full"></div>
        <h1 class="text-4xl font-bold text-gray-900 tracking-tight">创意视觉设计工坊</h1>
      </div>
    </header>
    <main class="flex-1 p-12 grid grid-cols-2 gap-12 bg-slate-50">
      <div class="flex flex-col justify-center space-y-8">
         <div class="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
             <h2 class="text-3xl font-bold text-indigo-900 mb-4">可视化编辑体验</h2>
             <p class="text-xl text-slate-600 leading-relaxed">
                直接点击、拖拽、双击修改文字。像制作 PPT 一样设计您的 HTML 页面。
             </p>
         </div>
         <div class="grid grid-cols-2 gap-4">
            <div class="p-6 bg-indigo-600 rounded-2xl text-white shadow-lg">
                <div class="text-3xl font-black mb-1">1600</div>
                <div class="text-xs font-bold uppercase opacity-80">Canvas Width</div>
            </div>
            <div class="p-6 bg-slate-800 rounded-2xl text-white shadow-lg">
                <div class="text-3xl font-black mb-1">900</div>
                <div class="text-xs font-bold uppercase opacity-80">Canvas Height</div>
            </div>
         </div>
      </div>
      <div class="rounded-3xl overflow-hidden shadow-2xl border-8 border-white transform rotate-2">
          <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" class="w-full h-full object-cover" />
      </div>
    </main>
  </div>
</body>
</html>`;

interface HtmlVisualEditorProps {
    onBack: () => void;
}

const HtmlVisualEditor: React.FC<HtmlVisualEditorProps> = ({ onBack }) => {
    const [html, setHtml] = useState(DEFAULT_TEMPLATE);
    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(0.5);
    const [isPasting, setIsPasting] = useState(false);

    useEffect(() => {
        const fit = () => {
            const containerWidth = window.innerWidth - 80;
            const containerHeight = window.innerHeight - 150;
            const s = Math.min(containerWidth / 1600, containerHeight / 900) * 0.9;
            setScale(s);
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);

    const handleDownloadPdf = async () => {
        setIsExporting(true);
        try {
            const blob = await generatePdf(html, `visual_design_${new Date().getTime()}`, { 
                width: 1600, 
                height: 900 
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `design_${new Date().toISOString().slice(0,10)}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('PDF 导出失败');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePasteHtml = async () => {
        setIsPasting(true);
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.includes('<html') || text.includes('<div') || text.includes('<section') || text.includes('<body'))) {
                // Wrap simple div snippets in canvas structure if needed
                let finalHtml = text;
                if (!text.includes('id="canvas"')) {
                    finalHtml = text.replace(/<body(.*?)>/i, '<body$1><div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden mx-auto shadow-2xl">');
                    if (finalHtml.includes('</body>')) {
                        finalHtml = finalHtml.replace('</body>', '</div></body>');
                    } else {
                        finalHtml += '</div>';
                    }
                }
                setHtml(finalHtml);
                alert('已从剪贴板成功载入 HTML 结构');
            } else {
                alert('剪贴板中未检测到有效的 HTML 代码');
            }
        } catch (err) {
            alert('读取剪贴板失败，请确保已授予剪贴板访问权限');
        } finally {
            setIsPasting(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要清空当前设计并重置为默认模板吗？')) {
            setHtml(DEFAULT_TEMPLATE);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9]">
            {/* Custom Integrated Header for Editor */}
            <header className="h-16 px-4 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between shadow-sm z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors group"
                        title="返回集市"
                    >
                        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <PencilIcon className="w-4 h-4" />
                        </div>
                        <h1 className="text-sm font-black text-slate-800 tracking-tight hidden md:block">HTML 视觉设计工坊</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="重置画布"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button 
                        onClick={handlePasteHtml}
                        disabled={isPasting}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                        title="从剪贴板读取并覆盖当前 HTML"
                    >
                        {isPasting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                        <span>粘贴代码更新</span>
                    </button>

                    <button 
                        onClick={handleDownloadPdf}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-indigo-600 shadow-xl shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isExporting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                        <span>导出 PDF (1600x900)</span>
                    </button>
                </div>
            </header>

            {/* Visual Editor Content */}
            <main className="flex-1 overflow-hidden relative">
                <VisualEditor 
                    initialHtml={html}
                    onSave={setHtml}
                    scale={scale}
                    onScaleChange={setScale}
                    canvasSize={{ width: 1600, height: 900 }}
                />
            </main>
        </div>
    );
};

export default HtmlVisualEditor;
