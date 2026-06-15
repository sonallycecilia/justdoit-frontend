/* ============================================================
   JustDoIt — features/auth/auth.js
   Módulo compartilhado da feature de autenticação.
   Gerencia tema (claro/escuro) e sessão segura (JWT).
   ============================================================ */
const Auth = (function () {
  'use strict';

  const raiz = document.documentElement;

  // Aplica a classe de tema na raiz do documento
  function _aplicarTema(tema) {
    if (tema === 'dark') raiz.setAttribute('data-theme', 'dark');
    else raiz.removeAttribute('data-theme');
  }

  // Aplica o tema salvo 
  function iniciarTema() {
    const temaSalvo = window.Storage && Storage.lerTema ? Storage.lerTema() : null;
    const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    _aplicarTema(temaSalvo || (prefereDark ? 'dark' : 'light'));

    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        const novo = raiz.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        _aplicarTema(novo);
        if (window.Storage && Storage.gravarTema) Storage.gravarTema(novo);
      });
    }
  }

  /* ============================================================
     GERENCIAMENTO DE SESSÃO SEGURA (JWT)
     ============================================================ */

  /**
   * Salva o Token JWT no navegador.
   * @param {string} token - O JWT gerado pelo backend.
   * @param {boolean} lembrarSessao - Se true (Manter conectado), usa localStorage (sobrevive ao fechar a aba). 
   * Se false, usa sessionStorage (morre ao fechar a aba).
   */
  function salvarToken(token, lembrarSessao = true) {
    if (lembrarSessao) {
      localStorage.setItem('justdoit_jwt', token);
    } else {
      sessionStorage.setItem('justdoit_jwt', token);
    }
  }

  /**
   * Busca o token salvo (verifica tanto o localStorage quanto o sessionStorage).
   * @returns {string|null} O token JWT ou null se não estiver logado.
   */
  function obterToken() {
    return localStorage.getItem('justdoit_jwt') || sessionStorage.getItem('justdoit_jwt');
  }

  /**
   * Remove o token do navegador e redireciona para o Login.
   */
  function realizarLogout() {
    localStorage.removeItem('justdoit_jwt');
    sessionStorage.removeItem('justdoit_jwt');
    window.location.href = 'login.html';
  }

  /**
   * Prepara os cabeçalhos (Headers) para enviar nas requisições fetch.
   * Já injeta o token Bearer automaticamente se o usuário estiver logado.
   * @returns {Object} Cabeçalhos para a requisição.
   */
  function getAuthHeaders() {
    const token = obterToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    
    return headers;
  }

  // Expõe as funções para serem usadas nos outros arquivos (login.js, signup.js, etc.)
  return { 
    iniciarTema, 
    salvarToken, 
    obterToken, 
    realizarLogout, 
    getAuthHeaders 
  };
})();

window.Auth = Auth;