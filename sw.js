/* Tally service worker — the app works with no network at all. */
const CACHE = 'tally-v11';
const FILES = ['./', './index.html', './tokens.css', './app.css', './app.js', './icons.js', './templates.js', './manifest.webmanifest',
  './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
const SYNC = 'https://lodogasuaggsibycwqyi.supabase.co/functions/v1/push-sync';
const PENDING = 'tally-pending';
const localDate = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function tell(body) {            // a partial update to the server row
  const sub = await self.registration.pushManager.getSubscription(); if (!sub) return;
  await fetch(SYNC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ endpoint: sub.endpoint }, body)) }).catch(() => {});
}
async function remember(item) {        // for the app to apply when it next opens
  const c = await caches.open(PENDING); const r = await c.match('pending'); const list = r ? await r.json() : [];
  list.push(item); await c.put('pending', new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } }));
}
async function openApp(id) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const url = './' + (id && id !== 'test' ? '?habit=' + encodeURIComponent(id) : '');
  const c = list.find(w => 'focus' in w);
  if (c) { c.postMessage({ type: 'open-habit', id }); return c.focus(); }
  return self.clients.openWindow(url);
}
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Tally', body: e.data ? e.data.text() : '' }; }
  const real = d.id && d.id !== 'test';
  e.waitUntil(self.registration.showNotification(d.title || 'Tally', {
    body: d.body || '', tag: d.tag || 'tally', icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { id: d.id },
    actions: real ? [{ action: 'done', title: 'Done' }, { action: 'snooze', title: 'In 1 hour' }] : []
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id;
  if (e.action === 'done' && id) { e.waitUntil(Promise.all([remember({ type: 'done', id, date: localDate() }), tell({ doneAdd: { id, date: localDate() } }), notifyClients({ type: 'done', id, date: localDate() })])); return; }
  if (e.action === 'snooze' && id) { e.waitUntil(tell({ snooze: { id, minutes: 60 } })); return; }
  e.waitUntil(openApp(id));
});
async function notifyClients(msg) { (await self.clients.matchAll({ type: 'window' })).forEach(c => c.postMessage(msg)); }
