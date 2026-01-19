
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightCategory } from '../../../types';
import { getDeepInsightCategories, createDocTag, deleteDocTag, updateDocTag } from '../../../api';
import { TrashIcon, PlusIcon, RefreshIcon, CloseIcon, ViewGridIcon, CheckIcon, PencilIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, onUpdate }) => {
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [error, setError] = useState('');
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteItem, setDeleteItem] = useState<DeepInsightCategory | null>(null);

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
        if (isOpen) fetchCategories();
    }, [isOpen, fetchCategories]);

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return;
        setIsCreating(true);
        setError('');
        try {
            await createDocTag(newCategoryName);
            setNewCategoryName('');
            await fetchCategories();
            if (onUpdate) onUpdate();
        } catch (err: any) {
            setError(err.message || '创建分类失败');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await updateDocTag(id, editName);
            setEditingId(null);
            await fetchCategories();
            if (onUpdate) onUpdate();
        } catch (e) {
            alert('修改失败');
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await deleteDocTag(deleteItem.id);
            setDeleteItem(null);
            await fetchCategories();
            if (onUpdate) onUpdate();
        } catch (err: any) {
            alert(err.message || '删除失败，请确保该分类下无文档。');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <ViewGridIcon className="w-5 h-5 text-indigo-600"/> 分类标签管理
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tag & Category Orchestration</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Create Section */}
                <div className="p-6 border-b border-slate-50 bg-white">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="输入新分类名称 (如：智能底盘)"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                        />
                        <button 
                            onClick={handleCreate} 
                            disabled={isCreating || !newCategoryName.trim()}
                            className="px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isCreating ? <Spinner /> : <PlusIcon className="w-4 h-4" />}
                            添加
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>}
                </div>

                {/* List Section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-50/30">
                    {isLoading && categories.length === 0 ? (
                        <div className="p-20 text-center text-slate-400"><Spinner /></div>
                    ) : (
                        <div className="space-y-1">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group">
                                    {editingId === cat.id ? (
                                        <div className="flex-1 flex gap-2">
                                            <input 
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="flex-1 bg-white border border-indigo-400 rounded-lg px-2 py-1 text-sm outline-none"
                                                autoFocus
                                            />
                                            <button onClick={() => handleUpdate(cat.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><CloseIcon className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase shadow-inner">
                                                    {cat.name.slice(0, 1)}
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => setDeleteItem(cat)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && !isLoading && (
                                <div className="text-center py-20 text-slate-400 italic text-sm">暂无分类数据</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
                     <button onClick={onClose} className="px-8 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                         关闭
                     </button>
                </div>
            </div>

            {deleteItem && (
                <ConfirmationModal
                    title="删除分类"
                    message={`确定要删除分类 "${deleteItem.name}" 吗？此操作不可撤销，且需确保该分类下无文档。`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteItem(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
