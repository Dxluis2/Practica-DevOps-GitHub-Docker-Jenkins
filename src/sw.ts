/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | {
    url: string
    revision: string | null
  }>
}

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let data: {
    notification?: {
      title?: string
      body?: string
    }
    data?: {
      title?: string
      body?: string
      url?: string
    }
  }

  try {
    data = event.data.json()
  } catch {
    return
  }

  const title =
    data.notification?.title ||
    data.data?.title ||
    'Agenda Escolar'

  const body =
    data.notification?.body ||
    data.data?.body ||
    'Tienes una tarea pendiente.'

  const url = data.data?.url || '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  )

  if (url.origin !== self.location.origin) return

  event.waitUntil(
    self.clients.openWindow(url.href)
  )
})
