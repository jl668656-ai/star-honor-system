// Service Worker v12.2
// 针对 iOS Safari 优化，支持 PWA 缓存与实时更新
const CACHE_NAME = 'honor-system-v12.2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './firebase-config.js'
];

// 安装时缓存关键资源
self.addEventListener('install', event => {
  console.log('[SW v12.2] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW v12.2] 缓存资源');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW v12.2] 跳过等待，立即激活');
        return self.skipWaiting();
      })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW v12.2] 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW v12.2] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW v12.2] 立即接管所有客户端');
      return self.clients.claim();
    })
  );
});

// 请求拦截 - 采用"网络优先"策略确保及时更新
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 对于导航请求（页面刷新），使用网络优先策略
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then(response => {
          // 成功获取网络响应，更新缓存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // 网络失败，回退到缓存
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('./index.html');
          });
        })
    );
    return;
  }
  
  // 对于其他资源，也使用网络优先
  event.respondWith(
    fetch(request)
      .then(response => {
        // 缓存成功的响应
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试从缓存获取
        return caches.match(request);
      })
  );
});

// 监听来自主页面的消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v12.2] 收到跳过等待指令');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW v12.2] Service Worker 脚本已加载');
