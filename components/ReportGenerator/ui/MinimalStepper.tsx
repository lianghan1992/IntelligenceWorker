
import React from 'react';
import { CheckIcon } from '../../icons';

export const MinimalStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, title: "创意构思" },
        { id: 2, title: "大纲构建" },
        { id: 4, title: "内容撰写" }, // Skip 3 as per logic
        { id: 5, title: "智能排版" },
        { id: 6, title: "完成交付" },
    ];

    return (
        <div className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-white font-bold text-sm">AI</span>
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight">Report Engine</span>
                </div>

                <div className="flex items-center gap-1">
                    {steps.map((s, idx) => {
                        const isActive = currentStep === s.id;
                        const isCompleted = currentStep > s.id;
                        
                        return (
                            <div key={s.id} className="flex items-center">
                                {/* Connector Line */}
                                {idx > 0 && (
                                    <div className={`w-8 h-0.5 mx-2 rounded-full transition-colors duration-500 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                )}
                                
                                {/* Step Node */}
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                                    isActive 
                                        ? 'bg-indigo-50 border border-indigo-100 shadow-sm' 
                                        : 'opacity-60'
                                }`}>
                                    <div className={`
                                        w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300
                                        ${isActive 
                                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                                            : isCompleted 
                                                ? 'bg-green-500 border-green-500 text-white' 
                                                : 'bg-white border-slate-300 text-slate-400'
                                        }
                                    `}>
                                        {isCompleted ? <CheckIcon className="w-3 h-3" /> : idx + 1}
                                    </div>
                                    <span className={`text-xs font-medium transition-colors ${
                                        isActive ? 'text-indigo-900' : isCompleted ? 'text-green-700' : 'text-slate-500'
                                    }`}>
                                        {s.title}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
