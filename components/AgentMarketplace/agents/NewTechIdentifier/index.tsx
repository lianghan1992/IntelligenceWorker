
import React, { useState, useRef } from 'react';
import { CloudIcon, ArrowRightIcon, RefreshIcon, CheckIcon, DocumentTextIcon, DownloadIcon } from '../../../icons';
import { streamOpenRouterChat } from '../../utils/llm';
import { generatePdf } from '../../utils/services';
import { PROMPT_IDENTIFICATION, PROMPT_DEEP_DIVE, PROMPT_HTML_GEN } from './prompts';

const MODEL_NAME = "xiaomi/mimo-v2-flash:free";

interface TechItem {
    id: string;
    name: string;
    field: string;
    description: string;
    status: string;
    originalUrl?: string;
    isSelected: boolean;
    markdownDetail?: string;
    htmlCode?: string;
}

type Step = 'upload' | 'identify' | 'select' | 'generate';

export default function NewTechIdentifier() {
    const [step, setStep] = useState<Step>('upload');
    const [csvContent, setCsvContent] = useState<string[]>([]);
    const [techList, setTechList] = useState<TechItem[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const logEndRef = useRef<HTMLDivElement>(null);

    // --- Helpers ---
    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // --- Step 1: Upload ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            // Simple CSV parser: split by new line
            const rows = text.split(/\r?\n/).filter(row => row.trim().length > 0);
            // Remove header if it looks like one (simple heuristic)
            if (rows.length > 0 && (rows[0].includes('title') || rows[0].includes('标题'))) {
                rows.shift();
            }
            setCsvContent(rows);
            addLog(`已加载 CSV 文件，共识别到 ${rows.length} 行数据。`);
        };
        reader.readAsText(file);
    };

    // --- Step 2: Identify (Batch Processing) ---
    const parseMarkdownTable = (markdown: string): TechItem[] => {
        const items: TechItem[] = [];
        const lines = markdown.split('\n');
        let inTable = false;

        for (const line of lines) {
            if (line.trim().startsWith('|') && line.includes('---')) {
                inTable = true;
                continue;
            }
            if (inTable && line.trim().startsWith('|')) {
                const cols = line.split('|').map(c => c.trim()).filter(c => c);
                if (cols.length >= 4) {
                    items.push({
                        id: crypto.randomUUID(),
                        name: cols[0].replace(/\*\*/g, ''),
                        field: cols[1],
                        description: cols[2],
                        status: cols[3],
                        isSelected: true, // Default select all
                    });
                }
            }
        }
        return items;
    };

    const startIdentification = async () => {
        if (csvContent.length === 0) return;
        setStep('identify');
        setIsProcessing(true);
        setTechList([]);

        // Batch size (e.g., 5 rows per request to avoid context limit)
        const BATCH_SIZE = 5;
        
        for (let i = 0; i < csvContent.length; i += BATCH_SIZE) {
            const batch = csvContent.slice(i, i + BATCH_SIZE);
            addLog(`正在分析第 ${i + 1} - ${Math.min(i + BATCH_SIZE, csvContent.length)} 行...`);
            
            const prompt = `${PROMPT_IDENTIFICATION}\n\n**【CSV片段内容】**\n${batch.join('\n')}`;
            
            let buffer = "";
            await new Promise<void>(resolve => {
                streamOpenRouterChat(
                    [{ role: 'user', content: prompt }],
                    (token) => {
                        buffer += token;
                    },
                    () => {
                        const newItems = parseMarkdownTable(buffer);
                        setTechList(prev => [...prev, ...newItems]);
                        addLog(`批次分析完成，识别到 ${newItems.length} 个技术点。`);
                        resolve();
                    },
                    (err) => {
                        addLog(`Error: ${err.message}`);
                        resolve(); // Continue even if error
                    },
                    MODEL_NAME
                );
            });
        }
        
        setIsProcessing(false);
        setStep('select');
        addLog("所有内容分析完毕，请确认需要生成报告的技术点。");
    };

    // --- Step 3: Selection ---
    const toggleSelection = (id: string) => {
        setTechList(prev => prev.map(item => item.id === id ? { ...item, isSelected: !item.isSelected } : item));
    };

    // --- Step 4: Generation Loop ---
    const generateReports = async () => {
        const selectedItems = techList.filter(t => t.isSelected);
        if (selectedItems.length === 0) {
            alert("请至少选择一项技术");
            return;
        }

        setStep('generate');
        setIsProcessing(true);

        for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i];
            setCurrentProcessingIndex(i);
            addLog(`正在处理 [${i + 1}/${selectedItems.length}]: ${item.name}...`);

            // 1. Generate Deep Dive Markdown
            addLog(` > 正在编写深度分析报告 (Markdown)...`);
            const deepDivePrompt = `${PROMPT_DEEP_DIVE}\n\n**输入信息(技术名称/描述/领域):**\n名称：${item.name}\n领域：${item.field}\n描述：${item.description}\n现状：${item.status}`;
            
            let markdownBuffer = "";
            await new Promise<void>(resolve => {
                streamOpenRouterChat(
                    [{ role: 'user', content: deepDivePrompt }],
                    (token) => {
                         markdownBuffer += token;
                         // Optional: Update UI with streaming markdown if needed
                    },
                    () => resolve(),
                    (err) => { addLog(`Error generating markdown: ${err.message}`); resolve(); },
                    MODEL_NAME
                );
            });

            // Save Markdown
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, markdownDetail: markdownBuffer } : t));

            // 2. Generate HTML
            addLog(` > 正在生成 HTML 幻灯片代码...`);
            const htmlPrompt = `${PROMPT_HTML_GEN}\n\n**待转换的 Markdown 内容:**\n${markdownBuffer}`;
            
            let htmlBuffer = "";
            await new Promise<void>(resolve => {
                streamOpenRouterChat(
                    [{ role: 'user', content: htmlPrompt }],
                    (token) => htmlBuffer += token,
                    () => resolve(),
                    (err) => { addLog(`Error generating HTML: ${err.message}`); resolve(); },
                    MODEL_NAME
                );
            });

            // Extract Clean HTML
            let cleanHtml = htmlBuffer;
            const match = htmlBuffer.match(/```html([\s\S]*?)```/);
            if (match) cleanHtml = match[1];

            // Save HTML
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, htmlCode: cleanHtml } : t));
            addLog(` > [${item.name}] 处理完成。`);
        }

        setIsProcessing(false);
        addLog("所有任务执行完毕！");
    };

    const handleDownloadPDF = async (item: TechItem) => {
        if (!item.htmlCode) return;
        setDownloadingId(item.id);
        try {
            const blob = await generatePdf(item.htmlCode, item.name);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${item.name}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('PDF 生成失败，请重试。');
        } finally {
            setDownloadingId(null);
        }
    };

    // --- Renderers ---
    
    // 1. Upload View
    if (step === 'upload') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 animate-in fade-in zoom-in">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 text-indigo-600">
                    <CloudIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">上传 CSV 原始数据</h2>
                <p className="text-slate-500 mb-8 text-center max-w-md">
                    系统将自动分析每行数据，识别潜在的新技术并生成详细的四象限分析报告。
                </p>
                <div className="relative group">
                    <input 
                        type="file" 
                        accept=".csv,.txt"
                        onChange={handleFileUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <button className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg group-hover:bg-indigo-600 transition-colors flex items-center gap-2">
                        <ArrowRightIcon className="w-5 h-5" /> 选择文件
                    </button>
                </div>
                
                {csvContent.length > 0 && (
                    <div className="mt-8 w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-green-600 flex items-center gap-2">
                                <CheckIcon className="w-5 h-5" /> 已加载 {csvContent.length} 行数据
                            </span>
                            <button 
                                onClick={startIdentification}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                            >
                                开始识别
                            </button>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-xs font-mono text-slate-500 max-h-40 overflow-y-auto">
                            {csvContent.slice(0, 5).map((line, i) => (
                                <div key={i} className="truncate border-b border-slate-100 last:border-0 py-1">{line}</div>
                            ))}
                            {csvContent.length > 5 && <div className="pt-2 italic">... 以及更多 {csvContent.length - 5} 行</div>}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. Processing Logs (Shared View for Identify)
    if (step === 'identify') {
        return (
            <div className="p-10 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <RefreshIcon className="w-6 h-6 text-indigo-600 animate-spin" />
                    <h2 className="text-xl font-bold text-slate-800">正在分析数据...</h2>
                </div>
                <div className="flex-1 bg-slate-900 rounded-2xl p-6 font-mono text-sm text-green-400 overflow-y-auto shadow-inner">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-2">{log}</div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>
        );
    }

    // 3. Selection View
    if (step === 'select') {
        return (
            <div className="h-full flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
                        识别结果确认 ({techList.filter(t => t.isSelected).length}/{techList.length})
                    </h2>
                    <button 
                        onClick={generateReports}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <ArrowRightIcon className="w-5 h-5" /> 生成详细报告
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0">
                            <tr>
                                <th className="p-4 w-10"><input type="checkbox" checked readOnly className="rounded text-indigo-600" /></th>
                                <th className="p-4">技术名称</th>
                                <th className="p-4">领域</th>
                                <th className="p-4">描述</th>
                                <th className="p-4">现状</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {techList.map(item => (
                                <tr key={item.id} className={`hover:bg-slate-50 ${item.isSelected ? 'bg-indigo-50/30' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={item.isSelected} 
                                            onChange={() => toggleSelection(item.id)}
                                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-4 font-bold text-slate-900">{item.name}</td>
                                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{item.field}</span></td>
                                    <td className="p-4 text-xs max-w-md truncate" title={item.description}>{item.description}</td>
                                    <td className="p-4 text-xs">{item.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 4. Generation & Result View
    if (step === 'generate') {
        const selectedItems = techList.filter(t => t.isSelected);
        const currentItem = selectedItems[currentProcessingIndex];

        return (
            <div className="h-full flex overflow-hidden">
                {/* Sidebar List */}
                <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-700">生成队列</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {selectedItems.map((item, idx) => (
                            <div 
                                key={item.id}
                                className={`p-3 rounded-lg border text-sm transition-all ${
                                    idx === currentProcessingIndex 
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm'
                                        : item.htmlCode 
                                            ? 'border-green-200 bg-green-50 text-green-800'
                                            : 'border-transparent text-slate-500'
                                }`}
                                onClick={() => !isProcessing && setCurrentProcessingIndex(idx)}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold truncate">{idx+1}. {item.name}</span>
                                    {item.htmlCode && <CheckIcon className="w-4 h-4 text-green-600" />}
                                    {isProcessing && idx === currentProcessingIndex && <RefreshIcon className="w-4 h-4 text-indigo-600 animate-spin" />}
                                </div>
                                <div className="text-xs opacity-70 truncate">{item.field}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-slate-100 flex flex-col relative overflow-hidden">
                    {/* Toolbar */}
                    <div className="h-14 bg-white border-b border-slate-200 flex justify-between items-center px-6">
                        <h3 className="font-bold text-slate-800">{currentItem?.name} - 预览</h3>
                        {currentItem?.htmlCode && (
                            <button 
                                onClick={() => handleDownloadPDF(currentItem)}
                                disabled={downloadingId === currentItem.id}
                                className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                            >
                                {downloadingId === currentItem.id ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4" />}
                                导出 PDF
                            </button>
                        )}
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                        {currentItem?.htmlCode ? (
                            <div className="relative shadow-2xl origin-top" style={{ width: '1600px', height: '900px', transform: 'scale(0.6)', transformOrigin: 'center top' }}>
                                <iframe 
                                    srcDoc={currentItem.htmlCode}
                                    className="w-full h-full border-none bg-white"
                                    title="Preview"
                                />
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                <RefreshIcon className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-300" />
                                <p className="font-bold">正在生成内容...</p>
                                <p className="text-sm mt-2 opacity-70">Step 1: Deep Analysis -> Step 2: HTML Coding</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Log Overlay */}
                    {isProcessing && (
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-slate-900/90 backdrop-blur text-green-400 font-mono text-xs p-4 overflow-auto border-t border-slate-700">
                             {logs.slice(-5).map((l,i) => <div key={i}>{l}</div>)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return <div>Error state</div>;
}
