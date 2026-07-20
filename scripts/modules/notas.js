/* ============================================================
   JustDoIt — modules/notas.js
   Acesso às anotações (aba "Anotações") via API + cache local.

   A FONTE DA VERDADE é o backend (task-service, tabela `note` no
   MySQL): toda criação/edição/exclusão/fixar passa por /notes. O
   localStorage aqui é só cache de LEITURA — para a lista aparecer
   rápido e sobreviver a um refresh offline; nunca é a origem do dado.

   O rascunho do compositor (texto ainda não virou nota) usa a chave
   compartilhada Store.KEYS.NOTAS, a mesma do bloco no To Do — assim
   o que se está escrevendo é o mesmo nos dois lugares.

   Depende de core/storage.js e core/api.js.
   ============================================================ */
const Notas = (function () {
  'use strict';

  const KEY = 'notas-cache';               // cache de leitura da lista
  const KEY_RASCUNHO = Store.KEYS.NOTAS; // rascunho do compositor (compartilhado c/ To Do)

  // ── Cache local (modelo da UI) ──────────────────────────────
  function listar() { return Store.ler(KEY, []); }
  // Mantém a invariante da UI: a fixada primeiro. O sort é estável, então
  // preserva a ordem que o backend já devolveu dentro de cada grupo.
  function salvar(lista) {
    const ordenada = lista.slice().sort(function (a, b) {
      return (b.fixada ? 1 : 0) - (a.fixada ? 1 : 0);
    });
    Store.gravar(KEY, ordenada);
  }

  // resposta do backend (NoteResponse) → modelo da UI
  function daApi(n) {
    return {
      id:           n.id,
      titulo:       n.title || '',
      conteudo:     n.content || '',
      fixada:       !!n.pinned,
      criadaEm:     n.createdAt || null,
      atualizadaEm: n.updatedAt || null,
    };
  }

  // modelo da UI → corpo aceito pelo backend (NoteRequest)
  function paraApi(d) {
    return {
      title:   (d.titulo && d.titulo.trim()) ? d.titulo.trim() : null,
      content: (d.conteudo != null && String(d.conteudo).trim()) ? d.conteudo : null,
    };
  }

  // Avisa a UI (aba Anotações, bloco do To Do) que a lista mudou, para
  // re-renderizar a partir do cache já atualizado.
  function notificar() {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('notas:atualizadas'));
    }
  }

  // ── Operações (backend é a fonte da verdade) ────────────────
  function carregarDaApi() {
    return Api.get(Api.endpoints.notes.list)
      .then(function (dados) {
        const lista = (Array.isArray(dados) ? dados : []).map(daApi);
        salvar(lista);
        return lista;
      })
      .catch(function () { return listar(); });
  }

  function criar(dados) {
    return Api.post(Api.endpoints.notes.create, paraApi(dados)).then(function (resp) {
      if (resp && resp.id) {
        const nova = daApi(resp);
        const lista = listar();
        lista.unshift(nova);
        salvar(lista);
        notificar();
        return nova;
      }
      // Sem corpo no retorno: recarrega para pegar a nota criada.
      return carregarDaApi().then(function (lista) { notificar(); return lista[0] || null; });
    });
  }

  function atualizar(id, dados) {
    return Api.put(Api.endpoints.notes.update(id), paraApi(dados)).then(function (resp) {
      const lista = listar();
      const i = lista.findIndex(function (n) { return n.id === id; });
      const atualizada = (resp && resp.id)
        ? daApi(resp)
        : Object.assign({}, (i >= 0 ? lista[i] : {}), { id: id, titulo: dados.titulo || '', conteudo: dados.conteudo || '' });
      if (i >= 0) lista[i] = atualizada; else lista.unshift(atualizada);
      salvar(lista);
      notificar();
      return atualizada;
    });
  }

  function remover(id) {
    return Api.remove(Api.endpoints.notes.remove(id)).then(function () {
      salvar(listar().filter(function (n) { return n.id !== id; }));
      notificar();
    });
  }

  // Fixa a nota. O backend despina a anterior (só uma fixada por usuário) e a
  // ordenação muda, então recarrega a lista para refletir o novo estado/ordem.
  function fixar(id) {
    return Api.patch(Api.endpoints.notes.pin(id)).then(function () {
      return carregarDaApi().then(function (lista) { notificar(); return lista; });
    });
  }

  // ── Rascunho do compositor (compartilhado com o To Do) ──────
  function lerRascunho()       { return Store.ler(KEY_RASCUNHO, ''); }
  function gravarRascunho(txt) { Store.gravar(KEY_RASCUNHO, txt); }
  function limparRascunho()    { Store.remover(KEY_RASCUNHO); }

  return {
    listar, carregarDaApi, criar, atualizar, remover, fixar, daApi,
    lerRascunho, gravarRascunho, limparRascunho,
  };
})();

window.Notas = Notas;
