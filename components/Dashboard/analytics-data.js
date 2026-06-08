/* ============================================================
   JustDoIt — analytics-data.js
   Semente de dados analíticos da semana.
   ============================================================ */
window.AN_DATA = {
  // Planejado vs. executado por dia (horas) — RF16
  desvio: [
    { dia: 'SEG', plan: 3.0, real: 2.5 },
    { dia: 'TER', plan: 2.5, real: 3.0 },
    { dia: 'QUA', plan: 4.0, real: 3.2 },
    { dia: 'QUI', plan: 3.5, real: 3.3 },
    { dia: 'SEX', plan: 2.5, real: 1.8 },
    { dia: 'SÁB', plan: 1.5, real: 1.0 },
    { dia: 'DOM', plan: 1.0, real: 0.5 },
  ],
  // Alocação de tempo por categoria (horas) — RF18
  categorias: [
    { nome: 'Estudos', horas: 7.5, cor: 'var(--color-cat-estudos)' },
    { nome: 'Casa', horas: 4.0, cor: 'var(--color-cat-casa)' },
    { nome: 'Genérico', horas: 3.8, cor: 'var(--color-cat-generico)' },
  ],
  // Conclusão
  conclusao: { feitas: 7, total: 12 },
};
