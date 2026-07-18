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

  // ── Ciclo personalizado (cycleType == CUSTOM no backend) ──────────────────
  // Objeto: { count, unit: 'horas'|'dias', occurrences, startIso, startTime }.
  // Um custom só é válido com intervalo e nº de repetições > 0.
  function customValido(c) {
    return !!c && Number(c.count) > 0 && Number(c.occurrences) > 0
        && (c.unit === 'horas' || c.unit === 'dias');
  }

  // Rótulo curto p/ o painel de especificações. Ex.: "A cada 12h · 7×".
  function rotuloCustom(c) {
    if (!customValido(c)) return 'Personalizado';
    const u = c.unit === 'horas' ? 'h' : (Number(c.count) === 1 ? ' dia' : ' dias');
    return 'A cada ' + c.count + u + ' · ' + c.occurrences + '×';
  }

  return { TIPOS, rotulo, customValido, rotuloCustom };
})();

window.Cycle = Cycle;
