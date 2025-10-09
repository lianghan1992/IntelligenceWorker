import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Event, ApiTask } from '../types';
import { VideoCameraIcon, DocumentTextIcon } from './icons';
import { getEvents, convertApiTaskToFrontendEvent } from '../api';
import { EventReportModal } from './EventReportModal';

const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    }, [targetDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    const format = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className="flex space-x-3 text-center text-white">
            <div><span className="text-2xl font-bold tracking-tight">{format(timeLeft.days)}</span><span className="text-xs block text-white/70">天</span></div>
            <div><span className="text-2xl font-bold tracking-tight">{format(timeLeft.hours)}</span><span className="text-xs block text-white/70">时</span></div>
            <div><span className="text-2xl font-bold tracking-tight">{format(timeLeft.minutes)}</span><span className="text-xs block text-white/70">分</span></div>
            <div><span className="text-2xl font-bold tracking-tight">{format(timeLeft.seconds)}</span><span className="text-xs block text-white/70">秒</span></div>
        </div>
    );
};

const EventCard: React.FC<{ event: Event; onShowReport: (event: Event) => void; }> = ({ event, onShowReport }) => {
    const getStatusDetails = () => {
        switch (event.status) {
            case 'LIVE':
                return { text: '直播中', color: 'bg-red-600' };
            case 'UPCOMING':
                 return { text: '即将开始', color: 'bg-blue-600' };
            case 'SUMMARIZING':
                return { text: 'AI总结中', color: 'bg-yellow-600' };
            case 'FAILED':
                return { text: '处理失败', color: 'bg-red-800' };
            case 'CONCLUDED':
            default:
                return { text: '已结束', color: 'bg-gray-700' };
        }
    };

    const statusDetails = getStatusDetails();
    const eventDate = new Date(event.startTime);
    const isUpcoming = event.status === 'UPCOMING' && eventDate > new Date();
    const canShowReport = !!event.reportContentHtml;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group flex flex-col h-full shadow-sm hover:shadow-xl transition-shadow duration-300">
            <div 
                className={`relative h-48 bg-gray-900 p-5 flex flex-col justify-between text-white overflow-hidden ${canShowReport ? 'cursor-pointer' : ''}`}
                onClick={canShowReport ? () => onShowReport(event) : undefined}
                title={canShowReport ? '点击查看AI解读报告' : ''}
            >
                {event.coverImageUrl && (
                    <img src={event.coverImageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/70"></div>
                
                {canShowReport && (
                     <div className="absolute top-5 left-5 z-10 flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-blue-800 bg-blue-100/80 backdrop-blur-sm rounded-full">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        <span>可查看报告</span>
                    </div>
                )}
                
                <div className={`absolute top-5 right-5 px-2.5 py-1 text-xs font-bold rounded-full z-10 ${statusDetails.color}`}>
                    {statusDetails.text}
                </div>

                <div className="relative z-10">
                     <h3 className="text-xl font-bold mb-2 pr-16 line-clamp-2">{event.title}</h3>
                    <div className="flex items-center text-sm text-gray-200 space-x-1.5">
                        <VideoCameraIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{event.organizer.platform}</span>
                    </div>
                </div>

                <div className="relative z-10">
                    {isUpcoming ? (
                        <div>
                            <p className="text-xs text-white/80 mb-2">距离直播开始</p>
                            <CountdownTimer targetDate={event.startTime} />
                        </div>
                    ) : event.status === 'LIVE' && (
                        <div className="flex items-center space-x-2 animate-pulse">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-lg font-bold text-red-400">正在直播</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
                <div className="mt-auto pt-4 border-t border-gray-100">
                    {(() => {
                        const pad = (num: number) => num.toString().padStart(2, '0');
                        const year = eventDate.getFullYear();
                        const month = pad(eventDate.getMonth() + 1);
                        const day = pad(eventDate.getDate());
                        const hours = pad(eventDate.getHours());
                        const minutes = pad(eventDate.getMinutes());
                        const newFormattedTime = `${year}-${month}-${day} ${hours}:${minutes}`;
                        const timeInfoText = `直播于 ${newFormattedTime} 开始`;

                        const hasReplay = !!event.liveUrl;
                        let actionButton;

                        switch (event.status) {
                            case 'UPCOMING':
                                actionButton = (
                                    <button className="w-full py-2.5 px-4 bg-gray-100 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors">
                                        添加日历提醒
                                    </button>
                                );
                                break;
                            case 'LIVE':
                                actionButton = (
                                    <a 
                                        href={event.liveUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={`w-full block text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                            hasReplay
                                            ? 'bg-red-600 text-white hover:bg-red-700' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        观看直播
                                    </a>
                                );
                                break;
                            default: // SUMMARIZING, CONCLUDED, FAILED
                                actionButton = (
                                    <a 
                                        href={event.liveUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={`w-full block text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                            hasReplay
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                        onClick={(e) => !hasReplay && e.preventDefault()}
                                    >
                                        观看回放
                                    </a>
                                );
                                break;
                        }

                        return (
                            <div>
                                <p className="text-xs text-gray-400 mb-2">{timeInfoText}</p>
                                {actionButton}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

const sortEvents = (events: Event[]): Event[] => {
    return [...events].sort((a, b) => {
        const statusOrder = { 'LIVE': 1, 'UPCOMING': 2, 'SUMMARIZING': 3, 'CONCLUDED': 4, 'FAILED': 5 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        if (a.status === 'UPCOMING') {
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime(); // Sooner first
        }
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime(); // Most recent first for all others
    });
};

export const IndustryEvents: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedEventForReport, setSelectedEventForReport] = useState<Event | null>(null);

    const observer = useRef<IntersectionObserver>();
    const lastEventElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages) {
                setPage(prevPage => prevPage + 1);
            }
        });
        
        if (node) observer.current.observe(node);
    }, [isLoading, isFetchingMore, page, totalPages]);

    useEffect(() => {
        const loadEvents = async () => {
            if (page === 1) setIsLoading(true);
            else setIsFetchingMore(true);

            setError(null);
            try {
                const { events: newEvents, totalPages: newTotalPages } = await getEvents(page);
                setEvents(prevEvents => sortEvents(page === 1 ? newEvents : [...prevEvents, ...newEvents]));
                setTotalPages(newTotalPages);
            } catch (err) {
                setError(err instanceof Error ? err.message : '发生未知错误');
            } finally {
                setIsLoading(false);
                setIsFetchingMore(false);
            }
        };

        loadEvents();
    }, [page]);
    
    useEffect(() => {
        // Fix: The socket.io client `io()` function was called without an argument, but the function signature requires one.
        // Providing '/' as the argument connects the client to the server that served the page, resolving the error.
        // FIX: The io() function requires an argument. Passing '/' connects to the host that serves the page.
        const socket: Socket = io('/');

        socket.on('connect', () => {
            console.log('WebSocket connected. Joining room: live_recorder');
            socket.emit('join', { room: 'live_recorder' });
        });
        
        socket.on('disconnect', () => {
            console.log('WebSocket disconnected.');
        });
        
        socket.on('tasks_status_batch_update', (data: { tasks: ApiTask[] }) => {
            console.log('WebSocket event: tasks_status_batch_update received', data);
            if (data && Array.isArray(data.tasks)) {
                // Per API v11, we should completely replace the list for consistency.
                const newEvents = data.tasks.map(convertApiTaskToFrontendEvent);
                setEvents(sortEvents(newEvents));
            }
        });

        return () => {
            console.log('Disconnecting WebSocket.');
            socket.disconnect();
        };
    }, []);

    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            {isLoading && page === 1 && <div className="text-center py-10">加载中...</div>}
            {error && <div className="text-center py-10 text-red-500">加载失败: {error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {events.map((event, index) => (
                     <div ref={events.length === index + 1 ? lastEventElementRef : null} key={event.id}>
                        <EventCard event={event} onShowReport={setSelectedEventForReport} />
                    </div>
                ))}
            </div>

            {isFetchingMore && <div className="text-center py-10">加载更多...</div>}
            {page >= totalPages && !isLoading && events.length > 0 && (
                <div className="text-center py-10 text-gray-500">已加载全部内容</div>
            )}
            {!isLoading && !error && events.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <p>暂无行业发布会信息。</p>
                </div>
            )}

            {selectedEventForReport && <EventReportModal event={selectedEventForReport} onClose={() => setSelectedEventForReport(null)} />}
        </div>
    );
};
