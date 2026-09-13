import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/chat/',
  plugins: [
    react(),
    {
      name: 'redirect-chat',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/chat') {
            res.writeHead(301, { Location: '/chat/' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/chat-api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
