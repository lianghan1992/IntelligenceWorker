
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CompetitivenessEntity, CompetitivenessModule, BackfillJob, SystemStatus } from '../../types';
import { 
    getEntities, createEntity, updateEntity, deleteEntity,
    getModules, createModule, updateModule, deleteModule,
    getBackfillJobs, createBackfillJob, startBackfillJob, pauseBackfillJob,
    getSystemStatus,
    queryData
} from '../../api';
import { 
    CloseIcon, PlusIcon, TrashIcon, PencilIcon, SearchIcon, RefreshIcon, 
    ChevronLeftIcon, ChevronRightIcon, BrainIcon, UsersIcon, ServerIcon,
    PlayIcon, StopIcon, ClockIcon,
    DatabaseIcon
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

const ViewContainer: React.FC<{ title: string; onRefresh?: () => void; isLoading?: boolean; children: React.ReactNode; rightHeader?: React.ReactNode }> = ({ title, onRefresh, isLoading, children, rightHeader }) => (
    <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <div className="flex items-center gap-2">
                {rightHeader}
                {onRefresh && (
                    <button onClick={onRefresh} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
            {children}
        </div>
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void, disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`${checked ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </button>
);


const TagInput: React.FC<{ value: string[]; onChange: (value: string[]) => void, placeholder?: string }> = ({ value, onChange, placeholder }) => {
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
                 <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || "输入后按回车添加..."}
                    className="flex-1 bg-transparent focus:outline-none text-sm"
                />
            </div>
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
        metadata: entity?.metadata ? JSON.stringify(entity.metadata, null, 2) : '{}',
        is_active: entity ? entity.is_active : true
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            let parsedMetadata = {};
            if (formData.metadata && formData.metadata.trim() !== '') {
                try {
                    parsedMetadata = JSON.parse(formData.metadata);
                } catch (e) {
                    throw new Error('元数据 (Metadata) 不是有效的JSON格式。');
                }
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
                        <TagInput value={formData.aliases} onChange={v => setFormData(p => ({ ...p, aliases: v }))} placeholder="输入别名后按回车添加..." />
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
                         <label className="flex items-center space-x-3 cursor-pointer">
                            <ToggleSwitch checked={formData.is_active} onChange={c => setFormData(p => ({...p, is_active: c}))} />
                            <span className="text-sm font-medium text-gray-700">激活实体</span>
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
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    
    const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0, pages: 1 });
    const [modalState, setModalState] = useState<{ type: 'edit' | 'new' | 'delete' | null, data?: CompetitivenessEntity | null }>({ type: null });
    
    const [uniqueEntityTypes, setUniqueEntityTypes] = useState<string[]>([]);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError('');
        try {
            const response = await getEntities({ 
                page: pagination.page,
                size: pagination.size,
                entity_type: filters.entity_type || undefined,
                is_active: filters.is_active === '' ? undefined : filters.is_active === 'true',
                search_term: debouncedSearchTerm || undefined
            });

            setEntities(response.items || []);
            setPagination(prev => ({ 
                ...prev, 
                total: response.total,
                pages: response.pages || 1
            }));

            if (uniqueEntityTypes.length === 0 && response.total > 0) {
                 const allEntitiesResponse = await getEntities({ size: 1000 });
                 const types = [...new Set(allEntitiesResponse.items.map(e => e.entity_type))].sort();
                 setUniqueEntityTypes(types);
            }
        } catch (e: any) {
             setError(e.message || '加载实体失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [pagination.page, pagination.size, filters.entity_type, filters.is_active, debouncedSearchTerm, uniqueEntityTypes.length]);
    
    useEffect(() => {
        setPagination(p => ({...p, page: 1}));
    }, [filters.entity_type, filters.is_active, debouncedSearchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
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
    
    const handleToggleActive = async (entity: CompetitivenessEntity) => {
        setTogglingId(entity.id);
        try {
            const { created_at, updated_at, ...payload } = entity;
            await updateEntity(entity.id, { ...payload, is_active: !entity.is_active });
            setEntities(prev => prev.map(e => e.id === entity.id ? {...e, is_active: !e.is_active} : e));
        } catch (err: any) {
            setError(`为 ${entity.name} 更新状态失败: ${err.message}`);
        } finally {
            setTogglingId(null);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div className="h-full flex flex-col">
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
            
            <div className="flex-shrink-0 mb-4 p-4 bg-white rounded-lg border flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索实体名称..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4" />
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
                    <button onClick={() => fetchData()} className="p-2.5 bg-white border rounded-lg"><RefreshIcon className={`w-5 h-5 ${isLoading && !entities.length ? 'animate-spin' : ''}`} /></button>
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
                            <th className="px-6 py-3">描述</th>
                            <th className="px-6 py-3">激活</th>
                            <th className="px-6 py-3">更新时间</th>
                            <th className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && entities.length === 0 ? (<tr><td colSpan={7}><Spinner /></td></tr>)
                        : entities.length === 0 ? (<tr><td colSpan={7} className="text-center py-10">未找到任何实体。</td></tr>)
                        : (entities.map(entity => (
                            <tr key={entity.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{entity.name}</td>
                                <td className="px-6 py-4">{entity.entity_type}</td>
                                <td className="px-6 py-4 max-w-sm truncate" title={entity.aliases.join(', ')}>{entity.aliases.join(', ')}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={entity.description || ''}>{entity.description}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch
                                            checked={entity.is_active}
                                            onChange={() => handleToggleActive(entity)}
                                            disabled={togglingId === entity.id}
                                        />
                                        {togglingId === entity.id && <Spinner small={true} />}
                                    </div>
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
                        <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="p-2 bg-white border rounded-md disabled:opacity-50"><ChevronLeftIcon className="w-4 h-4" /></button>
                        <span>第 {pagination.page} / {pagination.pages} 页</span>
                        <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="p-2 bg-white border rounded-md disabled:opacity-50"><ChevronRightIcon className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

            {(modalState.type === 'new' || modalState.type === 'edit') && <EntityModal entity={modalState.data} onClose={() => setModalState({type: null})} onSuccess={() => { setModalState({type: null}); fetchData(false); }} />}
            {modalState.type === 'delete' && modalState.data && <ConfirmationModal title="确认删除" message={`确定要删除实体 "${modalState.data.name}" 吗？`} onConfirm={handleDelete} onCancel={() => setModalState({type: null})} />}
        </div>
    );
};


// --- Module Modal ---
const EXTRACTION_FIELDS_PLACEHOLDER = JSON.stringify({
    "field_name_1": {
      "type": "string",
      "description": "对这个字段的业务描述",
      "ai_instruction": "给AI的指令，告诉它如何从文章中提取这个字段"
    },
    "field_name_2": {
      "type": "enum",
      "options": ["选项1", "选项2"],
      "description": "这是一个枚举字段",
      "ai_instruction": "指示AI必须从提供的选项中选择一个"
    }
}, null, 2);

const ModuleModal: React.FC<{ module?: CompetitivenessModule | null; onClose: () => void; onSuccess: () => void; }> = ({ module, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        module_name: module?.module_name || '',
        module_key: module?.module_key || '',
        target_entity_types: module?.target_entity_types || [],
        final_data_table: module?.final_data_table || '',
        description: module?.description || '',
        extraction_fields: module?.extraction_fields ? JSON.stringify(module.extraction_fields, null, 2) : EXTRACTION_FIELDS_PLACEHOLDER,
        is_active: module ? module.is_active : true
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            let parsedFields = {};
            try {
                parsedFields = JSON.parse(formData.extraction_fields);
            } catch (e) {
                throw new Error('提取字段 (Extraction Fields) 不是有效的JSON格式。');
            }
            const payload = { ...formData, extraction_fields: parsedFields };
            
            if (module) {
                await updateModule(module.id, payload);
            } else {
                await createModule(payload);
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
            <div className="bg-white rounded-2xl w-full max-w-3xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">{module ? '编辑模块' : '新建模块'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">模块名称</label>
                            <input value={formData.module_name} onChange={e => setFormData(p => ({ ...p, module_name: e.target.value }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">模块 Key (唯一标识)</label>
                            <input value={formData.module_key} onChange={e => setFormData(p => ({ ...p, module_key: e.target.value }))} disabled={!!module} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 disabled:bg-gray-200" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">目标实体类型</label>
                            <TagInput value={formData.target_entity_types} onChange={v => setFormData(p => ({ ...p, target_entity_types: v }))} placeholder="例如: car_brand" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">最终数据表名</label>
                            <input value={formData.final_data_table} onChange={e => setFormData(p => ({ ...p, final_data_table: e.target.value }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">模块描述</label>
                        <textarea value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">提取字段 (JSON)</label>
                        <textarea value={formData.extraction_fields} onChange={e => setFormData(p => ({ ...p, extraction_fields: e.target.value }))} rows={10} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 font-mono text-sm" />
                    </div>
                     <div>
                         <label className="flex items-center space-x-3 cursor-pointer">
                            <ToggleSwitch checked={formData.is_active} onChange={c => setFormData(p => ({...p, is_active: c}))} />
                            <span className="text-sm font-medium text-gray-700">激活模块</span>
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


// --- Module Manager ---
const ModuleManager: React.FC = () => {
    const [modules, setModules] = useState<CompetitivenessModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalState, setModalState] = useState<{ type: 'new' | 'edit' | 'delete' | null, data?: CompetitivenessModule | null }>({ type: null });
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError('');
        try {
            const response = await getModules({ limit: 100 });
            setModules(response || []);
        } catch (e: any) {
            setError(e.message || '加载模块失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        if (modalState.type !== 'delete' || !modalState.data) return;
        try {
            await deleteModule(modalState.data.id);
            setModalState({ type: null });
            fetchData(false);
        } catch (e: any) {
            setError(e.message || '删除失败');
        }
    };
    
    const handleToggleActive = async (module: CompetitivenessModule) => {
        setTogglingId(module.id);
        try {
            await updateModule(module.id, { is_active: !module.is_active });
            setModules(prev => prev.map(m => m.id === module.id ? { ...m, is_active: !m.is_active } : m));
        } catch (err: any) {
            setError(`为 ${module.module_name} 更新状态失败: ${err.message}`);
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
            <div className="flex-shrink-0 mb-4 flex justify-end">
                 <button onClick={() => setModalState({ type: 'new' })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"><PlusIcon className="w-4 h-4" /> 新建模块</button>
            </div>
            <div className="flex-1 bg-white rounded-lg border overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">模块名称</th>
                            <th className="px-6 py-3">模块 Key</th>
                            <th className="px-6 py-3">目标实体类型</th>
                            <th className="px-6 py-3">激活</th>
                            <th className="px-6 py-3">更新时间</th>
                            <th className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={6}><Spinner /></td></tr>)
                        : modules.length === 0 ? (<tr><td colSpan={6} className="text-center py-10">未找到任何模块。</td></tr>)
                        : (modules.map(module => (
                            <tr key={module.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{module.module_name}</td>
                                <td className="px-6 py-4 font-mono text-xs">{module.module_key}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {module.target_entity_types.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">{t}</span>)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch checked={module.is_active} onChange={() => handleToggleActive(module)} disabled={togglingId === module.id} />
                                        {togglingId === module.id && <Spinner small />}
                                    </div>
                                </td>
                                <td className="px-6 py-4">{new Date(module.updated_at || module.created_at).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => setModalState({ type: 'edit', data: module })} className="p-1.5 hover:bg-gray-100 rounded"><PencilIcon className="w-4 h-4 text-blue-600"/></button>
                                        <button onClick={() => setModalState({ type: 'delete', data: module })} className="p-1.5 hover:bg-gray-100 rounded"><TrashIcon className="w-4 h-4 text-red-600"/></button>
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
            </div>

            {(modalState.type === 'new' || modalState.type === 'edit') && <ModuleModal module={modalState.data} onClose={() => setModalState({type: null})} onSuccess={() => { setModalState({type: null}); fetchData(false); }} />}
            {modalState.type === 'delete' && modalState.data && <ConfirmationModal title="确认删除" message={`确定要删除模块 "${modalState.data.module_name}" 吗？`} onConfirm={handleDelete} onCancel={() => setModalState({type: null})} />}
        </div>
    );
};

// --- Data Query View ---
const DataQueryView: React.FC = () => {
    const [params, setParams] = useState({ data_table: 'cdash_data_technology', entity_types: 'car_brand', limit: 10 });
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);

    const handleQuery = useCallback(async (newPage = 1) => {
        setIsLoading(true);
        setError('');
        setPage(newPage);
        try {
            const queryBody = {
                entity_types: params.entity_types.split(',').map(s => s.trim()).filter(Boolean),
                data_table: params.data_table
            };
            const queryParams = { 
                limit: params.limit,
                offset: (newPage - 1) * params.limit
            };
            const data = await queryData(queryParams, queryBody);
            setResults(data);
        } catch (e: any) {
            setError(e.message || '查询失败');
        } finally {
            setIsLoading(false);
        }
    }, [params]);

    const headers = useMemo(() => {
        if (results?.data?.length > 0) {
            return Object.keys(results.data[0]);
        }
        return [];
    }, [results]);

    const totalPages = useMemo(() => {
        if (!results || !results.limit) return 1;
        return Math.ceil(results.total / results.limit) || 1;
    }, [results]);

     return (
        <ViewContainer title="数据查询">
            <div className="space-y-4 p-4 bg-white rounded-lg border mb-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数据表</label>
{/* @v-fix start */}
                    <input value={params.data_table} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParams({...params, data_table: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
{/* @v-fix end */}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实体类型 (逗号分隔)</label>
{/* @v-fix start */}
                    <input value={params.entity_types} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParams({...params, entity_types: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
{/* @v-fix end */}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量限制</label>
{/* @v-fix start */}
                    <input value={params.limit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParams({...params, limit: Number(e.target.value)})} type="number" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
{/* @v-fix end */}
                </div>
                <button onClick={() => handleQuery(1)} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-blue-300">
                    {isLoading ? '查询中...' : '查询'}
                </button>
            </div>

            <div className="flex-1 bg-white rounded-lg border overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    {isLoading ? <Spinner /> 
                    : error ? <div className="p-4 text-red-600">错误: {error}</div>
                    : !results || results.data.length === 0 ? <div className="p-4 text-gray-500">查询结果将显示在这里。</div>
                    : (
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    {headers.map(header => (
                                        <th key={header} scope="col" className="px-6 py-3">{header.replace(/_/g, ' ')}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.data.map((item: any, index: number) => (
                                    <tr key={item.id || index} className="bg-white border-b hover:bg-gray-50">
                                        {headers.map(header => (
                                            <td key={header} className="px-6 py-4 max-w-xs truncate" title={String(item[header])}>
                                                {item[header] === null ? <span className="text-gray-400">null</span> : String(item[header])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {results && results.total > 0 && (
                     <div className="flex-shrink-0 p-3 border-t border-gray-200 flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">共 {results.total} 条</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleQuery(page - 1)} disabled={page <= 1 || isLoading} className="p-1.5 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600"/>
                            </button>
                            <span className="text-gray-600">
                                第 {page} / {totalPages} 页
                            </span>
                            <button onClick={() => handleQuery(page + 1)} disabled={page >= totalPages || isLoading} className="p-1.5 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronRightIcon className="w-4 h-4 text-gray-600"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ViewContainer>
    );
};

// --- Backfill Job Modal ---
const BackfillJobModal: React.FC<{ onClose: () => void; onSuccess: () => void; }> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        module_ids: [] as string[],
        entity_ids: [] as string[],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [availableModules, setAvailableModules] = useState<CompetitivenessModule[]>([]);
    const [availableEntities, setAvailableEntities] = useState<CompetitivenessEntity[]>([]);
    
    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                // Fetch all active modules using pagination
                const fetchAllModules = async (): Promise<CompetitivenessModule[]> => {
                    const allModules: CompetitivenessModule[] = [];
                    let offset = 0;
                    const limit = 100; // Max limit as per API documentation
                    while (true) {
                        const modulesPage = await getModules({ is_active: true, limit, offset });
                        if (modulesPage && modulesPage.length > 0) {
                            allModules.push(...modulesPage);
                        }
                        if (!modulesPage || modulesPage.length < limit) {
                            break; // This was the last page
                        }
                        offset += limit;
                    }
                    return allModules;
                };

                const [modulesRes, entitiesRes] = await Promise.all([
                    fetchAllModules(),
                    getEntities({ is_active: true, size: 1000 })
                ]);
                setAvailableModules(modulesRes || []);
                setAvailableEntities(entitiesRes.items || []);
            } catch (e: any) {
                setError('无法加载模块或实体列表: ' + e.message);
            }
        };
        fetchDependencies();
    }, []);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (!formData.start_date || !formData.end_date) {
                throw new Error("请选择开始和结束日期。");
            }
            const payload = {
                ...formData,
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString(),
                module_ids: formData.module_ids.length > 0 ? formData.module_ids : undefined,
                entity_ids: formData.entity_ids.length > 0 ? formData.entity_ids : undefined,
            };
            await createBackfillJob(payload);
            onSuccess();
        } catch (e: any) {
            setError(e.message || '创建任务失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">创建回溯任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
                        <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                            <input type="date" value={formData.end_date} onChange={e => setFormData(p => ({...p, end_date: e.target.value}))} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">指定模块 (可选, 默认全部)</label>
                        <select multiple value={formData.module_ids} onChange={e => setFormData(p => ({...p, module_ids: Array.from(e.target.selectedOptions, o => o.value)}))} className="w-full h-32 bg-gray-50 border border-gray-300 rounded-lg p-2">
                           {availableModules.map(m => <option key={m.id} value={m.id}>{m.module_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">指定实体 (可选, 默认全部)</label>
                         <select multiple value={formData.entity_ids} onChange={e => setFormData(p => ({...p, entity_ids: Array.from(e.target.selectedOptions, o => o.value)}))} className="w-full h-32 bg-gray-50 border border-gray-300 rounded-lg p-2">
                           {availableEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end flex-shrink-0">
                    <button onClick={handleSubmit} disabled={isLoading} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300">
                        {isLoading ? '创建中...' : '创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Backfill Jobs Manager ---
const BackfillJobsManager: React.FC = () => {
    const [jobs, setJobs] = useState<BackfillJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalState, setModalState] = useState<{ type: 'new' | 'start' | 'pause' | null, data?: BackfillJob | null }>({ type: null });

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError('');
        try {
            const response = await getBackfillJobs({ limit: 100 });
            setJobs(response.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []);
        } catch (e: any) {
            setError(e.message || '加载任务失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getStatusBadge = (status: BackfillJob['status']) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            running: 'bg-blue-100 text-blue-800 animate-pulse',
            paused: 'bg-gray-100 text-gray-800',
            completed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800'
        };
        return styles[status] || styles.paused;
    }
    
    const handleAction = async () => {
        if (!modalState.data || !modalState.type) return;
        
        try {
            if (modalState.type === 'start') {
                await startBackfillJob(modalState.data.id);
            } else if (modalState.type === 'pause') {
                await pauseBackfillJob(modalState.data.id);
            }
            setModalState({ type: null });
            fetchData(false);
        } catch (e: any) {
            setError(e.message || '操作失败');
        }
    };

    return (
        <div className="h-full flex flex-col">
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
             <div className="flex-shrink-0 mb-4 flex justify-end">
                 <button onClick={() => setModalState({ type: 'new' })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"><PlusIcon className="w-4 h-4" /> 新建回溯任务</button>
            </div>
            <div className="flex-1 bg-white rounded-lg border overflow-y-auto">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">任务名称</th>
                            <th className="px-6 py-3">时间范围</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">创建时间</th>
                            <th className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={5}><Spinner /></td></tr>)
                        : jobs.length === 0 ? (<tr><td colSpan={5} className="text-center py-10">未找到任何回溯任务。</td></tr>)
                        : (jobs.map(job => (
                            <tr key={job.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{job.name}</td>
                                <td className="px-6 py-4">{new Date(job.start_date).toLocaleDateString()} - {new Date(job.end_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(job.status)}`}>{job.status}</span></td>
                                <td className="px-6 py-4">{new Date(job.created_at).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        { (job.status === 'pending' || job.status === 'paused') && 
                                            <button onClick={() => setModalState({type: 'start', data: job})} className="p-1.5 hover:bg-gray-100 rounded" title="启动"><PlayIcon className="w-4 h-4 text-green-600" /></button>
                                        }
                                        { job.status === 'running' && 
                                             <button onClick={() => setModalState({type: 'pause', data: job})} className="p-1.5 hover:bg-gray-100 rounded" title="暂停"><StopIcon className="w-4 h-4 text-yellow-600" /></button>
                                        }
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                 </table>
            </div>
            {modalState.type === 'new' && <BackfillJobModal onClose={() => setModalState({type: null})} onSuccess={() => { setModalState({type: null}); fetchData(false); }} />}
            { (modalState.type === 'start' || modalState.type === 'pause') && modalState.data &&
                <ConfirmationModal 
                    title={`确认${modalState.type === 'start' ? '启动' : '暂停'}`} 
                    message={`确定要${modalState.type === 'start' ? '启动' : '暂停'}任务 "${modalState.data.name}" 吗？`} 
                    onConfirm={handleAction} 
                    onCancel={() => setModalState({type: null})}
                />
            }
        </div>
    );
};

// --- System Status Manager ---
const SystemStatusManager: React.FC = () => {
    const [status, setStatus] = useState<Partial<SystemStatus> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async (showLoading = true) => {
        if(showLoading) setIsLoading(true);
        setError('');
        try {
            const statusRes = await getSystemStatus();
            setStatus(statusRes);
        } catch (e: any) {
            setError(e.message || '获取系统状态失败');
        } finally {
            if(showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(false), 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const getStatusIndicator = (s: string | undefined) => {
        const lower = s?.toLowerCase();
        if (lower === 'healthy' || lower === 'connected') return { class: 'bg-green-500', text: '正常' };
        return { class: 'bg-red-500', text: '异常' };
    };

    const statusItems = useMemo(() => {
        if (!status) return [];
        return [
            { icon: ServerIcon, label: '服务状态', value: status.status, isStatus: true },
            { icon: DatabaseIcon, label: '数据库', value: status.database_status, isStatus: true },
            { icon: BrainIcon, label: '激活模块数', value: status.statistics?.active_modules ?? 0 },
            { icon: UsersIcon, label: '实体总数', value: status.statistics?.total_entities ?? 0 },
            { icon: RefreshIcon, label: '处理队列', value: status.statistics?.processing_queue_size ?? 0 },
            { icon: ClockIcon, label: '服务版本', value: status.version ?? 'N/A' },
            { icon: ClockIcon, label: '持续运行时间', value: status.uptime ?? 'N/A' },
        ];
    }, [status]);
    
    return (
        <div className="h-full flex flex-col">
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
            {isLoading && !status ? <Spinner/> : status ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statusItems.map(item => (
                        <div key={item.label} className="bg-white p-4 rounded-lg border flex items-center gap-4">
                            <div className="bg-blue-100 text-blue-600 p-3 rounded-full flex-shrink-0"><item.icon className="w-6 h-6"/></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{item.label}</p>
                                {item.isStatus ? (
                                    <div className="flex items-center gap-2 mt-1">
                                         <span className={`w-2.5 h-2.5 rounded-full ${getStatusIndicator(String(item.value)).class}`}></span>
                                         <p className="text-lg font-semibold text-gray-800">{getStatusIndicator(String(item.value)).text}</p>
                                    </div>
                                ) : (
                                     <p className="text-2xl font-bold text-gray-800">{String(item.value)}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p>未能加载系统状态。</p>}
        </div>
    );
};


// --- Main Component ---
export const CompetitivenessManager: React.FC = () => {
    const [subView, setSubView] = useState<'entities' | 'modules' | 'backfill_jobs' | 'system_status' | 'data_query'>('entities');

    const renderSubView = () => {
        switch (subView) {
            case 'entities': return <EntityManager />;
            case 'modules': return <ModuleManager />;
            case 'data_query': return <DataQueryView />;
            case 'backfill_jobs': return <BackfillJobsManager />;
            case 'system_status': return <SystemStatusManager />;
            default: return <EntityManager />;
        }
    };

    const navItems: { view: 'entities' | 'modules' | 'backfill_jobs' | 'system_status' | 'data_query'; label: string; icon: React.FC<any> }[] = [
        { view: 'entities', label: '实体管理', icon: UsersIcon },
        { view: 'modules', label: '模块管理', icon: BrainIcon },
        { view: 'data_query', label: '数据查询', icon: DatabaseIcon },
        { view: 'backfill_jobs', label: '回溯任务', icon: RefreshIcon },
        { view: 'system_status', label: '系统状态', icon: ServerIcon },
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                         {navItems.map(item => (
                            <button
                                key={item.view}
                                onClick={() => setSubView(item.view)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                    subView === item.view
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            <div className="flex-1 mt-6 overflow-hidden flex flex-col">
                {renderSubView()}
            </div>
        </div>
    );
};
