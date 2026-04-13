import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /** SW script under `/sos/` so registration scope can match manifest (`/sos`) per ALIGNMENT_CHECK. */
      filename: 'sos/sw.js',
      scope: '/sos/',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'MamaAlert',
        short_name: 'MamaAlert',
        description: 'Maternal emergency alert system',
        theme_color: '#DC2626',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/sos',
        scope: '/sos',
        id: '/sos',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        /** Only SOS-related navigations get SPA shell offline; other routes need network (spec). */
        navigateFallbackAllowlist: [/^\/sos(\/.*)?$/],
        navigateFallbackDenylist: [/^\/api\//],
        additionalManifestEntries: [],
        /** Root `public/sw-sos.js` — relative to `/sos/sw.js` service worker URL. */
        importScripts: ['../sw-sos.js'],
        /**
         * Precache only the SOS PWA shell + shared core — exclude lazy chunks for other routes
         * (landing, volunteer, admin, family status, health worker, demo).
         */
        manifestTransforms: [
          async (entries) => {
            const deny =
              /(^|\/)assets\/(LandingPage|GlobeCanvas|DemoFlow|FamilyStatus|VolunteerDashboard|AdminZone|HealthWorkerDashboard)-[^/]+\.(js|css)$/
            const manifest = entries.filter((e) => !deny.test(e.url))
            return { manifest, warnings: [] }
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
