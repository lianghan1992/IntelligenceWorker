import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CompetitivenessEntity, CompetitivenessModule } from '../../types';
import { 
    getEntities, createEntity, updateEntity, deleteEntity,
    getModules, createModule, updateModule, deleteModule, createBackfillJob
} from '../../api';
import { 
    CloseIcon, PlusIcon, TrashIcon, PencilIcon, SearchIcon, RefreshIcon, 
    ChevronLeftIcon, ChevronRightIcon, BrainIcon, UsersIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

// --- Reusable Components ---
const Spinner: React.FC<{ small?: boolean }> = ({ small }) => (
    <div className={`flex items-center justify-center ${small ? '' : 'py-10'}`}>
        <svg className={`animate-spin ${small ? 'h-5 w-5' : 'h-8 w-8'} text-blue-600`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const TagInput: React.FC<{ value: string[]; onChange: (value: string[]) => void }> = ({ value, onChange }) => {
    const [inputValue, setInputValue] = useState('');
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!value.includes(inputValue.trim())) {
                onChange([...value, inputValue.trim()]);
            }
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };
    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2 p-2 min-h-[40px] bg-gray-50 border border-gray-300 rounded-lg">
                {value.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-blue-500 hover:text-blue-700">
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入别名后按回车添加..."
                className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3"
            />
        </div>
    );
};

// --- Entity Modal ---
const EntityModal: React.FC<{ entity?: CompetitivenessEntity | null; onClose: () => void; onSuccess: () => void; }> = ({ entity, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: entity?.name || '',
        entity_type: entity?.entity_type || '',
        aliases: entity?.aliases || [],
        description: entity?.description || '',
        metadata: entity ? JSON.stringify(entity.metadata, null, 2) : '{}',
        is_active: entity ? entity.is_active : true
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            let parsedMetadata;
            try {
                parsedMetadata = JSON.parse(formData.metadata);
            } catch (e) {
                throw new Error('元数据 (Metadata) 不是有效的JSON格式。');
            }
            
            const payload = { ...formData, metadata: parsedMetadata };
            
            if (entity) {
                await updateEntity(entity.id, payload);
            } else {
                await createEntity(payload);
            }
            onSuccess();
        } catch (e: any) {
            setError(e.message || '操作失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">{entity ? '编辑实体' : '新建实体'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                            <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">实体类型</label>
                            <input value={formData.entity_type} onChange={e => setFormData(p => ({ ...p, entity_type: e.target.value }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">别名</label>
                        <TagInput value={formData.aliases} onChange={v => setFormData(p => ({ ...p, aliases: v }))} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">元数据 (JSON)</label>
                        <textarea value={formData.metadata} onChange={e => setFormData(p => ({ ...p, metadata: e.target.value }))} rows={5} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 font-mono text-sm" />
                    </div>
                     <div>
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({...p, is_active: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-blue-600"/>
                            <span className="text-sm text-gray-800">激活</span>
                        </label>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end flex-shrink-0">
                    <button onClick={handleSubmit} disabled={isLoading} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300">
                        {isLoading ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Entity Manager ---
const EntityManager: React.FC = () => {
    const [entities, setEntities] = useState<CompetitivenessEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({ entity_type: '', is_active: '' });
    const [searchTerm, setSearchTerm] = useState('');
    
    const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0, pages: 1 });
    const [modalState, setModalState] = useState<{ type: 'edit' | 'new' | 'delete' | null, data?: CompetitivenessEntity | null }>({ type: null });
    
    const [uniqueEntityTypes, setUniqueEntityTypes] = useState<string[]>([]);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError('');
        try {
            const response = await getEntities({ 
                page: pagination.page,
                size: pagination.size,
                entity_type: filters.entity_type || undefined,
                is_active: filters.is_active === '' ? undefined : filters.is_active === 'true',
            });

            setEntities(response.items || []);
            setPagination(prev => ({ 
                ...prev, 
                total: response.total,
                pages: response.pages || 1
            }));

            if (uniqueEntityTypes.length === 0) {
                 const allEntities = await getEntities({ size: 1000 });
                 setUniqueEntityTypes([...new Set(allEntities.items.map(e => e.entity_type))]);
            }
        } catch (e: any) {
            setError(e.message || '加载实体失败');
            if (e.message.includes('422')) {
                 setError('加载失败 (422): 后端API参数有误。请检查API文档。');
            }
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [pagination.page, pagination.size, filters.entity_type, filters.is_active, uniqueEntityTypes.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const filteredEntities = useMemo(() => {
        return entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, entities]);
    
    const handleDelete = async () => {
        if (modalState.type !== 'delete' || !modalState.data) return;
        try {
            await deleteEntity(modalState.data.id);
            setModalState({ type: null });
            fetchData(false);
        } catch (e: any) {
            setError(e.message || '删除失败');
        }
    };
    
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };
    
    const handleFilterChange = () => {
        setPagination(p => ({...p, page: 1}));
    }
    
    useEffect(() => {
        handleFilterChange();
    }, [filters.entity_type, filters.is_active]);

    return (
        <div className="h-full flex flex-col">
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
            
            <div className="flex-shrink-0 mb-4 p-4 bg-white rounded-lg border flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="在当前页搜索..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4" />
                    </div>
                    <select value={filters.entity_type} onChange={e => setFilters(p => ({...p, entity_type: e.target.value}))} className="bg-white border border-gray-300 rounded-lg py-2 px-3">
                        <option value="">所有类型</option>
                        {uniqueEntityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                     <select value={filters.is_active} onChange={e => setFilters(p => ({...p, is_active: e.target.value}))} className="bg-white border border-gray-300 rounded-lg py-2 px-3">
                        <option value="">所有状态</option>
                        <option value="true">已激活</option>
                        <option value="false">未激活</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchData()} className="p-2.5 bg-white border rounded-lg"><RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => setModalState({ type: 'new' })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"><PlusIcon className="w-4 h-4" /> 新建实体</button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-lg border overflow-y-auto">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">名称</th>
                            <th className="px-6 py-3">类型</th>
                            <th className="px-6 py-3">别名</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">更新时间</th>
                            <th className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={6}><Spinner /></td></tr>)
                        : filteredEntities.length === 0 ? (<tr><td colSpan={6} className="text-center py-10">未找到任何实体。</td></tr>)
                        : (filteredEntities.map(entity => (
                            <tr key={entity.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{entity.name}</td>
                                <td className="px-6 py-4">{entity.entity_type}</td>
                                <td className="px-6 py-4">{entity.aliases.join(', ')}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${entity.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {entity.is_active ? '已激活' : '未激活'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{new Date(entity.updated_at || entity.created_at).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => setModalState({ type: 'edit', data: entity })} className="p-1.5 hover:bg-gray-100 rounded"><PencilIcon className="w-4 h-4 text-blue-600"/></button>
                                        <button onClick={() => setModalState({ type: 'delete', data: entity })} className="p-1.5 hover:bg-gray-100 rounded"><TrashIcon className="w-4 h-4 text-red-600"/></button>
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                 </table>
            </div>
            
            <div className="flex-shrink-0 flex justify-between items-center mt-4 text-sm">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                {pagination.pages > 1 && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md"><ChevronLeftIcon className="w-4 h-4" /></button>
                        <span>第 {pagination.page} / {pagination.pages} 页</span>
                        <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="px-3 py-1 bg-white border rounded-md"><ChevronRightIcon className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

            {(modalState.type === 'new' || modalState.type === 'edit') && <EntityModal entity={modalState.data} onClose={() => setModalState({type: null})} onSuccess={() => { setModalState({type: null}); fetchData(false); }} />}
            {modalState.type === 'delete' && modalState.data && <ConfirmationModal title="确认删除" message={`确定要删除实体 "${modalState.data.name}" 吗？`} onConfirm={handleDelete} onCancel={() => setModalState({type: null})} />}
        </div>
    );
};

// --- Module Manager ---
const ModuleManager: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold">模块管理</h2>
      <p className="mt-4">模块管理功能即将上线，敬请期待。</p>
    </div>
  );
};


// --- Main Component ---
export const CompetitivenessManager: React.FC = () => {
    const [subView, setSubView] = useState<'entities' | 'modules'>('entities');

    const renderSubView = () => {
        switch (subView) {
            case 'entities': return <EntityManager />;
            case 'modules': return <p className="p-4 text-gray-500">模块管理功能即将上线，敬请期待。</p>;
            default: return <EntityManager />;
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setSubView('entities')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                subView === 'entities'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <UsersIcon className="w-5 h-5" />
                            实体管理
                        </button>
                         <button
                            onClick={() => setSubView('modules')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                subView === 'modules'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <BrainIcon className="w-5 h-5" />
                            模块管理
                        </button>
                    </nav>
                </div>
            </div>
            <div className="flex-1 mt-6 overflow-hidden">
                {renderSubView()}
            </div>
        </div>
    );
};