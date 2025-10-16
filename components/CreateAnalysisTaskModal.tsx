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

const FileInput: React.FC<{
    onChange: (files: FileList | null) => void;
    multiple?: boolean;
    accept: string;
    files: File[] | null;
}> = ({ onChange, multiple = false, accept, files }) => (
    <div className="mt-2 flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">点击上传</span> 或拖拽文件</p>
                <p className="text-xs text-gray-500">{multiple ? "可选择多个文件" : "选择单个文件"}</p>
            </div>
            <input type="file" className="hidden" multiple={multiple} accept={accept} onChange={e => onChange(e.target.files)} />
        </label>
    </div>
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
    const [videoFile, setVideoFile] = useState<File[] | null>(null);
    const [imageFiles, setImageFiles] = useState<File[] | null>(null);

    const isFormValid = useMemo(() => {
        if (!title.trim()) return false;
        switch (taskType) {
            case 'live': return liveUrl.trim() !== '' && eventDate.trim() !== '';
            case 'video': return videoFile && videoFile.length > 0;
            case 'summit': return imageFiles && imageFiles.length > 0;
            default: return false;
        }
    }, [title, taskType, liveUrl, eventDate, videoFile, imageFiles]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            switch (taskType) {
                case 'live':
                    await createLiveAnalysisTask({
                        url: liveUrl,
                        event_name: title,
                        event_date: eventDate,
                        description,
                        prompt_type: promptType
                    });
                    break;
                case 'video':
                    if (!videoFile || videoFile.length === 0) throw new Error('请选择一个视频文件。');
                    const videoFormData = new FormData();
                    videoFormData.append('title', title);
                    if(description) videoFormData.append('description', description);
                    if(promptType) videoFormData.append('prompt_type', promptType);
                    videoFormData.append('video_file', videoFile[0]);
                    await createVideoAnalysisTask(videoFormData);
                    break;
                case 'summit':
                    if (!imageFiles || imageFiles.length === 0) throw new Error('请选择至少一张图片。');
                    const summitFormData = new FormData();
                    summitFormData.append('title', title);
                    if(description) summitFormData.append('description', description);
                    if(promptType) summitFormData.append('prompt_type', promptType);
                    imageFiles.forEach(file => summitFormData.append('images', file));
                    await createSummitAnalysisTask(summitFormData);
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

    const renderSelectedFiles = (files: File[] | null) => {
        if (!files || files.length === 0) return null;
        if (files.length === 1) return <p className="text-xs text-gray-500 mt-1">已选择: {files[0].name}</p>;
        return <p className="text-xs text-gray-500 mt-1">已选择 {files.length} 个文件。</p>;
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">视频文件 <span className="text-red-500">*</span></label>
                            <FileInput onChange={files => setVideoFile(files ? Array.from(files) : null)} accept="video/*" files={videoFile} />
                            {renderSelectedFiles(videoFile)}
                        </div>
                    )}
                    {taskType === 'summit' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">图片文件 <span className="text-red-500">*</span></label>
                            <FileInput onChange={files => setImageFiles(files ? Array.from(files) : null)} multiple accept="image/*" files={imageFiles} />
                            {renderSelectedFiles(imageFiles)}
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