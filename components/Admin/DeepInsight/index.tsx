
import React, { useState } from 'react';
import { TaskManager } from './TaskManager';
import { DiscoverySearch } from './DiscoverySearch';
import { ViewGridIcon, GlobeIcon } from '../../icons';

type SubView = 'tasks' | 'discovery';

export const DeepInsightManager: React.FC = () => {
    const [subView, setSubView] = useState<SubView>('tasks');

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            {/* Sub-navigation Tabs */}
            <div className="flex-shrink-0 mb-6 border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setSubView('tasks')}
                        className={`
                            whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all
                            ${subView === 'tasks' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}
                        `}
                    >
                        <ViewGridIcon className="w-5 h-5" />
                        现有任务管理
                    </button>
                    <button
                        onClick={() => setSubView('discovery')}
                        className={`
                            whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all
                            ${subView === 'discovery' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}
                        `}
                    >
                        <GlobeIcon className="w-5 h-5" />
                        全网 PDF 发现
                    </button>
                </nav>
            </div>

            <div className="flex-1 overflow-hidden">
                {subView === 'tasks' ? <TaskManager /> : <DiscoverySearch />}
            </div>
        </div>
    );
};
