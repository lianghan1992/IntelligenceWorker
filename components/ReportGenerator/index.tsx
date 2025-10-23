import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons';
import { Slide } from '../../types';

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

// --- 阶段1: 创意输入 ---
const IdeaInput: React.FC<{ onGenerate: (idea: string) => void }> = ({ onGenerate }) => {
    const [idea, setIdea] = useState('');
    return (
        <div className="flex flex-col items-center justify-center h-full pt-10 sm:pt-20">
            <div className="w-full max-w-3xl text-center">
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

                <div className="mt-8 flex justify-center items-center gap-4">
                    <button className="px-6 py-3 border border-gray-300 bg-white text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition">
                        上传辅助文件 (可选)
                    </button>
                    <button 
                        onClick={() => onGenerate(idea)}
                        disabled={!idea.trim()}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition transform hover:scale-105 flex items-center gap-2"
                    >
                        生成 <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
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