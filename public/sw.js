const CACHE = "trainforge-v3";
// Shell mínimo do app inteiro (login + fallback offline). As áreas do personal
// (/dashboard), do admin (/admin) e do aluno (/portal) entram no cache
// dinamicamente conforme o usuário navega — ver fetch handler abaixo.
const SHELL = ["/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// network-first pra qualquer navegação (login, dashboard do personal, admin
// ou portal do aluno) — garante que o que sobe pro ar aparece na hora no PWA.
// Guarda uma cópia de cada página visitada com sucesso pra funcionar offline
// depois; se a rede falhar e não tiver essa página em cache, cai no login.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match("/login")))
    );
  }
});

// ---------- Web Push ----------

self.addEventListener("push", (event) => {
  let payload = { title: "Train Forge", body: "", url: "/portal" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // payload não veio em JSON — mantém o default
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/portal" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/portal";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});