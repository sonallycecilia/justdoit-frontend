/* ============================================================
   JustDoIt — modules/blocos.js
   Acesso aos blocos de tempo do calendário via API (schedule-service).

   O backend (/time-blocks) só guarda quando e quanto:
   taskId / startDateTime / endDateTime / estimatedMinutes / date —
   tudo em data/hora absoluta. Os campos visuais do bloco (título,
   categoria, prioridade, concluído) vêm da tarefa vinculada (taskId),
   resolvida pela UI; aqui só traduzimos posição ⇄ data/hora.

   O modelo da UI usa posição relativa na semana:
     d   — índice do dia (0 = segunda … 6 = domingo)
     ini — hora de início como número (8.5 = 08:30)
     fim — hora de fim como número
   A conversão entre d/ini e a data/hora ISO usa o array `dias`
   (gerado por gerarDiasSemana), em que cada dia tem `.iso` (YYYY-MM-DD).

   Depende de core/api.js.
   ============================================================ */
const Blocos = (function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  function fmtHora(x) {
    const h = Math.floor(x);
    const m = Math.round((x % 1) * 60);
    return pad(h) + ':' + pad(m);
  }

  // "2026-06-10T08:30:00" → 8.5
  function horaDeIso(dataHora) {
    const parte = String(dataHora).split('T')[1] || '00:00';
    const [hh, mm] = parte.split(':').map(Number);
    return (hh || 0) + (mm || 0) / 60;
  }

  // ── Tradução UI ⇄ backend ───────────────────────────────────
  // evento (UI) → corpo aceito pelo backend (TimeBlockRequest)
  function paraApi(ev, dias) {
    const dia = dias[ev.d];
    const iso = dia ? dia.iso : null;
    return {
      taskId:           ev.taskId || null,
      startDateTime:    iso + 'T' + fmtHora(ev.ini) + ':00',
      endDateTime:      iso + 'T' + fmtHora(ev.fim) + ':00',
      estimatedMinutes: Math.round((ev.fim - ev.ini) * 60),
      date:             iso,
    };
  }

  // resposta do backend (TimeBlockResponse) → evento cru da UI
  // (sem título/categoria/prioridade — a UI completa a partir da tarefa)
  function daApi(b, dias) {
    const d = dias.findIndex(x => x.iso === b.date);
    return {
      id:     b.id,
      taskId: b.taskId || null,
      d:      d >= 0 ? d : 0,
      ini:    horaDeIso(b.startDateTime),
      fim:    horaDeIso(b.endDateTime),
    };
  }

  // ── Operações ───────────────────────────────────────────────
  // Busca crua de blocos num intervalo de datas (uma única chamada ao backend:
  // GET /time-blocks?from=…&to=…). Retorna os TimeBlockResponse.
  function buscarIntervalo(from, to) {
    return Api.get(Api.endpoints.schedule.range(from, to))
      .then(function (lista) { return Array.isArray(lista) ? lista : []; })
      .catch(function () { return []; });
  }

  // Semana (vistas dia/semana): evento com índice de dia `d` relativo a `dias`.
  function carregarSemana(dias) {
    return buscarIntervalo(dias[0].iso, dias[dias.length - 1].iso)
      .then(function (bs) { return bs.map(function (b) { return daApi(b, dias); }); });
  }

  // Mês (ou qualquer faixa): evento achatado por data ISO absoluta (sem índice de dia).
  function carregarIntervalo(from, to) {
    return buscarIntervalo(from, to).then(function (bs) {
      return bs.map(function (b) {
        return {
          id:     b.id,
          taskId: b.taskId || null,
          iso:    b.date,
          ini:    horaDeIso(b.startDateTime),
          fim:    horaDeIso(b.endDateTime),
        };
      });
    });
  }

  function criar(ev, dias) {
    return Api.post(Api.endpoints.schedule.create, paraApi(ev, dias))
      .then(function (resp) { return resp && resp.id ? daApi(resp, dias) : ev; });
  }

  function atualizar(ev, dias) {
    return Api.put(Api.endpoints.schedule.update(ev.id), paraApi(ev, dias))
      .then(function (resp) { return resp && resp.id ? daApi(resp, dias) : ev; });
  }

  function remover(id) {
    return Api.remove(Api.endpoints.schedule.remove(id));
  }

  return { carregarSemana, carregarIntervalo, criar, atualizar, remover };
})();

window.Blocos = Blocos;
