
import React, { useState, useEffect } from 'react';
import { TechItem } from './index';
import { ArticlePublic, StratifyPrompt } from '../../../../types';
import { 
    DatabaseIcon, BrainIcon, DocumentTextIcon, CodeIcon, PlayIcon, 
    CheckCircleIcon, RefreshIcon, CheckIcon, ExternalLinkIcon,
    DownloadIcon, PencilIcon, LinkIcon, SparklesIcon, TrendingUpIcon
} from '../../../../components/icons';
import { generatePdf } from '../../utils/services';
import { chatGemini, searchSemanticSegments } from '../../../../api/intelligence';
import { VisualEditor } from '../../../ReportGenerator/VisualEditor'; // Import VisualEditor

interface AnalysisWorkspaceProps {
    articles: ArticlePublic[];
    techList: TechItem[];
    setTechList: React.Dispatch<React.SetStateAction<TechItem[]>>;
    onBack: () => void;
    isExtracting: boolean;
    prompts?: StratifyPrompt[];
}

// URL Cleaner Helper
const cleanUrl = (url?: string) => {
    if (!url) return '';
    let clean = url.trim();
    const mdMatch = clean.match(/\[.*?\]\((.*?)\)/);
    if (mdMatch) {
        clean = mdMatch[1];
    } else {
        clean = clean.replace(/[<>\[\]\(\)]/g, '');
    }
    
    if (clean && !clean.startsWith('http') && !clean.startsWith('//')) {
        return 'https://' + clean;
    }
    return clean;
};

// Helper: Try to parse JSON or fallback to raw string
const parseReportResponse = (text: string): string => {
    try {
        const json = JSON.parse(text);
        if (json.content) return json.content;
        
        const codeBlockMatch = text.match(/```(?:json)?([\s\S]*?)```/);
        if (codeBlockMatch) {
            const innerJson = JSON.parse(codeBlockMatch[1]);
            if (innerJson.content) return innerJson.content;
        }
    } catch (e) {
        // Ignore
    }
    if (text.trim().startsWith('#')) {
        return text;
    }
    return text;
};

