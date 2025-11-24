import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightCategory } from '../../../types';
import { getDeepInsightCategories, createDeepInsightCategory, deleteDeepInsightCategory } from '../../../api';
import { TrashIcon, PlusIcon, RefreshIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const CategoryManager: React.FC = () => {
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getDeepInsightCategories();
            setCategories(data || []);
        } catch (err: any) {
            setError(err.message || '加载分类失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsCreating(true);
        setError('');
        try {
            await createDeepInsightCategory(newCategoryName);
            setNewCategoryName('');
            fetchCategories();
        } catch (err: any) {
            setError(err.message || '创建分类失败');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDeepInsightCategory(deleteId);
            setDeleteId(null);
            fetchCategories();
        } catch (err: any) {
            setError(err.message || '删除分类失败');
        }
    };

    return (
        <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-3">新建分类</h3>
                <form onSubmit={handleCreate} className="flex gap-3">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="输入分类名称..."
                        className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isCreating}
                    />
                    <button 
                        type="submit" 
                        disabled={isCreating || !newCategoryName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                    >
                        {isCreating ? <Spinner /> : <PlusIcon className="w-5 h-5" />}
                        <span>创建</span>
                    </button>
                </form>
            </div>

            {/* Error Message */}
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>}

            {/* List */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">分类列表</h3>
                    <button onClick={fetchCategories} className="p-2 hover:bg-gray-200 rounded-full text-gray-500" title="刷新">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                {isLoading && categories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">加载中...</div>
                ) : categories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">暂无分类数据。</div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">分类名称</th>
                                <th className="px-6 py-3">创建时间</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                                    <td className="px-6 py-4">{new Date(cat.created_at).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setDeleteId(cat.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {deleteId && (
                <ConfirmationModal
                    title="删除分类"
                    message="确定要删除此分类吗？此操作不可撤销。"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                />
            )}
        </div>
    );
};
