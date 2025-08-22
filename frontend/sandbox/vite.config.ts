import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, '../components'),
      '@lib': path.resolve(__dirname, '../lib'),
      '@utils': path.resolve(__dirname, '../utils'),
      '@types': path.resolve(__dirname, '../types'),
      '@hooks': path.resolve(__dirname, '../hooks'),
      '@validators': path.resolve(__dirname, '../validators'),
      '@filters': path.resolve(__dirname, '../filters')
    }
  },
  server: {
    port: 3001,
    host: true,
    open: true
  },
  preview: {
    port: 3001,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@heroicons/react', 'lucide-react', 'framer-motion']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
