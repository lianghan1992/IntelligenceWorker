
import React, { useState } from 'react';
import { UserList } from './UserList';
import { QuotaManager } from './QuotaManager';
import { FinanceManager } from './FinanceManager';
import { UsersIcon, ChartIcon, LightningBoltIcon } from '../../icons';

type SubView = 'users' | 'quotas' | 'finance';

export const UserManagement: React.FC = () => {
    const [subView, setSubView] = useState<SubView>('users');

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <UsersIcon className="w-8 h-8 text-indigo-600" />
                    用户与权益管理
                </h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setSubView('users')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'users' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <UsersIcon className="w-5 h-5" />
                            用户列表
                        </button>
                        <button
                            onClick={() => setSubView('quotas')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'quotas' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <LightningBoltIcon className="w-5 h-5" />
                            权益配置
                        </button>
                        <button
                            onClick={() => setSubView('finance')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'finance' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ChartIcon className="w-5 h-5" />
                            财务管理
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {subView === 'users' && <UserList />}
                {subView === 'quotas' && <QuotaManager />}
                {subView === 'finance' && <FinanceManager />}
            </div>
        </div>
    );
};
