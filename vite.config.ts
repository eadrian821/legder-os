import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/legder-os/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      manifest: false, // use public/manifest.webmanifest directly
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query']
        }
      }
    }
  }
})
