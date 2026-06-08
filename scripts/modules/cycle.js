/* ============================================================
   JustDoIt — modules/cycle.js  (RF08)
   Lógica de recorrência cíclica. Dada uma recorrência e a data
   atual, calcula a próxima ocorrência de uma tarefa.
   ============================================================ */
const Cycle = (function () {
  const TIPOS = {
    daily: { rotulo: 'Diária', dias: 1 },
    weekly: { rotulo: 'Semanal', dias: 7 },
    biweekly: { rotulo: 'Quinzenal', dias: 14 },
    monthly: { rotulo: 'Mensal', dias: null }, // tratado à parte
  };

  function rotulo(tipo) { return TIPOS[tipo] ? TIPOS[tipo].rotulo : 'Sem recorrência'; }

  // Próxima ocorrência a partir de uma data base
  function proxima(tipo, base = new Date()) {
    const d = new Date(base);
    if (tipo === 'monthly') { d.setMonth(d.getMonth() + 1); return d; }
    const t = TIPOS[tipo];
    if (!t) return null;
    d.setDate(d.getDate() + t.dias);
    return d;
  }

  // Ao concluir uma tarefa recorrente, gera a próxima instância
  function aoConcluir(tarefa, base = new Date()) {
    if (!tarefa.recorrencia) return null;
    return Object.assign({}, tarefa, {
      done: false,
      proximaData: proxima(tarefa.recorrencia, base),
    });
  }

  return { TIPOS, rotulo, proxima, aoConcluir };
})();

window.Cycle = Cycle;
