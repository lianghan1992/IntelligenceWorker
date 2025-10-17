import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CloseIcon } from './icons';
import { createLiveAnalysisTask, createVideoAnalysisTask, getLivestreamPrompts } from '../api';
import { LivestreamTask, LivestreamPrompt } from '../types';

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

// FIX: Added helper to convert file to base64 for API payload.
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        // The API likely expects the raw base64 string without the data URI prefix.
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};


export const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onSuccess }) => {
    const [taskType, setTaskType] = useState<TaskType>('live');

    // FIX: Unified form state for simplicity and to handle new API requirements.
    const [eventName, setEventName] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [prompts, setPrompts] = useState<LivestreamPrompt[]>([]);
    const [promptName, setPromptName] = useState('');
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        return eventName.trim() !== '' && sourceUrl.trim() !== '' && eventTime.trim() !== '' && promptName && coverImageFile;
    }, [eventName, sourceUrl, eventTime, promptName, coverImageFile]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCoverImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!isFormValid) {
            setError("请填写所有必填项。");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            let newEventData: LivestreamTask;
            const cover_image_data = await fileToBase64(coverImageFile!);
            const commonPayload = {
                event_name: eventName,
                event_date: eventTime.split('T')[0],
                prompt_name: promptName,
                cover_image_data,
            };

            if (taskType === 'live') {
                // FIX: Pass all required properties to createLiveAnalysisTask.
                const { task_id } = await createLiveAnalysisTask({
                    ...commonPayload,
                    url: sourceUrl,
                });
                
                // FIX: Update object to match LivestreamTask type, removing `prompt_file_path` and adding `prompt_name`.
                newEventData = {
                    task_id,
                    event_name: eventName,
                    description: '',
                    task_type: 'live',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    source_url: sourceUrl,
                    event_date: eventTime.split('T')[0],
                    prompt_name: promptName,
                    output_directory: null,
                };
            } else { // offline
                // FIX: Pass `url` instead of `video_path` and include all required properties.
                const { task_id } = await createVideoAnalysisTask({
                    ...commonPayload,
                    url: sourceUrl,
                });
                
                // FIX: Update object to match LivestreamTask type, removing `prompt_file_path` and adding `prompt_name`.
                newEventData = {
                    task_id,
                    event_name: eventName,
                    description: null,
                    task_type: 'video',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    source_url: sourceUrl,
                    event_date: eventTime.split('T')[0],
                    prompt_name: promptName,
                    output_directory: null,
                };
            }
            onSuccess(newEventData);
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

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label htmlFor="event-name" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                        <input
                            type="text" id="event-name" value={eventName} onChange={(e) => setEventName(e.target.value)}
                            placeholder={taskType === 'live' ? "例如：2024蔚来NIO Day直播" : "例如：2024蔚来NIO Day全程回顾"}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="source-url" className="block text-sm font-medium text-gray-700 mb-1">{taskType === 'live' ? '直播间 URL' : '源 URI (服务器文件路径)'} <span className="text-red-500">*</span></label>
                        <input
                            type={taskType === 'live' ? 'url' : 'text'} id="source-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                            placeholder={taskType === 'live' ? "https://live.bilibili.com/22625027" : "/data/videos/video.mp4"}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                         {taskType === 'offline' && <p className="text-xs text-gray-500 mt-1">请输入服务器上视频文件的绝对路径。</p>}
                    </div>
                     <div>
                        <label htmlFor="event-time" className="block text-sm font-medium text-gray-700 mb-1">{taskType === 'live' ? '计划开始时间' : '原始开始时间'} <span className="text-red-500">*</span></label>
                        <input
                            type="datetime-local" id="event-time" value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                         {taskType === 'offline' && <p className="text-xs text-gray-500 mt-1">用于前端排序和显示，请填写准确。</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分析模板 <span className="text-red-500">*</span></label>
                        <select value={promptName} onChange={e => setPromptName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" disabled={isLoading || prompts.length === 0}>
                           {prompts.map(p => <option key={p.name} value={p.name} title={p.description}>{p.display_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">封面图片 <span className="text-red-500">*</span></label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                        >
                            <span className="text-sm text-gray-500">{coverImageFile ? `已选择: ${coverImageFile.name}` : '点击选择图片文件'}</span>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
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