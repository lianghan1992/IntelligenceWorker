
import React, { useState, useRef } from 'react';
import { CloudIcon, ArrowRightIcon, RefreshIcon, CheckIcon, DocumentTextIcon, DownloadIcon, ExternalLinkIcon } from '../../../icons';
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
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
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

    // --- CSV Parser ---
    // Parses CSV text into headers and rows, respecting quoted fields.
    const parseCSV = (text: string) => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    currentCell += '"';
                    i++;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of cell
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
                // End of row
                currentRow.push(currentCell.trim());
                if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
                     rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
                if (char === '\r') i++;
            } else {
                currentCell += char;
            }
        }
        
        // Handle last row if no newline at EOF
        if (currentCell || currentRow.length > 0) {
             currentRow.push(currentCell.trim());
             if (currentRow.length > 0) rows.push(currentRow);
        }

        return rows;
    };

    // --- Step 1: Upload ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            
            const rawRows = parseCSV(text);
            
            if (rawRows.length > 0) {
                setCsvHeaders(rawRows[0]);
                setCsvRows(rawRows.slice(1));
                addLog(`已加载 CSV 文件，识别到表头: [${rawRows[0].join(', ')}]，共 ${rawRows.length - 1} 行数据。`);
            } else {
                addLog("CSV 文件为空或格式错误。");
            }
        };
        reader.readAsText(file);
    };

    // --- Step 2: Identify (Batch Processing) ---
    const parseJsonResult = (text: string): TechItem[] => {
        try {
            // Find JSON array brackets
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            
            if (start === -1 || end === -1) {
                console.warn("No JSON array found in response");
                return [];
            }
            
            const jsonStr = text.substring(start, end + 1);
            const items = JSON.parse(jsonStr);
            
            if (!Array.isArray(items)) return [];

            return items.map((item: any) => ({
                id: crypto.randomUUID(),
                name: item.name || '未知技术',
                field: item.field || '其他',
                description: item.description || '',
                status: item.status || '未知',
                originalUrl: item.original_url || '',
                isSelected: true, // Default select all
            }));
        } catch (e) {
            console.error("JSON Parse failed:", e);
            return [];
        }
    };

    const startIdentification = async () => {
        if (csvRows.length === 0) return;
        setStep('identify');
        setIsProcessing(true);
        setTechList([]);

        // Batch size (e.g., 5 rows per request to avoid context limit)
        const BATCH_SIZE = 5;
        const headerStr = csvHeaders.join(',');
        
        for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
            const batch = csvRows.slice(i, i + BATCH_SIZE);
            addLog(`正在分析第 ${i + 1} - ${Math.min(i + BATCH_SIZE, csvRows.length)} 行...`);
            
            // Format batch as CSV string with header repeated for context
            const batchCsvStr = [headerStr, ...batch.map(r => r.join(','))].join('\n');
            const prompt = `${PROMPT_IDENTIFICATION}\n\n**【CSV片段内容】**\n${batchCsvStr}`;
            
            let attempts = 0;
            const maxRetries = 3;
            let batchSuccess = false;

            while (attempts < maxRetries && !batchSuccess) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        let buffer = "";
                        streamOpenRouterChat(
                            [{ role: 'user', content: prompt }],
                            (token) => {
                                buffer += token;
                            },
                            () => {
                                const newItems = parseJsonResult(buffer);
                                if (newItems.length > 0) {
                                    setTechList(prev => [...prev, ...newItems]);
                                    addLog(`批次分析完成，识别到 ${newItems.length} 个技术点。`);
                                } else {
                                    addLog(`批次分析完成，未识别到有效技术点或格式解析失败。`);
                                }
                                batchSuccess = true;
                                resolve();
                            },
                            (err) => {
                                reject(err);
                            },
                            MODEL_NAME
                        );
                    });
                } catch (err: any) {
                    attempts++;
                    console.error(`Batch analysis failed (Attempt ${attempts}/${maxRetries}):`, err);
                    
                    if (attempts < maxRetries) {
                        addLog(`请求异常 (${err.message})，正在进行第 ${attempts} 次重试...`);
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        addLog(`Error: 本批次分析最终失败，跳过。错误原因: ${err.message}`);
                    }
                }
            }
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
            let mdAttempts = 0;
            let mdSuccess = false;
            
            while (mdAttempts < 3 && !mdSuccess) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        markdownBuffer = ""; // Reset buffer
                        streamOpenRouterChat(
                            [{ role: 'user', content: deepDivePrompt }],
                            (token) => { markdownBuffer += token; },
                            () => { mdSuccess = true; resolve(); },
                            (err) => reject(err),
                            MODEL_NAME
                        );
                    });
                } catch (err: any) {
                    mdAttempts++;
                    addLog(`生成 Markdown 失败 (${err.message})，重试 ${mdAttempts}/3...`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (!mdSuccess) {
                addLog(` > [${item.name}] Markdown 生成失败，跳过后续步骤。`);
                continue;
            }

            // Save Markdown
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, markdownDetail: markdownBuffer } : t));

            // 2. Generate HTML
            addLog(` > 正在生成 HTML 幻灯片代码...`);
            const htmlPrompt = `${PROMPT_HTML_GEN}\n\n**待转换的 Markdown 内容:**\n${markdownBuffer}`;
            
            let htmlBuffer = "";
            let htmlAttempts = 0;
            let htmlSuccess = false;

            while (htmlAttempts < 3 && !htmlSuccess) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        htmlBuffer = ""; // Reset buffer
                        streamOpenRouterChat(
                            [{ role: 'user', content: htmlPrompt }],
                            (token) => htmlBuffer += token,
                            () => { htmlSuccess = true; resolve(); },
                            (err) => reject(err),
                            MODEL_NAME
                        );
                    });
                } catch (err: any) {
                    htmlAttempts++;
                    addLog(`生成 HTML 失败 (${err.message})，重试 ${htmlAttempts}/3...`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (htmlSuccess) {
                // Extract Clean HTML
                let cleanHtml = htmlBuffer;
                const match = htmlBuffer.match(/```html([\s\S]*?)```/);
                if (match) cleanHtml = match[1];

                // Save HTML
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, htmlCode: cleanHtml } : t));
                addLog(` > [${item.name}] 处理完成。`);
            } else {
                addLog(` > [${item.name}] HTML 生成失败。`);
            }
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
            <div className="flex flex-col h-full p-10 animate-in fade-in zoom-in">
                {csvRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
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
                    </div>
                ) : (
                    <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">预览 CSV 数据</h2>
                                <p className="text-slate-500 text-sm mt-1">共 {csvRows.length} 行数据，请确认无误后开始识别。</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        accept=".csv,.txt"
                                        onChange={handleFileUpload} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50">
                                        重新上传
                                    </button>
                                </div>
                                <button 
                                    onClick={startIdentification}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2"
                                >
                                    <PlayIcon className="w-4 h-4" /> 开始识别
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                            <div className="overflow-auto custom-scrollbar flex-1">
                                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 border-b border-slate-200 w-12 text-center">#</th>
                                            {csvHeaders.map((header, i) => (
                                                <th key={i} className="p-3 border-b border-slate-200 whitespace-nowrap">{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {csvRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="p-3 text-center text-xs font-mono text-slate-400 border-r border-slate-100 bg-slate-50/30">{i + 1}</td>
                                                {row.map((cell, j) => (
                                                    <td key={j} className="p-3 max-w-xs truncate" title={cell}>{cell}</td>
                                                ))}
                                                {/* Fill remaining cells if row is shorter than header */}
                                                {Array.from({ length: Math.max(0, csvHeaders.length - row.length) }).map((_, j) => (
                                                    <td key={`empty-${j}`} className="p-3"></td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                
                <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-10"><input type="checkbox" checked readOnly className="rounded text-indigo-600" /></th>
                                <th className="p-4 w-48">技术名称</th>
                                <th className="p-4 w-32">领域</th>
                                <th className="p-4">描述</th>
                                <th className="p-4 w-32">现状</th>
                                <th className="p-4 w-40">原始链接</th>
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
                                    <td className="p-4 text-xs">
                                        {item.originalUrl ? (
                                            <a href={item.originalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 max-w-[150px] truncate">
                                                <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                                                链接
                                            </a>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
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
                                <p className="text-sm mt-2 opacity-70">Step 1: Deep Analysis &rarr; Step 2: HTML Coding</p>
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

// Simple PlayIcon component for the button
const PlayIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" clipRule="evenodd" />
    </svg>
);
