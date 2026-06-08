(function () {
  'use strict';

  /* ---------- Tema ---------- */
  const raiz = document.documentElement;
  const temaSalvo = window.Storage && Storage.lerTema();
  const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (temaSalvo === 'dark' || (!temaSalvo && prefereDark)) raiz.setAttribute('data-theme', 'dark');

  const btnTema = document.getElementById('themeToggle');
  if (btnTema) {
    btnTema.addEventListener('click', function () {
      const dark = raiz.getAttribute('data-theme') === 'dark';
      const novo = dark ? 'light' : 'dark';
      if (novo === 'dark') raiz.setAttribute('data-theme', 'dark'); else raiz.removeAttribute('data-theme');
      if (window.Storage) Storage.gravarTema(novo);
    });
  }

  /* ---------- Mostrar / ocultar senha ---------- */
  const toggleSenha = document.getElementById('toggleSenha');
  const inputSenha = document.getElementById('senha');
  if (toggleSenha && inputSenha) {
    toggleSenha.addEventListener('click', function () {
      const visivel = inputSenha.type === 'text';
      inputSenha.type = visivel ? 'password' : 'text';
      toggleSenha.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
    });
  }

  /* ---------- Cadastro ---------- */
  const form = document.getElementById('signupForm');
  if (form) {
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

      // Simulação (substituir por POST /api/auth/register)
      setTimeout(function () {
        if (window.Storage) {
          Storage.gravar('sessao', {
            nome:   document.getElementById('nome').value.trim(),
            email:  document.getElementById('email').value.trim(),
            perfil: perfil,
            em:     Date.now(),
          });
        }
        signupView.classList.add('hidden');
        doneView.classList.remove('hidden');

        setTimeout(function () {
          window.location.href = 'onboarding.html';
        }, 1200);
      }, 900);
    });
  }
})();
