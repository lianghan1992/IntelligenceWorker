// FIX: Import `useMemo` from `react` to resolve the "Cannot find name" error.
import React, { useState, useRef, useMemo } from 'react';
import { CloseIcon } from './icons';
import { createLiveAnalysisTask, createVideoAnalysisTask, createSummitAnalysisTask } from '../api';

interface CreateAnalysisTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [promptType, setPromptType] = useState('default');
    const [liveUrl, setLiveUrl] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [videoPath, setVideoPath] = useState('');
    const [imagesDirectory, setImagesDirectory] = useState('');

    const isFormValid = useMemo(() => {
        if (!title.trim() || !eventDate.trim()) return false;
        switch (taskType) {
            case 'live': return liveUrl.trim() !== '';
            case 'video': return videoPath.trim() !== '';
            case 'summit': return imagesDirectory.trim() !== '';
            default: return false;
        }
    }, [title, eventDate, taskType, liveUrl, videoPath, imagesDirectory]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            const commonData = {
                event_name: title,
                event_date: eventDate.split('T')[0], // Ensure YYYY-MM-DD format
                description,
                prompt_file: promptType !== 'default' ? `${promptType}.md` : undefined,
            };

            switch (taskType) {
                case 'live':
                    await createLiveAnalysisTask({ ...commonData, url: liveUrl });
                    break;
                case 'video':
                    await createVideoAnalysisTask({ ...commonData, video_path: videoPath });
                    break;
                case 'summit':
                    await createSummitAnalysisTask({ ...commonData, images_directory: imagesDirectory });
                    break;
            }
            onSuccess();
            onClose();
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
                taskType === type ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
            disabled={isLoading}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">新增分析任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700" disabled={isLoading}><CloseIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-4 bg-gray-50 border-b">
                    <div className="flex space-x-2 bg-gray-200 p-1 rounded-lg">
                        <TabButton type="live" label="直播分析" />
                        <TabButton type="video" label="视频分析" />
                        <TabButton type="summit" label="图片集分析" />
                    </div>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：2024蔚来NIO Day直播" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="输入任务的简短描述..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 resize-none" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分析模板</label>
                        <select value={promptType} onChange={e => setPromptType(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                           <option value="default">默认分析</option>
                           <option value="car_launch_event">新车发布会</option>
                           <option value="car_review">汽车测评</option>
                           <option value="summit_analysis">行业峰会</option>
                        </select>
                    </div>

                    {taskType === 'live' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">直播间 URL <span className="text-red-500">*</span></label>
                                <input type="url" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="https://live.bilibili.com/22625027" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">计划开始时间 <span className="text-red-500">*</span></label>
                                <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                            </div>
                        </>
                    )}
                    {taskType === 'video' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">视频文件路径 <span className="text-red-500">*</span></label>
                                <input type="text" value={videoPath} onChange={e => setVideoPath(e.target.value)} placeholder="/path/to/your/video.mp4" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                                <p className="text-xs text-gray-500 mt-1">请输入服务器上视频文件的绝对路径。</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">事件日期 <span className="text-red-500">*</span></label>
                                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                            </div>
                        </>
                    )}
                    {taskType === 'summit' && (
                         <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">图片文件夹路径 <span className="text-red-500">*</span></label>
                                <input type="text" value={imagesDirectory} onChange={e => setImagesDirectory(e.target.value)} placeholder="/path/to/summit/images" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                                <p className="text-xs text-gray-500 mt-1">请输入服务器上图片文件夹的绝对路径。</p>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">事件日期 <span className="text-red-500">*</span></label>
                                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={handleSubmit} disabled={!isFormValid || isLoading} className="w-32 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
                        {isLoading ? <Spinner /> : '创建任务'}
                    </button>
                </div>
            </div>
        </div>
    );
};