
import React, { useState } from 'react';
import VisualEditor from '../../shared/VisualEditor';
import { CodeIcon, EyeIcon } from '../../icons';

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center h-screen m-0 p-0 overflow-hidden">
  <div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden shadow-xl flex flex-col border-[12px] border-white box-border">
    <!-- Header -->
    <header class="h-[80px] px-10 flex items-center border-b border-gray-100 bg-white z-10 justify-between">
      <div class="flex items-center gap-4">
        <div class="w-1.5 h-8 bg-blue-600 rounded-full"></div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Q3 季度核心业务增长分析</h1>
      </div>
      <div class="flex items-center gap-3">
        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100">CONFIDENTIAL</span>
        <span class="text-gray-400 font-mono text-sm">2023-10-24</span>
      </div>
    </header>
    
    <!-- Content Grid -->
    <main class="flex-1 p-10 grid grid-cols-3 gap-8 bg-slate-50">
      
      <!-- Card 1 -->
      <div class="col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col relative group overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-4 -mt-4 transition-all group-hover:scale-110"></div>
        
        <div class="flex items-center gap-3 mb-6 relative z-10">
           <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">A</div>
           <h2 class="text-2xl font-bold text-slate-800">用户增长引擎</h2>
        </div>
        
        <div class="flex-1 grid grid-cols-2 gap-6 relative z-10">
            <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div class="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">活跃用户 (DAU)</div>
                <div class="text-5xl font-black text-slate-800">2.4M</div>
                <div class="text-green-500 text-sm font-bold mt-2 flex items-center gap-1">
                    <span>▲ 15%</span>
                    <span class="text-slate-400 font-normal">vs last month</span>
                </div>
            </div>
            <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div class="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">付费转化率</div>
                <div class="text-5xl font-black text-indigo-600">8.5%</div>
                 <div class="text-green-500 text-sm font-bold mt-2 flex items-center gap-1">
                    <span>▲ 2.1%</span>
                    <span class="text-slate-400 font-normal">optimization</span>
                </div>
            </div>
        </div>
        
        <p class="mt-6 text-slate-500 text-sm leading-relaxed">
            通过优化新用户引导流程 (Onboarding) 及精准的 AI 推荐策略，本季度实现了用户留存率的显著提升。关键增长点来自于移动端渠道的爆发式裂变。
        </p>
      </div>

      <!-- Card 2 -->
      <div class="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div class="absolute bottom-0 right-0 w-48 h-48 bg-white/10 blur-[60px] rounded-full pointer-events-none"></div>

        <div class="relative z-10">
            <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-white">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            </div>
            <h2 class="text-2xl font-bold mb-2">战略里程碑</h2>
            <p class="text-indigo-100 text-sm opacity-90">Q4 核心攻坚目标设定</p>
        </div>
        
        <div class="relative z-10 space-y-4">
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div class="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 opacity-80">System Stability</div>
                <div class="w-full bg-black/20 rounded-full h-1.5">
                    <div class="bg-green-400 h-1.5 rounded-full" style="width: 98%"></div>
                </div>
                <div class="text-right text-xs mt-1 font-mono">99.9% SLA</div>
            </div>
             <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div class="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 opacity-80">AI Model Training</div>
                <div class="w-full bg-black/20 rounded-full h-1.5">
                    <div class="bg-yellow-400 h-1.5 rounded-full" style="width: 65%"></div>
                </div>
                <div class="text-right text-xs mt-1 font-mono">65% Done</div>
            </div>
        </div>
      </div>
      
      <!-- Card 3 (Bottom) -->
      <div class="col-span-3 bg-white rounded-3xl p-6 border border-slate-100 flex items-center justify-between shadow-sm">
         <div class="flex items-center gap-6">
             <div class="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
             </div>
             <div>
                 <h3 class="text-lg font-bold text-slate-800">下一步行动计划</h3>
                 <p class="text-sm text-slate-500">启动 "Project X" 增长黑客实验，聚焦二三线城市下沉市场。</p>
             </div>
         </div>
         <button class="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-all">查看详情 →</button>
      </div>

    </main>
  </div>
</body>
</html>`;

export const HtmlDesign: React.FC = () => {
    const [html, setHtml] = useState(SAMPLE_HTML);
    const [mode, setMode] = useState<'editor' | 'preview'>('editor');

    return (
        <div className="h-full flex flex-col bg-slate-100">
            {/* Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-800">HTML 组件可视化设计</h2>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setMode('editor')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${mode === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <EyeIcon className="w-4 h-4"/> 可视化编辑
                    </button>
                    <button 
                        onClick={() => setMode('preview')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${mode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CodeIcon className="w-4 h-4"/> 源码预览
                    </button>
                </div>
            </div>

            {/* Workspace */}
            <div className="flex-1 overflow-hidden relative">
                {mode === 'editor' ? (
                    <VisualEditor 
                        initialHtml={html}
                        onSave={setHtml}
                        scale={0.7} 
                    />
                ) : (
                    <div className="h-full w-full bg-[#1e1e1e] p-6 overflow-auto custom-scrollbar-dark">
                        <textarea 
                            value={html}
                            onChange={(e) => setHtml(e.target.value)}
                            className="w-full h-full bg-transparent text-slate-300 font-mono text-sm outline-none resize-none"
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
