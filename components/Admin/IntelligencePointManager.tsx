import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemSource, Subscription } from '../../types';
import { getSources, getPointsBySourceName, deleteIntelligencePoints } from '../../api';
import { PlusIcon, TrashIcon, PencilIcon, RefreshIcon, SearchIcon } from '../icons';
import { IntelligencePointModal } from './IntelligencePointModal';
import { ConfirmationModal } from './ConfirmationModal';

const cronToHumanReadable = (cron: string): string => {
    const mapping: { [key: string]: string } = {
        '*/30 * * * *': '每30分钟',
        '0 * * * *': '每小时',
        '0 */3 * * *': '每3小时',
        '0 */6 * * *': '每6小时',
        '0 */8 * * *': '每8小时',
        '0 */12 * * *': '每12小时',
        '0 0 * * *': '每24小时',
        '0 0 * * 0': '每1周',
    };
    return mapping[cron] || cron;
};


export const IntelligencePointManager: React.FC = () => {
    const [allPoints, setAllPoints] = useState<Subscription[]>([]);
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [filterSource, setFilterSource] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pointToEdit, setPointToEdit] = useState<Subscription | null>(null);
    const [pointToDelete, setPointToDelete] = useState<Subscription | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedSources = await getSources();
            setSources(fetchedSources);

            const pointsPromises = fetchedSources.map(source => 
                getPointsBySourceName(source.source_name)
            );
            const pointsBySource = await Promise.all(pointsPromises);
            setAllPoints(pointsBySource.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        } catch (err: any) {
            setError('数据加载失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const processedPoints = useMemo(() => {
        return allPoints
            .filter(p => !filterSource || p.source_name === filterSource)
            .filter(p => {
                if (filterStatus === 'active') return p.is_active === 1;
                if (filterStatus === 'inactive') return p.is_active === 0;
                return true;
            })
            .filter(p => {
                const term = searchTerm.toLowerCase();
                return p.point_name.toLowerCase().includes(term) || p.point_url.toLowerCase().includes(term);
            });
    }, [allPoints, filterSource, filterStatus, searchTerm]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterSource, filterStatus, searchTerm]);

    const paginatedPoints = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedPoints.slice(startIndex, startIndex + itemsPerPage);
    }, [processedPoints, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedPoints.length / itemsPerPage);

    const handleAddClick = () => {
        setPointToEdit(null);
        setIsModalOpen(true);
    };
    
    const handleEditClick = (point: Subscription) => {
        setPointToEdit(point);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!pointToDelete) return;
        
        setError(null);
        try {
            await deleteIntelligencePoints([pointToDelete.id]);
            await fetchData();
        } catch (err: any) {
             setError('删除失败: ' + err.message);
        } finally {
            setPointToDelete(null);
        }
    };

    return (
        <>
            <div className="h-full flex flex-col">
                {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
                
                <div className="flex-shrink-0 mb-4 p-4 bg-white rounded-lg border flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                         <div className="relative flex-grow max-w-xs">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="搜索名称或URL..."
                                className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchData} className="p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                                <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={handleAddClick} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                                <PlusIcon className="w-4 h-4" /> 添加情报点
                            </button>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <select 
                            value={filterSource} 
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">所有情报源</option>
                            {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                        </select>
                         <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">所有状态</option>
                            <option value="active">已激活</option>
                             <option value="inactive">未激活</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-lg border overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">情报源</th>
                                <th scope="col" className="px-6 py-3">情报点名称</th>
                                <th scope="col" className="px-6 py-3">URL</th>
                                <th scope="col" className="px-6 py-3">采集频率</th>
                                <th scope="col" className="px-6 py-3">状态</th>
                                <th scope="col" className="px-6 py-3">上次触发</th>
                                <th scope="col" className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-10">加载中...</td></tr>
                            ) : paginatedPoints.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10">未找到任何情报点。</td></tr>
                            ) : (
                                paginatedPoints.map(point => (
                                    <tr key={point.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{point.source_name}</td>
                                        <td className="px-6 py-4">{point.point_name}</td>
                                        <td className="px-6 py-4"><a href={point.point_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">{point.point_url}</a></td>
                                        <td className="px-6 py-4 text-gray-700">{cronToHumanReadable(point.cron_schedule)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${point.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {point.is_active ? '已激活' : '未激活'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{point.last_triggered_at ? new Date(point.last_triggered_at).toLocaleString('zh-CN') : '从未'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(point)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="修改"><PencilIcon className="w-4 h-4 text-blue-600" /></button>
                                                <button onClick={() => setPointToDelete(point)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="删除"><TrashIcon className="w-4 h-4 text-red-600" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                 <div className="flex-shrink-0 flex justify-between items-center mt-4 text-sm">
                    <span className="text-gray-600">共 {processedPoints.length} 条</span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                            <span>第 {currentPage} / {totalPages} 页</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && <IntelligencePointModal onClose={() => setIsModalOpen(false)} onSuccess={fetchData} pointToEdit={pointToEdit} sources={sources} />}
            {pointToDelete && (
                <ConfirmationModal
                    title="确认删除情报点"
                    message={`您确定要删除 “${pointToDelete.point_name}” 吗？此操作无法撤销。`}
                    onConfirm={handleDelete}
                    onCancel={() => setPointToDelete(null)}
                />
            )}
        </>
    );
};