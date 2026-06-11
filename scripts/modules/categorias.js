/* ============================================================
   JustDoIt — modules/categorias.js
   Fonte única das categorias: nome, id (chave de URL/token)
   e cor (variável de tokens.css).
   ============================================================ */
const Categorias = (function () {
  'use strict';

  const TODAS = [
    { id: 'estudos',  nome: 'Estudos',  cor: 'var(--color-cat-estudos)'  },
    { id: 'casa',     nome: 'Casa',     cor: 'var(--color-cat-casa)'     },
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
