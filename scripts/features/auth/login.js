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
  const erroLogin = document.getElementById('erroLogin');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha  = document.getElementById('senha').value;
    if (!email || !senha) return;

    erroLogin.classList.add('hidden');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Entrando…';

    Api.post(Api.endpoints.auth.login, { email: email, password: senha })
      .then(function (res) {
        Auth.gravarSessao({ token: res.token });
        window.location.href = '../dashboard/dashboard.html';
      })
      .catch(function (err) {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Entrar';
        erroLogin.textContent = err.error || 'E-mail ou senha incorretos.';
        erroLogin.classList.remove('hidden');
      });
  });
})();
