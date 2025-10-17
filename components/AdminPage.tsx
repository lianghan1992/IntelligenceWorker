import React, { useState, useEffect, useCallback } from 'react';
import { AdminView, Subscription } from '../types';
import { UserManager } from './UserManager';
import { ConferenceManager } from './ConferenceManager';
import { getSubscriptions, addPoint, updatePoint, deletePoints } from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon, LightBulbIcon, DiveIcon, VideoCameraIcon } from './icons';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-gray-500" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Intelligence Manager ---
const IntelligenceManager: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | null, subscription: Subscription | null }>({ mode: null, subscription: null });
    const [itemToDelete, setItemToDelete] = useState<Subscription | null>(null);

    const loadSubscriptions = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getSubscriptions();
            // The API might return points from various sources. For this admin view, let's just show them all.
            // Sorting by source name then point name for consistency.
            data.sort((a, b) => {
                if (a.source_name < b.source_name) return -1;
                if (a.source_name > b.source_name) return 1;
                if (a.point_name < b.point_name) return -1;
                if (a.point_name > b.point_name) return 1;
                return 0;
            });
            setSubscriptions(data);
        } catch (err: any) {
            setError(err.message || '无法加载订阅列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubscriptions();
    }, [loadSubscriptions]);

    const handleSave = async (data: Partial<Subscription>) => {
        setIsLoading(true);
        setError('');
        try {
            if (modalState.mode === 'add') {
                await addPoint(data);
            } else if (modalState.mode === 'edit' && data.id) {
                await updatePoint(data.id, data);
            }
            setModalState({ mode: null, subscription: null });
            await loadSubscriptions();
        } catch (err: any) {
            setError(err.message || '保存失败');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        setIsLoading(true);
        setError('');
        try {
            await deletePoints([itemToDelete.id]);
            setItemToDelete(null);
            await loadSubscriptions();
        } catch (err: any) {
            setError(err.message || '删除失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">情报点管理</h2>
                 <button onClick={() => setModalState({ mode: 'add', subscription: null })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                    <PlusIcon className="w-5 h-5" />
                    <span>新增情报点</span>
                </button>
            </div>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">情报源</th>
                            <th className="px-6 py-3">情报点</th>
                            <th className="px-6 py-3">URL</th>
                            <th className="px-6 py-3">刷新周期</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={5} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && subscriptions.map(sub => (
                             <tr key={sub.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-800">{sub.source_name}</td>
                                <td className="px-6 py-4">{sub.point_name}</td>
                                <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={sub.point_url}>{sub.point_url}</td>
                                <td className="px-6 py-4 font-mono text-xs">{sub.cron_schedule}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                     <button onClick={() => setModalState({ mode: 'edit', subscription: sub })} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md"><PencilIcon className="w-4 h-4" /></button>
                                     <button onClick={() => setItemToDelete(sub)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {!isLoading && subscriptions.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p>暂无情报订阅点。</p>
                        <p className="mt-1">点击“新增情报点”开始添加。</p>
                    </div>
                )}
            </div>
            
            {modalState.mode && (
                <AddSubscriptionModal 
                    mode={modalState.mode}
                    subscriptionToEdit={modalState.subscription}
                    onClose={() => setModalState({ mode: null, subscription: null })}
                    onSave={handleSave}
                    isLoading={isLoading}
                />
            )}
            {itemToDelete && (
                <ConfirmationModal 
                    title="确认删除情报点"
                    message={`您确定要删除 "${itemToDelete.point_name}" 吗？此操作无法撤销。`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setItemToDelete(null)}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};


// --- Dives Manager (Placeholder) ---
const DivesManager: React.FC = () => {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800">深度洞察管理</h2>
            <div className="mt-8 text-center text-gray-500 bg-white p-10 rounded-lg border-2 border-dashed">
                <p>此功能正在开发中。</p>
            </div>
        </div>
    );
};

// --- Main Admin Page ---
const navItems: { view: AdminView; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { view: 'users', label: '用户管理', icon: UsersIcon },
    { view: 'intelligence', label: '情报点管理', icon: LightBulbIcon },
    { view: 'events', label: '发布会管理', icon: VideoCameraIcon },
    { view: 'dives', label: '深度洞察', icon: DiveIcon },
];

const AdminNavItem: React.FC<{
    item: typeof navItems[0];
    isActive: boolean;
    onClick: () => void;
}> = ({ item, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
            isActive ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
        <item.icon className="w-5 h-5" />
        <span>{item.label}</span>
    </button>
);


export const AdminPage: React.FC = () => {
    const [adminView, setAdminView] = useState<AdminView>('users');

    const renderView = () => {
        switch (adminView) {
            case 'users':
                return <UserManager />;
            case 'intelligence':
                return <IntelligenceManager />;
            case 'events':
                return <ConferenceManager />;
            case 'dives':
                 return <DivesManager />;
            default:
                return <UserManager />;
        }
    };
    
    return (
        <div className="flex h-full bg-gray-50/70">
            <aside className="w-64 bg-white p-4 border-r flex-shrink-0">
                <h1 className="text-lg font-bold text-gray-800 px-4 py-2 mb-4">后台管理</h1>
                <nav className="space-y-2">
                    {navItems.map(item => (
                        <AdminNavItem 
                            key={item.view}
                            item={item}
                            isActive={adminView === item.view}
                            onClick={() => setAdminView(item.view)}
                        />
                    ))}
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};
