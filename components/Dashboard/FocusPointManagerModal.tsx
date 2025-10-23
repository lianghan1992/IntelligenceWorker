import React, { useState, useEffect, useCallback } from 'react';
import { ApiPoi } from '../../types';
import { getUserPois, addUserPoi, deleteUserPoi } from '../../api';
import { CloseIcon, PlusIcon, TrashIcon, DocumentTextIcon } from '../icons';

interface FocusPointManagerModalProps {
    onClose: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const FocusPointManagerModal: React.FC<FocusPointManagerModalProps> = ({ onClose }) => {
    const [pois, setPois] = useState<(ApiPoi & { related_count: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [newPoi, setNewPoi] = useState({ content: '', keywords: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPois = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const userPois = await getUserPois();
            // Augment with mock data for now, pending backend API update
            const augmentedPois = userPois.map(poi => ({
                ...poi,
                related_count: Math.floor(Math.random() * 100) + 5
            }));
            setPois(augmentedPois);
        } catch (err: any) {
            setError(err.message || '加载关注点失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPois();
    }, [fetchPois]);

    const handleAddPoi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPoi.content.trim()) return;
        setIsSubmitting(true);
        setError('');
        try {
            const addedPoi = await addUserPoi(newPoi);
            setPois(prev => [...prev, { ...addedPoi, related_count: 0 }]);
            setNewPoi({ content: '', keywords: '' });
        } catch (err: any) {
            setError(err.message || '添加失败');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeletePoi = async (poiId: string) => {
        const originalPois = [...pois];
        setPois(prev => prev.filter(p => p.id !== poiId));
        setError('');
        try {
            await deleteUserPoi(poiId);
        } catch (err: any) {
            setError(err.message || '删除失败，请刷新后重试');
            setPois(originalPois); // Revert on error
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95 flex flex-col h-[70vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">管理我的关注点</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
                    
                    <form onSubmit={handleAddPoi} className="flex items-start sm:items-center gap-4 mb-6 flex-col sm:flex-row">
                        <div className='flex-1 w-full'>
                            <label htmlFor="poi-content" className="sr-only">关注点</label>
                            <input
                                id="poi-content"
                                type="text"
                                value={newPoi.content}
                                onChange={e => setNewPoi(p => ({ ...p, content: e.target.value }))}
                                placeholder="关注点，如 智能座舱"
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className='flex-1 w-full'>
                             <label htmlFor="poi-keywords" className="sr-only">备注</label>
                             <input
                                id="poi-keywords"
                                type="text"
                                value={newPoi.keywords}
                                onChange={e => setNewPoi(p => ({ ...p, keywords: e.target.value }))}
                                placeholder="备注 (可选, 逗号分隔), 如 HUD,NOMI"
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                        <button type="submit" disabled={isSubmitting || !newPoi.content.trim()} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2 flex-shrink-0">
                           {isSubmitting ? <Spinner /> : <PlusIcon className="w-4 h-4" />} 添加
                        </button>
                    </form>

                    {isLoading ? (
                        <div className="text-center py-10"><Spinner /></div>
                    ) : (
                        <div className="space-y-3">
                            {pois.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">您还没有添加任何关注点。</p>
                            ) : (
                                pois.map(poi => (
                                    <div key={poi.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center group">
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold text-gray-800 truncate">{poi.content}</p>
                                            <p className="text-xs text-gray-600 truncate">备注: {poi.keywords || '无'}</p>
                                        </div>
                                        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                <DocumentTextIcon className="w-4 h-4" />
                                                <span>{poi.related_count} 条</span>
                                            </div>
                                            <button onClick={() => handleDeletePoi(poi.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                 <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end rounded-b-2xl flex-shrink-0">
                    <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors">
                        完成
                    </button>
                </div>
            </div>
        </div>
    );
};
