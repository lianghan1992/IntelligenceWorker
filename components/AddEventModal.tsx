import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CloseIcon } from './icons';
import { createLiveAnalysisTask, createVideoAnalysisTask, createSummitAnalysisTask, getLivestreamPrompts } from '../api';
import { LivestreamTask, LivestreamPrompt } from '../types';

interface AddEventModalProps {
  onClose: () => void;
  onSuccess: (newEvent?: LivestreamTask) => void;
}

type TaskType = 'live' | 'video' | 'summit';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onSuccess }) => {
    const [taskType, setTaskType] = useState<TaskType>('live');

    const [eventName, setEventName] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [prompts, setPrompts] = useState<LivestreamPrompt[]>([]);
    const [promptName, setPromptName] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const response = await getLivestreamPrompts();
                setPrompts(response.prompts);
                if (response.prompts.length > 0) {
                    setPromptName(response.prompts[0].name);
                }
            } catch (err) {
                console.error("Failed to fetch prompts", err);
                setError("无法加载分析模板");
            }
        };
        fetchPrompts();
    }, []);

    const isFormValid = useMemo(() => {
        return eventName.trim() !== '' && sourceUrl.trim() !== '' && eventTime.trim() !== '' && promptName;
    }, [eventName, sourceUrl, eventTime, promptName]);

    const handleSubmit = async () => {
        if (!isFormValid) {
            setError("请填写所有必填项。");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const formattedEventDate = eventTime ? eventTime.split('T')[0] : '';

            const commonPayload = {
                event_name: eventName,
                event_date: formattedEventDate,
                prompt: promptName,
            };

            switch (taskType) {
                case 'live':
                    await createLiveAnalysisTask({ ...commonPayload, url: sourceUrl });
                    break;
                case 'video':
                    await createVideoAnalysisTask({ ...commonPayload, file_path: sourceUrl });
                    break;
                case 'summit':
                     await createSummitAnalysisTask({ ...commonPayload, images_directory: sourceUrl });
                    break;
            }
            onSuccess();
            onClose();
        } catch (err: any) {
             let errorMessage = err.message || '发生未知错误，请重试。';
             if (errorMessage.includes('this live has a listener')) {
                errorMessage = '创建失败：该直播间已在监控中，请勿重复添加。';
             }
            setError(errorMessage);
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
    
    const getUrlLabelAndPlaceholder = () => {
        switch (taskType) {
            case 'video':
                return { label: '视频文件路径', placeholder: '/path/to/your/video.mp4' };
            case 'summit':
                return { label: '图片目录路径', placeholder: '/path/to/summit/images/' };
            case 'live':
            default:
                return { label: '直播间 URL', placeholder: 'https://live.bilibili.com/22625027' };
        }
    };

    const { label: urlLabel, placeholder: urlPlaceholder } = getUrlLabelAndPlaceholder();

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
                        <TabButton type="video" label="视频分析" />
                        <TabButton type="summit" label="峰会分析" />
                    </div>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label htmlFor="event-name" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                        <input
                            type="text" id="event-name" value={eventName} onChange={(e) => setEventName(e.target.value)}
                            placeholder="例如：2024蔚来NIO Day"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="source-url" className="block text-sm font-medium text-gray-700 mb-1">{urlLabel} <span className="text-red-500">*</span></label>
                        <input
                            type={taskType === 'live' ? 'url' : 'text'} id="source-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                            placeholder={urlPlaceholder}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="event-time" className="block text-sm font-medium text-gray-700 mb-1">事件时间 <span className="text-red-500">*</span></label>
                        <input
                            type="date" id="event-time" value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分析模板 <span className="text-red-500">*</span></label>
                        <select value={promptName} onChange={e => setPromptName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" disabled={isLoading || prompts.length === 0}>
                           {prompts.map(p => <option key={p.name} value={p.name} title={p.description}>{p.description}</option>)}
                        </select>
                    </div>
                    
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
                        disabled={!isFormValid || isLoading}
                        className="py-2 px-4 w-32 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '创建任务'}
                    </button>
                </div>
            </div>
        </div>
    );
};