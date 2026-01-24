
import React from 'react';
import { User, View } from '../types';
import { 
    CloseIcon, EyeIcon, ChartIcon, DiveIcon, 
    VideoCameraIcon, SparklesIcon, CubeIcon, 
    GearIcon, UserIcon, ArrowRightIcon 
} from './icons';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    onShowProfile: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ 
    isOpen, onClose, user, onNavigate, onLogout, onShowProfile 
}) => {
    if (!isOpen) return null;

    const handleNav = (view: View) => {
        onNavigate(view);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] md:hidden flex flex-col">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={onClose}
            ></div>
            
            {/* Drawer Content */}
            <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[85vh]">
                <div className="p-2 flex justify-center">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-md text-xl">
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 leading-tight">{user?.username}</h3>
                            <p className="text-xs text-slate-400 font-medium">{user?.email}</p>
                        </div>
                     </div>
                     <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <CloseIcon className="w-6 h-6"/>
                     </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-3 custom-scrollbar">
                    <button onClick={() => handleNav('cockpit')} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-indigo-700 active:scale-95 transition-transform">
                        <EyeIcon className="w-8 h-8"/>
                        <span className="font-bold text-sm">情报洞察</span>
                    </button>
                    <button onClick={() => handleNav('techboard')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform">
                        <ChartIcon className="w-8 h-8"/>
                        <span className="font-bold text-sm">竞争力看板</span>
                    </button>
                    <button onClick={() => handleNav('dives')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform">
                        <DiveIcon className="w-8 h-8"/>
                        <span className="font-bold text-sm">深度洞察</span>
                    </button>
                    <button onClick={() => handleNav('events')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform">
                        <VideoCameraIcon className="w-8 h-8"/>
                        <span className="font-bold text-sm">发布会</span>
                    </button>
                    <button onClick={() => handleNav('ai')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform">
                        <SparklesIcon className="w-8 h-8"/>
                        <span className="font-bold text-sm">AI报告</span>
                    </button>
                    <button onClick={() => handleNav('marketplace')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform">
                        <CubeIcon className="w-8 h-8"/>
                        <span className="font-bold text-sm">效率集市</span>
                    </button>
                    {user?.email === '326575140@qq.com' && (
                        <button onClick={() => handleNav('admin')} className="col-span-2 p-3 bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-transform">
                            <GearIcon className="w-5 h-5"/> 后台管理
                        </button>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3 pb-8">
                     <button onClick={() => { onShowProfile(); onClose(); }} className="w-full py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex items-center justify-center gap-2 shadow-sm active:bg-slate-100">
                        <UserIcon className="w-4 h-4"/> 个人资料 & 账单
                     </button>
                     <button onClick={onLogout} className="w-full py-3.5 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-600 flex items-center justify-center gap-2 active:bg-red-100">
                        <ArrowRightIcon className="w-4 h-4"/> 退出登录
                     </button>
                </div>
            </div>
        </div>
    );
};
