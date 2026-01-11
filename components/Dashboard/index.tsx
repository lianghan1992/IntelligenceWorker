
import React, { useState } from 'react';
import { User, View, SystemSource } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { FocusPointManagerModal } from './FocusPointManagerModal';
import { TodaysEvents } from './TodaysEvents';
import { RecentDeepDives } from './RecentDeepDives';
import { LazyLoadModule } from './LazyLoadModule';
import { SearchIcon, PlusIcon, SparklesIcon } from '../icons';

// --- Main Dashboard Component ---
interface DashboardProps {
    user: User | null; // Allow null user
    subscriptions: SystemSource[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, onNavigate }) => {
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);

    const handleFocusPointModalClose = () => {
        setIsFocusPointModalOpen(false);
    };

    return (
        <div className="min-h-full bg-[#f8fafc] w-full overflow-x-hidden">
            {/* Fluid Container for Full Width experience */}
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
                
                {/* 1. Welcome Header (Simple) */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        欢迎回来，{user ? user.username : '访客'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        这里是您的智能情报指挥中心。
                    </p>
                </div>

                {/* 2. Top Section: Metrics */}
                <DashboardWidgets />
                
                {/* 3. Quick Actions Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* AI Report Generator */}
                    <div 
                        onClick={() => onNavigate('ai')}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-purple-300 transition-all group flex items-center gap-4"
                    >
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-purple-700 transition-colors">AI 报告生成</h3>
                            <p className="text-slate-500 text-xs mt-0.5">一键生成专业行业研报</p>
                        </div>
                    </div>

                    {/* Upload Document */}
                    <div 
                        onClick={() => onNavigate('dives')}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group flex items-center gap-4"
                    >
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                            <PlusIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">上传文档</h3>
                            <p className="text-slate-500 text-xs mt-0.5">解析 PDF/研报并提取知识</p>
                        </div>
                    </div>

                    {/* Intelligence Search */}
                    <div 
                        onClick={() => onNavigate('cockpit')}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group flex items-center gap-4"
                    >
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            <SearchIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">情报检索</h3>
                            <p className="text-slate-500 text-xs mt-0.5">全网资讯语义搜索与洞察</p>
                        </div>
                    </div>
                </div>

                {/* 4. Content Grid: Events & Docs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LazyLoadModule placeholder={<div className="h-64 bg-slate-100 rounded-2xl animate-pulse"/>}>
                        <TodaysEvents onNavigate={onNavigate} />
                    </LazyLoadModule>
                    
                    <LazyLoadModule placeholder={<div className="h-64 bg-slate-100 rounded-2xl animate-pulse"/>}>
                        <RecentDeepDives onNavigate={onNavigate} />
                    </LazyLoadModule>
                </div>

            </div>

            {isFocusPointModalOpen && user && (
                <FocusPointManagerModal onClose={handleFocusPointModalClose} />
            )}
        </div>
    );
};
