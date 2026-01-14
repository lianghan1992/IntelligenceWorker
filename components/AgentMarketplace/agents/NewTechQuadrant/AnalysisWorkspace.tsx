
import React, { useState, useEffect, useRef } from 'react';
import { TechItem } from './index';
import { ArticlePublic } from '../../../../types';
import { 
    DatabaseIcon, BrainIcon, DocumentTextIcon, CodeIcon, PlayIcon, 
    CheckCircleIcon, RefreshIcon, ChevronRightIcon, ArrowRightIcon,
    DownloadIcon, ArrowLeftIcon, PencilIcon
} from '../../../../components/icons';
// Reuse the robust VisualEditor from ReportGenerator
import { VisualEditor } from '../../../ReportGenerator/VisualEditor'; 
import { generatePdf } from '../../utils/services';

interface AnalysisWorkspaceProps {
    articles: ArticlePublic[];
    techList: TechItem[];
    setTechList: React.Dispatch<React.SetStateAction<TechItem[]>>;
    onBack: () => void;
}

// 模拟 RAG 日志
const MOCK_LOGS = [
    "正在分析上下文语义...",
    "调用向量数据库检索相关技术细节...",
    "检索到 5 篇相关论文与报道...",
    "正在生成四象限分析维度 (领先性, 可行性, 壁垒, 营销)...",
    "草稿生成完毕，等待确认..."
];

const MOCK_MARKDOWN = `# 全固态硫化物电解质

## 1. 领先性
- **能量密度**: 突破 500Wh/kg，相比现有液态锂电池提升 40% 以上。
- **安全性**: 彻底杜绝漏液、起火风险，通过针刺测试。
- **充放电效率**: 支持 5C 以上快充，10分钟补能 80%。

## 2. 可行性
- **材料体系**: 硫化物电解质室温离子电导率已接近液态电解质。
- **工艺路径**: 采用干法电极工艺，减少溶剂使用，降低成本。
- **供应链**: 主要原材料锂、硫储量丰富，关键合成设备已国产化。

## 3. 技术壁垒
- **界面稳定性**: 通过界面修饰层技术，有效抑制副反应。
- **专利布局**: 核心合成配方已申请 PCT 专利保护。

## 4. 卖点营销
- **"充电像加油一样快"**: 彻底解决续航焦虑。
- **"不起火的电池"**: 给家人最极致的安全守护。`;

