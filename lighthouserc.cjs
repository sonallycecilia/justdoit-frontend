module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 4,
      // Invocar o Vite diretamente evita que o lhci espere por um processo npm
      // filho no Windows depois de concluir a coleta.
      startServerCommand: 'node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173',
      startServerReadyPattern: 'Local',
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance'],
        maxWaitForLoad: 30000,
        pauseAfterLoadMs: 1000,
      },
    },
  },
};
