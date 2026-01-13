
import React from 'react';
import { UserList } from './UserList';
import { UsersIcon } from '../../icons';

export const UserManagement: React.FC = () => {
    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <UsersIcon className="w-8 h-8 text-indigo-600" />
                    用户管理
                </h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                        <button
                            className="whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 border-indigo-600 text-indigo-600"
                        >
                            <UsersIcon className="w-5 h-5" />
                            用户列表
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <UserList />
            </div>
        </div>
    );
};
