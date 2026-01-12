
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CloudIcon, ArrowRightIcon, RefreshIcon, CheckIcon, DocumentTextIcon, DownloadIcon, ExternalLinkIcon, CodeIcon, EyeIcon, ClockIcon } from '../../../icons';
import { streamOpenRouterChat } from '../../utils/llm';
import { generatePdf } from '../../utils/services';
import { PROMPT_IDENTIFICATION, PROMPT_DEEP_DIVE, PROMPT_HTML_GEN } from './prompts';
import { createSession } from '../../../../api/stratify';
import { AGENTS } from '../../../../agentConfig';
import { marked } from 'marked';

// Updated model with 'openrouter@' prefix for the new gateway
const MODEL_NAME = "openrouter@xiaomi/mimo-v2-flash:free";

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
    generationStatus?: 'pending' | 'analyzing' | 'coding' | 'done' | 'error';
}

type Step = 'upload' | 'identify' | 'select' | 'generate';

// Helper component for scaling slide
const ScaledSlide: React.FC<{ html: string }> = ({ html }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const targetRatio = 16 / 9;
                const containerRatio = clientWidth / clientHeight;
                
                let newScale;
                if (containerRatio > targetRatio) {
                    // Container is wider than 16:9, scale based on height
                    newScale = (clientHeight - 40) / 900;
                } else {
                    // Container is narrower, scale based on width
                    newScale = (clientWidth - 40) / 1600;
                }
                setScale(newScale);
            }
        };

        window.addEventListener('resize', updateScale);
        updateScale();
        // Delay update to ensure layout is settled
        setTimeout(updateScale, 100);

        return () => window.removeEventListener('resize', updateScale);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-slate-100 overflow-hidden relative">
             <div 
                style={{ 
                    width: '1600px', 
                    height: '900px', 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'center center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
                className="bg-white"
            >
                <iframe 
                    srcDoc={html}
                    className="w-full h-full border-none bg-white pointer-events-none select-none"
                    title="Slide Preview"
                />
            </div>
            {/* Overlay to block iframe interactions */}
            <div className="absolute inset-0 z-10 bg-transparent"></div>
        </div>
    );
};

// Helper for Markdown rendering
const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
    const html = useMemo(() => {
        try {
            return marked.parse(content) as string;
        } catch (e) {
            return `<pre class="whitespace-pre-wrap">${content}</pre>`;
        }
    }, [content]);

    return (
        <div className="prose prose-sm max-w-none p-8 bg-white shadow-sm border border-slate-200 rounded-xl overflow-y-auto h-full custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <RefreshIcon className="w-3 h-3 animate-spin" />
                正在生成深度分析报告...
            </h3>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {/* Auto-scroll anchor */}
            <div className="h-4" /> 
        </div>
    );
};

// Helper for Code Streaming
const CodeTerminal: React.FC<{ code: string }> = ({ code }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [code]);

    return (
        <div className="bg-[#1e1e1e] text-green-400 font-mono text-xs p-6 rounded-xl shadow-2xl h-full flex flex-col overflow-hidden border border-slate-700">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <span className="flex items-center gap-2 font-bold text-slate-300">
                    <CodeIcon className="w-4 h-4" /> 
                    HTML Generator
                </span>
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-green-500 animate-pulse">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Live Coding
                </span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed opacity-90 custom-scrollbar-dark">
                {code}
                <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse align-middle"></span>
            </div>
        </div>
    );
};

// Helper for Static Code Viewer
const SourceCodeViewer: React.FC<{ code: string }> = ({ code }) => {
    return (
        <div className="w-full h-full bg-[#1e1e1e] flex flex-col relative overflow-hidden">
             <div className="flex-1 overflow-auto custom-scrollbar-dark p-6">
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                    {code}
                </pre>
             </div>
        </div>
    );
};