// Helper: Extract clean HTML from LLM response
const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*/i);
    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        let clean = cleanText.substring(codeBlockMatch.index + codeBlockMatch[0].length);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    // Fallback: look for doctype or html tag
    const rawStart = cleanText.search(/<!DOCTYPE|<html/i);
    if (rawStart !== -1) {
        let clean = cleanText.substring(rawStart);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    return '';
};

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({ articles, techList, setTechList, onBack, isExtracting, prompts }) => {
    const [activeTechId, setActiveTechId] = useState<string | null>(null);
    const [markdownInput, setMarkdownInput] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    
    // Scale for VisualEditor
    const [scale, setScale] = useState(0.8);
    
    const activeItem = techList.find(t => t.id === activeTechId);

    // Auto-select first item when list populates
    useEffect(() => {
        if (techList.length > 0) {
            const exists = techList.find(t => t.id === activeTechId);
            if (!activeTechId || !exists) {
                setActiveTechId(techList[0].id);
            }
        }
    }, [techList, activeTechId]);

    // Real Process: Keyword Gen -> Vector Search -> Report Gen
    const startAnalysis = async (id: string) => {
        const item = techList.find(t => t.id === id);
        if (!item) return;

        setActiveTechId(id);
        setTechList(prev => prev.map(t => t.id === id ? { ...t, analysisState: 'analyzing' } : t));
        setLogs(["准备开始深度分析..."]);
        
        try {
            // 0. Get Prompts
            const reportPrompt = prompts?.find(p => p.name === '新技术四象限编写');
            if (!reportPrompt) {
                throw new Error("缺少 '新技术四象限编写' 提示词配置");
            }

            // --- Step 1: Generate Search Keywords ---
            setLogs(prev => [...prev, "正在构建检索策略..."]);
            const keywordGenPrompt = `为了深度分析新技术【${item.name}】，请生成3个最关键的搜索关键词，用于在向量数据库中检索相关技术细节、竞品对比和市场应用。仅返回关键词，用空格分隔，不要其他内容。`;
            
            const keywordRes = await chatGemini([{ role: 'user', content: keywordGenPrompt }]);
            const keywords = keywordRes?.choices?.[0]?.message?.content || item.name;
            setLogs(prev => [...prev, `生成检索词: ${keywords}`]);

            // --- Step 2: Vector Search (RAG) ---
            setLogs(prev => [...prev, "正在检索知识库 (RAG)..."]);
            let retrievedContext = "暂无相关详细资料。";
            try {
                const searchRes = await searchSemanticSegments({
                    query_text: keywords,
                    page: 1,
                    page_size: 5,
                    similarity_threshold: 0.35
                });
                
                if (searchRes.items && searchRes.items.length > 0) {
                    retrievedContext = searchRes.items
                        .map((resItem, idx) => `[资料${idx+1}] ${resItem.title}: ${resItem.content}`)
                        .join('\n\n');
                    setLogs(prev => [...prev, `检索到 ${searchRes.items.length} 条相关情报。`]);
                } else {
                    setLogs(prev => [...prev, "未检索到强相关资料，将基于通用知识生成。"]);
                }
            } catch (e) {
                console.error("Vector search failed", e);
                setLogs(prev => [...prev, "检索服务连接失败，跳过。"]);
            }

            // --- Step 3: Generate Report ---
            setLogs(prev => [...prev, "AI 正在撰写深度分析报告..."]);
            
            let finalPrompt = reportPrompt.content;
            finalPrompt = finalPrompt.replace('{{ tech_name }}', item.name);
            finalPrompt = finalPrompt.replace('{{ tech_info }}', item.description);
            finalPrompt = finalPrompt.replace('{{ retrieved_info }}', retrievedContext);

            const reportRes = await chatGemini([{ role: 'user', content: finalPrompt }]);
            const rawResponse = reportRes?.choices?.[0]?.message?.content;

            if (rawResponse) {
                const reportContent = parseReportResponse(rawResponse);
                setLogs(prev => [...prev, "报告生成完毕，准备渲染编辑器..."]);
                
                // Update State
                setTechList(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    analysisState: 'review',
                    markdownContent: reportContent
                } : t));
                setMarkdownInput(reportContent);
            } else {
                throw new Error("LLM 未返回有效内容");
            }

        } catch (err: any) {
            console.error("Deep analysis failed", err);
            setLogs(prev => [...prev, `错误: ${err.message || "未知错误"}`]);
            setTechList(prev => prev.map(t => t.id === id ? { ...t, analysisState: 'idle' } : t)); // Reset on fail
            alert("分析失败，请重试");
        }
    };

    // Generate HTML from Markdown (Real Implementation)
    const generateHtml = async (id: string) => {
        const item = techList.find(t => t.id === id);
        // Use user-edited markdown if available, else original
        const contentToConvert = markdownInput || item?.markdownContent || '';

        if (!contentToConvert) {
            alert('请先生成或输入分析内容');
            return;
        }

        setTechList(prev => prev.map(t => t.id === id ? { ...t, analysisState: 'generating_html' } : t));
        
        try {
            // 1. Get Prompt
            const htmlPrompt = prompts?.find(p => p.name === '新技术四象限html生成');
            if (!htmlPrompt) {
                throw new Error("缺少 '新技术四象限html生成' 提示词配置");
            }

            // 2. Fill Placeholder
            const finalPrompt = htmlPrompt.content.replace('{{ markdown_content }}', contentToConvert);

            // 3. Call LLM (Updated to gemini-2.5-pro)
            const response = await chatGemini([
                { role: 'user', content: finalPrompt }
            ], 'gemini-2.5-pro');

            const rawHtml = response?.choices?.[0]?.message?.content;
            if (rawHtml) {
                const cleanHtml = extractCleanHtml(rawHtml);
                setTechList(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    analysisState: 'done',
                    htmlContent: cleanHtml,
                    markdownContent: contentToConvert // Save the version that was used
                } : t));
            } else {
                throw new Error("HTML 生成失败: 返回为空");
            }

        } catch (err: any) {
            console.error("HTML generation failed", err);
            alert(`生成 HTML 失败: ${err.message}`);
            // Revert state to review so user can try again
            setTechList(prev => prev.map(t => t.id === id ? { ...t, analysisState: 'review' } : t));
        }
    };

    // Update HTML content from visual editor
    const handleHtmlUpdate = (newHtml: string) => {
        if (activeTechId) {
            setTechList(prev => prev.map(t => t.id === activeTechId ? { ...t, htmlContent: newHtml } : t));
        }
    };
    
    // Download PDF with fixed dimensions
    const handleDownload = async () => {
         if (activeItem?.htmlContent) {
             try {
                 const blob = await generatePdf(activeItem.htmlContent, activeItem.name, { width: 1600, height: 900 });
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
            <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">识别清单 ({techList.length})</h3>
                    <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600">重选文章</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/50">
                    {techList.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            {isExtracting ? (
                                <>
                                    <RefreshIcon className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-400"/>
                                    正在从文章库提取并检索背景...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6 mx-auto mb-2 text-slate-300"/>
                                    未识别到有效技术点
                                </>
                            )}
                        </div>
                    ) : (
                        techList.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setActiveTechId(item.id)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                                    activeTechId === item.id 
                                        ? 'bg-white border-indigo-500 ring-1 ring-indigo-500/20 shadow-md' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-bold text-sm truncate pr-2 flex-1 ${activeTechId === item.id ? 'text-indigo-700' : 'text-slate-800'}`}>{item.name}</h4>
                                    {item.analysisState === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">{item.field}</span>
                                </div>

                                {/* Status Section (Rich Text) */}
                                <div className="mb-3 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                                    <div className="text-[10px] font-bold text-blue-600 mb-1 flex items-center gap-1">
                                        <TrendingUpIcon className="w-3 h-3"/> 行业应用现状
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                                        {item.status || "正在检索行业应用数据..."}
                                    </p>
                                </div>

                                <div className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed" title={item.description}>
                                    {item.description}
                                </div>
                                
                                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                                     {item.original_url ? (
                                        <a 
                                            href={cleanUrl(item.original_url)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <LinkIcon className="w-3 h-3"/> 原文链接
                                        </a>
                                     ) : <span className="text-[10px] text-slate-300">-</span>}

                                     {/* State Badge */}
                                     <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                        {item.analysisState === 'idle' && <span className="text-slate-400">待分析</span>}
                                        {item.analysisState === 'analyzing' && <span className="text-indigo-500 font-bold flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 分析中</span>}
                                        {item.analysisState === 'review' && <span className="text-orange-500 font-bold flex items-center gap-1">待确认</span>}
                                        {item.analysisState === 'generating_html' && <span className="text-purple-500 font-bold flex items-center gap-1"><CodeIcon className="w-3 h-3 animate-pulse"/> 生成中</span>}
                                        {item.analysisState === 'done' && <span className="text-green-600 font-bold flex items-center gap-1">已完成</span>}
                                     </div>
                                </div>
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
                        <p>请在左侧选择一项技术查看详情或开始分析</p>
                    </div>
                ) : activeItem.analysisState === 'idle' ? (
                    // Idle State: Show Full Details & Start Button
                    <div className="flex flex-col h-full p-8 overflow-y-auto custom-scrollbar">
                        <div className="max-w-3xl mx-auto w-full space-y-6">
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                        <DatabaseIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-extrabold text-slate-800">{activeItem.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">{activeItem.field}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* 1. Description */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">技术描述</h4>
                                        <p className="text-sm text-slate-700 leading-loose bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            {activeItem.description}
                                        </p>
                                    </div>

                                    {/* 2. Industry Status Section - Enhanced */}
                                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <TrendingUpIcon className="w-4 h-4"/> 行业应用现状 (基于 RAG 检索)
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-loose">
                                            {activeItem.status}
                                        </p>
                                    </div>

                                    {/* 3. Source Info */}
                                    {activeItem.original_url && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">来源信息</h4>
                                            <a 
                                                href={cleanUrl(activeItem.original_url)} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 p-3 rounded-lg border border-blue-100 w-fit max-w-full truncate"
                                            >
                                                <ExternalLinkIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{cleanUrl(activeItem.original_url)}</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                                     <button 
                                        onClick={() => startAnalysis(activeItem.id)}
                                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                    >
                                        <BrainIcon className="w-5 h-5" />
                                        开始深度分析与报告生成
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                    <div className="flex-1 flex flex-col overflow-hidden relative">
                                        {/* Toolbar for Final State */}
                                        <div className="h-14 px-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20 absolute top-0 left-0 right-0">
                                            <div className="flex items-center gap-2 text-slate-800 font-bold">
                                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                                分析完成
                                            </div>
                                            <div className="flex items-center gap-3">
                                                 {/* Scale Controls */}
                                                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                                    <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded text-xs transition-colors">-</button>
                                                    <span className="text-xs font-bold text-slate-600 w-8 text-center flex items-center justify-center select-none">{Math.round(scale * 100)}%</span>
                                                    <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded text-xs transition-colors">+</button>
                                                </div>

                                                <button 
                                                    onClick={handleDownload}
                                                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors flex items-center gap-2"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5" /> 导出 PDF
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Replaced iframe with VisualEditor */}
                                        <div className="flex-1 pt-14 bg-slate-200 relative overflow-hidden">
                                            <div className="w-full h-full flex items-center justify-center">
                                                {activeItem.htmlContent && (
                                                    <VisualEditor 
                                                        initialHtml={activeItem.htmlContent}
                                                        onSave={handleHtmlUpdate}
                                                        scale={scale}
                                                        onScaleChange={setScale}
                                                        canvasSize={{ width: 1600, height: 900 }}
                                                        hideToolbar={true}
                                                    />
                                                )}
                                            </div>
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
