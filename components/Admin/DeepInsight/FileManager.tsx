
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDeepInsightUploads, deleteDeepInsightUpload, createDeepInsightTask, startDeepInsightTask, getDeepInsightCategories, uploadDeepInsightFiles } from '../../../api';
import { DeepInsightCategory } from '../../../types';
import { TrashIcon, RefreshIcon, PlayIcon, DocumentTextIcon, PlusIcon, CloudIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const FileManager: React.FC = () => {
    const [files, setFiles] = useState<string[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteFile, setDeleteFile] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fileData, catData] = await Promise.all([
                getDeepInsightUploads(),
                getDeepInsightCategories()
            ]);
            setFiles(fileData || []);
            setCategories(catData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteConfirm = async () => {
        if (!deleteFile) return;
        try {
            await deleteDeepInsightUpload(deleteFile);
            setFiles(prev => prev.filter(f => f !== deleteFile));
            setDeleteFile(null);
        } catch (e) {
            alert('删除失败');
        }
    };

    const handleCreateTask = async (fileName: string) => {
        setIsActionLoading(fileName);
        try {
            // Create Task
            const task = await createDeepInsightTask(fileName, selectedCategory || undefined);
            // Auto Start
            await startDeepInsightTask(task.id);
            alert(`任务已创建并启动 (ID: ${task.id})`);
        } catch (e: any) {
            alert(`任务创建失败: ${e.message}`);
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        setIsUploading(true);
        try {
            const filesArray: File[] = Array.from(fileList);
            await uploadDeepInsightFiles(filesArray);
            await fetchData();
        } catch (err: any) {
            alert(`上传失败: ${err.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> 原始文件管理
                </h3>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select 
                        value={selectedCategory} 
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 min-w-[150px]"
                    >
                        <option value="">默认分类 (可选)</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        multiple 
                        accept=".pdf"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-3 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 shadow-sm"
                    >
                        {isUploading ? <Spinner /> : <CloudIcon className="w-3.5 h-3.5" />}
                        上传 PDF
                    </button>

                    <button onClick={fetchData} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 border bg-white shadow-sm" title="刷新">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">文件名</th>
                            <th className="px-6 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && files.length === 0 ? (
                            <tr><td colSpan={2} className="text-center py-10">加载中...</td></tr>
                        ) : files.length === 0 ? (
                            <tr><td colSpan={2} className="text-center py-10 text-gray-400">暂无上传文件</td></tr>
                        ) : (
                            files.map((file) => (
                                <tr key={file} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 font-mono break-all">
                                        {file}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button 
                                                onClick={() => handleCreateTask(file)}
                                                disabled={!!isActionLoading}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shadow-sm"
                                            >
                                                {isActionLoading === file ? <Spinner /> : <PlayIcon className="w-3 h-3" />}
                                                转为任务
                                            </button>
                                            <button 
                                                onClick={() => setDeleteFile(file)}
                                                disabled={!!isActionLoading}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="删除文件"
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

            {deleteFile && (
                <ConfirmationModal
                    title="删除文件"
                    message={`确定要删除原始文件 "${deleteFile}" 吗？`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteFile(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
