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
    BrainIcon,
    ChartIcon, // 导入新图标
} from './icons';

interface HeaderProps {
    currentView: View;
    onNavigate: (view: View) => void;
    onUpgrade: () => void;
    user: User;
}

const navItems: { view: View; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { view: 'dashboard', label: '我的工作台', icon: HomeIcon },
    { view: 'cockpit', label: 'AI情报洞察', icon: EyeIcon },
    { view: 'techboard', label: '竞争力看板', icon: ChartIcon },
    { view: 'dives', label: '深度洞察', icon: DiveIcon },
    { view: 'events', label: '发布会', icon: VideoCameraIcon },
    { view: 'ai', label: 'AI报告生成', icon: SparklesIcon },
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
        className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
            isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);


export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onUpgrade, user }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Add admin to nav if user is admin
    const finalNavItems = [...navItems];
    // A simple check for the admin user to show the admin page link
    if (user.email === '326575140@qq.com') {
        finalNavItems.push({ view: 'admin', label: '后台管理', icon: GearIcon });
    }
    
    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        localStorage.removeItem('accessToken');
        window.location.reload();
    };

    return (
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and Desktop Nav */}
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
                            <div className="relative flex items-center justify-center w-9 h-9">
                                <LogoIcon className="w-9 h-9 text-indigo-600 transition-transform duration-300 group-hover:scale-110 filter drop-shadow-sm" />
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-slate-900">Auto Insight</span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-1">
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

                    {/* Right side: Upgrade, User Menu, and Mobile Menu Button */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <button
                            onClick={onUpgrade}
                            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg shadow-md hover:from-indigo-500 hover:to-violet-500 transition-all transform hover:scale-105"
                        >
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            升级专业版
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
                                className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:inline text-sm font-medium text-slate-700 px-1">{user.username}</span>
                                <ChevronDownIcon className="hidden sm:block w-4 h-4 text-slate-400" />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in-0 zoom-in-95 origin-top-right">
                                    <div className="px-4 py-2 border-b border-slate-50">
                                        <p className="text-xs text-slate-500">登录账号</p>
                                        <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
                                    </div>
                                    <a href="#" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">个人资料</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">设置</a>
                                    <div className="border-t border-slate-50 my-1"></div>
                                    <a href="#" onClick={handleLogout} className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">退出登录</a>
                                </div>
                            )}
                        </div>
                        
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                                aria-controls="mobile-menu"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMobileMenuOpen ? (
                                    <CloseIcon className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-slate-200" id="mobile-menu">
                    <nav className="px-4 pt-2 pb-4 space-y-1">
                         {finalNavItems.map(item => (
                            <button
                                key={item.view}
                                onClick={() => {
                                    onNavigate(item.view);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center w-full space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                                    currentView === item.view
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                                aria-current={currentView === item.view ? 'page' : undefined}
                            >
                                <item.icon className={`w-5 h-5 ${currentView === item.view ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                         <button
                            onClick={() => {
                                onUpgrade();
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-center px-4 py-3 text-base font-bold text-white bg-indigo-600 rounded-xl shadow-sm hover:bg-indigo-700 transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            升级专业版
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};