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
    ChevronDownIcon,
    MenuIcon,
    CloseIcon,
    BrainIcon,
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
    { view: 'forecast', label: '技术预测', icon: BrainIcon },
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
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-20">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and Desktop Nav */}
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

                    {/* Right side: Upgrade, User Menu, and Mobile Menu Button */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <button
                            onClick={onUpgrade}
                            className="hidden md:inline-block px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
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
                                    <a href="#" onClick={handleLogout} className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">退出登录</a>
                                </div>
                            )}
                        </div>
                        
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
                <div className="md:hidden" id="mobile-menu">
                    <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                         {finalNavItems.map(item => (
                            <button
                                key={item.view}
                                onClick={() => {
                                    onNavigate(item.view);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center w-full space-x-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                                    currentView === item.view
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                aria-current={currentView === item.view ? 'page' : undefined}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="pt-4 pb-3 border-t border-gray-200 px-4">
                         <button
                            onClick={() => {
                                onUpgrade();
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                        >
                            升级专业版
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};