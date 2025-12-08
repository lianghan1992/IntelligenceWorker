
import React, { useState, useEffect } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticleDetail, updateSpiderArticle, reviewSpiderArticle } from '../../../api/intelligence';
import { CloseIcon, ServerIcon, ClockIcon, ExternalLinkIcon, CheckCircleIcon, PencilIcon, SparklesIcon } from '../../icons';

interface ArticleDetailModalProps {
    articleId: string;
    onClose: () => void;
    onUpdate?: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ articleId, onClose, onUpdate }) => {
    const [article, setArticle] = useState<SpiderArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', publish_time: '', content: '' });

    useEffect(() => {
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const data = await getSpiderArticleDetail(articleId);
                setArticle(data);
                setEditForm({
                    title: data.title || '',
                    publish_time: data.publish_time || '',
                    content: data.content || ''
                });
            } catch (e) {
                console.error("Failed to load article detail", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [articleId]);

    const handleSave = async () => {
        if (!article) return;
        setIsSaving(true);
        try {
            await updateSpiderArticle(article.id, editForm);
            const updated = await getSpiderArticleDetail(article.id);
            setArticle(updated);
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (e) {
            alert('更新失败');
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!article) return;
        setIsApproving(true);
        try {
            await reviewSpiderArticle(article.id, true);
            const updated = await getSpiderArticleDetail(article.id);
            setArticle(updated);
            if (onUpdate) onUpdate();
        } catch (e) {
            alert('审核失败');
        } finally {
            setIsApproving(false);
        }
    };

    if (isLoading && !article) {
        return (
            <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-4xl p-10 flex justify-center">
                    <Spinner />
                </div>
            </div>
        );
    }

    if (!article) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-start flex-shrink-0">
                    <div className="flex-1 pr-8">
                        {isEditing ? (
                            <input 
                                className="w-full text-lg font-bold border border-blue-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editForm.title}
                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                                placeholder="文章标题"
                            />
                        ) : (
                            <h3 className="text-xl font-bold text-gray-800 leading-snug">{article.title}</h3>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <ServerIcon className="w-3 h-3" /> {article.source_name || '未知来源'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {article.point_name || '未知采集点'}
                            </span>
                            {article.is_reviewed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <CheckCircleIcon className="w-3 h-3" /> 已入库
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                    待审核
                                </span>
                            )}
                            <div className="h-4 w-px bg-slate-300 mx-1"></div>
                            {isEditing ? (
                                <input 
                                    type="datetime-local" // Simplified, ideally consistent format
                                    className="text-xs border border-blue-300 rounded p-1"
                                    value={editForm.publish_time?.replace(' ', 'T') || ''}
                                    onChange={e => setEditForm({...editForm, publish_time: e.target.value.replace('T', ' ')})}
                                />
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <ClockIcon className="w-3 h-3" /> 
                                    发布: {article.publish_time || 'N/A'}
                                </span>
                            )}
                            <a 
                                href={article.original_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 ml-2"
                            >
                                <ExternalLinkIcon className="w-3 h-3"/> 原文
                            </a>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-6 h-6"/></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white custom-scrollbar">
                    {isEditing ? (
                        <textarea 
                            className="w-full h-full min-h-[400px] border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            value={editForm.content}
                            onChange={e => setEditForm({...editForm, content: e.target.value})}
                            placeholder="文章内容 (Markdown)"
                        />
                    ) : (
                        <article className="prose prose-sm md:prose-base max-w-none text-slate-700">
                            {article.content ? (
                                <div dangerouslySetInnerHTML={{ __html: window.marked?.parse(article.content) || article.content.replace(/\n/g, '<br/>') }} />
                            ) : (
                                <div className="text-center text-gray-400 py-20 italic">内容为空</div>
                            )}
                        </article>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <div className="text-xs text-gray-400 font-mono">ID: {article.id}</div>
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
                                >
                                    {isSaving && <Spinner />} 保存
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => {
                                        setIsEditing(true);
                                        setEditForm({
                                            title: article.title,
                                            publish_time: article.publish_time || '',
                                            content: article.content || ''
                                        });
                                    }}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <PencilIcon className="w-4 h-4" /> 编辑
                                </button>
                                {!article.is_reviewed && (
                                    <button 
                                        onClick={handleApprove}
                                        disabled={isApproving}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2"
                                    >
                                        {isApproving ? <Spinner /> : <SparklesIcon className="w-4 h-4" />} 
                                        审核入库
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
