
import React, { useState } from 'react';
import { VisualCanvas } from './VisualCanvas';
import { 
    CodeIcon, EyeIcon, DownloadIcon, CheckIcon, PlusIcon
} from '../../../../components/icons';

// 简单的剪贴板图标
const ClipboardIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.5 3A1.501 1.501 0 009 4.5h6A1.5 1.5 0 0013.5 3h-3zm-2.693.178A3 3 0 0110.5 1.5h3a3 3 0 012.694 1.678c.497.042.992.092 1.486.15 1.495.173 2.57 1.46 2.57 2.929V19.5a3 3 0 01-3 3H6.75a3 3 0 01-3-3V6.257c0-1.47 1.075-2.756 2.57-2.93.493-.057.989-.107 1.487-.15z" clipRule="evenodd" />
    </svg>
);

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center h-screen m-0 p-0 overflow-hidden">
  <div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden shadow-xl flex flex-col">
    <!-- Header -->
    <header class="h-24 px-12 flex items-center border-b border-gray-100 bg-white z-10">
      <div class="flex items-center gap-4">
        <div class="w-2 h-10 bg-indigo-600 rounded-full"></div>
        <h1 class="text-4xl font-bold text-gray-900 tracking-tight">2025 战略规划概览</h1>
      </div>
      <div class="ml-auto text-gray-400 font-mono text-xl">CONFIDENTIAL</div>
    </header>
    
    <!-- Content -->
    <main class="flex-1 p-12 grid grid-cols-2 gap-12">
      <div class="flex flex-col justify-center space-y-8">
         <div class="p-8 bg-indigo-50 rounded-3xl border border-indigo-100">
             <h2 class="text-3xl font-bold text-indigo-900 mb-4">核心目标</h2>
             <p class="text-xl text-indigo-700 leading-relaxed">
                通过技术创新驱动业务增长，实现全场景智能化覆盖，构建行业领先的竞争壁垒。
             </p>
         </div>
         
         <div class="space-y-4">
             <div class="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold">1</div>
                 <div>
                     <h3 class="text-xl font-bold text-gray-800">市场份额增长</h3>
                     <p class="text-gray-500">Target: 25% YoY</p>
                 </div>
             </div>
             <div class="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">2</div>
                 <div>
                     <h3 class="text-xl font-bold text-gray-800">研发投入占比</h3>
                     <p class="text-gray-500">Target: 15% Revenue</p>
                 </div>
             </div>
         </div>
      </div>
      
      <div class="bg-gray-100 rounded-3xl flex items-center justify-center relative overflow-hidden group">
          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Strategy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div class="relative z-10 text-white text-center p-8">
              <div class="text-6xl font-black mb-2">Q4</div>
              <div class="text-2xl font-light tracking-widest uppercase">Key Milestone</div>
          </div>
      </div>
    </main>
  </div>
</body>
</html>`;

const HtmlVisualEditor: React.FC = () => {
    const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE);
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
    const [copyStatus, setCopyStatus] = useState('复制代码');
    const [pasteStatus, setPasteStatus] = useState('从剪贴板导入');

    const handleSyncCode = (newHtml: string) => {
        setHtmlContent(newHtml);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(htmlContent);
        setCopyStatus('已复制!');
        setTimeout(() => setCopyStatus('复制代码'), 2000);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setHtmlContent(text);
                setViewMode('visual'); // Switch to visual mode to see changes
                setPasteStatus('导入成功!');
                setTimeout(() => setPasteStatus('从剪贴板导入'), 2000);
            } else {
                alert('剪贴板为空');
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
            alert('无法访问剪贴板，请检查浏览器权限或手动粘贴到源码模式。');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `design_${new Date().toISOString().slice(0,10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Toolbar */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('visual')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <EyeIcon className="w-4 h-4" /> 可视化编辑
                        </button>
                        <button 
                            onClick={() => setViewMode('code')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CodeIcon className="w-4 h-4" /> 源码模式
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200"></div>

                    <button 
                        onClick={handlePaste}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all border border-blue-100"
                        title="将剪贴板的HTML代码直接导入编辑器"
                    >
                        {pasteStatus === '导入成功!' ? <CheckIcon className="w-4 h-4"/> : <ClipboardIcon className="w-4 h-4"/>}
                        {pasteStatus}
                    </button>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                    >
                        {copyStatus === '已复制!' ? <CheckIcon className="w-3.5 h-3.5"/> : <CodeIcon className="w-3.5 h-3.5"/>}
                        {copyStatus}
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                    >
                        <DownloadIcon className="w-3.5 h-3.5"/>
                        下载 HTML
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'visual' ? (
                    <VisualCanvas 
                        initialHtml={htmlContent} 
                        onSave={handleSyncCode}
                    />
                ) : (
                    <div className="w-full h-full bg-[#1e1e1e] flex flex-col">
                        <textarea 
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            className="flex-1 w-full bg-transparent text-gray-300 font-mono text-sm p-6 resize-none focus:outline-none custom-scrollbar-dark leading-relaxed"
                            spellCheck={false}
                            placeholder="在此粘贴 HTML 代码..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default HtmlVisualEditor;
