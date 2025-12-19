
import React, { useState, useEffect, useCallback } from 'react';
import { UploadedDocument, DocTag } from '../../../types';
import { getUploadedDocs, getDocTags, downloadUploadedDoc } from '../../../api/intelligence';
import { 
    CloudIcon, RefreshIcon, SearchIcon, FilterIcon, CalendarIcon, 
    DownloadIcon, ArrowRightIcon, EyeIcon, PlusIcon, TagIcon, GearIcon, ViewGridIcon
} from '../../icons';
import { DocUploadModal } from './DocUploadModal';
import { DocMoveModal } from './DocMoveModal';
import { DocPreviewModal } from './DocPreviewModal';
import { DocTagManagerModal } from './DocTagManagerModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DocumentManager: React.FC = () => {
    const [docs, setDocs] = useState<UploadedDocument[]>([]);
    const [tags, setTags] = useState<DocTag[]>([]);
    const [selectedTagId, setSelectedTagId] = useState<string>(''); // '' means All
    
    const [isLoading, setIsLoading] = useState(false);
    const [total, setTotal] = useState(0);
    
    // Filters
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);

    const fetchTags = async () => {
        try {
            const res = await getDocTags();
            setTags(res);
        } catch (e) { console.error(e); }
    };

    const fetchDocs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getUploadedDocs({
                page,
                page_size: 20,
                search: search || undefined,
                point_uuid: selectedTagId || undefined,
                start_date: startDate ? new Date(startDate).toISOString() : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined
            });
            setDocs(res.items);
            setTotal(res.total);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, selectedTagId, startDate, endDate]);

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    const handleDownload = async (doc: UploadedDocument) => {
        try {
            const blob = await downloadUploadedDoc(doc.uuid);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.original_filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('下载失败');
        }
    };

    const handleTagChange = (tagId: string) => {
        setSelectedTagId(tagId);
        setPage(1);
    };

    return (
        <div className="h-full flex bg-slate-50">
            {/* Left Sidebar: Tag Navigation */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <TagIcon className="w-4 h-4 text-indigo-600"/> 文档分类
                    </h3>
                    <button 
                        onClick={() => setIsTagManagerOpen(true)}
                        className="p-1.5 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                        title="管理标签"
                    >
                        <GearIcon className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <button
                        onClick={() => handleTagChange('')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                            selectedTagId === '' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span className="flex items-center gap-2"><ViewGridIcon className="w-4 h-4 opacity-70"/> 所有文档</span>
                    </button>
                    
                    {tags.map(tag => (
                        <button
                            key={tag.uuid}
                            onClick={() => handleTagChange(tag.uuid)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                                selectedTagId === tag.uuid ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <span className="truncate">{tag.name}</span>
                            <span className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">{tag.doc_count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-white z-10 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                             {selectedTagId ? tags.find(t => t.uuid === selectedTagId)?.name : '所有文档'}
                             <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsMoveModalOpen(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                            >
                                <ArrowRightIcon className="w-4 h-4" /> 批量迁移
                            </button>
                            <button 
                                onClick={() => setIsUploadModalOpen(true)}
                                className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-md"
                            >
                                <PlusIcon className="w-4 h-4" /> 上传文档
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="搜索文件名..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && setPage(1)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-sm text-gray-600">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="bg-transparent outline-none w-32 cursor-pointer"
                            />
                            <span className="text-gray-300">-</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="bg-transparent outline-none w-32 cursor-pointer"
                            />
                        </div>

                        <button onClick={() => fetchDocs()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 border border-transparent hover:border-gray-200 transition-colors">
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Table List */}
                <div className="flex-1 overflow-auto bg-slate-50/50 p-4 custom-scrollbar">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 font-medium">文件名</th>
                                    <th className="px-6 py-3 font-medium w-32">大小/类型</th>
                                    <th className="px-6 py-3 font-medium w-40">标签</th>
                                    <th className="px-6 py-3 font-medium w-24">页数</th>
                                    <th className="px-6 py-3 font-medium w-40">发布时间</th>
                                    <th className="px-6 py-3 font-medium w-40">上传时间</th>
                                    <th className="px-6 py-3 font-medium w-32 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading && docs.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center"><Spinner /></td></tr>
                                ) : docs.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center text-gray-400">暂无文档</td></tr>
                                ) : (
                                    docs.map(doc => (
                                        <tr key={doc.uuid} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                <div className="truncate max-w-xs font-bold" title={doc.original_filename}>{doc.original_filename}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div>{formatSize(doc.file_size)}</div>
                                                <div className="text-gray-400 uppercase font-mono">{doc.mime_type.split('/')[1] || 'FILE'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs border border-indigo-100">{doc.point_name || '未分类'}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{doc.page_count} P</td>
                                            <td className="px-6 py-4 text-xs font-mono">{new Date(doc.publish_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setPreviewDoc(doc)}
                                                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded transition-colors" 
                                                        title="预览"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownload(doc)}
                                                        className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors" 
                                                        title="下载"
                                                    >
                                                        <DownloadIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center text-sm text-gray-500">
                        <span>共 {total} 个文件</span>
                        <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
                            <span className="px-2 py-1">{page}</span>
                            <button disabled={docs.length < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isTagManagerOpen && (
                <DocTagManagerModal 
                    isOpen={isTagManagerOpen} 
                    onClose={() => { setIsTagManagerOpen(false); fetchTags(); }} 
                    tags={tags}
                />
            )}

            {isUploadModalOpen && (
                <DocUploadModal 
                    isOpen={isUploadModalOpen} 
                    onClose={() => setIsUploadModalOpen(false)} 
                    onSuccess={() => { fetchDocs(); setIsUploadModalOpen(false); fetchTags(); }}
                    tags={tags}
                />
            )}

            {isMoveModalOpen && (
                <DocMoveModal 
                    isOpen={isMoveModalOpen} 
                    onClose={() => setIsMoveModalOpen(false)} 
                    onSuccess={() => { fetchDocs(); setIsMoveModalOpen(false); fetchTags(); }}
                    tags={tags}
                />
            )}

            {previewDoc && (
                <DocPreviewModal 
                    isOpen={!!previewDoc} 
                    doc={previewDoc} 
                    onClose={() => setPreviewDoc(null)} 
                />
            )}
        </div>
    );
};
