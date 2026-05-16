// v20260516
self.addEventListener('install', () => {}); // ユーザーが更新を承認するまで待機
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
