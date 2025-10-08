import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, BellIcon, ChevronDownIcon, MenuIcon, FeedIcon, DiveIcon, ChartIcon, SparklesIcon, PlusIcon, HomeIcon, LogoIcon, GearIcon } from './icons';
import { User, View } from '../types';

interface HeaderProps {
    currentView: View;
    onNavigate: (view: View) => void;
    onUpgrade: () => void;
    user: User;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; isMobile?: boolean; }> = ({ icon, label, isActive, onClick, isMobile }) => (
    <button
        onClick={onClick}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${
            isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${isMobile ? 'w-full' : ''}`}
    >
        <div className="w-5 h-5 mr-3 flex-shrink-0">{icon}</div>
        <span>{label}</span>
    </button>
);

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onUpgrade, user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const navLinks: { view: View; label: string; icon: React.ReactNode }[] = [
        { view: 'dashboard', label: '仪表盘', icon: <HomeIcon /> },
        { view: 'feed', label: '实时情报', icon: <FeedIcon /> },
        { view: 'dives', label: '深度洞察专题', icon: <DiveIcon /> },
        { view: 'events', label: '行业发布会', icon: <ChartIcon /> },
        { view: 'ai', label: '报告创建', icon: <SparklesIcon /> },
        { view: 'admin', label: '后台管理', icon: <GearIcon /> },
    ];

    const handleNav = (view: View) => {
        onNavigate(view);
        setIsMenuOpen(false);
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    return (
        <header className="bg-white border-b border-gray-200 flex-shrink-0 z-20 relative">
            <div className="flex items-center justify-between px-4 sm:px-6 h-16">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                        <LogoIcon className="w-8 h-8 text-blue-600" />
                        <span className="text-xl font-bold text-gray-800 hidden sm:inline">行业情报工作台</span>
                    </div>

                    <nav className="hidden md:flex items-center space-x-1">
                        {navLinks.map(link => (
                            <NavItem 
                                key={link.view}
                                icon={link.icon}
                                label={link.label}
                                isActive={currentView === link.view}
                                onClick={() => handleNav(link.view)}
                            />
                        ))}
                    </nav>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="relative hidden sm:block">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索..."
                            className="w-32 sm:w-40 bg-gray-100 border border-transparent rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                        />
                    </div>
                    
                    <button onClick={onUpgrade} className="px-3 py-2 text-sm font-semibold bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors flex-shrink-0">
                        升级
                    </button>
                    
                    <button className="text-gray-500 hover:text-gray-800 p-1 hidden sm:block" aria-label="通知">
                        <BellIcon className="w-6 h-6" />
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2">
                            <img src={`https://ui-avatars.com/api/?name=${user.username}&background=random&color=fff`} alt="用户头像" className="w-9 h-9 rounded-full" />
                            <div className="hidden md:flex items-center text-sm font-medium text-gray-700">
                                <span>{user.username}</span>
                                <ChevronDownIcon className="w-4 h-4 ml-1" />
                            </div>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30 py-1 animate-in fade-in-0 zoom-in-95">
                                <div className="px-4 py-2">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{user.username}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 -mr-2 text-gray-600 hover:text-gray-800" aria-label="打开菜单">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 absolute w-full shadow-lg">
                    <nav className="p-2 space-y-1">
                        {navLinks.map(link => (
                            <NavItem 
                                key={link.view}
                                icon={link.icon}
                                label={link.label}
                                isActive={currentView === link.view}
                                onClick={() => handleNav(link.view)}
                                isMobile
                            />
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
};