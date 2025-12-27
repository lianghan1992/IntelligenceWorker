
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UploadedDocument, DocTag } from '../../../types';
import { getUploadedDocs, getDocTags, downloadUploadedDoc, deleteUploadedDoc, uploadDocs } from '../../../api/intelligence';
import { 
    CloudIcon, RefreshIcon, SearchIcon, FilterIcon, CalendarIcon, 
    DownloadIcon, ArrowRightIcon, EyeIcon, PlusIcon, TagIcon, GearIcon, ViewGridIcon, TrashIcon, ClockIcon
} from '../../icons';
import { DocUploadModal } from './DocUploadModal';
import { DocMoveModal } from './DocMoveModal';
import { DocPreviewModal } from './DocPreviewModal';
import { DocTagManagerModal } from './DocTagManagerModal';
import { ConfirmationModal } from '../ConfirmationModal';

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

const getStatusBadge = (doc: UploadedDocument) => {
    const status = doc.status.toLowerCase();
    const stage = doc.process_stage ? doc.process_stage.toLowerCase() : '';
    const progress = doc.process_progress || 0;

    if (status === 'completed') {
        return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">完成</span>;
    }
    if (status === 'failed') {
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold" title={doc.error_message || ''}>失败</span>;
    }
    if (status === 'processing') {
        return (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <ClockIcon className="w-3 h-3 animate-pulse" />
                {stage || '处理中'} {progress}%
            </span>
        );
    }
    return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">排队中</span>;
};

export const DocumentManager: React.FC = () => {
    const [docs, setDocs] = useState<UploadedDocument[]>([]);
    const [tags, setTags] = useState<DocTag[]>([]);
    const [selectedTagId, setSelectedTagId] = useState<string>(''); // '' means All
    
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryUploading, setIsHistoryUploading] = useState(false);
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
    
    // Delete State
    const [docToDelete, setDocToDelete] = useState<UploadedDocument | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const historyFileInputRef = useRef<HTMLInputElement>(null);

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

    const handleDelete = async () => {
        if (!docToDelete) return;
        setIsDeleting(true);
        try {
            await deleteUploadedDoc(docToDelete.uuid);
            setDocToDelete(null);
            fetchDocs();
            fetchTags(); // Update counts
        } catch (e: any) {
            alert(`删除失败: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTagChange = (tagId: string) => {
        setSelectedTagId(tagId);
        setPage(1);
    };

    // --- 批量历史文档上传逻辑 ---
    const handleHistoryUploadClick = () => {
        if (!selectedTagId) {
            alert("请先从左侧选择一个分类标签，再进行批量上传。");
            return;
        }
        historyFileInputRef.current?.click();
    };

    const onHistoryFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !selectedTagId) return;

        setIsHistoryUploading(true);
        const fileArray = Array.from(files);
        
        // 正则：匹配 YYYY.MM.DD.文件名.格式
        const historyRegex = /^(\d{4})\.(\d{2})\.(\d{2})\.(.+)$/;
        
        // 按日期分组，因为 API 每次调用只支持一个发布日期
        const groups: Record<string, File[]> = {};
        const skippedFiles: string[] = [];

        fileArray.forEach(file => {
            const match = file.name.match(historyRegex);
            if (match) {
                const [_, yyyy, mm, dd, newName] = match;
                const isoDate = `${yyyy}-${mm}-${dd}T10:00:00`; // 统一定位在上午10点
                
                // 创建一个重命名后的新 File 对象（删除日期前缀）
                const renamedFile = new File([file], newName, { type: file.type });
                
                if (!groups[isoDate]) groups[isoDate] = [];
                groups[isoDate].push(renamedFile);
            } else {
                skippedFiles.push(file.name);
            }
        });

        if (skippedFiles.length > 0 && skippedFiles.length === fileArray.length) {
            alert("选中的文件都不符合 'YYYY.MM.DD.文件名' 的命名格式，请检查后重试。");
            setIsHistoryUploading(false);
            return;
        }

        try {
            const dateKeys = Object.keys(groups);
            let successCount = 0;

            // 串行或并行执行上传请求
            for (const isoDate of dateKeys) {
                await uploadDocs({
                    files: groups[isoDate],
                    point_uuid: selectedTagId,
                    publish_date: isoDate
                });
                successCount += groups[isoDate].length;
            }

            let msg = `成功上传 ${successCount} 份历史文档。`;
            if (skippedFiles.length > 0) {
                msg += `\n注意：有 ${skippedFiles.length} 个文件因格式不符被跳过。`;
            }
            alert(msg);
            
            fetchDocs();
            fetchTags();
        } catch (error: any) {
            alert(`批量上传过程中出现错误: ${error.message}`);
        } finally {
            setIsHistoryUploading(false);
            if (historyFileInputRef.current) historyFileInputRef.current.value = '';
        }
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
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {selectedTagId ? tags.find(t => t.uuid === selectedTagId)?.name : '所有文档'}
                                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
                            </h2>
                            {isHistoryUploading && (
                                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold animate-pulse">
                                    <RefreshIcon className="w-3 h-3 animate-spin" />
                                    历史文档处理中...
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsMoveModalOpen(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                            >
                                <ArrowRightIcon className="w-4 h-4" /> 批量迁移
                            </button>

                            {/* 批量历史上传按钮 */}
                            <input 
                                type="file" 
                                ref={historyFileInputRef} 
                                onChange={onHistoryFilesSelected} 
                                multiple 
                                className="hidden" 
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                            />
                            <button 
                                onClick={handleHistoryUploadClick}
                                disabled={!selectedTagId || isHistoryUploading}
                                title={!selectedTagId ? "请先选择分类标签" : "上传符合 YYYY.MM.DD.xxx 格式的历史文档"}
                                className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                                    !selectedTagId || isHistoryUploading
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                }`}
                            >
                                <ClockIcon className="w-4 h-4" /> 批量历史上传
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
                                    <th className="px-6 py-3 font-medium w-32 text-center">状态</th>
                                    <th className="px-6 py-3 font-medium w-24 text-right">页数</th>
                                    <th className="px-6 py-3 font-medium w-40 text-right">发布时间</th>
                                    <th className="px-6 py-3 font-medium w-40 text-right">上传时间</th>
                                    <th className="px-6 py-3 font-medium w-32 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading && docs.length === 0 ? (
                                    <tr><td colSpan={8} className="py-20 text-center"><Spinner /></td></tr>
                                ) : docs.length === 0 ? (
                                    <tr><td colSpan={8} className="py-20 text-center text-gray-400">暂无文档</td></tr>
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
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(doc)}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-right">{doc.page_count} P</td>
                                            <td className="px-6 py-4 text-xs font-mono text-right">{new Date(doc.publish_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-gray-400 text-right">{new Date(doc.created_at).toLocaleDateString()}</td>
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
                                                    <button 
                                                        onClick={() => setDocToDelete(doc)}
                                                        className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors" 
                                                        title="删除"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
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

            {docToDelete && (
                <ConfirmationModal
                    title="删除文档"
                    message={`确定要删除文档 "${docToDelete.original_filename}" 吗？此操作将永久删除文件及相关数据，不可恢复。`}
                    onConfirm={handleDelete}
                    onCancel={() => setDocToDelete(null)}
                    confirmText="删除"
                    variant="destructive"
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};
