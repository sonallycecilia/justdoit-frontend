/* ============================================================
   JustDoIt — modules/tarefas.js
   Acesso às tarefas via API + cache em localStorage.

   O backend (task-service) só armazena title/description/priority/
   dueDate/dueTime/status/categoryId. Campos que a UI usa mas o
   backend não guarda — nome da categoria, nível de prioridade da UI
   (urgent/important/normal/low) e recorrência — ficam num cache
   lateral ("meta") atrelado ao id da tarefa.

   Depende de core/storage.js, core/api.js e core/utils.js.
   ============================================================ */
const Tarefas = (function () {
  'use strict';

  const KEY = Storage.KEYS.TAREFAS;
  const META_KEY = 'todo-tarefas-meta';

  // ── Cache local (modelo da UI) ──────────────────────────────
  function listar() {
    return Storage.ler(KEY, []);
  }

  function buscar(id) {
    return listar().find(t => t.id === id) || null;
  }

  function salvar(lista) {
    Storage.gravar(KEY, lista);
  }

  // ── Meta lateral (campos que o backend não persiste) ────────
  function lerMeta() { return Storage.ler(META_KEY, {}); }

  function gravarMeta(id, dados) {
    const mapa = lerMeta();
    mapa[id] = Object.assign({}, mapa[id], dados);
    Storage.gravar(META_KEY, mapa);
  }

  // ── Tradução backend ↔ frontend ─────────────────────────────
  // frontend → corpo aceito pelo backend (TaskRequest)
  function paraApi(d) {
    return {
      title:       d.titulo,
      description: d.descricao || null,
      categoryId:  null,            // categorias ainda não integradas (sem UUID)
      priority:    null,            // nível real fica na meta; backend usa NORMAL
      dueDate:     d.dataIso || null,
      dueTime:     d.hora || null,  // "HH:mm" — aceito como LocalTime
    };
  }

  // resposta do backend (TaskResponse) + meta → modelo da UI
  function daApi(t) {
    const meta = lerMeta()[t.id] || {};
    const dataObj = t.dueDate ? new Date(t.dueDate + 'T00:00:00') : null;
    const quando = dataObj ? Utils.calcQuando(dataObj) : 'all';
    const concluida = t.status === 'COMPLETED';
    return {
      id:          t.id,
      titulo:      t.title,
      descricao:   t.description || '',
      cat:         meta.cat || 'Genérico',
      prioridade:  meta.prioridade || 'normal',
      recorrencia: meta.recorrencia,
      done:        concluida,
      dataIso:     t.dueDate || null,
      data:        dataObj ? Utils.dataRelativa(dataObj) : 'Sem data',
      quando:      quando,
      overdue:     !concluida && quando === 'past',
      hora:        t.dueTime ? String(t.dueTime).slice(0, 5) : undefined,
    };
  }

  // ── Operações ───────────────────────────────────────────────
  function criar(dados) {
    return Api.post(Api.endpoints.tasks.create, paraApi(dados)).then(function (resp) {
      // Sem corpo no retorno (ex.: 201 só com Location): não há id para atrelar a
      // meta; recarrega a lista da API para refletir a nova tarefa.
      if (!resp || !resp.id) return carregarDaApi();
      gravarMeta(resp.id, {
        cat: dados.cat, prioridade: dados.prioridade, recorrencia: dados.recorrencia,
      });
      const nova = daApi(resp);
      const lista = listar();
      lista.unshift(nova);
      salvar(lista);
      return nova;
    });
  }

  function atualizar(id, dados) {
    return Api.put(Api.endpoints.tasks.update(id), paraApi(dados)).then(function (resp) {
      gravarMeta(id, {
        cat: dados.cat, prioridade: dados.prioridade, recorrencia: dados.recorrencia,
      });
      const lista = listar();
      const i = lista.findIndex(x => x.id === id);
      const atualizada = daApi(resp);
      if (i >= 0) lista[i] = atualizada; else lista.unshift(atualizada);
      salvar(lista);
      return atualizada;
    });
  }

  function toggleDone(id) {
    const lista = listar();
    const i = lista.findIndex(x => x.id === id);
    if (i < 0) return Promise.resolve();

    // O backend só conclui (status COMPLETED); não reabre tarefa concluída.
    // Reabrir é feito apenas localmente.
    if (lista[i].done) {
      lista[i].done = false;
      salvar(lista);
      return Promise.resolve();
    }

    return Api.patch(Api.endpoints.tasks.complete(id)).then(function (resp) {
      const atual = listar();
      const j = atual.findIndex(x => x.id === id);
      if (j < 0) return;
      // O endpoint /complete pode responder com a tarefa atualizada (200) ou
      // sem corpo (204). Em qualquer caso, marcamos como concluída localmente.
      atual[j] = resp && resp.id ? daApi(resp) : Object.assign({}, atual[j], { done: true });
      salvar(atual);
    });
  }

  function carregarDaApi() {
    return Api.get(Api.endpoints.tasks.list)
      .then(function (dados) {
        const lista = (Array.isArray(dados) ? dados : []).map(daApi);
        salvar(lista);
        return lista;
      })
      .catch(function () {
        return listar();
      });
  }

  return { listar, buscar, salvar, criar, atualizar, toggleDone, carregarDaApi };
})();

window.Tarefas = Tarefas;
