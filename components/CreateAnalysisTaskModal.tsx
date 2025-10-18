import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CloseIcon } from './icons';
import { createLiveAnalysisTask, createVideoAnalysisTask, createSummitAnalysisTask, getLivestreamPrompts } from '../api';
import { LivestreamPrompt } from '../types';

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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const CreateAnalysisTaskModal: React.FC<CreateAnalysisTaskModalProps> = ({ onClose, onSuccess }) => {
    const [taskType, setTaskType] = useState<TaskType>('live');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [prompts, setPrompts] = useState<LivestreamPrompt[]>([]);

    // Form state
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [promptName, setPromptName] = useState('');
    const [source, setSource] = useState(''); // Holds URL, file_path, or dir_path
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
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
                setError("无法加载分析模板列表");
            }
        };
        fetchPrompts();
    }, []);
    
    const isFormValid = useMemo(() => {
        if (taskType === 'live') {
            return source.trim() !== '' && title.trim() !== '' && eventName.trim() !== '' && eventDate.trim() !== '' && promptName.trim() !== '';
        } else { // video or summit
            return eventName.trim() !== '' && eventDate.trim() !== '' && source.trim() !== '';
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
                        title: title,
                        description: description,
                        event_name: eventName,
                        event_date: eventDate,
                        cover_image_data,
                     });
                    break;
                case 'video':
                    await createVideoAnalysisTask({ 
                        file_path: source,
                        event_name: eventName,
                        event_date: eventDate,
                        prompt: promptName,
                        cover_image_data,
                    });
                    break;
                case 'summit':
                    await createSummitAnalysisTask({
                        images_directory: source,
                        event_name: eventName,
                        event_date: eventDate,
                        prompt: promptName,
                        cover_image_data,
                    });
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
    
    const renderFormFields = () => {
        const commonFields = (
            <>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分析模板 <span className="text-red-500">*</span></label>
                    <select value={promptName} onChange={e => setPromptName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
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
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">直播间URL <span className="text-red-500">*</span></label>
                        <input type="text" value={source} onChange={e => setSource(e.target.value)} placeholder="支持B站、微博、抖音等主流平台" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">任务标题 <span className="text-red-500">*</span></label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：小米汽车SU7发布会" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">事件名称 <span className="text-red-500">*</span></label>
                        <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="用于报告生成的事件名称" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">事件日期 <span className="text-red-500">*</span></label>
                        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">任务描述 (可选)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="关于本次直播任务的简短描述" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 resize-none" />
                    </div>
                    {commonFields}
                </>
            );
        }

        return (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务/事件名称 <span className="text-red-500">*</span></label>
                    <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="例如：2024蔚来NIO Day" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">事件时间 <span className="text-red-500">*</span></label>
                    <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{taskType === 'video' ? '视频文件路径' : '图片目录路径'} <span className="text-red-500">*</span></label>
                    <input type="text" value={source} onChange={e => setSource(e.target.value)} placeholder={taskType === 'video' ? '/srv/videos/nio_day.mp4' : '/srv/images/summit_2024/'} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                </div>
                {commonFields}
            </>
        );
    }

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
                        <TabButton type="summit" label="峰会分析" />
                    </div>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    {renderFormFields()}
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