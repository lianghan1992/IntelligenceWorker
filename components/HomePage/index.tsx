import React from 'react';
import { FeedIcon, DiveIcon, ChartIcon, SparklesIcon, ArrowRightIcon, CheckIcon } from '../icons';

interface HomePageProps {
    onEnter: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
);

const ValuePropCard: React.FC<{ user: string; value: string; impact: string[] }> = ({ user, value, impact }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 h-full">
        <h3 className="font-bold text-blue-700">{user}</h3>
        <p className="font-semibold text-gray-800 my-2">{value}</p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            {impact.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
    </div>
);

const PricingFeature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start">
        <CheckIcon className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
        <span className="text-gray-600">{children}</span>
    </li>
);

export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    return (
        <div className="w-full bg-gray-50 text-gray-800">
            {/* Hero Section */}
            <section className="relative text-center py-20 sm:py-32 px-4 bg-white overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)]"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-block px-4 py-1.5 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full mb-4">
                        情报即服务 (Intelligence as a Service)
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
                        AI驱动的汽车行业情报平台
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
                        主动感知、深度分析、生成决策依据。将数小时的情报工作压缩至数分钟，让您聚焦于更高价值的决策思考。
                    </p>
                    <button
                        onClick={onEnter}
                        className="mt-10 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                        进入工作台 <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </section>
            
            {/* Problem Section */}
            <section className="py-16 sm:py-24 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">信息海洋，情报荒漠</h2>
                    <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
                        汽车行业信息指数级爆炸，但信息的数量不等于情报的质量。我们为您解决三大核心挑战：
                    </p>
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="font-semibold text-gray-800">高昂的“情报成本”</h3>
                            <p className="mt-2 text-sm text-gray-500">专业人才耗费大量时间在整理资料，而非战略思考，机会成本巨大。</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="font-semibold text-gray-800">决策的时效性挑战</h3>
                            <p className="mt-2 text-sm text-gray-500">市场瞬息万变，冗长的分析流程可能让企业错失最佳应对窗口。</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="font-semibold text-gray-800">低信噪比与工具缺失</h3>
                            <p className="mt-2 text-sm text-gray-500">通用工具缺乏行业深度，难以从海量噪音中提炼高价值的结构化洞察。</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features Section */}
            <section className="py-16 sm:py-24 px-4 bg-white">
                 <div className="absolute inset-0 bg-grid-slate-50 [mask-image:linear-gradient(to_bottom,white_1%,transparent_50%)]"></div>
                <div className="relative max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                         <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">四大核心能力，重塑情报工作流</h2>
                        <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
                           我们提供从实时追踪到深度分析，再到报告生成的一站式解决方案。
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard 
                            icon={<FeedIcon className="w-6 h-6" />}
                            title="实时情报追踪"
                            description="AI重构信息流，将新闻、公告、视频等转化为结构化卡片，并提供AI摘要与影响力评分，让信息消费高效愉悦。"
                        />
                        <FeatureCard 
                            icon={<DiveIcon className="w-6 h-6" />}
                            title="深度洞察专题"
                            description="官方出品的“活”报告，持续追踪核心车企、关键技术，自动更新，免除用户自行研究的负担。"
                        />
                        <FeatureCard 
                            icon={<ChartIcon className="w-6 h-6" />}
                            title="重大事件解读"
                            description="自动覆盖行业发布会、技术论坛，在活动结束后分钟级生成包含核心观点与摘要的AI解读报告。"
                        />
                        <FeatureCard 
                            icon={<SparklesIcon className="w-6 h-6" />}
                            title="AI报告生成"
                            description="从一个想法开始，AI可自动生成结构化大纲和完整的PPT式报告，支持多轮修改与即时预览。"
                        />
                    </div>
                </div>
            </section>
            
            {/* Value Proposition Section */}
            <section className="py-16 sm:py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">为您的决策带来可量化的价值</h2>
                        <p className="mt-4 text-gray-600">我们承诺为不同角色的专业人士带来明确、可衡量的价值回报。</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ValuePropCard 
                            user="主机厂规划/研究人员"
                            value="追求时间与深度"
                            impact={["情报收集与报告撰写时间减少90%", "决策速度与分析深度提升50%"]}
                        />
                        <ValuePropCard 
                            user="产业链销售/市场人员"
                            value="追求商机与效率"
                            impact={["关键商机发现时间提前48小时以上", "销售线索转化率提升20%"]}
                        />
                        <ValuePropCard 
                            user="投资者/分析师"
                            value="追求信噪比与先机"
                            impact={["过滤99%的市场噪音信息", "核心情报获取速度领先市场24小时"]}
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-16 sm:py-24 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">选择适合您的订阅方案</h2>
                        <p className="mt-4 text-gray-600">从免费开始，随您的需求扩展，解锁更强大的情报能力。</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                        {/* Free Plan */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
                            <h3 className="text-2xl font-semibold text-gray-900">免费版</h3>
                            <p className="text-gray-500 mt-2">体验核心价值，开始您的情报之旅。</p>
                            <p className="text-4xl font-bold text-gray-900 my-6">¥0 <span className="text-lg font-normal text-gray-500">/ 月</span></p>
                            <button className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold cursor-default">当前方案</button>
                            <ul className="space-y-4 mt-8 text-sm flex-grow">
                                <PricingFeature>核心情报源追踪 (有限制)</PricingFeature>
                                <PricingFeature>AI摘要与卡片</PricingFeature>
                                <PricingFeature>AI问答助手 (有限制)</PricingFeature>
                            </ul>
                        </div>
                        
                        {/* Professional Plan */}
                        <div className="bg-white border-2 border-blue-500 rounded-2xl p-8 flex flex-col relative ring-4 ring-blue-500/10">
                            <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase">最受欢迎</div>
                            <h3 className="text-2xl font-semibold text-blue-600">专业版</h3>
                            <p className="text-gray-600 mt-2">专业人士不可或缺的生产力倍增器。</p>
                            <p className="text-4xl font-bold text-gray-900 my-6">¥199 <span className="text-lg font-normal text-gray-500">/ 月</span></p>
                            <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors transform hover:scale-105">立即升级</button>
                            <ul className="space-y-4 mt-8 text-sm flex-grow">
                                <PricingFeature>**无限制**核心情报源追踪</PricingFeature>
                                <PricingFeature>订阅**所有**深度洞察专题</PricingFeature>
                                <PricingFeature>**全自动**事件解读报告</PricingFeature>
                                <PricingFeature>**无限制**AI问答与报告生成</PricingFeature>
                                <PricingFeature>报告导出与分享</PricingFeature>
                            </ul>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
                            <h3 className="text-2xl font-semibold text-gray-900">企业版</h3>
                            <p className="text-gray-500 mt-2">为大型团队定制，提供最高级别的支持与集成。</p>
                            <p className="text-4xl font-bold text-gray-900 my-6">联系我们</p>
                            <button className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors">获取报价</button>
                            <ul className="space-y-4 mt-8 text-sm flex-grow">
                                <PricingFeature>包含专业版所有功能</PricingFeature>
                                <PricingFeature>团队协作空间</PricingFeature>
                                <PricingFeature>API 访问与第三方集成</PricingFeature>
                                <PricingFeature>专属客户成功经理</PricingFeature>
                                <PricingFeature>私有化部署选项</PricingFeature>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Final CTA Section */}
            <section className="py-16 sm:py-24 px-4 bg-blue-700 text-white text-center">
                 <div className="relative max-w-4xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-bold">
                       准备好变革您的情报工作方式了吗？
                    </h2>
                    <p className="mt-4 text-lg text-blue-200">
                        立即开始，体验AI如何将繁杂的信息处理工作，转变为轻松的洞察发现之旅。
                    </p>
                    <button
                        onClick={onEnter}
                        className="mt-10 px-8 py-4 bg-white text-blue-600 font-bold rounded-lg shadow-lg hover:bg-gray-100 transition transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                        免费开始使用 <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </section>

             <style dangerouslySetInnerHTML={{ __html: `
                .bg-grid-slate-100 {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%23e2e8f0'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
                }
                .bg-grid-slate-50 {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%23f1f5f9'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
                }
            `}}/>
        </div>
    );
};