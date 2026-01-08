
import React, { useState } from 'react';
import { User, View } from '../types';
import {
    HomeIcon,
    EyeIcon,
    DiveIcon,
    VideoCameraIcon,
    SparklesIcon,
    GearIcon,
    LogoIcon,
    ChevronDownIcon,
    MenuIcon,
    CloseIcon,
    ChartIcon,
    CubeTransparentIcon,
} from './icons';

interface HeaderProps {
    currentView: View;
    onNavigate: (view: View) => void;
    onUpgrade: () => void;
    onLogout: () => void;
    user: User;
}

const navItems: { view: View; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { view: 'cockpit', label: 'AI情报洞察', icon: EyeIcon },
    { view: 'techboard', label: '竞争力看板', icon: ChartIcon },
    { view: 'dives', label: '深度洞察', icon: DiveIcon },
    { view: 'events', label: '发布会', icon: VideoCameraIcon },
    { view: 'ai', label: 'AI报告生成', icon: SparklesIcon },
    { view: 'mart', label: '效率集市', icon: CubeTransparentIcon },
];

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onUpgrade, onLogout, user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 relative z-30">
            {/* Logo area */}
            <div className="flex items-center gap-2">
                <LogoIcon className="w-8 h-8" />
                <span className="font-bold text-xl text-gray-900 tracking-tight hidden md:block">Auto Insight</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => onNavigate(item.view)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentView === item.view
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
                <button onClick={onUpgrade} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all transform hover:scale-105">
                    <SparklesIcon className="w-3 h-3" />
                    升级 PRO
                </button>
                
                <div className="relative group">
                    <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {user.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 hidden group-hover:block animate-in fade-in zoom-in-95">
                        <div className="px-4 py-2 border-b border-gray-50">
                            <p className="text-sm font-bold text-gray-800 truncate">{user.username}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <GearIcon className="w-4 h-4" /> 设置
                        </button>
                        <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            退出登录
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-600">
                    {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Nav */}
            {isMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 md:hidden shadow-lg flex flex-col gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.view}
                            onClick={() => { onNavigate(item.view); setIsMenuOpen(false); }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                currentView === item.view
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                    <div className="border-t border-gray-100 my-2 pt-2">
                        <button onClick={onUpgrade} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold mb-2">
                            <SparklesIcon className="w-4 h-4" /> 升级到 Professional
                        </button>
                        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
                            退出登录
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};
