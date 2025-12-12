import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 添加时间戳 v=Timestamp 强制浏览器每次加载最新 sw.ts，防止 Service Worker 文件本身被缓存
    navigator.serviceWorker.register('/sw.ts?v=' + new Date().getTime())
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        // 手动触发更新检查
        registration.update();
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);