
import React, { useRef, useEffect, useState } from 'react';
import { 
    SparklesIcon, CheckCircleIcon, RefreshIcon,
    DatabaseIcon, GlobeIcon, DocumentTextIcon,
    ArrowRightIcon, CheckIcon, ExternalLinkIcon,
    BrainIcon, SearchIcon, PencilIcon, StopIcon,
    ChevronDownIcon, ClipboardIcon, DownloadIcon
} from '../../../../components/icons';
import { marked } from 'marked';
import { GenStatus } from './index';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export type SectionStatus = 'pending' | 'planning' | 'searching' | 'writing' | 'completed' | 'error';

export interface ReportSection {
    id: string;
    title: string;
    instruction: string;
    status: SectionStatus;
    content: string;
    logs: string[];
    references: { title: string; url: string; source: string; snippet?: string }[];
    currentThought?: string; // New: Agent's reasoning stream
}

interface ReportCanvasProps {
    mainStatus: GenStatus;
    topic: string;
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    currentSectionIdx: number;
    onStart: () => void;
    onRetry: (idx: number) => void;
}

// --- Component: Hero / Empty State ---
const ResearchHero: React.FC<{ topic: string }> = ({ topic }) => (
    <div className="h-full flex flex-col items-center justify-center p-12 bg-white relative overflow-hidden">
        {/* Background Grid & Decor */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 text-center max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-8 animate-in fade-in zoom-in duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Deep Research Engine Ready</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 drop-shadow-sm">
                深度研究
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">.AI</span>
            </h1>
            
            <p className="text-lg text-slate-500 leading-relaxed font-medium">
                {topic ? `正在为您规划关于 “${topic}” 的研究路径...` : "全网实时数据检索 · 深度逻辑推理 · 专家级长文报告"}
            </p>
        </div>
    </div>
);

// --- Component: Thinking Bubble (Reused) ---
const ThinkingBubble: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if(isStreaming && isExpanded && ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    if (!content) return null;

    return (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm mx-6 mt-4">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors select-none"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>Agent 思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div 
                    ref={ref}
                    className="px-4 pb-3 max-h-48 overflow-y-auto custom-scrollbar text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap italic"
                >
                    {content}
                </div>
            )}
        </div>
    );
};

