/* ============================================================
   JustDoIt — features/auth/signup.js
   Controller da tela de cadastro integrado com a API.
   Depende de: features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  // Inicia o tema claro/escuro
  Auth.iniciarTema();

  const API_BASE_URL = 'http://localhost:8080'; // URL do backend

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

  /* ---------- Cadastro Real via API ---------- */
  const form = document.getElementById('signupForm');
  if (!form) return;

  const submitBtn  = document.getElementById('submitBtn');
  const signupView = document.getElementById('signupView');
  const doneView   = document.getElementById('doneView');
  const inputConf  = document.getElementById('confirmar');
  const erroSenha  = document.getElementById('erroSenha');

  // Limpa a mensagem de erro de senha ao digitar
  inputConf.addEventListener('input', function () {
    erroSenha.classList.add('hidden');
    inputConf.setCustomValidity('');
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = inputSenha.value;
    const confirma = inputConf.value;

    // Validação de senhas iguais
    if (senha !== confirma) {
      erroSenha.classList.remove('hidden');
      inputConf.setCustomValidity('As senhas não coincidem');
      inputConf.reportValidity();
      return;
    }

    // Bloqueia o botão para evitar cliques duplos ansiosos
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta…';

    try {
      // Chamada real para o Backend Spring Boot
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        // Enviando os dados exatamente como o seu UserRegisterRequestDTO espera
        body: JSON.stringify({ 
          name: nome, 
          email: email, 
          password: senha 
        })
      });

      if (response.ok) {
        // Sucesso (201 Created) - Mostra a tela de sucesso
        signupView.classList.add('hidden');
        doneView.classList.remove('hidden');

        // Aguarda 2 segundos para o utilizador ler a mensagem e manda para a tela de login
        setTimeout(function () {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        // Trata erro (ex: 409 Conflict - E-mail já existe, ou 400 Bad Request)
        const erroMsg = await response.text();
        alert('Falha ao cadastrar: ' + (erroMsg || 'Verifique os dados inseridos.'));
        
        // Liberta o botão para o utilizador tentar de novo
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar conta';
      }
    } catch (error) {
      console.error("Erro na comunicação:", error);
      alert('Erro de conexão com o servidor. O backend está a correr na porta 8080?');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar conta';
    }
  });
})();