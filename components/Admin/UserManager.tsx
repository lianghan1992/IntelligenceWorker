
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserListItem, UserForAdminUpdate, UserProfileDetails } from '../../types';
import { getUsers, updateUser, deleteUser, getUserProfileDetails } from '../../api';
import { CloseIcon, PencilIcon, TrashIcon, SearchIcon, FilterIcon, RefreshIcon, UsersIcon, ChartIcon } from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { QuotaConfigModal } from './QuotaConfigModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- UserDetailsModal ---
const UserDetailsModal: React.FC<{ user: UserListItem; type: 'sources' | 'pois'; onClose: () => void }> = ({ user, type, onClose }) => {
    const [details, setDetails] = useState<UserProfileDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await getUserProfileDetails(user.id);
                setDetails(data);
            } catch (err: any) {
                setError(err.message || '加载详情失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [user.id]);

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-8">加载中...</div>;
        if (error) return <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>;
        if (!details) return <div className="text-center p-8">没有找到数据。</div>;

        if (type === 'sources') {
            const sources = details.intelligence_sources.items;
            return sources.length > 0 ? (
                <ul className="space-y-2">
                    {sources.map(source => (
                        <li key={source.id} className="p-2 bg-gray-50 rounded-md border border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-700">{source.source_name || source.name}</span>
                            <span className="text-xs text-gray-400 font-mono">ID: {source.id.slice(0,6)}</span>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500 text-sm">该用户没有订阅任何情报源。</p>;
        }

        if (type === 'pois') {
            const pois = details.points_of_interest.items;
            return pois.length > 0 ? (
                 <ul className="space-y-3">
                    {pois.map(poi => (
                        <li key={poi.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                            <p className="font-semibold text-gray-800 text-sm">{poi.content}</p>
                            {poi.keywords && <p className="text-xs text-gray-500 mt-1">关键词: {poi.keywords}</p>}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500 text-sm">该用户没有设置任何关注点。</p>;
        }
        
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{user.username} 的{type === 'sources' ? '情报源' : '关注点'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};


// --- EditUserModal ---
const EditUserModal: React.FC<{ user: UserListItem; onClose: () => void; onSave: () => void; }> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState<UserForAdminUpdate>({
        username: user.username,
        email: user.email,
        plan_name: user.plan_name === '高级版' ? 'pro' : (user.plan_name === '免费版' ? 'free' : user.plan_name), // simple mapping
        status: user.status
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await updateUser(user.id, formData);
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || '更新失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">编辑用户: {user.username}</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">用户名</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">邮箱</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">订阅计划</label>
                        <select name="plan_name" value={formData.plan_name} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="free">免费版</option>
                            <option value="pro">专业版</option>
                            <option value="enterprise">企业版</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">状态</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="active">激活 (Active)</option>
                            <option value="disabled">禁用 (Disabled)</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white transition-colors">取消</button>
                    <button type="submit" disabled={isLoading} className="py-2 px-6 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center shadow-md">
                        {isLoading ? <Spinner /> : '保存更改'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- Main UserManager Component ---
export const UserManager: React.FC = () => {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    
    // Filters
    const [filters, setFilters] = useState({
        search_term: '',
        plan_name: '',
        status: ''
    });

    const [modalState, setModalState] = useState<{ type: 'edit' | 'delete' | 'details_sources' | 'details_pois', user: UserListItem | null }>({ type: 'edit', user: null });
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getUsers({ 
                page: pagination.page, 
                limit: pagination.limit,
                search_term: filters.search_term || undefined,
                plan_name: filters.plan_name || undefined,
                status: filters.status || undefined
            });
            setUsers(response.items || []);
            setPagination(prev => ({ ...prev, total: response.total, totalPages: response.totalPages ?? 1 }));
        } catch (err: any) {
            setError(err.message || '获取用户列表失败');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleDeleteUser = async () => {
        if (modalState.type !== 'delete' || !modalState.user) return;
        try {
            await deleteUser(modalState.user.id);
            setModalState({ type: 'edit', user: null });
            fetchUsers();
        } catch (err: any) {
            alert(err.message || '删除用户失败');
        }
    };
    
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <UsersIcon className="w-8 h-8 text-indigo-600" /> 用户管理
                </h1>
                <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setIsQuotaModalOpen(true)}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all"
                    >
                        <ChartIcon className="w-4 h-4"/> 权益配置
                    </button>
                     <button onClick={fetchUsers} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="搜索用户名或邮箱..." 
                        value={filters.search_term}
                        onChange={(e) => handleFilterChange('search_term', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-4 h-4 text-gray-400" />
                    <select 
                        value={filters.plan_name}
                        onChange={(e) => handleFilterChange('plan_name', e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="">所有计划</option>
                        <option value="free">免费版</option>
                        <option value="pro">专业版</option>
                        <option value="enterprise">企业版</option>
                    </select>

                    <select 
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="">所有状态</option>
                        <option value="active">正常 (Active)</option>
                        <option value="disabled">禁用 (Disabled)</option>
                    </select>
                </div>
            </div>

            {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md flex-shrink-0 text-sm border border-red-200">{error}</div>}
            
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                {/* Desktop Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">ID / 用户</th>
                                <th className="px-6 py-4">邮箱</th>
                                <th className="px-6 py-4">订阅计划</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4">资源统计</th>
                                <th className="px-6 py-4">注册时间</th>
                                <th className="px-6 py-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && users.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-20"><div className="flex justify-center"><Spinner /></div></td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-20 text-gray-400">暂无用户数据</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{user.username}</div>
                                        <div className="font-mono text-xs text-gray-400 mt-0.5">{user.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            user.plan_name?.includes('pro') || user.plan_name?.includes('专业') ? 'bg-indigo-100 text-indigo-700' : 
                                            user.plan_name?.includes('enterprise') ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {user.plan_name || 'Free'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${user.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4 text-xs">
                                            <button onClick={() => setModalState({ type: 'details_sources', user })} className="text-slate-600 hover:text-indigo-600 hover:underline">
                                                Sources: <b>{user.source_subscription_count}</b>
                                            </button>
                                            <button onClick={() => setModalState({ type: 'details_pois', user })} className="text-slate-600 hover:text-indigo-600 hover:underline">
                                                POIs: <b>{user.poi_count}</b>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{new Date(user.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setModalState({ type: 'edit', user })} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition-colors" title="编辑"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setModalState({ type: 'delete', user })} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors" title="删除"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
             <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center mt-4 text-sm gap-4 px-2">
                <span className="text-gray-500">共 {pagination.total} 条记录</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">上一页</button>
                    <span className="font-medium text-gray-700">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">下一页</button>
                </div>
            </div>

            {modalState.user && modalState.type === 'edit' && <EditUserModal user={modalState.user} onClose={() => setModalState({type: 'edit', user: null})} onSave={fetchUsers} />}
            {modalState.user && modalState.type === 'delete' && <ConfirmationModal title="确认删除用户" message={`您确定要删除用户 "${modalState.user.username}" 吗？此操作不可撤销，并将清除该用户的所有关联数据。`} onConfirm={handleDeleteUser} onCancel={() => setModalState({type: 'delete', user: null})} variant="destructive" />}
            {modalState.user && modalState.type === 'details_sources' && <UserDetailsModal user={modalState.user} type="sources" onClose={() => setModalState({type: 'details_sources', user: null})} />}
            {modalState.user && modalState.type === 'details_pois' && <UserDetailsModal user={modalState.user} type="pois" onClose={() => setModalState({type: 'details_pois', user: null})} />}
            
            {isQuotaModalOpen && <QuotaConfigModal isOpen={isQuotaModalOpen} onClose={() => setIsQuotaModalOpen(false)} />}
        </div>
    );
};
