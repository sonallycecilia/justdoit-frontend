/* ============================================================
   JustDoIt — modules/cycle.js  (RF08)
   Registro dos tipos de recorrência da UI (rótulos exibidos no
   seletor de ciclo do detalhe da tarefa).

   IMPORTANTE: a recorrência real é do BACKEND (task-service):
   PUT/DELETE /tasks/{id}/cycle-config define o ciclo e um job
   diário gera as próximas instâncias. Este módulo NÃO calcula
   próximas ocorrências nem cria instâncias localmente — fazer
   isso duplicaria o job do backend. Aqui ficam só tipos e rótulos.
   O mapeamento rótulo↔CycleType vive em modules/tarefas.js.
   ============================================================ */
const Cycle = (function () {
  const TIPOS = {
    daily: { rotulo: 'Diária' },
    weekly: { rotulo: 'Semanal' },
    biweekly: { rotulo: 'Quinzenal' },
    monthly: { rotulo: 'Mensal' },
    annual: { rotulo: 'Anual' },
  };

  function rotulo(tipo) { return TIPOS[tipo] ? TIPOS[tipo].rotulo : 'Sem recorrência'; }

  return { TIPOS, rotulo };
})();

window.Cycle = Cycle;
