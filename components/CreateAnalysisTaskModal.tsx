import React, { useState } from 'react';
import { CloseIcon } from './icons';
import { createLiveAnalysisTask, createVideoAnalysisTask } from '../api';
import { LivestreamTask } from '../types';

interface CreateAnalysisTaskModalProps {
  onClose: () => void;
  onSuccess: (newEvent: LivestreamTask) => void;
}

type TaskType = 'live' | 'video' | 'summit';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const CreateAnalysisTaskModal: React.FC<CreateAnalysisTaskModalProps> = ({ onClose, onSuccess }) => {
    const [taskType, setTaskType] = useState<TaskType>('live');

    // Live Task State
    const [liveTitle, setLiveTitle] = useState('');
    const [liveUrl, setLiveUrl] = useState('');
    const [eventDate, setEventDate] = useState('');
    
    // Video Task State
    const [videoTitle, setVideoTitle] = useState('');
    const [videoPath, setVideoPath] = useState('');
    const [videoEventDate, setVideoEventDate] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const isLiveFormValid = liveTitle.trim() !== '' && liveUrl.trim() !== '' && eventDate.trim() !== '';
    const isVideoFormValid = videoTitle.trim() !== '' && videoPath.trim() !== '' && videoEventDate.trim() !== '';

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            let newEventData: LivestreamTask;
            if (taskType === 'live') {
                if (!isLiveFormValid) {
                    setError('任务标题、直播URL和事件日期是必填项。');
                    setIsLoading(false);
                    return;
                }

                const { task_id } = await createLiveAnalysisTask({
                    url: liveUrl,
                    event_name: liveTitle,
                    event_date: eventDate,
                });
                
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
                    event_date: eventDate,
                    prompt_file_path: null,
                    output_directory: null,
                };
            } else { // video or summit
                if(!isVideoFormValid){
                    setError('任务标题、视频路径和事件日期是必填项。');
                    setIsLoading(false);
                    return;
                }
                const { task_id } = await createVideoAnalysisTask({
                    video_path: videoPath,
                    event_name: videoTitle,
                    event_date: videoEventDate,
                });

                newEventData = {
                    task_id,
                    event_name: videoTitle,
                    description: null,
                    task_type: 'video', // Assuming summit is also video for now
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    source_url: videoPath,
                    event_date: videoEventDate,
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
                    <h3 className="text-lg font-semibold text-gray-900">创建新的分析任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 border-b">
                    <div className="flex space-x-2 bg-gray-200 p-1 rounded-lg">
                        <TabButton type="live" label="直播分析" />
                        <TabButton type="video" label="视频分析" />
                        <TabButton type="summit" label="图片集分析" />
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {taskType === 'live' && (
                        <>
                             <div>
                                <label htmlFor="live-title" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                                <input
                                    type="text" id="live-title" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)}
                                    placeholder="例如：2025 CES 汽车技术发布会"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                             <div>
                                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">直播间 URL <span className="text-red-500">*</span></label>
                                <input
                                    type="url" id="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)}
                                    placeholder="https://live.example.com/12345"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                             <div>
                                <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">事件日期 <span className="text-red-500">*</span></label>
                                <input
                                    type="date" id="eventDate" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    )}
                    {taskType === 'video' && (
                         <>
                            <div>
                                <label htmlFor="videoTitle" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                                <input
                                    type="text" id="videoTitle" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)}
                                    placeholder="例如：2025 CES 汽车技术发布会回顾"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="videoPath" className="block text-sm font-medium text-gray-700 mb-1">视频路径 (服务器路径) <span className="text-red-500">*</span></label>
                                <input
                                    type="text" id="videoPath" value={videoPath} onChange={(e) => setVideoPath(e.target.value)}
                                    placeholder="/data/videos/ces2025.mp4"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                             <div>
                                <label htmlFor="videoEventDate" className="block text-sm font-medium text-gray-700 mb-1">事件日期 <span className="text-red-500">*</span></label>
                                <input
                                    type="date" id="videoEventDate" value={videoEventDate} onChange={(e) => setVideoEventDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    )}
                    {taskType === 'summit' && (
                        <div className="text-center p-8 bg-gray-100 rounded-lg">
                            <p className="text-gray-500">图片集分析功能正在开发中...</p>
                        </div>
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
                        disabled={(taskType === 'live' ? !isLiveFormValid : !isVideoFormValid) || isLoading || taskType === 'summit'}
                        className="py-2 px-4 w-32 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '创建任务'}
                    </button>
                </div>
            </div>
        </div>
    );
};
