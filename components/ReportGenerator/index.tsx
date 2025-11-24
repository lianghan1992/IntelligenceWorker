
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon 
} from '../icons';
import { Slide } from '../../types';
import { searchSemantic } from '../../api';

// 模拟的AI思考过程和JSON输出
const mockAiThoughtProcess = `
> [AI 思考过程]
分析用户的核心指令：“PPT编写技巧指南”。这个组词没有明显的逻辑结构或语义关联，无法识别为宽泛的主题(idea)、结构化大纲(outline)或完整内容(full_content)。根据工作流程，当用户输入随意输入导致无法理解时，我需要生成一份关于PPT编写技巧的大纲，共5页。我将基于专业知识，构建一个逻辑严谨的大纲，涵盖PPT的关键要素，包括重要性、设计原则、内容组织、视觉元素和实践优化，确保每个页面标题精炼、内容摘要简明扼要。

> [AI JSON 输出]
---FINAL_JSON_OUTPUT---
{
  "type": "outline",
  "data": {
    "title": "PPT编写技巧指南",
    "pages": [
      {
        "title": "引言：PPT的重要性",
        "content": "介绍PPT在商业和学术中的关键作用，以及为什么掌握编写技巧至关重要。"
      },
      {
        "title": "设计原则：简洁与清晰",
        "content": "讨论PPT设计的基本原则，如使用简洁的布局、一致的字体和颜色，确保信息易于理解。"
      },
      {
        "title": "内容组织：逻辑结构",
        "content": "讲解如何组织PPT内容，包括使用标题、要点、图表等，确保逻辑流畅。"
      },
      {
        "title": "视觉元素：图表与图像",
        "content": "强调使用高质量图表和图像来增强视觉吸引力，避免信息过载。"
      },
      {
        "title": "实践与优化",
        "content": "提供实用技巧，如排练演讲、获取反馈，以及如何根据受众调整内容。"
      }
    ]
  }
}
`;

