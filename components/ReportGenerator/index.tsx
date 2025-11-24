
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon 
} from '../icons';
import { Slide, SearchChunkResult } from '../../types';
import { searchChunks } from '../../api';

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
const ProcessFlowCards: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, icon: LightBulbIcon, title: "意图识别", desc: "语义解析", color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
        { id: 2, icon: BrainIcon, title: "深度推理", desc: "逻辑关联", color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200" },
        { id: 3, icon: ViewGridIcon, title: "结构规划", desc: "大纲生成", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
        { id: 4, icon: SparklesIcon, title: "内容生成", desc: "RAG写作", color: "text-pink-600", bg: "bg-pink-100", border: "border-pink-200" },
        { id: 5, icon: ChartIcon, title: "智能排版", desc: "图文布局", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" },
    ];

    return (
        <div className="w-full max-w-5xl mx-auto mb-10 px-4">
            <div className="relative">
                {/* Connecting Line Background */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full hidden md:block"></div>
                
                {/* Steps Grid */}
                <div className="grid grid-cols-5 gap-2 md:gap-4 relative z-10">
                    {steps.map((step, i) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        const isPending = currentStep < step.id;

                        return (
                            <div 
                                key={step.id} 
                                className={`flex flex-col items-center text-center transition-all duration-500 ${isPending ? 'opacity-60 grayscale' : 'opacity-100'}`}
                            >
                                {/* Connector Progress (Active Line) */}
                                {i < steps.length - 1 && isCompleted && (
                                    <div className="hidden md:block absolute top-1/2 left-[10%] w-[20%] h-1 -translate-y-1/2 bg-indigo-500 transition-all duration-1000" style={{ left: `${(i * 20) + 10}%` }}></div>
                                )}

                                {/* Card/Icon Node */}
                                <div className={`
                                    relative w-12 h-12 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
                                    ${isActive 
                                        ? `bg-white ${step.border} shadow-[0_0_20px_rgba(0,0,0,0.1)] scale-110 z-20 ring-4 ring-white` 
                                        : isCompleted 
                                            ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' 
                                            : 'bg-gray-50 border-transparent text-gray-400'
                                    }
                                `}>
                                    <div className={`
                                        transition-colors duration-300
                                        ${isActive ? step.color : ''}
                                    `}>
                                        {isCompleted ? <CheckIcon className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                                    </div>
                                    
                                    {/* Pulse Effect for Active */}
                                    {isActive && (
                                        <span className={`absolute inset-0 rounded-2xl ${step.bg} opacity-30 animate-ping`}></span>
                                    )}
                                </div>
                                
                                {/* Text Labels */}
                                <div className="mt-3 md:mt-4 space-y-0.5">
                                    <h4 className={`text-[10px] md:text-sm font-bold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {step.title}
                                    </h4>
                                    <p className={`hidden md:block text-xs font-medium ${isActive ? step.color : 'text-transparent'}`}>
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- 知识库检索模态框 ---
const KnowledgeSearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchChunkResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        try {
            const response = await searchChunks({
                query_text: query,
                top_k: 20,
                similarity_threshold: 0.5
            });
            setResults(response.results || []);
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 relative animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-sm">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">知识库语义检索</h3>
                            <p className="text-xs text-gray-500 mt-0.5">基于向量相似度匹配，为您精准定位高价值情报片段</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 bg-white shadow-sm z-10">
                    <form onSubmit={handleSearch} className="relative group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="输入关键词或描述，例如 '固态电池最新进展'..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-32 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white focus:border-purple-500 transition-all shadow-inner"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !query.trim()}
                            className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 text-white font-bold text-sm rounded-lg hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            {isLoading ? '搜索中...' : '检索'}
                        </button>
                    </form>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
                            <p>AI 正在扫描向量数据库...</p>
                        </div>
                    ) : !hasSearched ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-60">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                <DocumentTextIcon className="w-10 h-10 text-gray-300" />
                            </div>
                            <p>输入关键词开始检索</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <p className="text-lg font-medium">未找到相关内容</p>
                            <p className="text-sm mt-2 text-gray-400">尝试更换关键词或降低相似度阈值</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {results.map((item, index) => (
                                <div key={`${item.article_id}-${index}`} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group relative">
                                    {/* Score Badge */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="flex-shrink-0 text-xs font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100">
                                                置信度: {(item.similarity_score * 100).toFixed(1)}%
                                            </div>
                                            {item.similarity_score > 0.8 && (
                                                <span className="flex-shrink-0 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                    强相关
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 truncate font-medium">{item.article_title}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleCopy(item.chunk_text, index)}
                                            className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${
                                                copiedIndex === index 
                                                    ? 'text-green-700 bg-green-50 border-green-200' 
                                                    : 'text-gray-500 bg-white border-gray-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50'
                                            }`}
                                        >
                                            {copiedIndex === index ? <CheckIcon className="w-3.5 h-3.5" /> : <DocumentTextIcon className="w-3.5 h-3.5" />}
                                            {copiedIndex === index ? '已复制' : '复制引用'}
                                        </button>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4 group-hover:line-clamp-none transition-all duration-300 relative">
                                        {item.chunk_text}
                                    </div>
                                    
                                    {/* Footer Metadata */}
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                            <span className="text-[10px] text-gray-400 font-mono">Ref ID: {item.article_id.slice(0,8)}</span>
                                        </div>
                                        {item.article_publish_date && (
                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">发布于: {new Date(item.article_publish_date).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer Info */}
                <div className="p-3 bg-white border-t border-gray-200 text-center flex justify-between px-6">
                    <span className="text-xs text-gray-400">Auto Insight Knowledge Base</span>
                    <span className="text-xs text-gray-400">共检索到 {results.length} 条相关片段</span>
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
        <div className="flex flex-col items-center justify-start h-full overflow-y-auto pb-20 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            
            <div className="w-full max-w-3xl text-center px-4 mt-4 md:mt-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">从一个想法开始</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    描述您报告的核心概念，AI 将为您完成从<span className="text-indigo-600 font-semibold">知识检索</span>到<span className="text-indigo-600 font-semibold">逻辑构建</span>的全过程。
                </p>
                <p className="mt-2 text-sm text-gray-400">支持格式: TXT, MD, PDF, DOCX · 支持粘贴大纲</p>
                
                <div className="mt-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[20px] opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="例如：‘从一位智能汽车行业研究专家的角度编写一份10页左右关于端到端自动驾驶技术未来3-5年的技术路线报告，汇报对象为集团高层和技术专家’"
                        className="relative w-full h-48 p-6 text-base bg-white rounded-2xl shadow-xl border border-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button className="w-full sm:w-auto px-6 py-3 border border-gray-200 bg-white text-gray-600 font-semibold rounded-xl shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2">
                        <DocumentTextIcon className="w-5 h-5" />
                        上传辅助文件 (可选)
                    </button>
                    
                    {/* Knowledge Base Search Button */}
                    <button 
                        onClick={() => setIsSearchModalOpen(true)}
                        className="w-full sm:w-auto px-6 py-3 border border-purple-200 bg-purple-50 text-purple-700 font-semibold rounded-xl shadow-sm hover:bg-purple-100 hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                    >
                        <SearchIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        检索知识库
                    </button>

                    <button 
                        onClick={() => onGenerate(idea)}
                        disabled={!idea.trim()}
                        className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        立即生成
                    </button>
                </div>
            </div>
            
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
         <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="w-full max-w-2xl bg-black border border-gray-800 rounded-xl shadow-2xl overflow-hidden font-mono">
                <div className="p-3 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                     <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                     </div>
                     <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
                     <div className="w-12"></div>
                </div>
                <div className="p-6 h-96 overflow-y-auto text-sm">
                    <pre className="text-green-400/90 whitespace-pre-wrap">
                        {log}
                        <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1 align-middle" />
                    </pre>
                </div>
            </div>
        </div>
    );
};

// --- 阶段3: 大纲审查 ---
const OutlineEditor: React.FC<{ outline: Slide[]; onGenerateContent: () => void }> = ({ outline, onGenerateContent }) => (
    <div className="max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500 pb-20">
        <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-lg mb-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">PPT编写技巧指南</h2>
            <p className="text-gray-500">共 {outline.length} 页 · 预计阅读时间 5 分钟</p>
        </div>
        
        <div className="space-y-4 mb-8">
            {outline.map((slide, index) => (
                <div key={slide.id} className="bg-white p-6 rounded-xl border border-gray-200 flex items-start gap-5 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 font-bold rounded-xl flex items-center justify-center border border-gray-100 group-hover:border-indigo-100 transition-colors">
                        {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-indigo-700 transition-colors">{slide.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{slide.content}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-lg sticky bottom-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <SparklesIcon className="w-5 h-5 text-indigo-600" />
                </div>
                AI 智能修订
            </h3>
            <div className="relative">
                <textarea
                    placeholder="请输入您对大纲的整体修改意见。例如：“增加一个市场竞争分析章节”或“将技术挑战和商业化前景合并”"
                    className="w-full h-24 p-4 pr-32 bg-white border border-indigo-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-sm"
                />
                <div className="absolute bottom-3 right-3">
                    <button 
                        onClick={onGenerateContent}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-indigo-700 transition transform hover:scale-105 flex items-center gap-2"
                    >
                        生成内容 <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
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
        <div className="max-w-4xl mx-auto animate-in fade-in-0 pb-20">
            <div className="flex items-center justify-between mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-900">正在生成内容...</h2>
                    <p className="text-gray-500 text-sm mt-1">AI 正在逐页撰写详细报告内容，请稍候</p>
                 </div>
                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
            
            <div className="space-y-4">
                {slides.map((slide, index) => (
                    <div key={slide.id} className={`
                        bg-white p-6 rounded-xl border shadow-sm transition-all duration-500
                        ${slide.status === 'generating' ? 'border-indigo-500 ring-2 ring-indigo-100 scale-[1.02]' : 'border-gray-200'}
                    `}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${slide.status === 'done' ? 'bg-green-100 text-green-700' : slide.status === 'generating' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                    P{index + 1}
                                </span>
                                <h3 className="font-bold text-gray-800 text-lg">{slide.title}</h3>
                            </div>
                            {slide.status === 'done' && <CheckIcon className="w-5 h-5 text-green-500" />}
                            {slide.status === 'generating' && <span className="text-xs font-bold text-indigo-600 animate-pulse">生成中...</span>}
                            {slide.status === 'queued' && <span className="text-xs text-gray-400">排队中</span>}
                        </div>
                        
                        {/* Terminal-like Output Area */}
                        <div className={`
                            bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-hidden transition-all duration-500
                            ${slide.status === 'queued' ? 'h-0 p-0 opacity-0' : 'h-auto opacity-100'}
                        `}>
                            {slide.status === 'generating' && (
                                <div className="text-blue-300">
                                    <p>{'>'} 正在连接AI模型 (zhipu@glm-4.5-flash)...</p>
                                    <p>{'>'} 分析页面主题：“{slide.title}”</p>
                                    <p>{'>'} 检索相关知识库片段...</p>
                                    <p className="flex items-center gap-2">
                                        {'>'} 生成草稿... <span className="w-2 h-4 bg-blue-400 animate-pulse block"></span>
                                    </p>
                                </div>
                            )}
                            {slide.status === 'done' && (
                                <div className="text-green-400">
                                    <p>{'>'} 内容生成完毕。</p>
                                    <p className="text-gray-400 mt-2 line-clamp-2 opacity-80">{slide.content}</p>
                                </div>
                            )}
                        </div>
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
        <div className="max-w-6xl mx-auto animate-in fade-in-0 pb-10 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                <button onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                    <ArrowLeftIcon className="w-4 h-4"/>
                    重新开始
                </button>
                
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                        <SparklesIcon className="w-4 h-4 text-purple-600"/>
                        AI 润色
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                        <DownloadIcon className="w-4 h-4"/>
                        导出 PDF
                    </button>
                </div>
            </div>
            
            {/* Slide Viewer */}
            <div className="flex-1 flex gap-6 overflow-hidden px-4 sm:px-0">
                {/* Thumbnails Sidebar */}
                <div className="hidden md:flex flex-col w-48 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {slides.map((slide, idx) => (
                        <div 
                            key={slide.id}
                            onClick={() => setCurrentIndex(idx)}
                            className={`
                                p-3 rounded-lg border cursor-pointer transition-all
                                ${idx === currentIndex ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:border-gray-300'}
                            `}
                        >
                            <div className="text-[10px] font-bold text-gray-400 mb-1">PAGE {idx + 1}</div>
                            <div className="text-xs font-semibold text-gray-800 line-clamp-2">{slide.title}</div>
                        </div>
                    ))}
                </div>

                {/* Main Slide Area */}
                <div className="flex-1 flex flex-col">
                    <div className="aspect-video w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12 md:p-16 flex flex-col relative overflow-hidden group">
                        {/* Slide Number */}
                        <div className="absolute bottom-6 right-8 text-gray-300 font-bold text-4xl opacity-20 pointer-events-none">
                            {currentIndex + 1}
                        </div>

                        <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 leading-tight">{slides[currentIndex].title}</h3>
                        <div className="text-base sm:text-lg text-gray-600 leading-relaxed prose max-w-none flex-1 overflow-y-auto custom-scrollbar">
                            <p>{slides[currentIndex].content}</p>
                        </div>
                        
                        {/* Hover Navigation Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex justify-between items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={goToPrev} className="pointer-events-auto p-3 bg-black/5 hover:bg-black/10 rounded-full backdrop-blur-sm transition-colors">
                                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
                            </button>
                            <button onClick={goToNext} className="pointer-events-auto p-3 bg-black/5 hover:bg-black/10 rounded-full backdrop-blur-sm transition-colors">
                                <ArrowRightIcon className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Mobile Navigation Controls */}
                    <div className="md:hidden flex justify-between items-center mt-4 bg-white p-3 rounded-xl shadow-sm border">
                        <button onClick={goToPrev} className="p-2"><ArrowLeftIcon className="w-5 h-5"/></button>
                        <span className="font-bold text-gray-700">{currentIndex + 1} / {slides.length}</span>
                        <button onClick={goToNext} className="p-2"><ArrowRightIcon className="w-5 h-5"/></button>
                    </div>
                </div>
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

    const getStepFromState = (state: string) => {
        switch(state) {
            case 'idea': return 1;
            case 'generatingOutline': return 2;
            case 'outlineReview': return 3;
            case 'generatingContent': return 4;
            case 'preview': return 5;
            default: return 1;
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50/50 min-h-full flex flex-col font-sans">
            {/* Global Process Flow Tracker (Sticky Top) */}
            <ProcessFlowCards currentStep={getStepFromState(flowState)} />
            
            <div className="flex-1 relative">
                {flowState === 'idea' && <IdeaInput onGenerate={handleStartOutlineGeneration} />}
                {flowState === 'generatingOutline' && <GenerationProgress title="AI 深度推理中..." onComplete={handleOutlineGenerated} />}
                {flowState === 'outlineReview' && <OutlineEditor outline={slides} onGenerateContent={handleStartContentGeneration} />}
                {flowState === 'generatingContent' && <ContentGeneratorView slides={slides} onComplete={() => setFlowState('preview')} />}
                {flowState === 'preview' && <ReportPreview slides={slides} onStartOver={handleStartOver} />}
            </div>
        </div>
    );
};
