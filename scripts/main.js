/* ============================================================
   JustDoIt — main.js
   Inicialização: tema (claro/escuro persistente) e o fluxo de
   login da tela de entrada. Roteamento simples por links.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Tema (claro/escuro) ---------- */
  const raiz = document.documentElement;

  function aplicarTema(tema) {
    if (tema === 'dark') raiz.setAttribute('data-theme', 'dark');
    else raiz.removeAttribute('data-theme');
  }

  // Tema inicial: preferência salva → preferência do sistema → claro
  const temaSalvo = window.Storage && Storage.lerTema();
  const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  aplicarTema(temaSalvo || (prefereDark ? 'dark' : 'light'));

  const btnTema = document.getElementById('themeToggle');
  if (btnTema) {
    btnTema.addEventListener('click', function () {
      const ehDark = raiz.getAttribute('data-theme') === 'dark';
      const novo = ehDark ? 'light' : 'dark';
      aplicarTema(novo);
      if (window.Storage) Storage.gravarTema(novo);
    });
  }

  /* ---------- Login ---------- */
  const form = document.getElementById('loginForm');
  if (form) {
    const submitBtn = document.getElementById('submitBtn');
    const loginView = document.getElementById('loginView');
    const doneView = document.getElementById('doneView');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const senha = document.getElementById('senha').value;
      if (!email || !senha) return;

      // Simulação de autenticação (substituir por chamada à API REST + JWT)
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entrando…';

      setTimeout(function () {
        // Persiste uma "sessão" fake e mostra o sucesso
        if (window.Storage) {
          Storage.gravar('sessao', { email: email, em: Date.now() });
        }
        loginView.classList.add('hidden');
        doneView.classList.remove('hidden');

        // Em produção: window.location.href = 'pages/dashboard.html';
        setTimeout(function () {
          // location.href = 'pages/dashboard.html';
        }, 1200);
      }, 900);
    });
  }
})();
