import React, { useState, useEffect } from 'react';
import { CloseIcon, CheckIcon } from './icons';
import { getPlans } from '../api';
import { PlanDetails } from '../types';

interface PricingModalProps {
  onClose: () => void;
}

const FeatureItem: React.FC<{ children: React.ReactNode; included: boolean }> = ({ children, included }) => (
    <li className="flex items-center space-x-3">
        <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${included ? 'bg-green-500' : 'bg-gray-300'}`}>
            {included ? <CheckIcon className="w-3 h-3 text-white" /> : <CloseIcon className="w-3 h-3 text-gray-500" />}
        </div>
        <span className={included ? 'text-gray-700' : 'text-gray-500'}>{children}</span>
    </li>
);

export const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
    const [plans, setPlans] = useState<PlanDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const planData = await getPlans();
                setPlans(planData);
            } catch (error) {
                console.error("Failed to fetch pricing plans:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlans();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="p-8 md:p-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">选择适合您的计划</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">解锁全部功能，获得无与倫比的情报优势，将您的决策提升到新高度。</p>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center">正在加载方案...</div>
                ) : !plans ? (
                    <div className="p-8 text-center text-red-500">无法加载定价方案。</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 pt-0">
                        {/* Freemium Plan */}
                        <div className="bg-white border border-gray-200 rounded-xl p-8">
                            <h3 className="text-2xl font-semibold text-gray-900 mb-2">{plans.free.name}</h3>
                            <p className="text-gray-500 mb-6">体验核心价值，开始您的情报之旅。</p>
                            <p className="text-4xl font-bold text-gray-900 mb-6">¥{plans.free.price} <span className="text-lg font-normal text-gray-500">/ 月</span></p>
                            <button className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors">当前计划</button>
                            <ul className="space-y-4 mt-8 text-left text-sm">
                                <FeatureItem included={true}>核心情报源追踪 (最多 {plans.free.max_sources} 个)</FeatureItem>
                                <FeatureItem included={true}>自定义关注点 (最多 {plans.free.max_pois} 个)</FeatureItem>
                                <FeatureItem included={true}>AI摘要与卡片</FeatureItem>
                                <FeatureItem included={false}>订阅深度洞察专题</FeatureItem>
                                <FeatureItem included={false}>全自动事件解读报告</FeatureItem>
                                <FeatureItem included={false}>AI问答助手 (有限制)</FeatureItem>
                                <FeatureItem included={false}>报告导出与分享</FeatureItem>
                            </ul>
                        </div>

                        {/* Professional Plan */}
                        <div className="bg-white border-2 border-blue-500 rounded-xl p-8 relative ring-4 ring-blue-500/10">
                            <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase">最受欢迎</div>
                            <h3 className="text-2xl font-semibold text-blue-600 mb-2">{plans.premium.name}</h3>
                            <p className="text-gray-600 mb-6">专业人士不可或缺的生产力倍增器。</p>
                            <p className="text-4xl font-bold text-gray-900 mb-2">¥{plans.premium.price} <span className="text-lg font-normal text-gray-500">/ 月</span></p>
                            <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors transform hover:scale-105">立即升级</button>
                            <ul className="space-y-4 mt-8 text-left text-sm">
                                <FeatureItem included={true}>**无限制**核心情报源追踪</FeatureItem>
                                <FeatureItem included={true}>**无限制**自定义关注点</FeatureItem>
                                <FeatureItem included={true}>AI摘要与卡片</FeatureItem>
                                <FeatureItem included={true}>**订阅所有**深度洞察专题</FeatureItem>
                                <FeatureItem included={true}>**全自动**事件解读报告</FeatureItem>
                                <FeatureItem included={true}>**无限制**AI问答助手</FeatureItem>
                                <FeatureItem included={true}>报告导出与分享</FeatureItem>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
