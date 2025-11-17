import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserListItem, UserForAdminUpdate, UserProfileDetails } from '../../types';
import { getUsers, updateUser, deleteUser, getUserProfileDetails } from '../../api';
import { CloseIcon, PencilIcon, TrashIcon } from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

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
                        <li key={source.id} className="p-2 bg-gray-50 rounded-md">{source.source_name}</li>
                    ))}
                </ul>
            ) : <p>该用户没有订阅任何情报源。</p>;
        }

        if (type === 'pois') {
            const pois = details.points_of_interest.items;
            return pois.length > 0 ? (
                 <ul className="space-y-3">
                    {pois.map(poi => (
                        <li key={poi.id} className="p-3 bg-gray-50 rounded-md">
                            <p className="font-semibold text-gray-800">{poi.content}</p>
                            <p className="text-xs text-gray-600 mt-1">关键词: {poi.keywords}</p>
                        </li>
                    ))}
                </ul>
            ) : <p>该用户没有设置任何关注点。</p>;
        }
        
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{user.username} 的{type === 'sources' ? '情报源' : '关注点'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
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
        plan_name: user.plan_name === '高级版' ? 'premium' : 'free',
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">编辑用户: {user.username}</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">订阅计划</label>
                        <select name="plan_name" value={formData.plan_name} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                            <option value="free">免费版</option>
                            <option value="premium">高级版</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                            <option value="active">激活</option>
                            <option value="disabled">禁用</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button type="submit" disabled={isLoading} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
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
    
    const [modalState, setModalState] = useState<{ type: 'edit' | 'delete' | 'details_sources' | 'details_pois', user: UserListItem | null }>({ type: 'edit', user: null });

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getUsers({ page: pagination.page, limit: pagination.limit });
            setUsers(response.items);
            setPagination(prev => ({ ...prev, total: response.total, totalPages: response.totalPages ?? 1 }));
        } catch (err: any) {
            setError(err.message || '获取用户列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleDeleteUser = async () => {
        if (modalState.type !== 'delete' || !modalState.user) return;
        try {
            await deleteUser(modalState.user.id);
            setModalState({ type: 'edit', user: null });
            fetchUsers();
        } catch (err: any) {
            setError(err.message || '删除用户失败');
        }
    };
    
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex-shrink-0">用户管理</h1>
            {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md flex-shrink-0">{error}</div>}
            
            <div className="flex-1 overflow-y-auto">
                {/* Desktop Table */}
                <div className="bg-white rounded-lg border overflow-x-auto hidden md:block">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">用户名</th>
                                <th className="px-6 py-3">邮箱</th>
                                <th className="px-6 py-3">订阅</th>
                                <th className="px-6 py-3">情报源</th>
                                <th className="px-6 py-3">关注点</th>
                                <th className="px-6 py-3">创建时间</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && users.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10">加载中...</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{user.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">{user.plan_name}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setModalState({ type: 'details_sources', user })} className="text-blue-600 hover:underline">{user.source_subscription_count}</button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setModalState({ type: 'details_pois', user })} className="text-blue-600 hover:underline">{user.poi_count}</button>
                                    </td>
                                    <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setModalState({ type: 'edit', user })} className="p-1.5 hover:bg-gray-100 rounded" title="编辑"><PencilIcon className="w-4 h-4 text-blue-600"/></button>
                                            <button onClick={() => setModalState({ type: 'delete', user })} className="p-1.5 hover:bg-gray-100 rounded" title="删除"><TrashIcon className="w-4 h-4 text-red-600"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {isLoading && users.length === 0 ? (
                        <div className="text-center py-10">加载中...</div>
                    ) : users.map(user => (
                        <div key={user.id} className="bg-white rounded-lg border p-4 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-900">{user.username}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 -mr-1.5">
                                    <button onClick={() => setModalState({ type: 'edit', user })} className="p-1.5 hover:bg-gray-100 rounded" title="编辑"><PencilIcon className="w-4 h-4 text-blue-600"/></button>
                                    <button onClick={() => setModalState({ type: 'delete', user })} className="p-1.5 hover:bg-gray-100 rounded" title="删除"><TrashIcon className="w-4 h-4 text-red-600"/></button>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div>
                                    <p className="text-gray-500">订阅计划</p>
                                    <p className="font-medium text-gray-800">{user.plan_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">创建于</p>
                                    <p className="font-medium text-gray-800">{new Date(user.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">情报源</p>
                                    <button onClick={() => setModalState({ type: 'details_sources', user })} className="font-medium text-blue-600 hover:underline">{user.source_subscription_count}</button>
                                </div>
                                <div>
                                    <p className="text-gray-500">关注点</p>
                                    <button onClick={() => setModalState({ type: 'details_pois', user })} className="font-medium text-blue-600 hover:underline">{user.poi_count}</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination */}
             <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center mt-4 text-sm gap-4">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span>第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {modalState.user && modalState.type === 'edit' && <EditUserModal user={modalState.user} onClose={() => setModalState({type: 'edit', user: null})} onSave={fetchUsers} />}
            {modalState.user && modalState.type === 'delete' && <ConfirmationModal title="确认删除用户" message={`您确定要删除用户 "${modalState.user.username}" 吗？此操作不可撤销。`} onConfirm={handleDeleteUser} onCancel={() => setModalState({type: 'delete', user: null})} />}
            {modalState.user && modalState.type === 'details_sources' && <UserDetailsModal user={modalState.user} type="sources" onClose={() => setModalState({type: 'details_sources', user: null})} />}
            {modalState.user && modalState.type === 'details_pois' && <UserDetailsModal user={modalState.user} type="pois" onClose={() => setModalState({type: 'details_pois', user: null})} />}
        </div>
    );
};
