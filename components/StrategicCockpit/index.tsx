import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Subscription, InfoItem, ApiPoi } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { getUserPois, searchArticlesFiltered } from '../../api';

// --- Main Component ---
export const StrategicCockpit: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    // Left navigation state
    const [selectedLook, setSelectedLook] = useState('all');
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    
    // Active query state for API calls
    const [activeQuery, setActiveQuery] = useState<{ type: 'sublook' | 'poi', value: string, label: string }>({ 
        type: 'sublook', 
        value: '*', 
        label: '所有情报' 
    });

    // Data fetching and display state
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Detail view state
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    
    // Focus points state
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);
    const [pois, setPois] = useState<ApiPoi[]>([]);
    const [isLoadingPois, setIsLoadingPois] = useState(true);

    const subscribedSourceNames = useMemo(() => {
        if (!subscriptions) return [];
        return Array.from(new Set(subscriptions.map(sub => sub.source_name)));
    }, [subscriptions]);
    
    const fetchArticles = useCallback(async (query: string, page: number = 1) => {
        setIsLoading(true);
        if (page === 1) {
            setArticles([]); 
        }
        setError(null);

        try {
            const limit = 20;
            const params: any = {
                query_text: query,
                page,
                limit: limit,
                similarity_threshold: 0.35,
            };
            
            // Only add source filter if we have subscriptions and query is general
            // For semantic search (when query != *), we might want to broaden the scope or keep it strict.
            // Let's keep it consistent with the dashboard logic.
            if (subscribedSourceNames.length > 0) {
                params.source_names = subscribedSourceNames;
            }
            
            const response = await searchArticlesFiltered(params);
            
            const calculatedTotalPages = Math.ceil(response.total / limit) || 1;

            setArticles(response.items || []);
            setPagination({ page: response.page, totalPages: calculatedTotalPages, total: response.total });
            
            // Auto-select first article only on initial load if none selected
            if (page === 1 && response.items && response.items.length > 0 && !selectedArticle) {
                setSelectedArticle(response.items[0]);
            } else if (page === 1 && (!response.items || response.items.length === 0)) {
                setSelectedArticle(null);
            }

        } catch (err: any) {
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, [subscribedSourceNames]); // Removed selectedArticle from dependencies to prevent infinite loop


    useEffect(() => {
        // Trigger fetch when activeQuery changes
        if (activeQuery.value) {
            fetchArticles(activeQuery.value, 1);
        }
    }, [activeQuery, fetchArticles]);

    const handleNavChange = (type: 'sublook' | 'poi', value: string, label: string) => {
        setActiveQuery({ type, value, label });
        // Reset selection on category change to avoid stale data display
        setSelectedArticle(null); 
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, newPage);
        }
    };
    
    const fetchPois = useCallback(async () => {
        setIsLoadingPois(true);
        try {
            const userPois = await getUserPois();
            setPois(userPois);
        } catch (err) {
            console.error("Failed to fetch POIs in Cockpit:", err);
        } finally {
            setIsLoadingPois(false);
        }
    }, []);

    useEffect(() => {
        fetchPois();
    }, [fetchPois]);

    const handleModalClose = () => {
        setIsFocusPointModalOpen(false);
        fetchPois(); 
    };

    return (
        <div className="h-full flex flex-col bg-[#f8f9fa] p-4 gap-4 overflow-hidden">
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Left Sidebar - Navigation Drawer (Material 3) */}
                <aside className="w-72 flex-shrink-0 flex flex-col bg-white rounded-[24px] py-6 shadow-sm border border-gray-100/50">
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
                        <h2 className="text-sm font-bold text-gray-500 px-4 mb-4 uppercase tracking-wider">情报罗盘</h2>
                        <StrategicCompass
                            categories={lookCategories}
                            selectedLook={selectedLook}
                            setSelectedLook={setSelectedLook}
                            selectedSubLook={selectedSubLook}
                            setSelectedSubLook={setSelectedSubLook}
                            onSubCategoryClick={(value, label) => handleNavChange('sublook', value, label)}
                            activeQuery={activeQuery}
                        />
                        <div className="my-6 border-t border-gray-100 mx-2"></div>
                        <FocusPoints 
                            onManageClick={() => setIsFocusPointModalOpen(true)}
                            pois={pois}
                            isLoading={isLoadingPois}
                            onPoiClick={(value, label) => handleNavChange('poi', value, label)}
                            activeQuery={activeQuery}
                        />
                    </div>
                </aside>

                {/* Main Content Area */}
                 <main className="flex-1 flex gap-4 min-w-0">
                    {/* List View */}
                    <div className="w-[420px] flex-shrink-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-gray-100/50 overflow-hidden">
                        <IntelligenceCenter
                            title={activeQuery.label}
                            articles={articles}
                            isLoading={isLoading}
                            error={error}
                            selectedArticleId={selectedArticle?.id || null}
                            onSelectArticle={setSelectedArticle}
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.total