import React, { useState } from 'react';
import { User, View } from '../types';
import {
    HomeIcon,
    EyeIcon,
    FeedIcon,
    DiveIcon,
    VideoCameraIcon,
    SparklesIcon,
    GearIcon,
    LogoIcon,
    ChevronDownIcon
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
    { view: 'feed', label: '情报信息流', icon: FeedIcon },
    { view: 'dives', label: '深度洞察', icon: DiveIcon },
    { view: 'events', label: '行业事件', icon: VideoCameraIcon },
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
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-200'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);


export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onUpgrade, user }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Add admin to nav if user is admin (simple check for demo)
    const finalNavItems = [...navItems];
    // A simple check for admin users to show the admin page link
    if (user.username.toLowerCase().includes('admin')) {
        finalNavItems.push({ view: 'admin', label: '后台管理', icon: GearIcon });
    }

    return (
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-20">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and Nav */}
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-2 text-blue-600 cursor-pointer" onClick={() => onNavigate('dashboard')}>
                            <LogoIcon className="w-8 h-8"/>
                            <span className="font-bold text-lg text-gray-800">情报平台</span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-2">
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

                    {/* Right side: Upgrade and User Menu */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onUpgrade}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                        >
                            升级专业版
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
                                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:inline text-sm font-medium text-gray-700">{user.username}</span>
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 animate-in fade-in-0 zoom-in-95">
                                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">个人资料</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">设置</a>
                                    <div className="border-t my-1"></div>
                                    <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }} className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">退出登录</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};