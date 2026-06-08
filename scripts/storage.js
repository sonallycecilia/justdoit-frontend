/* ============================================================
   JustDoIt — storage.js
   Abstração simples do LocalStorage. Todo estado temporário
   (tarefas, configurações, sessão) deve passar por aqui.
   ============================================================ */
const Storage = (function () {
  const PREFIX = 'jdi.';

  function ler(chave, padrao = null) {
    try {
      const bruto = localStorage.getItem(PREFIX + chave);
      return bruto === null ? padrao : JSON.parse(bruto);
    } catch (e) {
      console.warn('[Storage] falha ao ler', chave, e);
      return padrao;
    }
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(PREFIX + chave, JSON.stringify(valor));
    } catch (e) {
      console.warn('[Storage] falha ao gravar', chave, e);
    }
  }

  function remover(chave) {
    localStorage.removeItem(PREFIX + chave);
  }

  // Preferência de tema persistida
  function lerTema() { return ler('tema', null); }
  function gravarTema(tema) { gravar('tema', tema); }

  return { ler, gravar, remover, lerTema, gravarTema };
})();

// Disponível globalmente para os outros scripts
window.Storage = Storage;
