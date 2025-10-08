import { DeepDive, RecommendedSubscription } from './types';

// --- Recommended Subscriptions ---
export const mockRecommendedSubscriptions: RecommendedSubscription[] = [
  { id: 'rec1', title: '比亚迪DM-i 5.0技术深度解析', description: '追踪比亚迪最新的第五代DM-i混动技术，包括其技术原理、能耗表现及搭载车型。', keywords: ['比亚迪', 'DM-i', '混动'] },
  { id: 'rec2', title: '800V高压平台与超充技术', description: '关注800V高压平台架构的普及情况，以及配套的超充网络建设和电池技术。', keywords: ['800V', '超充', '碳化硅'] },
  { id: 'rec3', title: '小米汽车SU7市场表现与产能', description: '跟踪小米SU7上市后的市场反馈、订单数据、交付情况以及产能爬坡进度。', keywords: ['小米', 'SU7', '市场表现'] },
  { id: 'rec4', title: '车载大模型应用落地', description: '分析AI大模型在智能座舱中的应用，如语音助手、场景推荐、人机交互等。', keywords: ['大模型', '智能座舱', 'AI'] },
];

// --- Deep Dives ---
export const mockDeepDives: DeepDive[] = [
  { id: 'dive1', title: '城市NOA技术路线深度对比（2024版）', summary: '系统梳理“有图”与“无图”两大技术流派的核心差异，对比分析特斯拉、华为、小鹏、理想等头部玩家的方案优劣与量产进度。', author: '行业分析师团队', date: '2024-05-10', imageUrl: 'https://picsum.photos/seed/dive1/600/400', tags: ['智能驾驶', 'NOA', '技术路线'], category: { primary: '技术专题', secondary: '智能驾驶' } },
  { id: 'dive2', title: '一体化压铸：汽车制造业的百年变革', summary: '从技术原理、材料科学到供应链格局，全面解析一体化压铸如何重塑汽车制造的成本结构、生产效率与设计理念。', author: '行业分析师团队', date: '2024-04-22', imageUrl: 'https://picsum.photos/seed/dive2/600/400', tags: ['供应链', '一体化压铸', '降本增效'], category: { primary: '供应链专题', secondary: '制造工艺' } },
  { id: 'dive3', title: '800V高压平台：下一代电动车的“高速公路”', summary: '深入探讨800V高压架构的核心优势、技术挑战（SiC、电池、热管理）以及其对补能生态和用户体验的颠覆性影响。', author: '行业分析师团队', date: '2024-03-15', imageUrl: 'https://picsum.photos/seed/dive3/600/400', tags: ['三电系统', '800V', '超快充'], category: { primary: '技术专题', secondary: '三电系统' } },
  { id: 'dive4', title: '华为鸿蒙座舱生态全景解析', summary: '分析鸿蒙座舱的核心架构、跨设备协同能力以及应用生态现状，探讨其如何构建差异化竞争优势，并与其他座舱OS进行对比。', author: '行业分析师团队', date: '2024-02-28', imageUrl: 'https://picsum.photos/seed/dive4/600/400', tags: ['智能座舱', '鸿蒙OS', '人机交互'], category: { primary: '技术专题', secondary: '智能座舱' } },
  { id: 'dive5', title: '2024年第一季度中国新能源市场复盘', summary: '通过详实的数据分析，复盘第一季度各大品牌的销量表现、市场份额变化、热门车型趋势，并对全年市场走向进行展望。', author: '市场分析团队', date: '2024-04-10', imageUrl: 'https://picsum.photos/seed/dive5/600/400', tags: ['市场分析', '销量', '新能源'], category: { primary: '市场专题', secondary: '销量分析' } },
  { id: 'dive6', title: '出海记：中国车企欧洲市场攻略', summary: '聚焦比亚迪、蔚来、名爵等品牌在欧洲市场的战略布局、渠道建设、本地化挑战与机遇，为中国车企出海提供决策参考。', author: '市场分析团队', date: '2024-05-20', imageUrl: 'https://picsum.photos/seed/dive6/600/400', tags: ['海外市场', '出海', '欧洲'], category: { primary: '市场专题', secondary: '海外市场' } },
];