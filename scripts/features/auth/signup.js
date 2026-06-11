/* ============================================================
   JustDoIt — features/auth/signup.js
   Controller da tela de cadastro.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

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

  /* ---------- Cadastro ---------- */
  const form = document.getElementById('signupForm');
  if (!form) return;

  const submitBtn  = document.getElementById('submitBtn');
  const signupView = document.getElementById('signupView');
  const doneView   = document.getElementById('doneView');
  const inputConf  = document.getElementById('confirmar');
  const erroSenha  = document.getElementById('erroSenha');

  inputConf.addEventListener('input', function () {
    erroSenha.classList.add('hidden');
    inputConf.setCustomValidity('');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const senha    = inputSenha.value;
    const confirma = inputConf.value;

    if (senha !== confirma) {
      erroSenha.classList.remove('hidden');
      inputConf.setCustomValidity('As senhas não coincidem');
      inputConf.reportValidity();
      return;
    }

    const perfil = form.querySelector('input[name="perfil"]:checked').value;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Criando conta…';

    // TODO: substituir por Api.post(Api.endpoints.auth.register, { nome, email, senha, perfil })
    setTimeout(function () {
      Auth.gravarSessao({
        nome:   document.getElementById('nome').value.trim(),
        email:  document.getElementById('email').value.trim(),
        perfil: perfil,
      });
      signupView.classList.add('hidden');
      doneView.classList.remove('hidden');

      setTimeout(function () {
        window.location.href = 'onboarding.html';
      }, 1200);
    }, 900);
  });
})();