// --- 流程动画卡片组件 ---
const ProcessFlowCards: React.FC = () => {
    const steps = [
        { id: 1, icon: LightBulbIcon, title: "意图识别", desc: "NLP 语义解析与需求拆解", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
        { id: 2, icon: BrainIcon, title: "深度推理", desc: "知识库检索与逻辑关联", color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100" },
        { id: 3, icon: ViewGridIcon, title: "结构规划", desc: "生成多级大纲与叙事流", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
        { id: 4, icon: SparklesIcon, title: "内容生成", desc: "RAG 增强专业写作", color: "text-pink-500", bg: "bg-pink-50", border: "border-pink-100" },
        { id: 5, icon: ChartIcon, title: "智能排版", desc: "自适应图文可视化布局", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
    ];

    return (
        <div className="mt-20 w-full max-w-6xl px-4 animate-in slide-in-from-bottom-10 duration-1000 fade-in fill-mode-forwards">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold tracking-wider uppercase border border-gray-200 shadow-sm">
                    <SparklesIcon className="w-3 h-3 text-indigo-500" />
                    Agentic Workflow Engine
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                {/* Background Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent -translate-y-1/2 -z-10"></div>
                
                {steps.map((step, i) => (
                    <div 
                        key={step.id} 
                        className="relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center z-10"
                        style={{ transitionDelay: `${i * 100}ms` }}
                    >
                        {/* Step Number Badge */}
                        <div className="absolute -top-3 bg-white text-[10px] font-bold text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full shadow-sm">
                            0{step.id}
                        </div>

                        {/* Connector Arrow (Absolute, centered between cards) */}
                        {i < steps.length - 1 && (
                            <div className="hidden md:block absolute -right-[1.75rem] top-1/2 -translate-y-1/2 z-0 text-gray-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        )}

                        <div className={`mb-4 p-4 rounded-2xl ${step.bg} ${step.color} ${step.border} border group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                            <step.icon className="w-7 h-7" />
                        </div>
                        
                        <h4 className="font-bold text-gray-800 text-sm mb-1.5 group-hover:text-indigo-600 transition-colors">{step.title}</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 知识库检索模态框 ---
const KnowledgeSearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ article_id: string; content_chunk: string; score: number }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        try {
            // Top K: 20, Min Score: 0.5 as requested
            const response = await searchSemantic(query, 20, 0.5);
            setResults(response.items || []);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 relative">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">知识库语义检索</h3>
                            <p className="text-xs text-gray-500">基于向量相似度匹配的高价值情报片段</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 bg-white">
                    <form onSubmit={handleSearch} className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="输入关键词或描述，例如 '固态电池最新进展'..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3.5 pl-12 pr-32 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-sm"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !query.trim()}
                            className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? '搜索中...' : '检索'}
                        </button>
                    </form>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
                            <p>AI 正在扫描知识库...</p>
                        </div>
                    ) : !hasSearched ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-60">
                            <DocumentTextIcon className="w-16 h-16 text-gray-300" />
                            <p>输入关键词开始检索</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <p className="text-lg font-medium">未找到相关内容</p>
                            <p className="text-sm mt-2">尝试更换关键词或降低相似度阈值</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {results.map((item, index) => (
                                <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
                                    {/* Score Badge */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100">
                                                置信度: {(item.score * 100).toFixed(1)}%
                                            </div>
                                            {item.score > 0.8 && (
                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                    强相关
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleCopy(item.content_chunk, index)}
                                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${copiedIndex === index ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                                        >
                                            {copiedIndex === index ? <CheckIcon className="w-3.5 h-3.5" /> : <DocumentTextIcon className="w-3.5 h-3.5" />}
                                            {copiedIndex === index ? '已复制' : '复制引用'}
                                        </button>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6 group-hover:line-clamp-none transition-all">
                                        {item.content_chunk}
                                    </div>
                                    
                                    {/* ID Reference (Optional) */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-mono">Ref ID: {item.article_id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer Info */}
                <div className="p-3 bg-white border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-400">共检索到 {results.length} 条相关片段 (Min Score: 0.5)</p>
                </div>
            </div>
        </div>
    );
};

// --- 阶段1: 创意输入 ---
const IdeaInput: React.FC<{ onGenerate: (idea: string) => void }> = ({ onGenerate }) => {
    const [idea, setIdea] = useState('');
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    return (
        <div className="flex flex-col items-center justify-start h-full overflow-y-auto pb-20 pt-10 sm:pt-16">
            <div className="w-full max-w-3xl text-center px-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">从一个想法开始</h1>
                <p className="mt-4 text-lg text-gray-600">描述您报告的核心概念，让我们的AI为您构建基础。</p>
                <p className="mt-1 text-sm text-gray-500">支持上传用户私有数据，使报告内容更聚焦，支持格式为: TXT, MD, PDF, DOCX</p>
                
                <div className="mt-8">
                     <a href="#" className="text-blue-600 font-semibold hover:underline">如您已有大纲或完整PPT每页内容，请直接粘贴，AI将自动为您解析</a>
                </div>

                <div className="mt-4 relative">
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="例如，‘从一位智能汽车行业研究专家的角度编写一份10页左右关于端到端自动驾驶技术未来3-5年的技术路线报告，汇报对象为集团高层和技术专家’"
                        className="w-full h-48 p-6 text-base bg-white rounded-2xl shadow-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button className="w-full sm:w-auto px-6 py-3 border border-gray-300 bg-white text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition">
                        上传辅助文件 (可选)
                    </button>
                    
                    {/* NEW: Knowledge Base Search Button */}
                    <button 
                        onClick={() => setIsSearchModalOpen(true)}
                        className="w-full sm:w-auto px-6 py-3 border border-purple-200 bg-purple-50 text-purple-700 font-semibold rounded-lg shadow-sm hover:bg-purple-100 transition flex items-center justify-center gap-2"
                    >
                        <SearchIcon className="w-4 h-4" />
                        检索知识库
                    </button>

                    <button 
                        onClick={() => onGenerate(idea)}
                        disabled={!idea.trim()}
                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                        生成 <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* Process Flow Visualization */}
            <ProcessFlowCards />
            
            {/* Search Modal */}
            {isSearchModalOpen && (
                <KnowledgeSearchModal onClose={() => setIsSearchModalOpen(false)} />
            )}
        </div>
    );
};

// --- 阶段2: 生成进度 ---
const GenerationProgress: React.FC<{ title: string; onComplete: () => void }> = ({ title, onComplete }) => {
    const [log, setLog] = useState('');
    const fullLog = `> 初始化报告生成流程...
> 任务ID: gen_1750689845867
> 分析请求...
> 正在连接AI模型 (zhipu@glm-4.5-flash) ...
${mockAiThoughtProcess}`;

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setLog(prev => prev + fullLog[index]);
            index++;
            if (index >= fullLog.length) {
                clearInterval(interval);
                setTimeout(onComplete, 1000); // Wait a bit after finishing
            }
        }, 10); // Faster typing speed
        return () => clearInterval(interval);
    }, []);

    return (
         <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-gray-900/50">
                     <h2 className="text-lg font-bold text-white text-center">{title}</h2>
                </div>
                <div className="p-6 h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                        {log}
                        <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
                    </pre>
                </div>
            </div>
        </div>
    );
};

// --- 阶段3: 大纲审查 ---
const OutlineEditor: React.FC<{ outline: Slide[]; onGenerateContent: () => void }> = ({ outline, onGenerateContent }) => (
    <div className="max-w-4xl mx-auto animate-in fade-in-0">
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-gray-900">报告标题</h2>
            <p className="text-blue-600 text-lg">PPT编写技巧指南</p>
        </div>
        
        <div className="space-y-4 mb-8">
            {outline.map((slide, index) => (
                <div key={slide.id} className="bg-white p-5 rounded-xl border border-gray-200 flex items-start gap-4 shadow-sm">
                    <div className="flex-shrink-0 bg-gray-100 text-gray-600 font-bold rounded-full h-8 w-8 flex items-center justify-center border">{index + 1}</div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{slide.title}</h3>
                        <p className="text-gray-600 mt-1">{slide.content}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-blue-500" />
                AI 智能修订
            </h3>
            <textarea
                placeholder="请输入您对大纲的整体修改意见。例如：“增加一个市场竞争分析章节”或“将技术挑战和商业化前景合并”"
                className="w-full h-24 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={onGenerateContent}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition transform hover:scale-105"
                >
                    生成内容
                </button>
            </div>
        </div>
    </div>
);


// --- 阶段4: 内容生成 ---
const ContentGeneratorView: React.FC<{ slides: Slide[]; onComplete: () => void }> = ({ slides: initialSlides, onComplete }) => {
    const [slides, setSlides] = useState(initialSlides);

    useEffect(() => {
        let currentSlide = 0;
        const processSlide = () => {
            if (currentSlide >= slides.length) {
                setTimeout(onComplete, 1000);
                return;
            }
            
            // Mark as generating
            setSlides(prev => prev.map((s, i) => i === currentSlide ? { ...s, status: 'generating' } : s));
            
            // Simulate generation
            setTimeout(() => {
                setSlides(prev => prev.map((s, i) => i === currentSlide ? { 
                    ...s, 
                    status: 'done',
                    content: `这是为“${s.title}”页面生成的详细内容。AI会根据大纲中的摘要进行扩展，填充具体的数据点、分析和论据。例如，在设计原则部分，可以详细阐述留白、对比、重复、对齐等具体技巧，并提供正反案例对比图。`
                } : s));
                currentSlide++;
                processSlide();
            }, 2000);
        };

        processSlide();
    }, []);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in-0">
            <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">内容生成</h2>
                 <p className="text-gray-600">实时跟踪您的报告生成进度。</p>
            </div>
            <div className="space-y-4">
                {slides.map(slide => (
                    <div key={slide.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-800 text-lg">{slide.title}</h3>
                            {slide.status === 'done' && <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">已完成</span>}
                            {slide.status === 'generating' && <span className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full animate-pulse">生成中...</span>}
                            {slide.status === 'queued' && <span className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-full">排队中</span>}
                        </div>
                         <div className="bg-gray-900 text-gray-300 font-mono text-sm rounded-lg p-4 h-32 overflow-y-auto">
                            {slide.status === 'generating' && <><span>{'>'} 正在连接AI模型 (zhipu@glm-4.5-flash)...</span><br/><span>{'>'} 分析页面主题：“{slide.title}”</span><br/><span>{'>'} 生成草稿...</span><span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" /></>}
                            {slide.status === 'queued' && <span>{'>'} 排队等待生成...</span>}
                            {slide.status === 'done' && <span>{'>'} 页面内容生成完毕。</span>}
                        </div>
                        {slide.status === 'done' && 
                            <div className="mt-4 flex justify-end">
                                <button className="px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 text-sm">
                                    <SparklesIcon className="w-4 h-4 inline-block mr-1" />
                                    AI 修改
                                </button>
                            </div>
                        }
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- 阶段5: 报告预览 ---
const ReportPreview: React.FC<{ slides: Slide[]; onStartOver: () => void }> = ({ slides, onStartOver }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleExport = () => {
        alert("正在准备导出为PDF...");
    };
    
    const goToNext = () => setCurrentIndex(prev => (prev + 1) % slides.length);
    const goToPrev = () => setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in-0">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-gray-700 font-semibold hover:bg-gray-100">
                    <ArrowLeftIcon className="w-4 h-4"/>
                    重新开始
                </button>
                <h2 className="text-xl font-bold text-gray-800">报告预览</h2>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                    <DownloadIcon className="w-4 h-4"/>
                    导出为PDF
                </button>
            </div>
            
            {/* Slide */}
            <div className="aspect-video w-full bg-white rounded-xl shadow-lg border p-8 sm:p-12 flex flex-col">
                <h3 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">{slides[currentIndex].title}</h3>
                <div className="text-base sm:text-lg text-gray-700 leading-relaxed prose max-w-none">
                    <p>{slides[currentIndex].content}</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-4">
                <button onClick={goToPrev} className="p-3 bg-white border rounded-full shadow-sm hover:bg-gray-100">
                    <ArrowLeftIcon className="w-5 h-5"/>
                </button>
                <span className="font-semibold text-gray-700">{currentIndex + 1} / {slides.length}</span>
                <button onClick={goToNext} className="p-3 bg-white border rounded-full shadow-sm hover:bg-gray-100">
                    <ArrowRightIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};


export const ReportGenerator: React.FC = () => {
    const [flowState, setFlowState] = useState<'idea' | 'generatingOutline' | 'outlineReview' | 'generatingContent' | 'preview'>('idea');
    const [slides, setSlides] = useState<Slide[]>([]);

    const handleStartOutlineGeneration = () => {
        setFlowState('generatingOutline');
    };
    
    const handleOutlineGenerated = () => {
        const outlineData = JSON.parse(mockAiThoughtProcess.split('---FINAL_JSON_OUTPUT---')[1]).data;
        const initialSlides: Slide[] = outlineData.pages.map((page: any, index: number) => ({
            id: `slide-${index}`,
            title: page.title,
            content: page.content, // Initially content is the outline summary
            status: 'queued',
        }));
        setSlides(initialSlides);
        setFlowState('outlineReview');
    };

    const handleStartContentGeneration = () => {
        setFlowState('generatingContent');
    };
    
    const handleStartOver = () => {
        setSlides([]);
        setFlowState('idea');
    };

    const renderContent = () => {
        switch (flowState) {
            case 'idea':
                return <IdeaInput onGenerate={handleStartOutlineGeneration} />;
            case 'generatingOutline':
                return <GenerationProgress title="正在生成大纲..." onComplete={handleOutlineGenerated} />;
            case 'outlineReview':
                return <OutlineEditor outline={slides} onGenerateContent={handleStartContentGeneration} />;
            case 'generatingContent':
                return <ContentGeneratorView slides={slides} onComplete={() => setFlowState('preview')} />;
            case 'preview':
                return <ReportPreview slides={slides} onStartOver={handleStartOver} />;
            default:
                return <IdeaInput onGenerate={handleStartOutlineGeneration} />;
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50/50 min-h-full">
            {renderContent()}
        </div>
    );
};
