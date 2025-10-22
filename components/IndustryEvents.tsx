import React, { useState, useEffect } from 'react';
import { LivestreamTask, PaginatedResponse } from '../types';
import { getLivestreamTasks } from '../api';
import { TaskCard } from './TaskCard';
import { EventReportModal } from './EventReportModal';
import { SearchIcon } from './icons';

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    useEffect(() => {
        const fetchTasks = async () => {
            setIsLoading(true);
            setError('');
            try {
                const params: any = { page: 1, limit: 100, sort_by: 'start_time', order: 'desc' };
                if (searchTerm) {
                    params.search_term = searchTerm;
                }
                const response: PaginatedResponse<LivestreamTask> = await getLivestreamTasks(params);
                setTasks(response.items);
            } catch (err: any) {
                setError(err.message || '无法加载事件列表');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTasks();
    }, [searchTerm]);

    const filteredTasks = tasks.filter(task => {
        if (filter === 'upcoming') {
            return new Date(task.start_time) > new Date() && task.status !== 'completed';
        }
        if (filter === 'past') {
            return new Date(task.start_time) <= new Date() || task.status === 'completed';
        }
        return true;
    });

    const handleViewReport = (task: LivestreamTask) => {
        setSelectedEvent(task);
    };

    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">行业发布会</h1>
                        <p className="mt-1 text-gray-500">追踪重要的行业事件，获取AI生成的深度解读报告。</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="搜索发布会名称..."
                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button onClick={() => setFilter('all')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${filter === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            全部事件
                        </button>
                        <button onClick={() => setFilter('upcoming')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${filter === 'upcoming' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            即将开始
                        </button>
                        <button onClick={() => setFilter('past')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${filter === 'past' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            往期回顾
                        </button>
                    </nav>
                </div>

                {isLoading ? (
                    <div className="text-center py-20">正在加载...</div>
                ) : error ? (
                    <div className="text-center py-20 text-red-500">{error}</div>
                ) : filteredTasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTasks.map(task => (
                            <TaskCard key={task.id} task={task} onViewReport={handleViewReport} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                        <p className="text-gray-500">暂无相关事件。</p>
                    </div>
                )}
            </div>

            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        </div>
    );
};
