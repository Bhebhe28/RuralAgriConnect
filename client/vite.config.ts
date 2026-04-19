import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'RuralAgriConnect',
        short_name: 'AgriConnect',
        description: 'Offline-first farm advisory app for KwaZulu-Natal farmers',
        theme_color: '#2d6a4f',
        background_color: '#f5f0e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache all app assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Cache API responses for offline use
        runtimeCaching: [
          {
            // Cache advisories — stale-while-revalidate (show cached, update in background)
            urlPattern: /\/api\/advisories/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'advisories-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache weather data
            urlPattern: /\/api\/weather/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache notifications
            urlPattern: /\/api\/notifications/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'notifications-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }, // 1 day
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache outbreaks
            urlPattern: /\/api\/outbreaks/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'outbreaks-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache calendar
            urlPattern: /\/api\/calendar/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'calendar-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache community posts
            urlPattern: /\/api\/community/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'community-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache images from Railway
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/avatars': { target: 'http://localhost:3001', changeOrigin: true },
      '/community': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
