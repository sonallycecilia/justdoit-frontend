/* ============================================================
   JustDoIt — modules/categorias.js
   Fonte única das categorias: nome, id (chave de URL/token)
   e cor (variável de tokens.css).
   ============================================================ */
const Categorias = (function () {
  'use strict';

  // Genérico é a única categoria padrão de todo usuário. As demais são
  // criadas pelo próprio usuário (sidebar → "Nova categoria", task-service).
  const TODAS = [
    { id: 'generico', nome: 'Genérico', cor: 'var(--color-cat-generico)' },
  ];

  const PADRAO = TODAS[TODAS.length - 1]; // Genérico

  function porNome(nome) {
    return TODAS.find(c => c.nome === nome) || PADRAO;
  }

  function porId(id) {
    return TODAS.find(c => c.id === id) || PADRAO;
  }

  function cor(nome) {
    return porNome(nome).cor;
  }

  return { TODAS, porNome, porId, cor };
})();

window.Categorias = Categorias;
