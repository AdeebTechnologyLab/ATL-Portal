import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    'process.env': {}
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-hot-toast'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-underline', '@tiptap/extension-text-align'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
        }
      }
    },
  }
})
