import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons';
import { Subscription, SystemSource } from '../types';
import { getSources } from '../api';

interface AddSubscriptionModalProps {
  onClose: () => void;
  // 修复：从Omit类型中移除不存在的 'query' 属性
  onSave: (subscription: Omit<Subscription, 'id' | 'keywords' | 'newItemsCount'>) => void;
  isLoading?: boolean;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const cronOptions = [
    { label: '每5分钟', value: '*/5 * * * *' },
    { label: '每30分钟', value: '*/30 * * * *' },
    { label: '每1小时', value: '0 * * * *' },
    { label: '每3小时', value: '0 */3 * * *' },
    { label: '每6小时', value: '0 */6 * * *' },
    { label: '每12小时', value: '0 */12 * * *' },
];

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({ onClose, onSave, isLoading = false }) => {
    const [pointName, setPointName] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [pointUrl, setPointUrl] = useState('');
    const [cronSchedule, setCronSchedule] = useState(cronOptions[2].value); // Default to 1 hour
    const [sources, setSources] = useState<SystemSource[]>([]);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const fetchedSources = await getSources();
                setSources(fetchedSources);
            } catch (error) {
                console.error("Failed to fetch sources for dropdown:", error);
            }
        };
        fetchSources();
    }, []);

    const isFormValid = pointName.trim() && sourceName.trim() && pointUrl.trim() && cronSchedule.trim();

    const handleSave = () => {
        if (!isFormValid || isLoading) return;
        onSave({
            point_name: pointName,
            source_name: sourceName,
            point_url: pointUrl,
            cron_schedule: cronSchedule,
            source_id: '', // Backend will generate
            // FIX: The `is_active` property expects a number (0 or 1), not a boolean. Changed `true` to `1`.
            is_active: 1,
            last_triggered_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                        添加新的情报关注点
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">输入情报采集点的详细信息。如果情报源名称不存在，系统将自动创建。</p>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">情报源名称</label>
                            <input 
                                type="text" 
                                value={sourceName} 
                                onChange={e => setSourceName(e.target.value)}
                                list="sources-datalist"
                                placeholder="选择或输入新的情报源 (例如 '盖世汽车')"
                                className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <datalist id="sources-datalist">
                                {sources.map(source => <option key={source.id} value={source.name} />)}
                            </datalist>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-gray-700">情报点名称 (例如 "前沿技术")</label>
                            <input type="text" value={pointName} onChange={e => setPointName(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading}/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">网页 URL</label>
                            <input type="url" value={pointUrl} onChange={e => setPointUrl(e.target.value)} placeholder="https://auto.gasgoo.com/new-energy/" className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading}/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">刷新周期</label>
                             <select 
                                value={cronSchedule} 
                                onChange={e => setCronSchedule(e.target.value)} 
                                className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            >
                                {cronOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-2xl">
                    <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors" disabled={isLoading}>
                        取消
                    </button>
                    <button onClick={handleSave} disabled={!isFormValid || isLoading} className="w-32 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex justify-center items-center">
                        {isLoading ? <Spinner /> : '保存关注点'}
                    </button>
                </div>
            </div>
        </div>
    );
};