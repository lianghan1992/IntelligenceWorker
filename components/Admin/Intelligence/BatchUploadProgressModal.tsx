import React, { useState, useEffect, useRef } from 'react';
import { CloudIcon, CloseIcon, CheckIcon, RefreshIcon, ChevronDownIcon, ClockIcon } from '../../icons';

export interface UploadTask {
    id: string;
    file: File;
    newName: string;
    publishDate: string;
    size: number;
    progress: number;
    speed: number;
    status: 'waiting' | 'uploading' | 'processing' | 'completed' | 'error';
    errorMessage?: string;
    pointUuid: string;
}

interface BatchUploadProgressModalProps {
    isOpen: boolean;
    tasks: UploadTask[];
    onClose: () => void;
    onClear: () => void;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
};

export const BatchUploadProgressModal: React.FC<BatchUploadProgressModalProps> = ({ isOpen, tasks: initialTasks, onClose, onClear }) => {
    const [tasks, setTasks] = useState<UploadTask[]>(initialTasks);
    const [isMinimized, setIsMinimized] = useState(false);
    const activeUploadsCount = useRef(0);
    const MAX_CONCURRENT = 2; 

    // 同步外部任务到内部状态
    useEffect(() => {
        if (initialTasks.length > 0) {
            setTasks(prev => {
                const existingIds = new Set(prev.map(t => t.id));
                const newTasks = initialTasks.filter(t => !existingIds.has(t.id));
                return [...prev, ...newTasks];
            });
        }
    }, [initialTasks]);

    // 核心调度循环
    useEffect(() => {
        const waitingTask = tasks.find(t => t.status === 'waiting');
        if (waitingTask && activeUploadsCount.current < MAX_CONCURRENT) {
            startUpload(waitingTask.id);
        }
    }, [tasks]);

    const startUpload = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        activeUploadsCount.current++;
        updateTask(taskId, { status: 'uploading', progress: 0 });

        const formData = new FormData();
        const renamedFile = new File([task.file], task.newName, { type: task.file.type });
        formData.append('files', renamedFile);
        formData.append('point_uuid', task.pointUuid);
        if (task.publishDate) formData.append('publish_date', task.publishDate);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/intelspider/uploaded-docs/upload');
        
        const token = localStorage.getItem('accessToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        let startTime = Date.now();
        let lastLoaded = 0;
        const lastUpdateRef = { current: Date.now() };

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const now = Date.now();
                const loaded = event.loaded;
                const progress = Math.round((loaded / event.total) * 100);
                const timeDiff = (now - lastUpdateRef.current) / 1000;
                const instantSpeed = timeDiff > 0 ? (loaded - lastLoaded) / timeDiff : 0;
                
                // 留 1% 给后端处理阶段
                updateTask(taskId, { progress: progress === 100 ? 99 : progress, speed: instantSpeed });
                lastLoaded = loaded;
                lastUpdateRef.current = now;
            }
        };

        xhr.onload = () => {
            activeUploadsCount.current--;
            if (xhr.status >= 200 && xhr.status < 300) {
                updateTask(taskId, { status: 'completed', progress: 100, speed: 0 });
            } else {
                updateTask(taskId, { status: 'error', errorMessage: '服务器响应异常', speed: 0 });
            }
        };

        xhr.onerror = () => {
            activeUploadsCount.current--;
            updateTask(taskId, { status: 'error', errorMessage: '网络故障', speed: 0 });
        };

        xhr.send(formData);
    };

    const updateTask = (id: string, updates: Partial<UploadTask>) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    if (!isOpen && tasks.length === 0) return null;

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const isProcessing = tasks.some(t => t.status === 'uploading' || t.status === 'waiting');

    // 最小化状态显示悬浮球
    if (!isOpen || isMinimized) {
        return (
            <div 
                onClick={() => { setIsMinimized(false); if(!isOpen) onClose(); }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-all z-[100] group border-4 border-white"
            >
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
                    {tasks.length - completedCount}
                </div>
                <CloudIcon className={`w-7 h-7 text-white ${isProcessing ? 'animate-bounce' : ''}`} />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 pointer-events-none">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 pointer-events-auto flex flex-col max-h-[70vh] animate-in slide-in-from-bottom-4">
                {/* Header */}
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isProcessing ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                            {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">批量上传任务</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {completedCount} / {tasks.length} 已完成
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                            <ChevronDownIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => { onClear(); onClose(); }} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-slate-50/30">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2 gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-slate-700 truncate" title={task.newName}>{task.newName}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-400">{formatSize(task.size)}</span>
                                        {task.status === 'uploading' && (
                                            <span className="text-[10px] text-indigo-500 font-mono font-bold">{formatSpeed(task.speed)}</span>
                                        )}
                                        {task.status === 'completed' && (
                                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">正在解析...</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    {task.status === 'completed' ? (
                                        <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckIcon className="w-3 h-3"/></div>
                                    ) : task.status === 'error' ? (
                                        <span className="text-[10px] text-red-500 font-bold">失败</span>
                                    ) : task.status === 'uploading' ? (
                                        <span className="text-[10px] text-indigo-600 font-bold">{task.progress}%</span>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 font-bold">排队</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-300 ${
                                        task.status === 'completed' ? 'bg-green-500' : 
                                        task.status === 'error' ? 'bg-red-400' : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${task.progress}%` }}
                                ></div>
                            </div>
                            
                            {task.errorMessage && (
                                <p className="text-[9px] text-red-500 mt-1 truncate">{task.errorMessage}</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-3 border-t bg-white flex justify-between items-center rounded-b-2xl">
                    <div className="text-[10px] text-slate-400 italic">
                        提示: 面板收起后上传将在后台继续
                    </div>
                    {!isProcessing && (
                        <button onClick={onClear} className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors">
                            清空列表
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
