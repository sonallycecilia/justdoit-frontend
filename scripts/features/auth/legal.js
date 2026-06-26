/* ============================================================
   JustDoIt — features/auth/legal.js
   Modal de Termos de Uso e Política de Privacidade.
   Componente autônomo e compartilhado entre as telas de login e
   cadastro: injeta o modal + o conteúdo na página e liga qualquer
   gatilho marcado com data-legal="termos" ou data-legal="privacidade".
   ============================================================ */
(function () {
  'use strict';

  var ATUALIZADO = '<p class="legal-modal__updated">Última atualização: 26 de junho de 2026</p>';

  var CONTEUDO = {
    termos: {
      titulo: 'Termos de Uso',
      html: ATUALIZADO +
        '<h3>1. Aceitação dos termos</h3>' +
        '<p>Ao criar uma conta e utilizar o JustDoIt ("Serviço"), você concorda com estes Termos de Uso. Caso não concorde, não utilize o Serviço.</p>' +
        '<h3>2. Descrição do serviço</h3>' +
        '<p>O JustDoIt é um gerenciador de tarefas que permite organizar atividades, categorias, lembretes e acompanhar sua produtividade. O Serviço é fornecido "no estado em que se encontra", podendo ser alterado ou descontinuado a qualquer momento.</p>' +
        '<h3>3. Cadastro e conta</h3>' +
        '<ul>' +
          '<li>Você deve fornecer informações verdadeiras e mantê-las atualizadas.</li>' +
          '<li>Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta.</li>' +
          '<li>É necessário ter idade mínima de 13 anos para criar uma conta.</li>' +
        '</ul>' +
        '<h3>4. Responsabilidades do usuário</h3>' +
        '<p>Você concorda em não utilizar o Serviço para fins ilícitos, não tentar acessar contas de terceiros e não comprometer a segurança ou o funcionamento da plataforma.</p>' +
        '<h3>5. Conteúdo do usuário</h3>' +
        '<p>As tarefas e demais informações que você insere são de sua responsabilidade e permanecem de sua propriedade. Você nos concede apenas a permissão necessária para armazenar e exibir esse conteúdo a fim de operar o Serviço.</p>' +
        '<h3>6. Limitação de responsabilidade</h3>' +
        '<p>O JustDoIt não se responsabiliza por perdas de dados, prejuízos ou indisponibilidades decorrentes do uso do Serviço, na máxima extensão permitida pela lei.</p>' +
        '<h3>7. Alterações</h3>' +
        '<p>Estes Termos podem ser atualizados periodicamente. Mudanças relevantes serão comunicadas, e o uso contínuo do Serviço implica aceitação da versão vigente.</p>'
    },
    privacidade: {
      titulo: 'Política de Privacidade',
      html: ATUALIZADO +
        '<p>Esta Política descreve como o JustDoIt trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>' +
        '<h3>1. Dados que coletamos</h3>' +
        '<ul>' +
          '<li><strong>Dados de cadastro:</strong> nome, e-mail e data de nascimento.</li>' +
          '<li><strong>Dados de uso:</strong> tarefas, categorias, lembretes e configurações que você cria.</li>' +
          '<li><strong>Dados técnicos:</strong> informações de sessão necessárias para manter você conectado.</li>' +
        '</ul>' +
        '<h3>2. Como usamos seus dados</h3>' +
        '<p>Utilizamos seus dados para criar e autenticar sua conta, fornecer as funcionalidades do Serviço, salvar suas tarefas e melhorar a experiência de uso.</p>' +
        '<h3>3. Base legal</h3>' +
        '<p>O tratamento se baseia na execução do contrato (prestação do Serviço) e no seu consentimento, conforme a LGPD.</p>' +
        '<h3>4. Compartilhamento</h3>' +
        '<p>Não vendemos seus dados. O compartilhamento ocorre apenas quando necessário para operar o Serviço (por exemplo, provedores de infraestrutura) ou por obrigação legal.</p>' +
        '<h3>5. Armazenamento e segurança</h3>' +
        '<p>Adotamos medidas técnicas razoáveis para proteger seus dados, incluindo o armazenamento de senhas de forma criptografada. Nenhum sistema, porém, é totalmente imune a riscos.</p>' +
        '<h3>6. Seus direitos</h3>' +
        '<p>Você pode, a qualquer momento, solicitar acesso, correção, exclusão ou portabilidade dos seus dados, bem como revogar o consentimento, conforme o art. 18 da LGPD.</p>' +
        '<h3>7. Armazenamento local</h3>' +
        '<p>Utilizamos o armazenamento do seu navegador (localStorage) para guardar dados de sessão e preferências, como o tema. Você pode limpá-los pelas configurações do navegador.</p>' +
        '<h3>8. Retenção</h3>' +
        '<p>Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, eles são removidos ou anonimizados, salvo obrigação legal de retenção.</p>' +
        '<h3>9. Alterações</h3>' +
        '<p>Esta Política pode ser atualizada. Alterações relevantes serão comunicadas dentro do Serviço.</p>'
    }
  };

  var MODAL_HTML =
    '<div class="legal-modal" id="legalModal" hidden>' +
      '<div class="legal-modal__backdrop" data-legal-close></div>' +
      '<div class="legal-modal__card" role="dialog" aria-modal="true" aria-labelledby="legalModalTitle">' +
        '<div class="legal-modal__head">' +
          '<h2 class="legal-modal__title" id="legalModalTitle">Termos de Uso</h2>' +
          '<button type="button" class="legal-modal__close" id="legalModalClose" data-legal-close aria-label="Fechar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="legal-modal__body" id="legalModalBody"></div>' +
        '<div class="legal-modal__foot">' +
          '<button type="button" class="btn btn--primary" id="legalAgree">Concordo</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  function init() {
    // Injeta o modal uma única vez.
    if (!document.getElementById('legalModal')) {
      var wrap = document.createElement('div');
      wrap.innerHTML = MODAL_HTML;
      document.body.appendChild(wrap.firstElementChild);
    }

    var modal  = document.getElementById('legalModal');
    var titulo = document.getElementById('legalModalTitle');
    var corpo  = document.getElementById('legalModalBody');
    if (!modal || !titulo || !corpo) return;

    var ultimoFoco = null;
    var concordo   = document.getElementById('legalAgree');

    function abrir(chave) {
      var item = CONTEUDO[chave];
      if (!item) return;
      titulo.textContent = item.titulo;
      corpo.innerHTML = item.html;
      corpo.scrollTop = 0;
      ultimoFoco = document.activeElement;
      modal.hidden = false;
      if (concordo) concordo.focus();
    }

    function fechar() {
      modal.hidden = true;
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }

    // Ao concordar: marca o aceite de termos do formulário (se houver) e fecha.
    if (concordo) {
      concordo.addEventListener('click', function () {
        var termos = document.getElementById('termos');
        if (termos) termos.checked = true;
        fechar();
      });
    }

    document.addEventListener('click', function (e) {
      var gatilho = e.target.closest('[data-legal]');
      if (gatilho) {
        e.preventDefault();
        abrir(gatilho.getAttribute('data-legal'));
      }
    });

    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-legal-close]')) fechar();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) fechar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
