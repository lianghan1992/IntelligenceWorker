import React, { useState, useRef } from 'react';
import { CloseIcon } from './icons';
import { createLiveAnalysisTask, createVideoAnalysisTask } from '../api';
import { LivestreamTask } from '../types';

interface AddEventModalProps {
  onClose: () => void;
  onSuccess: (newEvent: LivestreamTask) => void;
}

type TaskType = 'live' | 'offline';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onSuccess }) => {
    const [taskType, setTaskType] = useState<TaskType>('live');

    // Live Task State
    const [liveTitle, setLiveTitle] = useState('');
    const [liveUrl, setLiveUrl] = useState('');
    const [starttime, setStarttime] = useState('');
    
    // Offline Task State
    const [offlineTitle, setOfflineTitle] = useState('');
    const [sourceUri, setSourceUri] = useState('');
    const [offlineStarttime, setOfflineStarttime] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const isLiveFormValid = liveTitle.trim() !== '' && liveUrl.trim() !== '' && starttime.trim() !== '';
    const isOfflineFormValid = offlineTitle.trim() !== '' && sourceUri.trim() !== '' && offlineStarttime.trim() !== '';

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            let newEventData: LivestreamTask;
            if (taskType === 'live') {
                if (!isLiveFormValid) {
                    setError('任务标题、直播URL和计划开始时间是必填项。');
                    setIsLoading(false);
                    return;
                }

                const { task_id } = await createLiveAnalysisTask({
                    url: liveUrl,
                    event_name: liveTitle,
                    event_date: starttime.split('T')[0], // Extract YYYY-MM-DD
                });
                
                // Construct a temporary object for the UI based on the new LivestreamTask type
                newEventData = {
                    task_id,
                    event_name: liveTitle,
                    description: '',
                    task_type: 'live',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    source_url: liveUrl,
                    event_date: starttime.split('T')[0],
                    prompt_file_path: null,
                    output_directory: null,
                };
            } else { // offline
                if(!isOfflineFormValid){
                    setError('任务标题、源URI和原始开始时间都是必填项。');
                    setIsLoading(false);
                    return;
                }
                const { task_id } = await createVideoAnalysisTask({
                    video_path: sourceUri,
                    event_name: offlineTitle,
                    event_date: offlineStarttime.split('T')[0],
                });

                newEventData = {
                    task_id,
                    event_name: offlineTitle,
                    description: null,
                    task_type: 'video',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    source_url: sourceUri,
                    event_date: offlineStarttime.split('T')[0],
                    prompt_file_path: null,
                    output_directory: null,
                };
            }
            onSuccess(newEventData);
        } catch (err: any) {
            setError(err.message || '发生未知错误，请重试。');
        } finally {
            setIsLoading(false);
        }
    };

    const TabButton: React.FC<{ type: TaskType; label: string }> = ({ type, label }) => (
        <button
            onClick={() => setTaskType(type)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                taskType === type
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            disabled={isLoading}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">新增任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 border-b">
                    <div className="flex space-x-2 bg-gray-200 p-1 rounded-lg">
                        <TabButton type="live" label="直播任务" />
                        <TabButton type="offline" label="离线分析任务" />
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {taskType === 'live' ? (
                        <>
                             <div>
                                <label htmlFor="live-title" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                                <input
                                    type="text" id="live-title" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)}
                                    placeholder="例如：2024蔚来NIO Day直播"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                             <div>
                                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">直播间 URL <span className="text-red-500">*</span></label>
                                <input
                                    type="url" id="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)}
                                    placeholder="https://live.bilibili.com/22625027"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                             <div>
                                <label htmlFor="starttime" className="block text-sm font-medium text-gray-700 mb-1">计划开始时间 <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local" id="starttime" value={starttime} onChange={(e) => setStarttime(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    ) : (
                         <>
                            <div>
                                <label htmlFor="offlinetitle" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                                <input
                                    type="text" id="offlinetitle" value={offlineTitle} onChange={(e) => setOfflineTitle(e.target.value)}
                                    placeholder="例如：2024蔚来NIO Day全程回顾"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="sourceuri" className="block text-sm font-medium text-gray-700 mb-1">源 URI (服务器文件路径) <span className="text-red-500">*</span></label>
                                <input
                                    type="text" id="sourceuri" value={sourceUri} onChange={(e) => setSourceUri(e.target.value)}
                                    placeholder="/data/videos/video.mp4"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 mt-1">请输入服务器上视频文件的绝对路径。</p>
                            </div>
                             <div>
                                <label htmlFor="offlinestarttime" className="block text-sm font-medium text-gray-700 mb-1">原始开始时间 <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local" id="offlinestarttime" value={offlineStarttime} onChange={(e) => setOfflineStarttime(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 mt-1">用于前端排序和显示，请填写准确。</p>
                            </div>
                        </>
                    )}

                     {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg mt-4">
                            <strong>错误:</strong> {error}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-2xl">
                    <button 
                        onClick={onClose}
                        className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
                        disabled={isLoading}
                    >
                        取消
                    </button>
                     <button 
                        onClick={handleSubmit}
                        disabled={(taskType === 'live' ? !isLiveFormValid : !isOfflineFormValid) || isLoading}
                        className="py-2 px-4 w-32 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '创建任务'}
                    </button>
                </div>
            </div>
        </div>
    );
};