module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 4,
      startServerCommand: 'npm run preview -- --host 127.0.0.1 --port 4173',
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
