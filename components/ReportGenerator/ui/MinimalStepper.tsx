
import React from 'react';

export const MinimalStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, title: "创意" },
        { id: 2, title: "大纲" },
        { id: 4, title: "撰写" },
        { id: 5, title: "排版" },
        { id: 6, title: "完成" },
    ];

    return (
        <div className="w-full max-w-md mx-auto mb-4 md:mb-8 px-4 flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-10"></div>
            <div 
                className="absolute left-0 top-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-700 ease-in-out"
                style={{ width: `${Math.min(100, ((currentStep - 1) / 5) * 100)}%` }}
            ></div>
            {steps.map((s) => {
                const active = currentStep >= s.id;
                const current = currentStep === s.id;
                return (
                    <div key={s.id} className="flex flex-col items-center gap-1 bg-slate-50 px-2 relative z-10">
                        <div className={`
                            w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300
                            ${current ? 'bg-indigo-600 scale-125 ring-2 md:ring-4 ring-indigo-100' : active ? 'bg-indigo-600' : 'bg-slate-300'}
                        `}></div>
                        <span className={`text-[9px] md:text-[10px] font-medium whitespace-nowrap ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {s.title}
                        </span>
                    </div>
                )
            })}
        </div>
    );
};
