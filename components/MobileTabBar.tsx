
import React from 'react';
import { View } from '../types';
import { EyeIcon, ChartIcon, DiveIcon, VideoCameraIcon, MenuIcon } from './icons';

interface MobileTabBarProps {
    currentView: View;
    onNavigate: (view: View) => void;
    onOpenMenu: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentView, onNavigate, onOpenMenu }) => {
    const tabs = [
        { id: 'cockpit', label: '情报', icon: EyeIcon },
        { id: 'techboard', label: '竞争力', icon: ChartIcon },
        { id: 'dives', label: '深度', icon: DiveIcon },
        { id: 'events', label: '发布会', icon: VideoCameraIcon },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-[45] flex justify-around items-center h-[calc(3.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onNavigate(tab.id as View)}
                    className={`flex flex-col items-center justify-center w-full h-full pb-1 space-y-1 ${
                        currentView === tab.id ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                >
                    <tab.icon className="w-6 h-6" strokeWidth={currentView === tab.id ? 2 : 1.5} />
                    <span className="text-[10px] font-bold">{tab.label}</span>
                </button>
            ))}
            <button
                onClick={onOpenMenu}
                className="flex flex-col items-center justify-center w-full h-full pb-1 space-y-1 text-slate-400 hover:text-indigo-600"
            >
                <MenuIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">更多</span>
            </button>
        </div>
    );
};
