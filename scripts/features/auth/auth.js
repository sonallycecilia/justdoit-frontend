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
    const temaSalvo = window.Store && Store.lerTema();
    const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    _aplicarTema(temaSalvo || (prefereDark ? 'dark' : 'light'));

    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        const novo = raiz.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        _aplicarTema(novo);
        if (window.Store) Store.gravarTema(novo);
      });
    }
  }

  function gravarSessao(dados) {
    // mescla com a sessao atual p/ preservar campos (name/em) ao renovar tokens
    var atual = lerSessao() || {};
    if (window.Store) Store.gravar('sessao', Object.assign({}, atual, dados, { em: Date.now() }));
  }

  function lerSessao() {
    return window.Store ? Store.ler('sessao') : null;
  }

  function limparSessao() {
    if (window.Store) Store.remover('sessao');
  }

  // Faz logout no backend (revoga o refresh token) e limpa a sessao local
  function logout(redirecionar) {
    var sessao = lerSessao();
    function fim() {
      limparSessao();
      window.location.href = redirecionar || '../auth/login.html';
    }
    if (sessao && sessao.accessToken && window.Api) {
      Api.post(Api.endpoints.auth.logout).then(fim, fim);
    } else {
      fim();
    }
  }

  return { iniciarTema, gravarSessao, lerSessao, limparSessao, logout };
})();

window.Auth = Auth;
