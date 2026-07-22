import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O CORS do backend (services/*/application.yml) só permite http://localhost:3000,
// então a porta é fixa: se 3000 estiver ocupada é melhor falhar do que subir em
// outra porta e ver toda requisição bloqueada.
//
// `base` fica no padrão '/' porque o site é servido na raiz de um domínio
// próprio (CNAME justdoit-app.duckdns.org), não numa subpasta do github.io.

// O GitHub Pages não conhece as rotas do React Router: recarregar /visao-geral
// faz ele procurar um arquivo com esse nome e devolver 404. Publicar o mesmo
// HTML como 404.html entrega o app, que então resolve a rota no cliente.
function fallbackSpa() {
  return {
    name: 'jdi-fallback-spa',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), fallbackSpa()],
  // Com a estrutura por feature, um import entre features sairia como
  // '../../../components/Ic'. O alias '@' aponta para src/ e mantém todo
  // import cruzado legível e imune a mudança de profundidade de pasta.
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
