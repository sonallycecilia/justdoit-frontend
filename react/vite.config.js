import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O CORS do backend (services/*/application.yml) só permite http://localhost:3000,
// então a porta é fixa: se 3000 estiver ocupada é melhor falhar do que subir em
// outra porta e ver toda requisição bloqueada.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
});