// --- Component: Active Processing Card (Redesigned) ---
const ActiveSectionCard: React.FC<{ section: ReportSection }> = ({ section }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const isStopped = section.status === 'error'; // We use error status for stopped state too
    
    // Auto-scroll as content generates
    useEffect(() => {
        if (contentRef.current && section.status === 'writing') {
             contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [section.content, section.status]);

    const getStepStatus = (stepName: string) => {
        // If stopped, freeze the indicators
        if (isStopped) {
             const order = ['planning', 'searching', 'writing'];
             if (section.content && stepName === 'writing') return 'active'; // Stopped while writing
             if (section.references.length > 0 && stepName === 'searching') return 'completed';
             return 'pending';
        }

        const order = ['planning', 'searching', 'writing', 'completed'];
        const currentIndex = order.indexOf(section.status);
        const stepIndex = order.indexOf(stepName);
        
        if (currentIndex > stepIndex) return 'completed';
        if (currentIndex === stepIndex) return 'active';
        return 'pending';
    };

    const steps = [
        { id: 'planning', label: '规划路径', icon: BrainIcon },
        { id: 'searching', label: '全网检索', icon: SearchIcon },
        { id: 'writing', label: '深度撰写', icon: PencilIcon },
    ];

    return (
        <div className={`my-10 bg-white rounded-2xl border shadow-2xl shadow-indigo-200/20 overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700 ring-1 ${isStopped ? 'border-red-200 ring-red-100' : 'border-indigo-100 ring-indigo-50/50'}`}>
            {/* 1. Header: Steps & Title */}
            <div className={`border-b ${isStopped ? 'bg-red-50/30 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="p-6 pb-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            {isStopped ? (
                                <span className="flex h-3 w-3 relative items-center justify-center">
                                    <StopIcon className="w-4 h-4 text-red-500" />
                                </span>
                            ) : (
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            )}
                            {section.title}
                            {isStopped && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200">已停止</span>}
                        </h2>
                        
                        {/* Improved Step Indicators (Pretty Design) */}
                        <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                            {steps.map((step, i) => {
                                const st = getStepStatus(step.id);
                                return (
                                    <div key={step.id} className="flex items-center">
                                        <div className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300
                                            ${st === 'active' && !isStopped ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md transform scale-105' : 
                                            st === 'active' && isStopped ? 'bg-red-100 text-red-600 border border-red-200' :
                                            st === 'completed' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}
                                        `}>
                                            {st === 'active' && !isStopped && <RefreshIcon className="w-3 h-3 animate-spin" />}
                                            {st === 'completed' && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                            <step.icon className={`w-3.5 h-3.5 ${st === 'pending' ? 'opacity-50' : ''}`} />
                                            <span>{step.label}</span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div className={`w-6 h-0.5 mx-1 rounded-full ${st === 'completed' ? 'bg-indigo-100' : 'bg-slate-100'}`}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Current Log Display */}
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm w-fit">
                        <span className="text-indigo-500 font-bold">{'>'}</span>
                        <span className={isStopped ? '' : 'animate-pulse'}>{section.logs[section.logs.length - 1] || 'Initializing...'}</span>
                    </div>
                </div>

                {/* Agent Thinking Stream - Displayed before References/Content if available */}
                {section.currentThought && section.status !== 'completed' && !isStopped && (
                    <ThinkingBubble content={section.currentThought} isStreaming={true} />
                )}
            </div>

            {/* 2. Reference Deck (Horizontal Scroll) */}
            <div className="border-b border-slate-100 bg-slate-50/30 p-4">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <DatabaseIcon className="w-3.5 h-3.5" />
                    引用来源 ({section.references.length})
                </div>
                
                {section.references.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                        {section.references.map((ref, i) => (
                            <a 
                                key={i} 
                                href={ref.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex-shrink-0 w-64 bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group snap-start cursor-pointer block text-left"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-blue-100">
                                            {i + 1}
                                        </div>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                            {ref.source}
                                        </span>
                                    </div>
                                    <ExternalLinkIcon className="w-3 h-3 text-slate-300 group-hover:text-indigo-500" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-700 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors mb-1">
                                    {ref.title}
                                </h4>
                                {ref.snippet && (
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed opacity-80">
                                        {ref.snippet}
                                    </p>
                                )}
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 italic px-2 py-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
                        {section.status === 'planning' ? '等待检索任务启动...' : (isStopped ? '未找到引用资料' : '正在全网搜寻相关资料...')}
                    </div>
                )}
            </div>

            {/* 3. Live Writing Area */}
            <div className="p-8 bg-white min-h-[300px] relative">
                <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none select-none">
                    Live Draft Preview
                </div>
                
                {section.content ? (
                    <article 
                        className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-800"
                        dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-300 gap-3">
                         <div className={`w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center ${isStopped ? '' : 'animate-pulse'}`}>
                             <PencilIcon className="w-5 h-5 text-slate-300" />
                         </div>
                         <p className="text-sm font-medium">{isStopped ? '内容生成已中断' : 'AI 正在组织语言...'}</p>
                    </div>
                )}
                
                {/* Blinking Cursor Indicator if writing */}
                {section.status === 'writing' && (
                    <div className="mt-2 w-2 h-4 bg-indigo-500 animate-pulse inline-block"></div>
                )}
            </div>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    mainStatus, topic, sections, currentSectionIdx
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isExportingWord, setIsExportingWord] = useState(false);

    // Initial View
    if (mainStatus === 'planning' || !topic) {
        return <ResearchHero topic={topic} />;
    }

    const handleCopyMarkdown = async () => {
        let text = `# ${topic}\n\n`;
        sections.forEach(s => {
            text += `## ${s.title}\n\n${s.content}\n\n`;
            if (s.references.length > 0) {
                text += `### 参考来源\n`;
                s.references.forEach((r, i) => {
                    text += `${i+1}. [${r.title}](${r.url}) - ${r.source}\n`;
                });
                text += `\n`;
            }
        });
        await navigator.clipboard.writeText(text);
        alert('完整报告内容已复制 (Markdown)');
    };

    const handleExportWord = async () => {
        if (isExportingWord) return;
        setIsExportingWord(true);
        try {
            const docChildren: any[] = [];
            // Title
            docChildren.push(new Paragraph({ 
                text: topic, 
                heading: HeadingLevel.TITLE, 
                alignment: AlignmentType.CENTER 
            }));

            sections.forEach(section => {
                // Section Title
                docChildren.push(new Paragraph({ 
                    text: section.title, 
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }));

                // Content (Basic Parsing)
                const lines = section.content.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return;
                    
                    const runs: TextRun[] = [];
                    const boldRegex = /\*\*(.*?)\*\*/g;
                    let lastIndex = 0;
                    let match;
                    while ((match = boldRegex.exec(trimmed)) !== null) {
                        if (match.index > lastIndex) {
                            runs.push(new TextRun({ text: trimmed.substring(lastIndex, match.index) }));
                        }
                        runs.push(new TextRun({ text: match[1], bold: true }));
                        lastIndex = boldRegex.lastIndex;
                    }
                    if (lastIndex < trimmed.length) {
                         runs.push(new TextRun({ text: trimmed.substring(lastIndex) }));
                    }
                    if (runs.length === 0) runs.push(new TextRun({ text: trimmed }));
                    
                    docChildren.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
                });
                
                // References
                if (section.references && section.references.length > 0) {
                     docChildren.push(new Paragraph({ 
                        text: '参考来源:', 
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 200, after: 100 }
                    }));
                    section.references.forEach((ref, idx) => {
                         docChildren.push(new Paragraph({
                             children: [
                                 new TextRun({ text: `[${idx+1}] ${ref.title}`, style: "Hyperlink" }),
                                 new TextRun({ text: ` - ${ref.source} (${ref.url})`, color: "666666" })
                             ],
                             bullet: { level: 0 }
                         }));
                    });
                }
            });

            const doc = new Document({ 
                sections: [{ 
                    properties: {}, 
                    children: docChildren 
                }] 
            });
            
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${topic}_深度研究报告.docx`);
        } catch (e) {
            alert('导出失败');
            console.error(e);
        } finally {
            setIsExportingWord(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] relative">
            {/* Sticky Header with Actions */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                    <DocumentTextIcon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <h2 className="font-bold text-lg text-slate-800 truncate max-w-md">{topic}</h2>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCopyMarkdown}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                    >
                        <ClipboardIcon className="w-3.5 h-3.5" />
                        复制 Markdown
                    </button>
                    <button 
                        onClick={handleExportWord}
                        disabled={isExportingWord}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExportingWord ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5" />}
                        导出 Word
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-6 md:p-12">
                <div className="max-w-4xl mx-auto pb-40">
                    {/* Document Intro */}
                    <div className="text-center mb-20 pt-4 pb-10 border-b border-slate-200/60">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                            <SparklesIcon className="w-3 h-3" /> Deep Research Report
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                            {topic}
                        </h1>
                        <div className="flex justify-center gap-8 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <CheckIcon className="w-3.5 h-3.5 text-green-500" /> Auto-Generated
                            </span>
                            <span>•</span>
                            <span>{new Date().toLocaleDateString()}</span>
                            <span>•</span>
                            <span>AI Research Agent</span>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-12">
                        {sections.map((section, idx) => {
                            // Completed Section
                            if (section.status === 'completed') {
                                return (
                                    <section key={section.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative group">
                                        <div className="hidden lg:block absolute -left-12 top-1 text-right w-8">
                                            <span className="text-xl font-black text-slate-200 group-hover:text-indigo-200 transition-colors">
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <div className="mb-4 flex items-baseline gap-4">
                                            <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                                        </div>
                                        
                                        <article 
                                            className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-800 prose-strong:text-slate-900 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
                                            dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                                        />
                                        
                                        {/* References Footnote */}
                                        {section.references.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-slate-100">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sources</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {section.references.map((r, ri) => (
                                                        <a 
                                                            key={ri} 
                                                            href={r.url} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all max-w-[200px]"
                                                        >
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <span className="truncate">{r.title}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                );
                            }
                            
                            // Active Section (Current or Stopped)
                            if (idx === currentSectionIdx || section.status === 'error') {
                                return <ActiveSectionCard key={section.id} section={section} />;
                            }

                            // Pending Section (Visual Placeholder)
                            return (
                                <div key={section.id} className="p-6 border-2 border-dashed border-slate-100 rounded-2xl opacity-60">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl font-black text-slate-100">{String(idx + 1).padStart(2, '0')}</span>
                                        <h3 className="text-lg font-bold text-slate-300">{section.title}</h3>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Completion Banner */}
                    {mainStatus === 'finished' && sections.every(s => s.status !== 'error') && (
                        <div className="mt-20 p-10 bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[32px] text-center space-y-4 animate-in zoom-in duration-1000 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <SparklesIcon className="w-48 h-48 text-white" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/50 animate-bounce">
                                    <CheckCircleIcon className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tight">研究报告已交付</h2>
                                <p className="text-indigo-200 text-sm max-w-lg mx-auto leading-relaxed font-medium">
                                    全流程深度研究已完成。您可以使用上方的工具栏导出报告。
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div ref={bottomRef} className="h-10"></div>
                </div>
            </div>
        </div>
    );
};
