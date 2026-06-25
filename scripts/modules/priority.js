/* ============================================================
   JustDoIt — modules/priority.js  (RF10 / RF11)
   Lógica da matriz de priorização. Define a ordem, rótulos e
   cores das prioridades, usados pela To Do e pelo detalhe.
   ============================================================ */
const Priority = (function () {
  // Ordem canônica (mais urgente primeiro)
  const NIVEIS = ['urgent', 'important', 'normal', 'low'];

  const ROTULO = {
    urgent: 'Urgente',
    important: 'Importante',
    normal: 'Normal',
    low: 'Baixa',
  };

  const COR = {
    urgent: 'var(--color-priority-urgent)',
    important: 'var(--color-priority-important)',
    normal: 'var(--color-priority-normal)',
    low: 'var(--color-priority-low)',
  };

  const ORDEM = NIVEIS.reduce((acc, n, i) => (acc[n] = i, acc), {});

  // Normaliza prioridade desconhecida/ausente para 'normal', evitando que uma
  // tarefa seja contada mas some da lista (cache antigo, meta perdida, etc.).
  function normalizar(p) {
    return ORDEM.hasOwnProperty(p) ? p : 'normal';
  }

  // Compara duas tarefas: concluídas ao fim, depois por prioridade
  function comparar(a, b) {
    return (a.done - b.done) || (ORDEM[normalizar(a.prioridade)] - ORDEM[normalizar(b.prioridade)]);
  }

  // Agrupa tarefas por nível de prioridade (mantendo a ordem canônica)
  function agrupar(tarefas) {
    return NIVEIS
      .map(nivel => ({ nivel, rotulo: ROTULO[nivel], cor: COR[nivel], itens: tarefas.filter(t => normalizar(t.prioridade) === nivel) }))
      .filter(g => g.itens.length);
  }

  return { NIVEIS, ROTULO, COR, ORDEM, normalizar, comparar, agrupar };
})();

window.Priority = Priority;
