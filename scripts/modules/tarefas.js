/* ============================================================
   JustDoIt — modules/tarefas.js
   Acesso às tarefas via API + cache em localStorage.
   Depende de core/storage.js e core/api.js.
   ============================================================ */
const Tarefas = (function () {
  'use strict';

  const KEY = Storage.KEYS.TAREFAS;

  function listar() {
    return Storage.ler(KEY, []);
  }

  function buscar(id) {
    return listar().find(t => t.id === id) || null;
  }

  function salvar(lista) {
    Storage.gravar(KEY, lista);
  }

  function criar(dados) {
    return Api.post(Api.endpoints.tasks.create, dados).then(function (nova) {
      const lista = listar();
      lista.unshift(nova);
      salvar(lista);
      return nova;
    });
  }

  function toggleDone(id) {
    return Api.patch(Api.endpoints.tasks.complete(id)).then(function () {
      const lista = listar();
      const t = lista.find(x => x.id === id);
      if (t) { t.done = !t.done; salvar(lista); }
    });
  }

  function carregarDaApi() {
    return Api.get(Api.endpoints.tasks.list)
      .then(function (dados) {
        var lista = Array.isArray(dados) ? dados : [];
        salvar(lista);
        return lista;
      })
      .catch(function () {
        return listar();
      });
  }

  return { listar, buscar, salvar, criar, toggleDone, carregarDaApi };
})();

window.Tarefas = Tarefas;