export default function NewTechIdentifier() {
    const [step, setStep] = useState<Step>('upload');
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [techList, setTechList] = useState<TechItem[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    // View Mode for Result (Slide or Code)
    const [viewMode, setViewMode] = useState<'slide' | 'code'>('slide');
    const [copyStatus, setCopyStatus] = useState('复制代码');

    const logEndRef = useRef<HTMLDivElement>(null);

    // --- Helpers ---
    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // Ensure session exists
    const ensureSession = async () => {
        if (sessionId) return sessionId;
        try {
            // Use global agent ID
            const sess = await createSession(AGENTS.NEW_TECH_IDENTIFIER, 'New Tech Analysis Task');
            setSessionId(sess.id);
            return sess.id;
        } catch (e) {
            console.error("Failed to create session", e);
            return null;
        }
    };

    // --- CSV Parser ---
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
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
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

    // --- Step 2: Identify ---
    const parseJsonResult = (text: string): TechItem[] => {
        try {
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
                isSelected: true,
                generationStatus: 'pending'
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

        const activeSessionId = await ensureSession();

        const BATCH_SIZE = 5;
        const headerStr = csvHeaders.join(',');
        
        for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
            const batch = csvRows.slice(i, i + BATCH_SIZE);
            addLog(`正在分析第 ${i + 1} - ${Math.min(i + BATCH_SIZE, csvRows.length)} 行...`);
            
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
                            (token) => { buffer += token; },
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
                            (err) => reject(err),
                            MODEL_NAME,
                            activeSessionId || undefined
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

    // --- Step 4: Generation Loop (Updated with Streaming) ---
    const generateReports = async () => {
        const selectedItems = techList.filter(t => t.isSelected);
        if (selectedItems.length === 0) {
            alert("请至少选择一项技术");
            return;
        }

        const activeSessionId = await ensureSession();

        setStep('generate');
        setIsProcessing(true);
        setViewMode('slide'); // Reset view to slide when starting generation

        for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i];
            setCurrentProcessingIndex(i);
            addLog(`正在处理 [${i + 1}/${selectedItems.length}]: ${item.name}...`);

            // 1. Generate Deep Dive Markdown
            // Update status to 'analyzing'
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, generationStatus: 'analyzing', markdownDetail: '' } : t));
            
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
                            (token) => { 
                                markdownBuffer += token;
                                // Streaming Update
                                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, markdownDetail: markdownBuffer } : t));
                            },
                            () => { mdSuccess = true; resolve(); },
                            (err) => reject(err),
                            MODEL_NAME,
                            activeSessionId || undefined
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
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, generationStatus: 'error' } : t));
                continue;
            }

            // 2. Generate HTML
            // Update status to 'coding'
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, generationStatus: 'coding', htmlCode: '' } : t));
            
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
                            (token) => {
                                htmlBuffer += token;
                                // Streaming Update for Terminal View
                                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, htmlCode: htmlBuffer } : t));
                            },
                            () => { htmlSuccess = true; resolve(); },
                            (err) => reject(err),
                            MODEL_NAME,
                            activeSessionId || undefined
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
                else {
                     // Fallback: look for <!DOCTYPE html> start
                     const startIdx = htmlBuffer.indexOf('<!DOCTYPE html>');
                     if (startIdx !== -1) cleanHtml = htmlBuffer.substring(startIdx);
                }

                // Save HTML and mark done
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, htmlCode: cleanHtml, generationStatus: 'done' } : t));
                addLog(` > [${item.name}] 处理完成。`);
            } else {
                addLog(` > [${item.name}] HTML 生成失败。`);
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, generationStatus: 'error' } : t));
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

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopyStatus('已复制!');
            setTimeout(() => setCopyStatus('复制代码'), 2000);
        } catch (e) {
            alert('复制失败');
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

    // 2. Processing Logs
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
        const isDone = currentItem?.generationStatus === 'done';

        return (
            <div className="h-full flex overflow-hidden bg-slate-50">
                {/* Sidebar List */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between items-center bg-gray-50/50">
                         <span>生成队列 ({selectedItems.length})</span>
                         {isProcessing && <RefreshIcon className="w-4 h-4 text-indigo-600 animate-spin" />}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {selectedItems.map((item, idx) => (
                            <div 
                                key={item.id}
                                className={`group p-3 rounded-xl border text-sm transition-all cursor-pointer flex flex-col gap-1 ${
                                    idx === currentProcessingIndex 
                                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                                        : item.generationStatus === 'done'
                                            ? 'border-green-200 bg-green-50/30'
                                            : 'border-transparent hover:bg-slate-50'
                                }`}
                                onClick={() => !isProcessing && setCurrentProcessingIndex(idx)}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`font-bold truncate ${idx === currentProcessingIndex ? 'text-indigo-900' : 'text-slate-700'}`}>{idx+1}. {item.name}</span>
                                    <div className="flex-shrink-0 ml-2">
                                        {item.generationStatus === 'done' && <CheckIcon className="w-4 h-4 text-green-600" />}
                                        {(item.generationStatus === 'analyzing' || item.generationStatus === 'coding') && <RefreshIcon className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                                        {item.generationStatus === 'error' && <span className="text-xs text-red-500 font-bold">Error</span>}
                                        {item.generationStatus === 'pending' && <span className="text-[10px] text-slate-300">Wait</span>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs opacity-70">
                                    <span className="truncate max-w-[150px]">{item.field}</span>
                                    <span className="uppercase text-[10px] font-bold tracking-wider">
                                        {item.generationStatus === 'analyzing' ? 'Analyzing...' : item.generationStatus === 'coding' ? 'Coding...' : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Log Console (Mini) */}
                    <div className="h-32 bg-[#0f172a] text-slate-400 font-mono text-[10px] p-3 overflow-auto custom-scrollbar-dark border-t border-slate-700 flex-shrink-0">
                         {logs.slice(-10).map((l,i) => <div key={i} className="mb-0.5 break-all">{l}</div>)}
                         <div ref={logEndRef} />
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
                    {/* Toolbar */}
                    <div className="h-14 bg-white border-b border-slate-200 flex justify-between items-center px-6 flex-shrink-0 z-20">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <h3 className="font-bold text-slate-800 truncate">{currentItem?.name}</h3>
                            <span className="text-xs text-slate-400 border-l border-slate-200 pl-3">
                                {currentItem?.generationStatus === 'analyzing' && 'Step 1: 深度分析与文案撰写'}
                                {currentItem?.generationStatus === 'coding' && 'Step 2: HTML 页面构建'}
                                {currentItem?.generationStatus === 'done' && 'Ready: 幻灯片预览'}
                            </span>
                        </div>
                        
                        {/* View Toggle */}
                        {isDone && (
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                 <button
                                    onClick={() => setViewMode('slide')}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'slide' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                 >
                                    <EyeIcon className="w-3.5 h-3.5" /> 预览
                                 </button>
                                 <button
                                    onClick={() => setViewMode('code')}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                 >
                                    <CodeIcon className="w-3.5 h-3.5" /> 代码
                                 </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                             {isDone && viewMode === 'code' && currentItem?.htmlCode && (
                                <button 
                                    onClick={() => handleCopyCode(currentItem.htmlCode!)}
                                    className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                                >
                                    {copyStatus}
                                </button>
                             )}

                            {currentItem?.htmlCode && (
                                <button 
                                    onClick={() => handleDownloadPDF(currentItem)}
                                    disabled={downloadingId === currentItem.id}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {downloadingId === currentItem.id ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4" />}
                                    导出 PDF
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Canvas Stage */}
                    <div className="flex-1 relative bg-slate-100 overflow-hidden">
                        {currentItem ? (
                            <>
                                {/* 1. Markdown Stream View */}
                                {currentItem.generationStatus === 'analyzing' && (
                                    <div className="absolute inset-0 p-8 flex justify-center">
                                        <div className="w-full max-w-3xl h-full animate-in fade-in zoom-in-95 duration-300">
                                            <MarkdownPreview content={currentItem.markdownDetail || ''} />
                                        </div>
                                    </div>
                                )}

                                {/* 2. Code Stream View (During Generation) */}
                                {currentItem.generationStatus === 'coding' && (
                                    <div className="absolute inset-0 p-8 flex justify-center bg-[#0f172a]">
                                        <div className="w-full max-w-4xl h-full animate-in fade-in duration-300">
                                            <CodeTerminal code={currentItem.htmlCode || ''} />
                                        </div>
                                    </div>
                                )}

                                {/* 3. Final Result View (Slide or Code) */}
                                {currentItem.generationStatus === 'done' && currentItem.htmlCode && (
                                    viewMode === 'slide' ? (
                                        <ScaledSlide html={currentItem.htmlCode} />
                                    ) : (
                                        <SourceCodeViewer code={currentItem.htmlCode} />
                                    )
                                )}

                                {/* 4. Pending/Empty State */}
                                {currentItem.generationStatus === 'pending' && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                         <ClockIcon className="w-16 h-16 opacity-20 mb-4" />
                                         <p className="font-medium">等待处理...</p>
                                     </div>
                                )}
                                
                                {currentItem.generationStatus === 'error' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
                                        <p className="font-bold">生成失败</p>
                                        <p className="text-sm">请查看日志了解详情</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                选择左侧项目以查看详情
                            </div>
                        )}
                    </div>
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
