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

  // "Genérico" é a categoria padrão da UI e NÃO existe no backend; ela é
  // representada por categoryId null nas tarefas.
  const CAT_GENERICO_ID = 'generico';

  // ── Recorrência (ciclicidade) ───────────────────────────────
  // A UI usa rótulos em minúsculas; o backend usa o enum CycleType em maiúsculas.
  // Ao contrário dos demais campos de "meta", a recorrência TAMBÉM é persistida no
  // task-service (PUT/DELETE /tasks/{id}/cycle-config) para que o job de geração
  // de instâncias cíclicas funcione. O cache "meta" continua sendo a fonte de
  // exibição (a listagem GET /tasks não devolve o cycle-config).
  const CICLO_API = {
    daily: 'DAILY', weekly: 'WEEKLY', biweekly: 'BIWEEKLY',
    monthly: 'MONTHLY', annual: 'ANNUAL', custom: 'CUSTOM',
  };
  // Inverso: CycleType do backend → rótulo da UI (usado ao ler GET /tasks).
  const CICLO_UI = {
    DAILY: 'daily', WEEKLY: 'weekly', BIWEEKLY: 'biweekly',
    MONTHLY: 'monthly', ANNUAL: 'annual', CUSTOM: 'custom',
  };

  // Valida um objeto de ciclo custom sem depender do módulo Cycle (tarefas.js roda
  // em páginas onde cycle.js não está carregado, ex.: calendário).
  function customValido(c) {
    return !!c && Number(c.count) > 0 && Number(c.occurrences) > 0
        && (c.unit === 'horas' || c.unit === 'dias');
  }

  // Objeto custom da UI → campos do CycleConfigRequest (backend).
  function customParaApi(c) {
    return {
      cycleType:        'CUSTOM',
      intervalUnit:     c.unit === 'horas' ? 'HOURS' : 'DAYS',
      intervalCount:    Number(c.count),
      totalOccurrences: Number(c.occurrences),
      startDate:        c.startIso || null,
      startTime:        c.unit === 'horas' ? (c.startTime || null) : null,
    };
  }

  // Reconcilia o cycle-config no backend. nova = recorrência escolhida (ou
  // undefined); antiga = a que estava antes (para saber se deve apagar);
  // custom = objeto do ciclo personalizado (usado só quando nova === 'custom';
  // se omitido, cai no cache "meta" da tarefa).
  // Best-effort: a tarefa já foi salva, não derruba o fluxo se o config falhar.
  function salvarRecorrencia(id, nova, antiga, custom) {
    const url = Api.endpoints.tasks.cycleConfig(id);
    const logErr = function (err) { console.error('Falha ao salvar recorrência:', err); return null; };
    if (nova === 'custom') {
      const c = custom || (lerMeta()[id] || {}).recorrenciaCustom;
      if (customValido(c)) {
        return Api.put(url, customParaApi(c)).catch(logErr);
      }
      return Promise.resolve(null); // custom incompleto → não envia
    }
    if (nova && CICLO_API[nova]) {
      return Api.put(url, { cycleType: CICLO_API[nova] }).catch(logErr);
    }
    if (antiga) { // tinha recorrência e o usuário removeu → apaga o config
      return Api.remove(url).catch(logErr);
    }
    return Promise.resolve(null);
  }

  // ── Tradução backend ↔ frontend ─────────────────────────────
  // frontend → corpo aceito pelo backend (TaskRequest)
  function paraApi(d) {
  const catId = (d.categoriaId && d.categoriaId !== CAT_GENERICO_ID) ? d.categoriaId : null;
  return {
    title:       d.titulo,
    description: d.descricao || null,
    categoryId:  catId,
    priority:    null,
    dueDate:     d.dataIso || null,
    dueTime:     d.hora || null,
  };
}

  // Campos da meta lateral gravados em toda criação/atualização. duracaoMin só
  // entra quando veio no payload: Object.assign copia chaves com undefined, então
  // incluí-la sempre apagaria o valor salvo em chamadas que não a informam
  // (ex.: mudarCategoria).
  function metaDe(dados) {
    const m = {
      cat: dados.cat, categoriaId: dados.categoriaId,
      prioridade: dados.prioridade, recorrencia: dados.recorrencia,
    };
    if (dados.duracaoMin != null) m.duracaoMin = dados.duracaoMin;
    // Detalhes do ciclo custom (o backend guarda no cycle-config, mas o GET /tasks
    // não os devolve — cache local reexibe intervalo/repetições). Só toca a chave
    // quando o save informa (undefined = update parcial → preserva; null = limpa).
    if (dados.recorrenciaCustom !== undefined) m.recorrenciaCustom = dados.recorrenciaCustom;
    return m;
  }

  // O tempo estimado NÃO faz parte do TaskRequest — o task-service o guarda no
  // timer da tarefa (PUT /tasks/{id}/timer). Mandá-lo junto do corpo da tarefa
  // não dá erro, o Spring só descarta o campo desconhecido — por isso o valor
  // "sumia" ao reabrir a tarefa.
  function salvarTempoEstimado(id, duracaoMin) {
    if (duracaoMin == null) return Promise.resolve(null);
    return Api.put(Api.endpoints.tasks.timer(id), { estimatedMinutes: duracaoMin })
      .catch(function (err) {
        // A tarefa em si já foi salva; não derruba o fluxo por causa do timer.
        console.error('Falha ao salvar tempo estimado:', err);
        return null;
      });
  }

  // Busca o tempo estimado no backend e o reflete no cache (a listagem
  // GET /tasks não traz esse campo). 404 = tarefa ainda sem timer.
  function carregarTempoEstimado(id) {
    return Api.get(Api.endpoints.tasks.timer(id))
      .then(function (t) {
        const min = (t && t.estimatedMinutes != null) ? t.estimatedMinutes : null;
        if (min == null) return null;
        gravarMeta(id, { duracaoMin: min });
        const lista = listar();
        const i = lista.findIndex(x => x.id === id);
        if (i >= 0) {
          lista[i] = Object.assign({}, lista[i], { duracaoMin: min });
          salvar(lista);
        }
        return min;
      })
      .catch(function () { return null; });
  }

  // resposta do backend (TaskResponse) + meta → modelo da UI
  function daApi(t) {
    const meta = lerMeta()[t.id] || {};
    const dataObj = t.dueDate ? new Date(t.dueDate + 'T00:00:00') : null;
    const quando = dataObj ? Utils.calcQuando(dataObj) : 'all';
    const concluida = t.status === 'COMPLETED';
    // Nome da categoria: o categoryId do backend é a fonte da verdade. Quando ele
    // resolve para uma categoria real (Categorias já carregado), esse nome vence —
    // assim corrige meta/cache antigos que tenham ficado com "Genérico". Só cai no
    // cache local (meta) quando não há categoryId resolvível (ex.: offline).
    let catNome = meta.cat;
    if (t.categoryId && window.Categorias) {
      const c = Categorias.porId(t.categoryId);
      if (c && c.id === t.categoryId) catNome = c.nome;
    }
    return {
      id:          t.id,
      titulo:      t.title,
      descricao:   t.description || '',
      cat:         catNome || 'Genérico',
      categoriaId: t.categoryId || CAT_GENERICO_ID,
      prioridade:  meta.prioridade || 'normal',
      // O backend agora devolve cycleType no GET /tasks: essa é a fonte da verdade
      // da recorrência (reflete ciclos criados em outro dispositivo/direto na API).
      // Cai no cache "meta" só quando a resposta não traz o campo (ex.: offline).
      recorrencia: (t.cycleType && CICLO_UI[t.cycleType]) || meta.recorrencia,
      // Detalhes do ciclo custom (só existem no cache local; ver metaDe).
      recorrenciaCustom: meta.recorrenciaCustom || null,
      done:        concluida,
      dataIso:     t.dueDate || null,
      data:        dataObj ? Utils.dataRelativa(dataObj) : 'Sem data',
      quando:      quando,
      overdue:     !concluida && quando === 'past',
      hora:        t.dueTime ? String(t.dueTime).slice(0, 5) : undefined,
      // Tempo estimado vive no timer da tarefa, não no TaskResponse: aqui vem do
      // cache lateral, atualizado por carregarTempoEstimado() no detalhe.
      duracaoMin:  meta.duracaoMin != null ? meta.duracaoMin : null,
    };
  }

  // ── Operações ───────────────────────────────────────────────
  function criar(dados) {
    // Guarda os ids atuais para conseguir identificar a tarefa recém-criada caso
    // o backend responda sem corpo (ver abaixo).
    const idsAntes = {};
    listar().forEach(function (t) { idsAntes[t.id] = true; });

    return Api.post(Api.endpoints.tasks.create, paraApi(dados)).then(function (resp) {
      if (resp && resp.id) {
        gravarMeta(resp.id, metaDe(dados));
        const nova = daApi(resp);
        const lista = listar();
        lista.unshift(nova);
        salvar(lista);
        return salvarTempoEstimado(nova.id, dados.duracaoMin)
          .then(function () { return salvarRecorrencia(nova.id, dados.recorrencia, undefined, dados.recorrenciaCustom); })
          .then(function () { return nova; });
      }

      // Sem corpo no retorno (ex.: 201 só com Location): recarrega a lista e
      // identifica a nova tarefa (id que não existia antes) para atrelar a meta
      // e DEVOLVER SEU ID. Sem isso, o detalhe não sabe sob qual id gravar
      // módulos/descrição/subtarefas/notas/ciclo e perde essas configurações.
      return carregarDaApi().then(function (lista) {
        const nova = lista.find(function (t) { return !idsAntes[t.id]; });
        if (!nova) return null;
        gravarMeta(nova.id, metaDe(dados));
        // Reaplica a meta ao cache para refletir prioridade/categoria escolhidas
        // (carregarDaApi remapeou a tarefa antes da meta existir).
        const atual = listar();
        const i = atual.findIndex(function (t) { return t.id === nova.id; });
        if (i < 0) return nova;
        atual[i] = Object.assign({}, atual[i], {
          cat: dados.cat, categoriaId: dados.categoriaId,
          prioridade: dados.prioridade || 'normal', recorrencia: dados.recorrencia,
          duracaoMin: dados.duracaoMin != null ? dados.duracaoMin : atual[i].duracaoMin,
        });
        salvar(atual);
        return salvarTempoEstimado(nova.id, dados.duracaoMin)
          .then(function () { return salvarRecorrencia(nova.id, dados.recorrencia, undefined, dados.recorrenciaCustom); })
          .then(function () { return atual[i]; });
      });
    });
  }

  function atualizar(id, dados) {
    // Captura a recorrência anterior ANTES de gravarMeta sobrescrever, para saber
    // se o usuário a removeu (e então apagar o cycle-config no backend).
    const recorrenciaAntiga = (lerMeta()[id] || {}).recorrencia;
    return Api.put(Api.endpoints.tasks.update(id), paraApi(dados)).then(function (resp) {
      gravarMeta(id, metaDe(dados));
      const lista = listar();
      const i = lista.findIndex(x => x.id === id);
      const atualizada = daApi(resp);
      if (i >= 0) lista[i] = atualizada; else lista.unshift(atualizada);
      salvar(lista);
      return salvarTempoEstimado(id, dados.duracaoMin)
        .then(function () { return salvarRecorrencia(id, dados.recorrencia, recorrenciaAntiga, dados.recorrenciaCustom); })
        .then(function () { return atualizada; });
    });
  }

  // Move uma tarefa para outra categoria e persiste no backend. Reaproveita os
  // demais campos da tarefa (título, data, hora, prioridade, recorrência) do
  // cache local e só troca a categoria, delegando a atualizar() → PUT /tasks/{id}
  // (e a meta lateral). categoriaId 'generico' vira category_id null no backend.
  function mudarCategoria(id, categoriaId, catNome) {
    const t = buscar(id);
    if (!t) return Promise.reject(new Error('Tarefa não encontrada: ' + id));
    if (t.categoriaId === categoriaId) return Promise.resolve(t);
    return atualizar(id, {
      titulo:      t.titulo,
      descricao:   t.descricao,
      cat:         catNome,
      categoriaId: categoriaId,
      prioridade:  t.prioridade,
      dataIso:     t.dataIso,
      hora:        t.hora,
      recorrencia: t.recorrencia,
    }).then(function (atualizada) {
      // Avisa a UI (ex.: sidebar) para repintar as categorias a partir do cache
      // já atualizado — a tarefa sai da categoria antiga e entra na nova.
      notificarMudanca();
      return atualizada;
    });
  }

  // Avisa as outras partes da UI (ex.: sidebar) que a lista mudou, para que
  // re-renderizem a partir do cache local sem refazer a busca na API.
  function notificarMudanca() {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('tarefas:atualizadas'));
    }
  }

  function toggleDone(id) {
    const lista = listar();
    const i = lista.findIndex(x => x.id === id);
    if (i < 0) return Promise.resolve();

    // Concluir → PATCH /complete (COMPLETED); reabrir → PATCH /reopen (PENDING).
    const concluir = !lista[i].done;
    const endpoint = concluir
      ? Api.endpoints.tasks.complete(id)
      : Api.endpoints.tasks.reopen(id);

    return Api.patch(endpoint).then(function (resp) {
      const atual = listar();
      const j = atual.findIndex(x => x.id === id);
      if (j < 0) return;
      // O endpoint pode responder com a tarefa atualizada (200) ou sem corpo
      // (204). Em qualquer caso, refletimos o novo estado localmente.
      atual[j] = resp && resp.id ? daApi(resp) : Object.assign({}, atual[j], { done: concluir });
      salvar(atual);
      notificarMudanca();
    });
  }

  function carregarDaApi() {
    // As categorias precisam estar carregadas ANTES de mapear as tarefas, senão
    // daApi resolve o nome da categoria como "Genérico" (a lista ainda só tem o
    // padrão) e grava esse nome errado no cache. Carrega categorias primeiro.
    const preCats = (window.Categorias && Categorias.carregar)
      ? Categorias.carregar().catch(function () {})
      : Promise.resolve();
    return preCats
      .then(function () { return Api.get(Api.endpoints.tasks.list); })
      .then(function (dados) {
        const lista = (Array.isArray(dados) ? dados : []).map(daApi);
        salvar(lista);
        return lista;
      })
      .catch(function () {
        return listar();
      });
  }

  // Move todas as tarefas de uma categoria (por nome) para "Genérico" no cache
  // local + meta. Espelha o que o backend faz ao excluir a categoria (zera o
  // category_id dessas tarefas), evitando que a meta cache continue mostrando o
  // nome antigo. Notifica a UI (ex.: sidebar) para re-renderizar.
  function moverParaGenerico(nome) {
    const mapa = lerMeta();
    const lista = listar().map(function (t) {
      if (t.cat !== nome) return t;
      mapa[t.id] = Object.assign({}, mapa[t.id], { cat: 'Genérico', categoriaId: CAT_GENERICO_ID });
      return Object.assign({}, t, { cat: 'Genérico', categoriaId: CAT_GENERICO_ID });
    });
    Storage.gravar(META_KEY, mapa);
    salvar(lista);
    notificarMudanca();
  }

  // Renomeia a categoria (por nome) no cache local + meta, refletindo no nome
  // exibido a edição feita no backend (PUT /categories/{id}). A associação por
  // categoryId não muda — só o rótulo. Notifica a UI para re-renderizar.
  function renomearCategoria(nomeAntigo, nomeNovo) {
    if (!nomeAntigo || !nomeNovo || nomeAntigo === nomeNovo) return;
    const mapa = lerMeta();
    const lista = listar().map(function (t) {
      if (t.cat !== nomeAntigo) return t;
      mapa[t.id] = Object.assign({}, mapa[t.id], { cat: nomeNovo });
      return Object.assign({}, t, { cat: nomeNovo });
    });
    Storage.gravar(META_KEY, mapa);
    salvar(lista);
    notificarMudanca();
  }

  // Exclui a tarefa no backend (DELETE /tasks/{id}) e a remove do cache local.
  function remover(id) {
    return Api.remove(Api.endpoints.tasks.remove(id)).then(function () {
      salvar(listar().filter(function (t) { return t.id !== id; }));
      notificarMudanca();
    });
  }

  return { listar, buscar, salvar, criar, atualizar, mudarCategoria, toggleDone, remover, moverParaGenerico, renomearCategoria, carregarDaApi, carregarTempoEstimado };
})();

window.Tarefas = Tarefas;
