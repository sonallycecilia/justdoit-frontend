/* ============================================================
   JustDoIt — features/auth/auth.js
   Módulo compartilhado da feature de autenticação.
   Gerencia tema (claro/escuro) e sessão do usuário.
   ============================================================ */
const Auth = (function () {
  'use strict';

  const raiz = document.documentElement;

  function _aplicarTema(tema) {
    if (tema === 'dark') raiz.setAttribute('data-theme', 'dark');
    else raiz.removeAttribute('data-theme');
  }

  // Aplica o tema salvo (ou preferência do sistema) e vincula o botão #themeToggle
  function iniciarTema() {
    const temaSalvo = window.Storage && Storage.lerTema();
    const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    _aplicarTema(temaSalvo || (prefereDark ? 'dark' : 'light'));

    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        const novo = raiz.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        _aplicarTema(novo);
        if (window.Storage) Storage.gravarTema(novo);
      });
    }
  }

  function gravarSessao(dados) {
    if (window.Storage) Storage.gravar('sessao', Object.assign({}, dados, { em: Date.now() }));
  }

  function lerSessao() {
    return window.Storage ? Storage.ler('sessao') : null;
  }

  return { iniciarTema, gravarSessao, lerSessao };
})();

window.Auth = Auth;
