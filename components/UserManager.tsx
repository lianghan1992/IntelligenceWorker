import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminUser, PlanDetails, Plan } from '../types';
import { getUsers, getPlans, registerUser, updateUser, deleteUser } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, SearchIcon, TrashIcon, PencilIcon, CloseIcon } from './icons';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

// --- User Modal for Add/Edit ---
interface UserModalProps {
    mode: 'add' | 'edit';
    user?: AdminUser | null;
    plans: PlanDetails | null;
    onClose: () => void;
    onSave: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ mode, user, plans, onClose, onSave }) => {
    const initialPlanKey = useMemo(() => {
        if (mode === 'edit' && user?.plan_name && plans) {
            const foundPlan = Object.entries(plans).find(
                // FIX: Cast `planDetails` to `Plan` to resolve property 'name' does not exist on type 'unknown' error.
                ([, planDetails]) => (planDetails as Plan).name === user.plan_name
            );
            return foundPlan ? foundPlan[0] : 'free';
        }
        return 'free';
    }, [mode, user, plans]);

    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        password: '',
        plan_name: initialPlanKey,
        status: user?.status || 'active',
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const planOptions = useMemo(() => {
        if (!plans) return [];
        // FIX: Cast `value` to `Plan` to resolve property 'name' does not exist on type 'unknown' error.
        return Object.entries(plans).map(([key, value]) => ({ key, name: (value as Plan).name }));
    }, [plans]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (mode === 'add') {
                await registerUser(formData.username, formData.email, formData.password, formData.plan_name);
            } else if (user) {
                await updateUser(user.id, {
                    username: formData.username,
                    email: formData.email,
                    plan_name: formData.plan_name,
                    status: formData.status as 'active' | 'disabled',
                });
            }
            onSave();
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">{mode === 'add' ? '新增用户' : '编辑用户'}</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">用户名</label>
                                <input type="text" name="username" value={formData.username} onChange={handleChange} required className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                        {mode === 'add' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">初始密码</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">订阅计划</label>
                                <select name="plan_name" value={formData.plan_name} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg">
                                    {planOptions.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">账户状态</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg">
                                    <option value="active">活跃</option>
                                    <option value="disabled">禁用</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                        <button type="submit" disabled={isLoading} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center min-w-[80px]">
                            {isLoading ? <Spinner className="h-5 w-5 text-white" /> : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const UserManager: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [plans, setPlans] = useState<PlanDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    
    const [filters, setFilters] = useState({ searchTerm: '', plan: '', status: '' });
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | null, user: AdminUser | null }>({ mode: null, user: null });
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getUsers({
                page: pagination.page,
                limit: pagination.limit,
                search_term: debouncedSearchTerm,
                plan_name: filters.plan,
                status: filters.status,
            });
            setUsers(data.items);
            setPagination(prev => ({ ...prev, total: data.total, totalPages: data.totalPages > 0 ? data.totalPages : 1 }));
        } catch (err: any) {
            setError(err.message || '无法获取用户列表');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearchTerm, filters.plan, filters.status]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        getPlans().then(setPlans).catch(() => setError('无法加载订阅计划'));
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPagination(p => ({ ...p, page: 1 })); // Reset to first page on filter change
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(p => ({ ...p, page: newPage }));
        }
    };

    const handleSaveSuccess = () => {
        setModalState({ mode: null, user: null });
        fetchUsers();
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.message || '删除用户失败');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="searchTerm"
                            value={filters.searchTerm}
                            onChange={handleFilterChange}
                            placeholder="搜索用户名或邮箱..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <select name="plan" value={filters.plan} onChange={handleFilterChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                            <option value="">所有计划</option>
                            {plans && Object.entries(plans).map(([key, value]) => (
                                // FIX: Cast `value` to `Plan` to resolve property 'name' does not exist on type 'unknown' error.
                                <option key={key} value={key}>{(value as Plan).name}</option>
                            ))}
                        </select>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                            <option value="">所有状态</option>
                            <option value="active">活跃</option>
                            <option value="disabled">禁用</option>
                        </select>
                        <button onClick={() => setModalState({ mode: 'add', user: null })} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                            <PlusIcon className="w-5 h-5" />
                            <span>新增用户</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">用户</th>
                            <th className="px-6 py-3">订阅计划</th>
                            <th className="px-6 py-3">订阅/关注点</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">注册日期</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={6} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-800">{user.username}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.plan_name === '高级版' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                        {user.plan_name}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{user.source_subscription_count} / {user.poi_count}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {user.status === 'active' ? '活跃' : '禁用'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => setModalState({ mode: 'edit', user })} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => setUserToDelete(user)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <span className="text-sm text-gray-600">共 {pagination.total} 条记录</span>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span className="text-sm font-semibold">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {modalState.mode && <UserModal mode={modalState.mode} user={modalState.user} plans={plans} onClose={() => setModalState({ mode: null, user: null })} onSave={handleSaveSuccess} />}
            {userToDelete && <ConfirmationModal title="确认删除用户" message={`您确定要删除用户 "${userToDelete.username}" 吗？此操作无法撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setUserToDelete(null)} />}
        </div>
    );
};