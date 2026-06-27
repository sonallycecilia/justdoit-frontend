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
  const inputSenha = document.getElementById('senha');

  function ligarOlho(toggleId, input) {
    const toggle = document.getElementById(toggleId);
    if (!toggle || !input) return;
    toggle.addEventListener('click', function () {
      const visivel = input.type === 'text';
      input.type = visivel ? 'password' : 'text';
      toggle.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
    });
  }

  ligarOlho('toggleSenha', inputSenha);
  ligarOlho('toggleConfirmar', document.getElementById('confirmar'));

  /* Modal de termos legais: ver features/auth/legal.js (componente compartilhado). */

  /* ---------- Cadastro ---------- */
  const form = document.getElementById('signupForm');
  if (!form) return;

  const submitBtn   = document.getElementById('submitBtn');
  const inputConf   = document.getElementById('confirmar');
  const erroSenha   = document.getElementById('erroSenha');
  const inputTermos = document.getElementById('termos');

  inputConf.addEventListener('input', function () {
    erroSenha.classList.add('hidden');
    inputConf.setCustomValidity('');
  });

  /* ---------- Verificação de e-mail (formato + cadastrado + entregável) ---------- */
  // Regex de formato razoavelmente estrita (não envia ao backend se falhar).
  const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const inputEmail = document.getElementById('email');
  const erroEmail  = document.getElementById('erroEmail');

  // Estados possíveis: 'idle' | 'checking' | 'ok' | 'registered' | 'invalid' | 'error'
  var emailStatus    = 'idle';
  var emailVerificado = '';   // último e-mail consultado (controle de corrida)

  function mostrarStatusEmail(texto, modificador) {
    erroEmail.textContent = texto || '';
    erroEmail.classList.remove('field__error--muted', 'field__error--ok');
    if (!texto) { erroEmail.classList.add('hidden'); return; }
    if (modificador) erroEmail.classList.add(modificador);
    erroEmail.classList.remove('hidden');
  }

  function aplicarStatus(status) {
    emailStatus = status;
    if (status === 'checking')        mostrarStatusEmail('Verificando e-mail…', 'field__error--muted');
    else if (status === 'ok')         mostrarStatusEmail('');
    else if (status === 'registered') mostrarStatusEmail('Este email já está em uso.');
    else if (status === 'invalid')    mostrarStatusEmail('Não encontramos esse provedor de email. Verifique se digitou corretamente.');
    else                              mostrarStatusEmail(''); // idle/error: sem ruído visual
  }

  // Consulta o backend. Retorna a Promise para reuso no submit.
  // Tem timeout próprio: se a verificação não responder a tempo, degrada para
  // 'error' (não trava a UI nem bloqueia o cadastro).
  const EMAIL_CHECK_TIMEOUT_MS = 6000;
  function verificarEmail(email) {
    aplicarStatus('checking');
    emailVerificado = email;

    var requisicao = Api.get(Api.endpoints.auth.checkEmail(email)).then(function (res) {
      if (email !== emailVerificado) return emailStatus; // resposta obsoleta: ignora
      if (res && res.registered)        aplicarStatus('registered');
      else if (res && res.deliverable === false) aplicarStatus('invalid');
      else                              aplicarStatus('ok');
      return emailStatus;
    }, function () {
      if (email !== emailVerificado) return emailStatus;
      aplicarStatus('error'); // degradação suave: não bloqueia o cadastro
      return 'error';
    });

    var timeout = new Promise(function (resolve) {
      setTimeout(function () {
        if (email === emailVerificado && emailStatus === 'checking') aplicarStatus('error');
        resolve(emailStatus);
      }, EMAIL_CHECK_TIMEOUT_MS);
    });

    return Promise.race([requisicao, timeout]);
  }

  // Debounce simples (não há helper em utils.js).
  var emailTimer = null;
  function agendarVerificacao() {
    if (emailTimer) clearTimeout(emailTimer);
    const email = inputEmail.value.trim();
    if (!email) { emailVerificado = ''; aplicarStatus('idle'); return; }
    if (!EMAIL_RE.test(email)) {
      emailVerificado = email;
      emailStatus = 'invalid';
      mostrarStatusEmail('E-mail inválido. Use o formato voce@exemplo.com.');
      return;
    }
    aplicarStatus('idle');
    emailTimer = setTimeout(function () { verificarEmail(email); }, 500);
  }

  inputEmail.addEventListener('input', agendarVerificacao);
  inputEmail.addEventListener('blur', function () {
    if (emailTimer) { clearTimeout(emailTimer); emailTimer = null; }
    const email = inputEmail.value.trim();
    if (email && EMAIL_RE.test(email) && email !== emailVerificado) verificarEmail(email);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const senha    = inputSenha.value;
    const confirma = inputConf.value;

    if (!nascimentoInput.value) {
      nascimentoBtn.focus();
      return;
    }

    // O <form> usa novalidate, então o `required` do checkbox não é cobrado
    // pelo navegador; validamos manualmente aqui.
    if (inputTermos && !inputTermos.checked) {
      inputTermos.reportValidity();
      return;
    }

    if (senha !== confirma) {
      erroSenha.classList.remove('hidden');
      inputConf.setCustomValidity('As senhas não coincidem');
      inputConf.reportValidity();
      return;
    }

    const email = inputEmail.value.trim();
    if (!email || !EMAIL_RE.test(email)) {
      mostrarStatusEmail('E-mail inválido. Use o formato voce@exemplo.com.');
      inputEmail.focus();
      return;
    }

    // Garante uma verificação atual do e-mail antes de enviar. Se ainda não
    // verificamos este e-mail (ou está em andamento), aguarda o resultado.
    var prontoParaVerificar = (emailStatus === 'ok' || emailStatus === 'error') && email === emailVerificado
      ? Promise.resolve(emailStatus)
      : verificarEmail(email);

    prontoParaVerificar.then(function (status) {
      if (status === 'registered' || status === 'invalid') {
        inputEmail.focus();
        return; // bloqueia o cadastro; 'error' segue (degradação suave)
      }
      enviarCadastro(senha);
    });
  });

  function enviarCadastro(senha) {
    var erroApi = document.getElementById('erroApi');
    erroApi.classList.add('hidden');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Criando conta…';

    const nome = Utils.capitalizarNome(document.getElementById('nome').value);

    Api.post(Api.endpoints.auth.register, {
      name:      nome,
      email:     document.getElementById('email').value.trim(),
      password:  senha,
      birthDate: nascimentoInput.value,
    }).then(function (res) {
      Auth.gravarSessao({ accessToken: res.accessToken, refreshToken: res.refreshToken, name: nome });
      Storage.gravar(Storage.KEYS.TAREFAS, []);
      window.location.href = 'onboarding.html';
    }).catch(function (err) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Criar conta';
      erroApi.textContent   = err.error || 'Erro ao criar conta. Tente novamente.';
      erroApi.classList.remove('hidden');
    });
  }
})();
