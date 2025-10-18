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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onSuccess }) => {
    const [taskType, setTaskType] = useState<TaskType>('live');

    // Shared state
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [source, setSource] = useState(''); // Holds URL, file_path, or dir_path
    const [prompts, setPrompts] = useState<LivestreamPrompt[]>([]);
    const [promptName, setPromptName] = useState('');

    // Live-specific state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (taskType === 'live') {
            return source.trim() !== '' && title.trim() !== '' && eventName.trim() !== '' && eventDate.trim() !== '' && promptName.trim() !== '';
        } else { // video or summit
            return eventName.trim() !== '' && source.trim() !== '' && eventDate.trim() !== '';
        }
    }, [taskType, source, title, eventName, eventDate, promptName]);

     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setCoverImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
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
            const cover_image_data = coverImage ? await fileToBase64(coverImage) : undefined;

            switch (taskType) {
                case 'live':
                    await createLiveAnalysisTask({ 
                        url: source,
                        prompt: promptName,
                        title,
                        description,
                        event_name: eventName,
                        event_date: eventDate,
                        cover_image_data
                    });
                    break;
                case 'video':
                    await createVideoAnalysisTask({
                        file_path: source,
                        event_name: eventName,
                        event_date: eventDate,
                        prompt: promptName,
                        cover_image_data
                    });
                    break;
                case 'summit':
                     await createSummitAnalysisTask({
                        images_directory: source,
                        event_name: eventName,
                        event_date: eventDate,
                        prompt: promptName,
                        cover_image_data
                     });
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
    
    const renderFormContent = () => {
        const commonFields = (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分析模板 <span className="text-red-500">*</span></label>
                    <select value={promptName} onChange={e => setPromptName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" disabled={isLoading || prompts.length === 0}>
                       {prompts.map(p => <option key={p.name} value={p.name} title={p.description}>{p.display_name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">封面图片 (可选)</label>
                    <div onClick={() => fileInputRef.current?.click()} className="mt-1 w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden">
                         {coverImagePreview ? (
                            <img src={coverImagePreview} alt="封面预览" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm text-gray-500">点击上传</span>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>
                </div>
            </>
        );

        if (taskType === 'live') {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="live-url" className="block text-sm font-medium text-gray-700 mb-1">直播间URL <span className="text-red-500">*</span></label>
                        <input
                            type="text" id="live-url" value={source} onChange={(e) => setSource(e.target.value)}
                            placeholder="支持B站、微博、抖音等主流平台"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="live-title" className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                        <input
                            type="text" id="live-title" value={title} onChange={(e) => setTitle(e.target.value)}
                            placeholder="例如：小米汽车SU7发布会"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="live-event-name" className="block text-sm font-medium text-gray-700 mb-1">事件名称 <span className="text-red-500">*</span></label>
                        <input
                            type="text" id="live-event-name" value={eventName} onChange={(e) => setEventName(e.target.value)}
                            placeholder="用于报告生成的事件名称"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="live-event-date" className="block text-sm font-medium text-gray-700 mb-1">事件日期 <span className="text-red-500">*</span></label>
                        <input
                            type="date" id="live-event-date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="live-description" className="block text-sm font-medium text-gray-700 mb-1">任务描述 (可选)</label>
                        <textarea
                            id="live-description" value={description} onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="关于本次直播任务的简短描述"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            disabled={isLoading}
                        />
                    </div>
                    {commonFields}
                </div>
            );
        }
        
        // For 'video' and 'summit'
        return (
            <div className="space-y-4">
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
                    <label htmlFor="source-path" className="block text-sm font-medium text-gray-700 mb-1">
                        {taskType === 'video' ? '视频文件路径' : '图片目录路径'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text" id="source-path" value={source} onChange={(e) => setSource(e.target.value)}
                        placeholder={taskType === 'video' ? '/path/to/your/video.mp4' : '/path/to/summit/images/'}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 mb-1">事件时间 <span className="text-red-500">*</span></label>
                    <input
                        type="date" id="event-date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>
                {commonFields}
            </div>
        );
    };

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

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg mb-4">
                            <strong>错误:</strong> {error}
                        </div>
                    )}
                    {renderFormContent()}
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