const MOCK_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
  <div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden shadow-2xl flex flex-col border-[12px] border-white box-border">
    <!-- Header -->
    <header class="h-[80px] w-full px-10 flex items-center border-b border-slate-100 bg-white z-10">
        <div class="flex-shrink-0 w-2 h-10 bg-[#FF6B00] rounded-full mr-5"></div>
        <h1 class="text-4xl font-bold text-slate-800 tracking-tight">全固态硫化物电解质</h1>
    </header>

    <!-- Main Grid -->
    <main class="flex-1 w-full p-10 grid grid-cols-2 grid-rows-2 gap-8 bg-slate-50">
        <!-- Q1 -->
        <section class="bg-white rounded-3xl p-8 shadow-sm flex flex-col">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-1.5 h-6 bg-[#007AFF] rounded-full"></div>
                <h2 class="text-2xl font-bold text-slate-800">领先性 (Leadership)</h2>
            </div>
            <div class="flex-1 space-y-4">
                <div class="flex items-center gap-4">
                     <span class="text-3xl font-black text-[#FF6B00]">500<small class="text-lg text-gray-500 ml-1">Wh/kg</small></span>
                     <p class="text-lg text-slate-600">能量密度提升 40%</p>
                </div>
                <div class="flex items-center gap-4">
                     <span class="text-3xl font-black text-[#FF6B00]">5C<small class="text-lg text-gray-500 ml-1">快充</small></span>
                     <p class="text-lg text-slate-600">10分钟补能 80%</p>
                </div>
            </div>
        </section>

        <!-- Q2 -->
        <section class="bg-white rounded-3xl p-8 shadow-sm flex flex-col">
             <div class="flex items-center gap-3 mb-6">
                <div class="w-1.5 h-6 bg-[#007AFF] rounded-full"></div>
                <h2 class="text-2xl font-bold text-slate-800">可行性 (Feasibility)</h2>
            </div>
            <p class="text-lg text-slate-600 leading-relaxed">
                采用干法电极工艺，减少溶剂使用。核心原材料锂、硫储量丰富，关键合成设备已实现国产化，成本可控。
            </p>
        </section>

        <!-- Q3 -->
         <section class="bg-white rounded-3xl p-8 shadow-sm flex flex-col">
             <div class="flex items-center gap-3 mb-6">
                <div class="w-1.5 h-6 bg-[#007AFF] rounded-full"></div>
                <h2 class="text-2xl font-bold text-slate-800">技术壁垒 (Barriers)</h2>
            </div>
            <ul class="space-y-3">
                <li class="flex items-start gap-3">
                    <span class="w-2 h-2 rounded-full bg-slate-300 mt-2.5"></span>
                    <span class="text-lg text-slate-700">界面修饰层技术，抑制副反应</span>
                </li>
                 <li class="flex items-start gap-3">
                    <span class="w-2 h-2 rounded-full bg-slate-300 mt-2.5"></span>
                    <span class="text-lg text-slate-700">核心配方 PCT 专利保护</span>
                </li>
            </ul>
        </section>

        <!-- Q4 -->
         <section class="bg-white rounded-3xl p-8 shadow-sm flex flex-col">
             <div class="flex items-center gap-3 mb-6">
                <div class="w-1.5 h-6 bg-[#007AFF] rounded-full"></div>
                <h2 class="text-2xl font-bold text-slate-800">卖点营销 (Marketing)</h2>
            </div>
             <div class="grid grid-cols-2 gap-4">
                 <div class="bg-orange-50 p-4 rounded-xl text-center">
                     <div class="text-xl font-bold text-orange-600 mb-1">不起火</div>
                     <div class="text-sm text-orange-400">极致安全守护</div>
                 </div>
                 <div class="bg-blue-50 p-4 rounded-xl text-center">
                     <div class="text-xl font-bold text-blue-600 mb-1">像加油一样快</div>
                     <div class="text-sm text-blue-400">告别里程焦虑</div>
                 </div>
             </div>
        </section>
    </main>
  </div>
</body>
</html>`;

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({ articles, techList, setTechList, onBack }) => {
    const [activeTechId, setActiveTechId] = useState<string | null>(null);
    const [markdownInput, setMarkdownInput] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    
    const activeItem = techList.find(t => t.id === activeTechId);

    // Mock Process: Start Analysis -> Logs -> Markdown
    const startAnalysis = (id: string) => {
        setActiveTechId(id);
        setTechList(prev => prev.map(t => t.id === id ? { ...t, analysisState: 'analyzing' } : t));
        setLogs([]);
        
        let step = 0;
        const interval = setInterval(() => {
            if (step < MOCK_LOGS.length) {
                setLogs(prev => [...prev, MOCK_LOGS[step]]);
                step++;
            } else {
                clearInterval(interval);
                setTechList(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    analysisState: 'review',
                    markdownContent: MOCK_MARKDOWN // Use mock markdown
                } : t));
                setMarkdownInput(MOCK_MARKDOWN);
            }
        }, 800);
    };

    // Generate HTML from Markdown
    const generateHtml = (id: string) => {
        setTechList(prev => prev.map(t => t.id === id ? { ...t, analysisState: 'generating_html' } : t));
        
        // Mock latency
        setTimeout(() => {
            setTechList(prev => prev.map(t => t.id === id ? { 
                ...t, 
                analysisState: 'done',
                htmlContent: MOCK_HTML,
                markdownContent: markdownInput // Save user edits
            } : t));
        }, 2000);
    };

    // Update HTML content from visual editor
    const handleHtmlUpdate = (newHtml: string) => {
        if (activeTechId) {
            setTechList(prev => prev.map(t => t.id === activeTechId ? { ...t, htmlContent: newHtml } : t));
        }
    };
    
    // Download PDF
    const handleDownload = async () => {
         if (activeItem?.htmlContent) {
             try {
                 const blob = await generatePdf(activeItem.htmlContent, activeItem.name);
                 const url = window.URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `${activeItem.name}_report.pdf`;
                 a.click();
             } catch(e) {
                 alert('PDF 生成失败');
             }
         }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Sidebar: Tech List */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">识别清单 ({techList.length})</h3>
                    <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600">重选文章</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/50">
                    {techList.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            <RefreshIcon className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-400"/>
                            正在从文章中提取技术点...
                        </div>
                    ) : (
                        techList.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => item.analysisState !== 'idle' && setActiveTechId(item.id)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                                    activeTechId === item.id 
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-sm truncate pr-2">{item.name}</h4>
                                    {item.analysisState === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-400 bg-white rounded-full" />}
                                </div>
                                <div className={`text-xs opacity-80 mb-3 line-clamp-2 ${activeTechId === item.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {item.description}
                                </div>
                                
                                {item.analysisState === 'idle' ? (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); startAnalysis(item.id); }}
                                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors border border-indigo-100"
                                    >
                                        开始深度分析
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-80">
                                        {item.analysisState === 'analyzing' && <><RefreshIcon className="w-3 h-3 animate-spin"/> RAG 检索中...</>}
                                        {item.analysisState === 'review' && <><DocumentTextIcon className="w-3 h-3"/> 待确认内容</>}
                                        {item.analysisState === 'generating_html' && <><CodeIcon className="w-3 h-3 animate-pulse"/> 生成代码...</>}
                                        {item.analysisState === 'done' && <><CheckCircleIcon className="w-3 h-3"/> 已完成</>}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Workspace */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col">
                {!activeItem ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <DatabaseIcon className="w-16 h-16 mb-4 text-slate-300" />
                        <p>请在左侧选择一项技术开始分析</p>
                    </div>
                ) : (
                    <>
                        {/* State A: Analyzing (Logs) */}
                        {activeItem.analysisState === 'analyzing' && (
                            <div className="flex flex-col items-center justify-center h-full p-10">
                                <div className="w-full max-w-2xl bg-slate-900 rounded-2xl p-8 shadow-2xl font-mono text-sm text-green-400 space-y-3 border border-slate-800">
                                    {logs.map((log, i) => (
                                        <div key={i} className="animate-in fade-in slide-in-from-bottom-2">
                                            <span className="opacity-50 mr-2">{'>'}</span> {log}
                                        </div>
                                    ))}
                                    <div className="animate-pulse">_</div>
                                </div>
                            </div>
                        )}

                        {/* State B: Markdown Review */}
                        {activeItem.analysisState === 'review' && (
                            <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
                                <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <PencilIcon className="w-5 h-5 text-indigo-600" />
                                        内容生成确认
                                    </h2>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => generateHtml(activeItem.id)}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                                        >
                                            <PlayIcon className="w-4 h-4" /> 生成可视化报告
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 p-6 overflow-hidden">
                                    <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                            Markdown Editor
                                        </div>
                                        <textarea 
                                            value={markdownInput}
                                            onChange={(e) => setMarkdownInput(e.target.value)}
                                            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-700 custom-scrollbar"
                                            placeholder="AI 正在生成内容..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* State C: Generating HTML / Visual Editor */}
                        {(activeItem.analysisState === 'generating_html' || activeItem.analysisState === 'done') && (
                            <div className="flex flex-col h-full">
                                {activeItem.analysisState === 'generating_html' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white">
                                        <CodeIcon className="w-12 h-12 text-blue-500 animate-bounce mb-4" />
                                        <p className="font-mono text-lg animate-pulse">Generating HTML Structure...</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Toolbar for Final State */}
                                        <div className="h-14 px-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
                                            <div className="flex items-center gap-2 text-slate-800 font-bold">
                                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                                分析完成
                                            </div>
                                            <button 
                                                onClick={handleDownload}
                                                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors flex items-center gap-2"
                                            >
                                                <DownloadIcon className="w-3.5 h-3.5" /> 导出 PDF
                                            </button>
                                        </div>
                                        
                                        {/* Reuse Visual Editor */}
                                        <div className="flex-1 relative overflow-hidden">
                                            <VisualEditor 
                                                initialHtml={activeItem.htmlContent || ''}
                                                onSave={handleHtmlUpdate}
                                                scale={0.65} // Default zoom for preview
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
