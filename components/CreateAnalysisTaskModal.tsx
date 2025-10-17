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
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
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
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const [archiveFile, setArchiveFile] = useState<File | null>(null);
    const coverImageInputRef = useRef<HTMLInputElement>(null);
    const archiveInputRef = useRef<HTMLInputElement>(null);

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
        if (!eventName.trim() || !eventDate.trim() || !promptName || !coverImageFile) return false;
        if (taskType === 'summit') {
            return url.trim() !== '' && archiveFile !== null;
        }
        return url.trim() !== '';
    }, [eventName, eventDate, promptName, coverImageFile, taskType, url, archiveFile]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileSetter: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files[0]) {
            fileSetter(e.target.files[0]);
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
            const cover_image_data = await fileToBase64(coverImageFile!);
            const formattedEventDate = eventDate ? eventDate.replace('T', ' ') + ':00' : '';

            const commonPayload = {
                event_name: eventName,
                event_date: formattedEventDate,
                prompt_name: promptName,
                cover_image_data,
            };
            
            switch (taskType) {
                case 'live':
                    await createLiveAnalysisTask({ ...commonPayload, url });
                    break;
                case 'video':
                    await createVideoAnalysisTask({ ...commonPayload, url });
                    break;
                case 'summit':
                    await createSummitAnalysisTask({
                        ...commonPayload,
                        url,
                        archive_file: archiveFile!.name,
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
    
    const getUrlLabel = () => {
        switch(taskType) {
            case 'live': return '直播间 URL';
            case 'video': return '视频 URL';
            case 'summit': return '峰会参考 URL';
            default: return 'URL';
        }
    }
    
    const getUrlPlaceholder = () => {
        switch(taskType) {
            case 'live': return 'https://live.bilibili.com/12345';
            case 'video': return 'https://www.bilibili.com/video/BV123...';
            case 'summit': return 'https://example.com/summit-2024';
            default: return '';
        }
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">任务/事件名称 <span className="text-red-500">*</span></label>
                        <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="例如：2024蔚来NIO Day" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">事件时间 <span className="text-red-500">*</span></label>
                        <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分析模板 <span className="text-red-500">*</span></label>
                        <select value={promptName} onChange={e => setPromptName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                           {prompts.map(p => <option key={p.name} value={p.name} title={p.description}>{p.display_name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{getUrlLabel()} <span className="text-red-500">*</span></label>
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={getUrlPlaceholder()} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                    </div>
                    
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">封面图片 <span className="text-red-500">*</span></label>
                        <div
                            onClick={() => coverImageInputRef.current?.click()}
                            className="w-full p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                        >
                            <span className="text-sm text-gray-500">{coverImageFile ? `已选择: ${coverImageFile.name}` : '点击选择图片文件'}</span>
                            <input type="file" ref={coverImageInputRef} onChange={(e) => handleFileChange(e, setCoverImageFile)} accept="image/*" className="hidden" />
                        </div>
                    </div>
                    
                    {taskType === 'summit' && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">图片集压缩文件 <span className="text-red-500">*</span></label>
                             <div
                                onClick={() => archiveInputRef.current?.click()}
                                className="w-full p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <span className="text-sm text-gray-500">{archiveFile ? `已选择: ${archiveFile.name}` : '点击选择 .zip 文件'}</span>
                                <input type="file" ref={archiveInputRef} onChange={(e) => handleFileChange(e, setArchiveFile)} accept=".zip,.rar,.7z" className="hidden" />
                            </div>
                        </div>
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