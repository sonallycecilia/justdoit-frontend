/* ============================================================
   JustDoIt — features/auth/login.js
   Controller do ecrã de login integrado com a API.
   Depende de: features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  // Inicia o tema claro/escuro
  Auth.iniciarTema();

  const API_BASE_URL = 'http://localhost:8080'; // URL do backend

  const form = document.getElementById('loginForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const emailInput = document.getElementById('email');
  const senhaInput = document.getElementById('senha');
  const lembrarCheck = document.getElementById('lembrar');
  const loginView = document.getElementById('loginView');
  const doneView = document.getElementById('doneView');

  // Interceta a submissão do formulário
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    const manterConectado = lembrarCheck.checked;

    // Prevenção básica de campos vazios
    if (!email || !senha) return;

    // Bloqueia o botão para evitar cliques múltiplos
    submitBtn.disabled = true;
    submitBtn.textContent = 'A entrar…';

    try {
      // Chamada real para o Backend Spring Boot
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          email: email, 
          password: senha 
        })
      });

      if (response.ok) {
        // Sucesso (200 OK) - Captura o JWT devolvido pelo backend
        const data = await response.json();
        
        // LoginResponseDTO devolve o token numa propriedade chamada "token"
        const token = data.token; 

        // Guarda o JWT de forma segura (localStorage ou sessionStorage)
        Auth.salvarToken(token, manterConectado);

        // Feedback visual de sucesso
        loginView.classList.add('hidden');
        doneView.classList.remove('hidden');

        // Aguarda 1.5 segundos e redireciona o utilizador para o dashboard
        setTimeout(function () {
          window.location.href = '../dashboard/dashboard.html'; 
        }, 1500);
      } else {
        // Erro 401 (Credenciais Inválidas) ou outros erros de autenticação
        alert('E-mail ou palavra-passe incorretos.');
        
        // Liberta o botão e limpa o campo da palavra-passe para o utilizador tentar novamente
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
        senhaInput.value = ''; 
        senhaInput.focus();
      }
    } catch (error) {
      console.error("Erro na comunicação:", error);
      alert('Erro de conexão com o servidor. O backend está a correr na porta 8080?');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });
  if (submitBtn.tagName === 'A') {
    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      // Dispara o evento de submit do formulário programaticamente
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  }
})();