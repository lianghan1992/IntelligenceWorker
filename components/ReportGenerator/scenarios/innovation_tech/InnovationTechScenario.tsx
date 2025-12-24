
import React, { useState, useEffect, useRef } from 'react';
import { ScenarioProps } from '../registry';
import { createStratifyTask, getScenarios } from '../../../../api/stratify';
import { InputStep } from './steps/InputStep';
import { ContentGenStep } from './steps/ContentGenStep';
import { HtmlGenStep } from './steps/HtmlGenStep';
import { LightBulbIcon, CheckIcon, ClockIcon, BrainIcon } from '../../../icons';

export const InnovationTechScenario: React.FC<ScenarioProps> = ({ taskId: initialTaskId, scenario, onComplete, initialTask }) => {
    // 状态流转: input -> analyzing -> visualizing -> done
    const [status, setStatus] = useState<'input' | 'analyzing' | 'visualizing' | 'done'>('input');
    
    // 数据状态
    const [topic, setTopic] = useState('');
    const [materials, setMaterials] = useState('');
    const [markdownContent, setMarkdownContent] = useState('');
    
    const [taskId, setTaskId] = useState(initialTaskId);
    const [defaultModel, setDefaultModel] = useState<string>('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    // 滚动锚点
    const analysisRef = useRef<HTMLDivElement>(null);
    const visualRef = useRef<HTMLDivElement>(null);

    // 获取配置
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const scenarios = await getScenarios();
                const current = scenarios.find(s => s.id === scenario || s.name === scenario);
                if (current?.default_model) setDefaultModel(current.default_model);
            } catch (e) { console.error(e); }
        };
        fetchConfig();
    }, [scenario]);

    // 自动滚动逻辑
    useEffect(() => {
        if (status === 'analyzing' && analysisRef.current) {
            setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
        if (status === 'visualizing' && visualRef.current) {
            setTimeout(() => visualRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }, [status]);

    const handleInputConfirm = async (inputTopic: string, inputMaterials: string) => {
        setTopic(inputTopic);
        setMaterials(inputMaterials);
        
        if (!taskId) {
            setIsCreatingTask(true);
            try {
                const newTask = await createStratifyTask(inputTopic, scenario);
                setTaskId(newTask.id);
                setStatus('analyzing');
            } catch (e) {
                alert("任务创建失败");
            } finally {
                setIsCreatingTask(false);
            }
        } else {
            setStatus('analyzing');
        }
    };

    const handleContentGenerated = (markdown: string, sessionId: string) => {
        setMarkdownContent(markdown);
        setStatus('visualizing');
    };

    const handleHtmlGenerated = () => {
        setStatus('done');
        // Optional: Auto trigger parent complete after a delay or let user click finish
        // onComplete(); 
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans overflow-y-auto custom-scrollbar relative scroll-smooth">
            
            {/* Header / Banner */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-md">
                        <LightBulbIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-800">创新技术分析 Agent</h1>
                        <p className="text-[10px] text-slate-500 font-mono">{taskId ? `TASK ID: ${taskId.slice(0,8)}` : 'NEW SESSION'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <StatusBadge label="Input" active={status === 'input'} done={status !== 'input'} />
                     <div className="w-4 h-px bg-slate-300"></div>
                     <StatusBadge label="Analysis" active={status === 'analyzing'} done={status === 'visualizing' || status === 'done'} />
                     <div className="w-4 h-px bg-slate-300"></div>
                     <StatusBadge label="Visual" active={status === 'visualizing'} done={status === 'done'} />
                </div>
            </div>

            <div className="max-w-5xl mx-auto w-full p-6 md:p-10 pb-32">
                
                {/* Timeline Container */}
                <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-12">
                    
                    {/* Step 1: Input */}
                    <TimelineItem 
                        icon={<LightBulbIcon className="w-5 h-5" />}
                        title="定义技术目标"
                        status={status === 'input' ? 'active' : 'done'}
                    >
                        <InputStep 
                            onStart={handleInputConfirm} 
                            isLoading={isCreatingTask}
                            readOnly={status !== 'input'} // Pass readonly prop to lock it
                            defaultValues={{ topic, materials }}
                        />
                    </TimelineItem>

                    {/* Step 2: Analysis */}
                    {(status === 'analyzing' || status === 'visualizing' || status === 'done') && (
                        <div ref={analysisRef}>
                            <TimelineItem 
                                icon={<BrainIcon className="w-5 h-5" />}
                                title="四象限深度分析"
                                status={status === 'analyzing' ? 'active' : 'done'}
                                isProcessing={status === 'analyzing'}
                            >
                                <ContentGenStep 
                                    taskId={taskId} 
                                    topic={topic} 
                                    materials={materials} 
                                    scenario={scenario}
                                    model={defaultModel}
                                    onComplete={handleContentGenerated}
                                    isReadOnly={status !== 'analyzing'} // Lock after done
                                />
                            </TimelineItem>
                        </div>
                    )}

                    {/* Step 3: Visualization */}
                    {(status === 'visualizing' || status === 'done') && (
                        <div ref={visualRef}>
                            <TimelineItem 
                                icon={<CheckIcon className="w-5 h-5" />}
                                title="可视化报告生成"
                                status={status === 'visualizing' ? 'active' : 'done'}
                                isProcessing={status === 'visualizing'}
                            >
                                <HtmlGenStep 
                                    taskId={taskId} 
                                    markdown={markdownContent} 
                                    scenario={scenario}
                                    onRestart={() => {}} // Reset not supported in linear timeline easily
                                    onComplete={onComplete} // Final Exit
                                />
                            </TimelineItem>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ label: string, active: boolean, done: boolean }> = ({ label, active, done }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
        active ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' : 
        done ? 'bg-green-50 text-green-600' : 'text-slate-400'
    }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-orange-500 animate-pulse' : done ? 'bg-green-500' : 'bg-slate-300'}`}></div>
        {label}
    </div>
);

const TimelineItem: React.FC<{ 
    icon: React.ReactNode, 
    title: string, 
    children: React.ReactNode, 
    status: 'active' | 'done' | 'pending',
    isProcessing?: boolean
}> = ({ icon, title, children, status, isProcessing }) => {
    return (
        <div className="relative pl-8 md:pl-12">
            {/* Timeline Dot */}
            <div className={`
                absolute -left-[9px] md:-left-[11px] top-0 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-[#f8fafc] flex items-center justify-center transition-all duration-500 z-10
                ${status === 'active' ? 'bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.2)]' : 
                  status === 'done' ? 'bg-green-500' : 'bg-slate-300'}
            `}>
                {status === 'done' && <CheckIcon className="w-3 h-3 text-white" />}
                {isProcessing && <div className="w-full h-full rounded-full border-2 border-white border-t-transparent animate-spin"></div>}
            </div>

            {/* Card Content */}
            <div className={`
                bg-white rounded-2xl border transition-all duration-500 overflow-hidden
                ${status === 'active' 
                    ? 'border-orange-200 shadow-xl shadow-orange-100/50 ring-1 ring-orange-100' 
                    : status === 'done' 
                        ? 'border-slate-200 shadow-sm opacity-90' 
                        : 'border-slate-100 opacity-50'}
            `}>
                {/* Card Header */}
                <div className={`px-6 py-4 border-b flex items-center gap-3 ${status === 'active' ? 'bg-orange-50/30 border-orange-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className={`p-2 rounded-lg ${status === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        {icon}
                    </div>
                    <h3 className={`font-bold text-base ${status === 'active' ? 'text-slate-800' : 'text-slate-600'}`}>
                        {title}
                    </h3>
                    {isProcessing && <span className="text-xs text-orange-500 font-medium animate-pulse ml-auto">正在处理中...</span>}
                </div>

                {/* Card Body */}
                <div className={`transition-all duration-500 ${status === 'done' ? '' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
