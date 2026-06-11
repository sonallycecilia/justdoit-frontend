/* ============================================================
   JustDoIt — features/auth/login.js
   Controller da tela de login.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

  const form = document.getElementById('loginForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const loginView = document.getElementById('loginView');
  const doneView  = document.getElementById('doneView');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha  = document.getElementById('senha').value;
    if (!email || !senha) return;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Entrando…';

    // TODO: substituir por Api.post(Api.endpoints.auth.login, { email, senha })
    setTimeout(function () {
      Auth.gravarSessao({ email: email });
      loginView.classList.add('hidden');
      doneView.classList.remove('hidden');

      setTimeout(function () {
        // window.location.href = 'dashboard.html';
      }, 1200);
    }, 900);
  });
})();
