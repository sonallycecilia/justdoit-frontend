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
    estimatedMinutes: (d.duracaoMin != null) ? d.duracaoMin : null,   
  };
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
      recorrencia: meta.recorrencia,
      done:        concluida,
      dataIso:     t.dueDate || null,
      data:        dataObj ? Utils.dataRelativa(dataObj) : 'Sem data',
      quando:      quando,
      overdue:     !concluida && quando === 'past',
      hora:        t.dueTime ? String(t.dueTime).slice(0, 5) : undefined,
      duracaoMin:  t.estimatedMinutes != null ? t.estimatedMinutes : null, 
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
        gravarMeta(resp.id, {
          cat: dados.cat, categoriaId: dados.categoriaId,
          prioridade: dados.prioridade, recorrencia: dados.recorrencia,
        });
        const nova = daApi(resp);
        const lista = listar();
        lista.unshift(nova);
        salvar(lista);
        return nova;
      }

      // Sem corpo no retorno (ex.: 201 só com Location): recarrega a lista e
      // identifica a nova tarefa (id que não existia antes) para atrelar a meta
      // e DEVOLVER SEU ID. Sem isso, o detalhe não sabe sob qual id gravar
      // módulos/descrição/subtarefas/notas/ciclo e perde essas configurações.
      return carregarDaApi().then(function (lista) {
        const nova = lista.find(function (t) { return !idsAntes[t.id]; });
        if (!nova) return null;
        gravarMeta(nova.id, {
          cat: dados.cat, categoriaId: dados.categoriaId,
          prioridade: dados.prioridade, recorrencia: dados.recorrencia,
        });
        // Reaplica a meta ao cache para refletir prioridade/categoria escolhidas
        // (carregarDaApi remapeou a tarefa antes da meta existir).
        const atual = listar();
        const i = atual.findIndex(function (t) { return t.id === nova.id; });
        if (i < 0) return nova;
        atual[i] = Object.assign({}, atual[i], {
          cat: dados.cat, categoriaId: dados.categoriaId,
          prioridade: dados.prioridade || 'normal', recorrencia: dados.recorrencia,
        });
        salvar(atual);
        return atual[i];
      });
    });
  }

  function atualizar(id, dados) {
    return Api.put(Api.endpoints.tasks.update(id), paraApi(dados)).then(function (resp) {
      gravarMeta(id, {
        cat: dados.cat, categoriaId: dados.categoriaId,
        prioridade: dados.prioridade, recorrencia: dados.recorrencia,
      });
      const lista = listar();
      const i = lista.findIndex(x => x.id === id);
      const atualizada = daApi(resp);
      if (i >= 0) lista[i] = atualizada; else lista.unshift(atualizada);
      salvar(lista);
      return atualizada;
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

  return { listar, buscar, salvar, criar, atualizar, mudarCategoria, toggleDone, remover, moverParaGenerico, renomearCategoria, carregarDaApi };
})();

window.Tarefas = Tarefas;
