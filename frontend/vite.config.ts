import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Suppress ECONNRESET noise when backend restarts
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as any).code === 'ECONNRESET' || (err as any).code === 'ECONNREFUSED') {
              // Silently ignore – backend is restarting
              return;
            }
            console.error('[proxy error]', err.message);
          });
        },
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as any).code === 'ECONNRESET' || (err as any).code === 'ECONNREFUSED') {
              return;
            }
            console.error('[ws proxy error]', err.message);
          });
        },
      }
    }
  }
})
