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

  /* ---------- Mostrar / ocultar senha ---------- */
  const inputSenha  = document.getElementById('senha');
  const toggleSenha = document.getElementById('toggleSenha');
  if (toggleSenha && inputSenha) {
    toggleSenha.addEventListener('click', function () {
      const visivel = inputSenha.type === 'text';
      inputSenha.type = visivel ? 'password' : 'text';
      toggleSenha.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
    });
  }

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
        Auth.gravarSessao({ accessToken: res.accessToken, refreshToken: res.refreshToken });
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
