/* ============================================================
   JustDoIt — modules/categorias.js
   Fonte única das categorias: nome, id (chave de URL/token)
   e cor (variável de tokens.css).
   ============================================================ */
const Categorias = (function () {
  'use strict';

  // Genérico é a única categoria padrão de todo usuário. As demais são
  // criadas pelo próprio usuário (sidebar → "Nova categoria", task-service).
  const PADRAO = { id: 'generico', nome: 'Genérico', cor: 'var(--color-cat-generico)' };

  // Lista viva: começa só com Genérico e é preenchida por carregar() com as
  // categorias do usuário (task-service: GET /categories). Mantemos a MESMA
  // referência de array para que quem já leu TODAS veja as atualizações.
  const TODAS = [PADRAO];

  function porNome(nome) {
    return TODAS.find(c => c.nome === nome) || PADRAO;
  }

  function porId(id) {
    return TODAS.find(c => c.id === id) || PADRAO;
  }

  function cor(nome) {
    return porNome(nome).cor;
  }

  // Busca as categorias do usuário no backend e atualiza TODAS in-place,
  // sempre com "Genérico" no topo como padrão. Em qualquer falha (sem Api,
  // offline, etc.) mantém apenas "Genérico". Retorna a lista resultante.
  function carregar() {
    if (!(window.Api && Api.endpoints && Api.endpoints.categories)) {
      return Promise.resolve(TODAS);
    }
    return Api.get(Api.endpoints.categories.list).then(function (cats) {
      const resto = (Array.isArray(cats) ? cats : []).map(function (c) {
        return {
          id:   c.id,
          nome: c.name,
          cor:  c.color || PADRAO.cor,
        };
      }).filter(function (c) { return c.nome !== PADRAO.nome; });
      TODAS.length = 0;
      TODAS.push(PADRAO, ...resto);
      return TODAS;
    }).catch(function () {
      TODAS.length = 0;
      TODAS.push(PADRAO);
      return TODAS;
    });
  }

  return { TODAS, PADRAO, porNome, porId, cor, carregar };
})();

window.Categorias = Categorias;
