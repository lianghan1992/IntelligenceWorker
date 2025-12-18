
import React, { useState, useRef } from 'react';
import { ArrowRightIcon, DocumentTextIcon, SparklesIcon, ViewGridIcon, BrainIcon } from '../../icons';
import { Scenario } from '../../../types';
import { uploadStratifyFile } from '../../../api/stratify';

const ScenarioCard: React.FC<{ 
    scenario: Scenario, 
    isActive: boolean, 
    onClick: () => void 
}> = ({ scenario, isActive, onClick }) => (
    <div 
        onClick={onClick}
        className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 ${
            isActive 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 -translate-y-1' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
    >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isActive ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
            <SparklesIcon className="w-5 h-5" />
        </div>
        <div className="font-bold text-sm mb-1">{scenario.name}</div>
        <div className={`text-[10px] line-clamp-2 leading-relaxed ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
            {scenario.description || '基于该场景的专业提示词架构生成高质量研报'}
        </div>
    </div>
);

export const IdeaInput: React.FC<{ 
    scenarios: Scenario[],
    selectedScenario: string,
    onScenarioChange: (name: string) => void,
    onStart: (idea: string, attachments?: string[]) => void, 
    isLoading: boolean, 
}> = ({ scenarios, selectedScenario, onScenarioChange, onStart, isLoading }) => {
    const [idea, setIdea] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadStratifyFile(file);
            setAttachments(prev => [...prev, { name: res.filename, url: res.url }]);
        } catch (e) {
            alert('文件上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-start pt-12 md:pt-20 min-h-screen px-4 pb-20 overflow-y-auto">
            <div className="w-full max-w-4xl flex flex-col gap-10">
                
                {/* 1. Header */}
                <div className="text-center">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
                        开启您的智能报告
                    </h1>
                    <p className="text-lg text-slate-500 font-medium">
                        选择一个专业场景，输入您的核心构思，由 AI 自动精炼。
                    </p>
                </div>

                {/* 2. Scenario Grid */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                        <ViewGridIcon className="w-4 h-4" /> 选择创作场景
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {scenarios.map(s => (
                            <ScenarioCard 
                                key={s.name} 
                                scenario={s} 
                                isActive={selectedScenario === s.name}
                                onClick={() => onScenarioChange(s.name)}
                            />
                        ))}
                    </div>
                </div>

                {/* 3. Input Console */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-2 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="描述您的报告核心需求..."
                        className="w-full h-48 p-6 text-lg bg-transparent border-none resize-none focus:ring-0 outline-none text-slate-800"
                        disabled={isLoading}
                    />
                    
                    {/* Attachments & Toolbelt */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border-t border-slate-100">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isLoading}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                            title="上传参考文件"
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {attachments.map((at, i) => (
                            <div key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-indigo-100 animate-in zoom-in">
                                <DocumentTextIcon className="w-3 h-3" />
                                <span className="max-w-[100px] truncate">{at.name}</span>
                                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-indigo-900">×</button>
                            </div>
                        ))}
                        {isUploading && <div className="text-xs text-slate-400 animate-pulse">文件上传中...</div>}
                    </div>
                </div>

                {/* 4. Action */}
                <div className="flex justify-center">
                    <button
                        onClick={() => onStart(idea, attachments.map(a => a.url))}
                        disabled={!idea.trim() || isLoading || isUploading}
                        className="px-16 py-4 bg-slate-900 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-600/30 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                    >
                        {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <BrainIcon className="w-6 h-6" />}
                        立即构思
                    </button>
                </div>
            </div>
        </div>
    );
};
