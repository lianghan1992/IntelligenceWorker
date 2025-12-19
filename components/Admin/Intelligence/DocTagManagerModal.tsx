
import React, { useState } from 'react';
import { DocTag } from '../../../types';
import { createDocTag, updateDocTag, deleteDocTag } from '../../../api/intelligence';
import { CloseIcon, TagIcon, TrashIcon, PencilIcon, CheckIcon, PlusIcon } from '../../icons';

interface DocTagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    tags: DocTag[];
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const DocTagManagerModal: React.FC<DocTagManagerModalProps> = ({ isOpen, onClose, tags: initialTags }) => {
    const [tags, setTags] = useState<DocTag[]>(initialTags);
    const [newTagName, setNewTagName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!newTagName.trim()) return;
        setIsCreating(true);
        setError('');
        try {
            const newTag = await createDocTag(newTagName);
            setTags([...tags, newTag]);
            setNewTagName('');
        } catch (e: any) {
            setError(e.message || '创建失败');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        try {
            const updated = await updateDocTag(id, editName);
            setTags(tags.map(t => t.uuid === id ? updated : t));
            setEditingId(null);
        } catch (e: any) {
            alert('更新失败: ' + e.message);
        }
    };

    const handleDelete = async (tag: DocTag) => {
        if (tag.doc_count > 0) {
            alert(`无法删除：该标签下仍有 ${tag.doc_count} 个文档。请先移除或迁移文档。`);
            return;
        }
        if (!confirm(`确定删除标签 "${tag.name}" 吗？`)) return;
        
        try {
            await deleteDocTag(tag.uuid);
            setTags(tags.filter(t => t.uuid !== tag.uuid));
        } catch (e: any) {
            alert('删除失败: ' + e.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <TagIcon className="w-5 h-5 text-indigo-600"/> 标签分类管理
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-5 h-5"/></button>
                </div>

                <div className="p-4 bg-white border-b border-gray-100">
                    <div className="flex gap-2">
                        <input 
                            value={newTagName} 
                            onChange={e => setNewTagName(e.target.value)} 
                            placeholder="新建标签名称..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        <button 
                            onClick={handleCreate} 
                            disabled={isCreating || !newTagName.trim()}
                            className="bg-indigo-600 text-white px-4 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                        >
                            {isCreating ? <Spinner /> : <PlusIcon className="w-4 h-4"/>}
                            创建
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {tags.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">暂无标签</div>
                    ) : (
                        <div className="space-y-1">
                            {tags.map(tag => (
                                <div key={tag.uuid} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group">
                                    {editingId === tag.uuid ? (
                                        <div className="flex-1 flex gap-2 mr-2">
                                            <input 
                                                value={editName} 
                                                onChange={e => setEditName(e.target.value)} 
                                                className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm outline-none"
                                                autoFocus
                                            />
                                            <button onClick={() => handleUpdate(tag.uuid)} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><CloseIcon className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-gray-700 text-sm">{tag.name}</span>
                                                <span className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">{tag.doc_count}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setEditingId(tag.uuid); setEditName(tag.name); }}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                >
                                                    <PencilIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(tag)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title={tag.doc_count > 0 ? "需清空文档后删除" : "删除"}
                                                >
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
