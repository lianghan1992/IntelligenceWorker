
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ArrowRightIcon, DownloadIcon, SparklesIcon, ExternalLinkIcon, ClockIcon } from '../icons';
import { getArticleHtml, generateArticleHtml, downloadArticlePdf, getSpiderArticleDetail } from '../../api/intelligence';

// 为从CDN加载的 `marked` 库提供类型声明
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface EvidenceTrailProps {
    selectedArticle: InfoItem | null;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Helper to unescape unicode characters in content (e.g., \u25cf -> ●)
const unescapeUnicode = (str: string) => {
    return str.replace(/\\u([0-9a-fA-F]{4})/gi, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ selectedArticle }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [fullContent, setFullContent] = useState<string>('');
    const [articleUrl, setArticleUrl] = useState<string>('');
    const [isHtmlLoading, setIsHtmlLoading] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Blob URL for iframe
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);

    // Fetch Content logic
    useEffect(() => {
        if (!selectedArticle) return;
        
        let active = true;
        setHtmlContent(null);
        setFullContent(selectedArticle.content || '');
        setArticleUrl(selectedArticle.original_url || ''); // Init from prop
        
        const loadData = async () => {
            // Always fetch detail if content is missing or too short
            const needsDetail = !selectedArticle.original_url || !selectedArticle.content || selectedArticle.content.length < 100;

            if (needsDetail) {
                setIsContentLoading(true);
                try {
                    const detail = await getSpiderArticleDetail(selectedArticle.id);
                    if (active) {
                        if (detail.original_url) setArticleUrl(detail.original_url);
                        if (detail.content) setFullContent(detail.content);
                        // If detail also reports it's atomized, we should respect that
                        if (detail.is_atomized) selectedArticle.is_atomized = true;
                    }
                } catch(e) {
                    console.error("Failed to fetch article detail", e);
                } finally {
                    if (active) setIsContentLoading(false);
                }
            }

            if (selectedArticle.is_atomized) {
                setIsHtmlLoading(true);
                try {
                    const htmlRes = await getArticleHtml(selectedArticle.id);
                    if (active && htmlRes && htmlRes.html_content) {
                        setHtmlContent(htmlRes.html_content);
                    }
                } catch (error) {
                    console.error("Failed to load HTML", error);
                } finally {
                    if (active) setIsHtmlLoading(false);
                }
            }
        };

        loadData();

        return () => { active = false; };
    }, [selectedArticle]);
    
    // Manage Blob URL for HTML content with ROBUST script injection
    useEffect(() => {
        if (htmlContent) {
            let finalHtml = htmlContent;

            // 1. 确保 ApexCharts 库存在 (兜底)
            if (!finalHtml.includes('apexcharts')) {
                const cdnLink = '<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>';
                if (finalHtml.includes('<head>')) {
                    finalHtml = finalHtml.replace('<head>', '<head>' + cdnLink);
                } else {
                    finalHtml = cdnLink + finalHtml;
                }
            }

            // 2. 提取并修复 ID
            let targetId = 'reliabilityChart'; // 默认
            const idMatch = finalHtml.match(/document\.querySelector\s*\(\s*["']#([\w-]+)["']\s*\)/) || 
                            finalHtml.match(/document\.getElementById\s*\(\s*["']([\w-]+)["']\s*\)/);
            if (idMatch) {
                targetId = idMatch[1];
            }

            // 3. 强力 CSS 补丁：解决 Tailwind 在 iframe 中加载慢导致的高度塌陷
            const cssPatch = `
                <style>
                    html, body { min-height: 100%; margin: 0; padding: 0; }
                    /* 针对特定ID */
                    #${targetId} {
                        min-height: 350px !important;
                        height: 350px !important;
                        width: 100% !important;
                        display: block !important;
                    }
                    /* 通用 ApexCharts 容器 */
                    .apexcharts-canvas {
                        width: 100% !important;
                        height: auto !important;
                    }
                </style>
            `;

            // 4. 强力 JS 补丁：重写初始化逻辑，增加轮询检测
            // 匹配任何包含 new ApexCharts 的脚本块，忽略 script 标签的属性
            const chartScriptRegex = /<script\b[^>]*>([\s\S]*?new\s+ApexCharts[\s\S]*?)<\/script>/gim;
            
            finalHtml = finalHtml.replace(chartScriptRegex, (match, scriptContent) => {
                // 将原有的 JS 代码包裹在安全执行的闭包中
                // 1. 等待 DOMContentLoaded
                // 2. 等待 ApexCharts 对象
                // 3. 等待 目标 DIV 出现
                return `
                <script>
                    (function() {
                        var maxChecks = 50; // 10秒超时
                        var checks = 0;

                        function runChart() {
                            var el = document.getElementById('${targetId}') || document.querySelector('#${targetId}');
                            
                            // 检查依赖
                            if (typeof ApexCharts === 'undefined' || !el) {
                                checks++;
                                if (checks < maxChecks) {
                                    setTimeout(runChart, 200);
                                } else {
                                    console.error('Chart init timeout: Lib or Element missing.');
                                    if(el) el.innerHTML = '<div style="padding:20px;color:red">图表加载超时，请检查网络。</div>';
                                }
                                return;
                            }

                            // 强制赋予高度 (防塌陷双重保险)
                            if (el.clientHeight < 50) {
                                el.style.minHeight = '300px';
                            }

                            try {
                                console.log('Starting ApexCharts rendering...');
                                ${scriptContent}
                                // 强制触发 resize 确保适配
                                setTimeout(function(){ window.dispatchEvent(new Event('resize')); }, 100);
                            } catch (e) {
                                console.error('Chart Execution Error:', e);
                                el.innerHTML = '<div style="padding:20px;color:red">图表脚本错误: ' + e.message + '</div>';
                            }
                        }

                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', runChart);
                        } else {
                            runChart();
                        }
                    })();
                </script>`;
            });

            // 5. 注入 CSS 到 Head
            if (finalHtml.includes('</head>')) {
                finalHtml = finalHtml.replace('</head>', cssPatch + '</head>');
            } else {
                finalHtml = cssPatch + finalHtml;
            }

            // 6. 如果没有完整 HTML 结构，包裹一下
            if (!finalHtml.trim().toLowerCase().startsWith('<!doctype')) {
                 finalHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${cssPatch}</head><body>${finalHtml}</body></html>`;
            }

            const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            setIframeSrc(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setIframeSrc(null);
        }
    }, [htmlContent]);

    const handleDownloadPdf = async () => {
        if (!selectedArticle) return;
        setIsDownloading(true);
        try {
            const blob = await downloadArticlePdf(selectedArticle.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedArticle.title}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            alert('下载失败: ' + (e.message || '系统繁忙，请稍后再试'));
        } finally {
            setIsDownloading(false);
        }
    };
    
    const fallbackArticleHtml = useMemo(() => {
        if (!fullContent) return '';

        // Unescape potential unicode escape sequences first
        const decodedContent = unescapeUnicode(fullContent);

        if (window.marked && typeof window.marked.parse === 'function') {
            const markdownWithStyledImages = decodedContent.replace(
                /!\[(.*?)\]\((.*?)\)/g,
                '<figure class="my-8"><img src="$2" alt="$1" class="rounded-xl w-full object-cover shadow-md border border-slate-100"><figcaption class="text-center text-xs text-slate-400 mt-2 italic">$1</figcaption></figure>'
            );
            return window.marked.parse(markdownWithStyledImages);
        }

        const escapedContent = decodedContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escapedContent.split('\n').map(p => `<p>${p}</p>`).join('');

    }, [fullContent]);

    if (!selectedArticle) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                    <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2">情报详情预览</h3>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                    请从左侧列表选择一篇文章，AI 将为您展示深度解析内容。
                </p>
            </div>
        );
    }

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden relative shadow-xl z-30">
            {/* Header - Modern & Clean */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-white z-20">
                <div className="px-6 py-5">
                     <div className="flex items-center gap-3 mb-3 text-xs">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md uppercase tracking-wide">
                            {selectedArticle.source_name}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric'})}
                        </span>
                        
                         {selectedArticle.is_atomized && (
                            <div className="flex items-center gap-1 text-purple-600 font-bold ml-auto">
                                <SparklesIcon className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-wider">AI Atomized</span>
                            </div>
                        )}
                    </div>
                    
                    <h3 className="font-extrabold text-slate-900 text-xl md:text-2xl leading-tight">
                        {selectedArticle.title}
                    </h3>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-2">
                        {htmlContent && (
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                                {isDownloading ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                                导出 PDF
                            </button>
                        )}
                    </div>
                    {articleUrl ? (
                        <a 
                            href={articleUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            阅读原文 <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                    ) : (
                         <span className="text-xs text-slate-300 cursor-not-allowed">原文链接失效</span>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white overflow-hidden relative">
                {(isHtmlLoading || isContentLoading) ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                        <p className="text-sm font-medium animate-pulse">正在加载深度内容...</p>
                    </div>
                ) : iframeSrc ? (
                    <div className="h-full w-full bg-slate-50">
                        <iframe 
                            src={iframeSrc}
                            className="w-full h-full border-none" 
                            title="Article Content"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-6 md:px-10 md:py-8 custom-scrollbar bg-white scroll-smooth">
                        <article 
                            className="prose prose-sm md:prose-base prose-slate max-w-none 
                                prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                                prose-p:text-slate-600 prose-p:leading-loose prose-p:mb-6
                                prose-a:text-indigo-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                                prose-strong:text-slate-800 prose-strong:font-bold
                                prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                                prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-slate-50 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700
                                prose-li:text-slate-600"
                            dangerouslySetInnerHTML={{ __html: fallbackArticleHtml }}
                        />
                         <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-300 pb-8">
                            — END OF DOCUMENT —
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
