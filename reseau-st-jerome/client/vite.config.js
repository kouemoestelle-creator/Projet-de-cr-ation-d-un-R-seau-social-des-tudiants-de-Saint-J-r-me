import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, les appels /api et /uploads sont redirigés vers le serveur (port 3000).
// Le navigateur croit parler à un seul site : les cookies de session fonctionnent sans réglage supplémentaire.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
