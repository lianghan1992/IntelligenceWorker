
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
    CubeIcon,
} from './icons';

interface HeaderProps {
    currentView: View;
    onNavigate: (view: View) => void;
    onUpgrade: () => void;
    onLogout: () => void;
    onShowBilling: () => void;
    onShowProfile?: () => void; // New prop for profile modal
    user: User;
}

const navItems: { view: View; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { view: 'cockpit', label: 'AI情报洞察', icon: EyeIcon },
    { view: 'techboard', label: '竞争力看板', icon: ChartIcon },
    { view: 'dives', label: '深度洞察', icon: DiveIcon },
    { view: 'events', label: '发布会', icon: VideoCameraIcon },
    { view: 'ai', label: 'AI报告生成', icon: SparklesIcon },
    { view: 'marketplace', label: '效率集市', icon: CubeIcon },
];

const NavItem: React.FC<{
    view: View;
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        title={label}
        className={`
            group flex items-center justify-center xl:justify-start space-x-0 xl:space-x-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex-shrink-0
            ${
            isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 transform scale-105'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
        <span className="hidden xl:block whitespace-nowrap">{label}</span>
    </button>
);


export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onUpgrade, onLogout, onShowBilling, onShowProfile, user }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const finalNavItems = [...navItems];
    if (user.email === '326575140@qq.com') {
        finalNavItems.push({ view: 'admin', label: '后台管理', icon: GearIcon });
    }
    
    return (
        <header className={`hidden md:block bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] sticky top-0 z-50`}>
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-18">
                    {/* Logo and Desktop Nav */}
                    <div className="flex items-center gap-4 lg:gap-8 overflow-hidden flex-1">
                        <div className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0 pr-4" onClick={() => onNavigate('cockpit')}>
                            <div className="relative flex items-center justify-center w-9 h-9">
                                <LogoIcon className="w-9 h-9 transition-transform duration-300 group-hover:rotate-12 filter drop-shadow-sm" />
                            </div>
                            <span className="text-xl tracking-tighter hidden sm:block whitespace-nowrap">
                                <span className="font-extrabold text-[#2563EB]">Auto</span><span className="font-semibold text-[#7C3AED]">Insight</span>
                            </span>
                        </div>
                        
                        <div className="hidden h-8 w-px bg-slate-200 lg:block flex-shrink-0"></div>

                        <nav className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto no-scrollbar mask-image-r">
                            {finalNavItems.map(item => (
                                <NavItem 
                                    key={item.view}
                                    {...item}
                                    isActive={currentView === item.view}
                                    onClick={() => onNavigate(item.view)}
                                />
                            ))}
                        </nav>
                    </div>

                    {/* Right side: User Menu */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        {/* Upgrade button removed */}

                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 group relative z-50"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:inline text-sm font-semibold text-slate-600 group-hover:text-slate-900 max-w-[100px] truncate">{user.username}</span>
                                <ChevronDownIcon className="hidden sm:block w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-180" />
                            </button>

                            {isUserMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 py-2 animate-in fade-in-0 zoom-in-95 origin-top-right z-50">
                                        <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">当前账号</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <button 
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    if (onShowProfile) onShowProfile();
                                                }}
                                                className="block w-full text-left px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                            >
                                                个人资料
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    onShowBilling();
                                                }}
                                                className="block w-full text-left px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                            >
                                                账单管理
                                            </button>
                                        </div>
                                        <div className="border-t border-slate-50 my-1"></div>
                                        <button 
                                            onClick={() => {
                                                onLogout();
                                                setIsUserMenuOpen(false);
                                            }}
                                            className="block w-full text-left px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            退出登录
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
