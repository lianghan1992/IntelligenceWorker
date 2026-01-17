import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// --- 1. Critical Components (Direct Import) ---
// 首页和头部组件直接打包进主文件，避免 React 加载完后还要发起额外的网络请求导致二次白屏。
import { Header } from './components/Header';
import { HomePage } from './components/HomePage/index';

// --- 2. Lazy Components (Code Splitting) ---
// 功能模块按需加载，减小首屏体积。
const AuthModal = React.lazy(() => import('./components/HomePage/AuthModal').then(m => ({ default: m.AuthModal })));
const PricingModal = React.lazy(() => import('./components/PricingModal').then(m => ({ default: m.PricingModal })));
const BillingModal = React.lazy(() => import('./components/UserProfile/BillingModal').then(m => ({ default: m.BillingModal })));
const UserProfileModal = React.lazy(() => import('./components/UserProfile/UserProfileModal').then(m => ({ default: m.UserProfileModal })));

const StrategicCockpit = React.lazy(() => import('./components/StrategicCockpit/index').then(m => ({ default: m.StrategicCockpit })));
const CompetitivenessDashboard = React.lazy(() => import('./components/CompetitivenessDashboard/index').then(m => ({ default: m.CompetitivenessDashboard })));
const DeepDives = React.lazy(() => import('./components/DeepDives/index').then(m => ({ default: m.DeepDives })));
const IndustryEvents = React.lazy(() => import('./components/IndustryEvents/index').then(m => ({ default: m.IndustryEvents })));
const ReportGenerator = React.lazy(() => import('./components/ReportGenerator/index').then(m => ({ default: m.ReportGenerator })));
const AdminPage = React.lazy(() => import('./components/Admin/index').then(m => ({ default: m.AdminPage })));
const AgentMarketplace = React.lazy(() => import('./components/AgentMarketplace/index'));

// --- 3. Prefetch List ---
// 这些组件会在浏览器空闲时默默下载
const prefetchList = [
    () => import('./components/StrategicCockpit/index'),
    () => import('./components/CompetitivenessDashboard/index'),
    () => import('./components/DeepDives/index'),
    () => import('./components/ReportGenerator/index'),
    () => import('./components/AgentMarketplace/index'),
    // Modals
    () => import('./components/HomePage/AuthModal'),
    () => import('./components/PricingModal'),
];

// --- 4. Fallback Loader ---
const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center bg-slate-50 min-h-[400px]">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Loading...</span>
      </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
        const cachedUser = localStorage.getItem('user_cache');
        return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
        return null;
    }
  });

  const [view, setView] = useState<View>('cockpit'); 
  const hasToken = !!localStorage.getItem('accessToken');
  // 如果有 token 但没有用户信息，需要 loading 等待验证；否则直接渲染
  const [isLoading, setIsLoading] = useState(hasToken && !user);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SystemSource[]>([]);

  // 🚀 Idle Prefetching Strategy
  useEffect(() => {
    // 仅在用户已登录或已停留在首页一段时间后触发预加载
    const runPrefetch = () => {
        // 使用 requestIdleCallback 在浏览器空闲时下载，不占用主线程和关键带宽
        const idleCallback = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 3000));
        
        idleCallback(() => {
            console.log('🚀 [AutoInsight] Network idle, prefetching next chunks...');
            
            // 串行预加载，每隔 1.5s 下载一个，避免突发网络拥塞
            prefetchList.reduce((promise, loader) => {
                return promise.then(() => {
                    return new Promise<void>(resolve => {
                        setTimeout(() => {
                            loader().catch(() => {}); // 静默下载，忽略错误
                            resolve();
                        }, 1500);
                    });
                });
            }, Promise.resolve());
        });
    };

    // 页面加载 5 秒后再开始检查空闲状态，确保首屏完全渲染
    const t = setTimeout(runPrefetch, 5000);
    return () => clearTimeout(t);
  }, []);

  // PWA Cleanup
  useEffect(() => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
                registration.unregister();
            }
        });
    }
  }, []);

  const handleLoginSuccess = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user_cache', JSON.stringify(loggedInUser));
    setShowAuthModal(false);
    setView('cockpit'); 
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user_cache');
    setUser(null);
    setView('cockpit');
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    try {
        const subs = await getUserSubscribedSources();
        setSubscriptions(subs);
    } catch (error) {
      console.error("Failed to load initial data", error);
    }
  }, [user]);

  // Silent Auth Verification
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
          setIsLoading(false);
          return;
      }
      try {
        const userData = await getMe();
        setUser(userData);
        localStorage.setItem('user_cache', JSON.stringify(userData));
      } catch (e) {
        console.error("Failed to verify token:", e);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user_cache');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
        loadInitialData();
    }
  }, [user, loadInitialData]);
  
  const handleNavigate = (newView: View) => {
      setView(newView);
  };
  
  const renderView = () => {
    switch (view) {
      case 'cockpit': return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
      case 'techboard': return <CompetitivenessDashboard />;
      case 'dives': return <DeepDives />;
      case 'events': return <IndustryEvents />;
      case 'ai': return <ReportGenerator onShowBilling={() => setShowBillingModal(true)} />;
      case 'marketplace': return <AgentMarketplace />;
      case 'admin': return <AdminPage />;
      default: return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Not logged in: Show HomePage immediately (no suspense needed for direct import)
  if (!user) {
    return (
        <>
            <HomePage onEnter={() => setShowAuthModal(true)} />
            <Suspense fallback={null}>
                {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
            </Suspense>
        </>
    );
  }

  // Logged in: Show App Shell
  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans">
        <Header 
            user={user}
            currentView={view}
            onNavigate={handleNavigate}
            onUpgrade={() => setShowPricingModal(true)}
            onLogout={handleLogout}
            onShowBilling={() => setShowBillingModal(true)}
            onShowProfile={() => setShowProfileModal(true)}
        />
        <main className="flex-1 min-h-0 relative">
            <Suspense fallback={<PageLoader />}>
                {renderView()}
            </Suspense>
        </main>
        
        <Suspense fallback={null}>
            {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
            {showBillingModal && <BillingModal user={user} onClose={() => setShowBillingModal(false)} />}
            {showProfileModal && <UserProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
        </Suspense>
    </div>
  );
};

export default App;