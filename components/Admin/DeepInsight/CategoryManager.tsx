
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightCategory } from '../../../types';
import { getDeepInsightCategories, createDeepInsightCategory, deleteDeepInsightCategory } from '../../../api';
import { TrashIcon, PlusIcon, RefreshIcon, CloseIcon, ViewGridIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void; // Callback to refresh parent data
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, onUpdate }) => {
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
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen, fetchCategories]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsCreating(true);
        setError('');
        try {
            await createDeepInsightCategory(newCategoryName);
            setNewCategoryName('');
            await fetchCategories();
            if (onUpdate) onUpdate();
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
            await fetchCategories();
            if (onUpdate) onUpdate();
        } catch (err: any) {
            setError(err.message || '删除分类失败');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-indigo-600"/> 分类标签管理
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
                    {/* Create Form */}
                    <div className="bg-white p-1 rounded-lg flex-shrink-0">
                        <form onSubmit={handleCreate} className="flex gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="输入新分类名称 (e.g. 固态电池)"
                                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                disabled={isCreating}
                            />
                            <button 
                                type="submit" 
                                disabled={isCreating || !newCategoryName.trim()}
                                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                            >
                                {isCreating ? <Spinner /> : <PlusIcon className="w-5 h-5" />}
                                添加
                            </button>
                        </form>
                        {error && <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-100 rounded-xl bg-gray-50/50 p-2">
                        {isLoading && categories.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
                        ) : categories.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2">
                                <ViewGridIcon className="w-8 h-8 opacity-20"/>
                                <span className="text-sm">暂无分类数据</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group">
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm">{cat.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{new Date(cat.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <button 
                                            onClick={() => setDeleteId(cat.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="删除分类"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                     <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-slate-600 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm shadow-sm">
                         完成
                     </button>
                </div>
            </div>

            {deleteId && (
                <ConfirmationModal
                    title="删除分类"
                    message="确定要删除此分类吗？此操作不可撤销。"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
