/* ============================================================
   JustDoIt — features/auth/signup.js
   Controller da tela de cadastro.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

  /* ---------- Date picker de nascimento ---------- */
  var nascimentoPick  = document.getElementById('nascimentoPick');
  var nascimentoBtn   = document.getElementById('nascimentoBtn');
  var nascimentoLabel = document.getElementById('nascimentoLabel');
  var nascimentoInput = document.getElementById('nascimento');

  if (nascimentoPick && nascimentoBtn) {
    DatePicker.criar({
      container:      nascimentoPick,
      botao:          nascimentoBtn,
      modoNascimento: true,
      onSelect:       function (d) {
        var dia = String(d.getDate()).padStart(2, '0');
        var mes = String(d.getMonth() + 1).padStart(2, '0');
        var ano = d.getFullYear();
        nascimentoInput.value      = ano + '-' + mes + '-' + dia;
        nascimentoLabel.textContent = dia + '/' + mes + '/' + ano;
        nascimentoLabel.classList.add('is-set');
      }
    });
  }

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

    if (!nascimentoInput.value) {
      nascimentoBtn.focus();
      return;
    }

    if (senha !== confirma) {
      erroSenha.classList.remove('hidden');
      inputConf.setCustomValidity('As senhas não coincidem');
      inputConf.reportValidity();
      return;
    }

    var erroApi = document.getElementById('erroApi');
    erroApi.classList.add('hidden');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Criando conta…';

    Api.post(Api.endpoints.auth.register, {
      name:      document.getElementById('nome').value.trim(),
      email:     document.getElementById('email').value.trim(),
      password:  senha,
      birthDate: nascimentoInput.value,
    }).then(function (res) {
      Auth.gravarSessao({ accessToken: res.accessToken, refreshToken: res.refreshToken, name: document.getElementById('nome').value.trim() });
      Storage.gravar(Storage.KEYS.TAREFAS, []);
      window.location.href = 'onboarding.html';
    }).catch(function (err) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Criar conta';
      erroApi.textContent   = err.error || 'Erro ao criar conta. Tente novamente.';
      erroApi.classList.remove('hidden');
    });
  });
})();
