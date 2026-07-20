/* ============================================================
   JustDoIt — pages/settings.js
   Preferências (tema), gestão de categorias (criar/excluir).
   ============================================================ */
(function () {
  'use strict';
  const raiz = document.documentElement;
  // Escape de conteúdo do usuário/backend interpolado em innerHTML.
  const esc = Utils.esc;

  /* ---------- Conta (perfil: nome, email, senha) ---------- */
  // Puxa os dados da conta de GET /auth/me. Cada campo (nome, email, senha) tem
  // seu próprio botão Editar e salva de forma independente via PUT /auth/me
  // (atualização parcial). A sessão local é atualizada p/ refletir na sidebar.
  (function () {
    const avatarEl = document.getElementById('profileAvatar');
    const msgEl    = document.getElementById('profileMsg');
    if (!avatarEl) return;

    /* Foto de perfil — redimensiona no cliente e envia ao backend (avatarUrl). */
    const avatarImg    = document.getElementById('profileAvatarImg');
    const avatarBtn    = document.getElementById('avatarBtn');
    const avatarInput  = document.getElementById('avatarInput');
    const avatarUpload = document.getElementById('avatarUploadBtn');
    const avatarRemove = document.getElementById('avatarRemoveBtn');
    const AVATAR_MAX = 256; // lado máximo do avatar, em px

    function mostrarFoto(dataUrl) {
      if (dataUrl) {
        avatarImg.src = dataUrl;
        avatarImg.hidden = false;
        avatarEl.hidden = true;
      } else {
        avatarImg.removeAttribute('src');
        avatarImg.hidden = true;
        avatarEl.hidden = false;
      }
      if (avatarRemove) avatarRemove.hidden = !dataUrl;
    }

    // Lê o arquivo, reduz para no máx. AVATAR_MAX px e devolve um Data URL JPEG
    // (algumas dezenas de KB), evitando trafegar/armazenar a imagem original.
    function redimensionar(file) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () { reject(new Error('Falha ao ler o arquivo.')); };
        reader.onload = function () {
          const img = new Image();
          img.onerror = function () { reject(new Error('Imagem inválida.')); };
          img.onload = function () {
            const escala = Math.min(1, AVATAR_MAX / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * escala));
            const h = Math.max(1, Math.round(img.height * escala));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function enviarFoto(dataUrl) {
      if (!temApi()) { aviso('Serviço de conta indisponível.', true); return; }
      aviso('');
      // A foto é persistida no backend (PUT /auth/me) e relida de lá. Nada de
      // base64 no localStorage — o backend é a única fonte da verdade.
      Api.put(Api.endpoints.auth.me, { avatarUrl: dataUrl })
        .then(function (user) { mostrarFoto(user && user.avatarUrl); })
        .catch(function (err) { aviso(traduzErro(err), true); });
    }

    function removerFoto() {
      if (!temApi()) { aviso('Serviço de conta indisponível.', true); return; }
      aviso('');
      // Backend remove a foto quando avatarUrl chega como string vazia (null é ignorado).
      Api.put(Api.endpoints.auth.me, { avatarUrl: '' })
        .then(function (user) { mostrarFoto(user && user.avatarUrl); })
        .catch(function (err) { aviso(traduzErro(err), true); });
    }

    // Remove caches antigos da foto que versões anteriores gravavam localmente.
    if (window.Auth && Auth.gravarSessao) Auth.gravarSessao({ avatarUrl: undefined });
    if (window.Store && Store.remover) Store.remover('perfil-foto');

    if (avatarInput) {
      const escolher = function () { avatarInput.click(); };
      if (avatarBtn)    avatarBtn.addEventListener('click', escolher);
      if (avatarUpload) avatarUpload.addEventListener('click', escolher);
      if (avatarRemove) avatarRemove.addEventListener('click', removerFoto);

      avatarInput.addEventListener('change', function () {
        const file = avatarInput.files && avatarInput.files[0];
        avatarInput.value = '';
        if (!file) return;
        if (!/^image\//.test(file.type)) { aviso('Selecione um arquivo de imagem.', true); return; }
        if (file.size > 5 * 1024 * 1024) { aviso('A imagem deve ter no máximo 5 MB.', true); return; }
        redimensionar(file)
          .then(enviarFoto)
          .catch(function (e) { aviso(e.message || 'Não foi possível processar a imagem.', true); });
      });
    }

    const fName    = document.getElementById('pfName');
    const fEmail   = document.getElementById('pfEmail');
    const fCurPwd  = document.getElementById('pfCurrentPwd');
    const fNewPwd  = document.getElementById('pfNewPwd');
    const fConfPwd = document.getElementById('pfConfirmPwd');

    const inputDe = { name: fName, email: fEmail };
    let usuario = { name: '', email: '' };

    function iniciais(nome) {
      if (!nome) return '–';
      const p = nome.trim().split(/\s+/);
      return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
    }

    // Atualiza o estado e os valores exibidos. Campos em edição não são
    // sobrescritos para não descartar o que o usuário está digitando.
    function aplicar(dados) {
      usuario = { name: (dados && dados.name) || '', email: (dados && dados.email) || '' };
      avatarEl.textContent = iniciais(usuario.name);
      if (fName.readOnly)  fName.value  = usuario.name;
      if (fEmail.readOnly) fEmail.value = usuario.email;
    }

    function aviso(texto, erro) {
      msgEl.textContent = texto || '';
      msgEl.hidden = !texto;
      msgEl.classList.toggle('set-profile-edit__msg--error', !!erro);
    }

    function temApi() {
      return !!(window.Api && Api.endpoints && Api.endpoints.auth && Api.endpoints.auth.me);
    }

    function traduzErro(err) {
      const m = (err && (err.message || err.error)) || '';
      if (/already registered/i.test(m)) return 'Este email já está em uso.';
      if (/current password/i.test(m))   return 'Senha atual incorreta.';
      if (/Password must be/i.test(m))    return 'A nova senha deve ter entre 8 e 100 caracteres.';
      return m || 'Não foi possível salvar as alterações.';
    }

    function campoEl(campo) { return document.querySelector('.acc-field[data-field="' + campo + '"]'); }

    /* ----- Campos inline (nome, email): "Editar" destrava o input ----- */
    function editarInline(campo, on) {
      const field = campoEl(campo);
      const input = inputDe[campo];
      input.readOnly = !on;
      field.classList.toggle('is-editing', on);
      field.querySelector('.acc-field__edit').hidden = on;
      field.querySelector('.acc-field__btns').hidden = !on;
      if (on) { input.focus(); input.select(); }
    }

    function cancelarInline(campo) {
      inputDe[campo].value = usuario[campo];
      editarInline(campo, false);
      aviso('');
    }

    /* ----- Senha: formulário expansível ----- */
    const senhaField = campoEl('password');
    const senhaForm  = document.querySelector('.acc-pwd[data-form="password"]');

    function abrirSenha(on) {
      senhaField.hidden = on;
      senhaForm.hidden = !on;
      if (on) { fCurPwd.value = ''; fNewPwd.value = ''; fConfPwd.value = ''; fCurPwd.focus(); }
      aviso('');
    }

    function salvar(campo) {
      if (!temApi()) { aviso('Serviço de conta indisponível.', true); return; }

      let body, btn;
      if (campo === 'name') {
        const nome = Utils.capitalizarNome(fName.value);
        if (!nome) { aviso('Informe seu nome.', true); return; }
        body = { name: nome };
        btn = campoEl('name').querySelector('[data-save="name"]');
      } else if (campo === 'email') {
        const email = fEmail.value.trim();
        if (!email) { aviso('Informe seu email.', true); return; }
        body = { email: email };
        btn = campoEl('email').querySelector('[data-save="email"]');
      } else { // password
        const atual = fCurPwd.value, nova = fNewPwd.value, conf = fConfPwd.value;
        if (!atual) { aviso('Informe a senha atual.', true); return; }
        if (!nova)  { aviso('Informe a nova senha.', true); return; }
        if (nova.length < 8) { aviso('A nova senha deve ter pelo menos 8 caracteres.', true); return; }
        if (conf !== nova)   { aviso('A confirmação não corresponde à nova senha.', true); return; }
        body = { currentPassword: atual, newPassword: nova };
        btn = senhaForm.querySelector('button[type="submit"]');
      }

      if (btn) btn.disabled = true;
      aviso('');
      Api.put(Api.endpoints.auth.me, body)
        .then(function (user) {
          if (window.Auth) Auth.gravarSessao({ name: user.name, email: user.email });
          if (campo === 'password') {
            aplicar(user);
            abrirSenha(false);
          } else {
            editarInline(campo, false);
            aplicar(user);
          }
        })
        .catch(function (err) { aviso(traduzErro(err), true); })
        .then(function () { if (btn) btn.disabled = false; });
    }

    // Render imediato com a sessão e, em seguida, dados reais do backend.
    const sessao = window.Auth && Auth.lerSessao();
    aplicar(sessao);
    if (temApi() && sessao && sessao.accessToken) {
      Api.get(Api.endpoints.auth.me)
        .then(function (user) {
          if (!user) return;
          if (window.Auth) Auth.gravarSessao({ name: user.name, email: user.email });
          aplicar(user);
          mostrarFoto(user.avatarUrl);
        })
        .catch(function () { /* mantém o que já está na tela */ });
    }

    // Editar (destrava inline ou abre o form de senha)
    document.querySelectorAll('.acc-field [data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        const campo = b.dataset.edit;
        if (campo === 'password') abrirSenha(true);
        else editarInline(campo, true);
      });
    });
    // Cancelar
    document.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', function () {
        const campo = b.dataset.cancel;
        if (campo === 'password') abrirSenha(false);
        else cancelarInline(campo);
      });
    });
    // Salvar (nome/email via botão)
    document.querySelectorAll('[data-save]').forEach(function (b) {
      b.addEventListener('click', function () { salvar(b.dataset.save); });
    });
    // Atalhos no input inline: Enter salva, Esc cancela
    ['name', 'email'].forEach(function (campo) {
      inputDe[campo].addEventListener('keydown', function (e) {
        if (e.key === 'Enter')      { e.preventDefault(); salvar(campo); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelarInline(campo); }
      });
    });
    // Salvar senha via submit do formulário
    senhaForm.addEventListener('submit', function (e) { e.preventDefault(); salvar('password'); });
  })();

  /* ---------- Tema (segmented, persistente) ---------- */
  const seg = document.getElementById('themeSeg');
  function temaAtual() {
    const salvo = Store.lerTema();
    return salvo || 'system';
  }
  function marcarSeg() {
    const atual = temaAtual();
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.theme === atual));
  }
  function aplicar(tema) {
    if (tema === 'dark') raiz.setAttribute('data-theme', 'dark');
    else if (tema === 'light') raiz.removeAttribute('data-theme');
    else { // system
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      dark ? raiz.setAttribute('data-theme', 'dark') : raiz.removeAttribute('data-theme');
    }
  }
  seg.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const t = b.dataset.theme;
      if (t === 'system') Store.remover('tema');
      else Store.gravarTema(t);
      aplicar(t);
      marcarSeg();
    });
  });
  marcarSeg();

  /* ---------- Início da semana (segmented, persistente) ---------- */
  const semSeg = document.getElementById('weekStartSeg');
  if (semSeg) {
    const marcarSemana = () => {
      const atual = Store.ler('inicio-semana', 'seg');
      semSeg.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.start === atual));
    };
    semSeg.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        Store.gravar('inicio-semana', b.dataset.start);
        marcarSemana();
      });
    });
    marcarSemana();
  }

  /* ---------- Categorias (backend: task-service /categories) ---------- */
  // Mesma fonte de dados da sidebar — criar/excluir aqui reflete lá no próximo
  // carregamento. "Genérico" é a categoria padrão de todo usuário: aparece
  // sempre, no topo, e não pode ser excluída.
  const DEL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const GENERICO = { nome: 'Genérico', cor: 'var(--color-cat-generico)' };

  // Mesma paleta da janela "Nova categoria" (sidebar) e da criação abaixo.
  const CORES = [
    'var(--color-cat-teal)',
    'var(--color-cat-rust)',
    'var(--color-cat-green)',
    'var(--color-cat-sage)',
    'var(--color-cat-purple)',
    'var(--color-cat-pink)',
    'var(--color-cat-blue)',
    'var(--color-cat-terracotta)',
    'var(--color-cat-plum)',
  ];

  let categorias = [];                       // backend: { id, name, color }
  let corSel = 'var(--color-cat-estudos)';

  const lista  = document.getElementById('catList');
  const input  = document.getElementById('catInput');
  const addBtn = document.getElementById('catAddBtn');

  // Mensagem de status logo abaixo da linha de adicionar.
  const msg = document.createElement('div');
  msg.className = 'cat-msg';
  msg.hidden = true;
  if (lista && lista.closest('.card')) lista.closest('.card').appendChild(msg);
  function aviso(texto, erro) {
    msg.textContent = texto || '';
    msg.hidden = !texto;
    msg.classList.toggle('cat-msg--error', !!erro);
  }

  function temApi() { return !!(window.Api && Api.endpoints && Api.endpoints.categories); }

  // Avisa a sidebar (mesma página) que a lista de categorias mudou, para que ela
  // rebusque no backend e repinte — sem precisar recarregar a página.
  function notificarCategorias() {
    if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('categorias:atualizadas'));
  }

  // Conta tarefas por nome de categoria (mesma associação por nome da sidebar).
  function contarTarefas() {
    const tarefas = window.Tarefas ? Tarefas.listar() : [];
    const mapa = {};
    tarefas.forEach(t => {
      const nome = t.cat || GENERICO.nome;
      mapa[nome] = (mapa[nome] || 0) + 1;
    });
    return mapa;
  }

  function rowHtml(nome, cor, count, opts) {
    opts = opts || {};
    const acao = opts.removivel
      ? `<button class="cat-row__edit" aria-label="Editar nome da categoria">${EDIT_ICON}</button>` +
        `<button class="cat-row__del" aria-label="Excluir categoria">${DEL_ICON}</button>`
      : `<span class="cat-row__tag">padrão</span>`;
    return `
      <div class="cat-row"${opts.id ? ` data-id="${esc(opts.id)}"` : ''} data-count="${count}">
        <span class="cat-row__dot" style="background:${esc(cor)}"></span>
        <span class="cat-row__name">${esc(nome)}</span>
        <span class="cat-row__count">${count} ${count === 1 ? 'tarefa' : 'tarefas'}</span>
        ${acao}
      </div>`;
  }

  function pintar() {
    const cont = contarTarefas();
    let html = rowHtml(GENERICO.nome, GENERICO.cor, cont[GENERICO.nome] || 0, { removivel: false });
    html += categorias
      .filter(c => c.name !== GENERICO.nome)
      .map(c => rowHtml(c.name, c.color || GENERICO.cor, cont[c.name] || 0, { removivel: true, id: c.id }))
      .join('');
    lista.innerHTML = html;
    lista.querySelectorAll('.cat-row__del').forEach(btn => {
      const row = btn.closest('.cat-row');
      btn.addEventListener('click', () => excluir(
        row.dataset.id,
        row.querySelector('.cat-row__name').textContent,
        Number(row.dataset.count) || 0
      ));
    });
    lista.querySelectorAll('.cat-row__edit').forEach(btn => {
      const row = btn.closest('.cat-row');
      btn.addEventListener('click', () => editar(
        row.dataset.id,
        row.querySelector('.cat-row__name').textContent
      ));
    });
  }

  function carregar() {
    const pCats = temApi() ? Api.get(Api.endpoints.categories.list).catch(() => []) : Promise.resolve([]);
    const pTasks = (window.Tarefas && Tarefas.carregarDaApi)
      ? Tarefas.carregarDaApi().catch(() => null)
      : Promise.resolve(null);
    return Promise.all([pCats, pTasks]).then(([cats]) => {
      categorias = Array.isArray(cats) ? cats : [];
      pintar();
    });
  }

  function adicionar() {
    const nome = input.value.trim();
    if (!nome) return;
    if (!temApi()) { aviso('Serviço de categorias indisponível.', true); return; }

    addBtn.disabled = true;
    aviso('');
    Api.post(Api.endpoints.categories.create, { name: nome, color: corSel })
      .then(() => { input.value = ''; notificarCategorias(); return carregar(); })
      .catch(err => aviso((err && (err.message || err.error)) || 'Não foi possível criar a categoria.', true))
      .then(() => { addBtn.disabled = false; });
  }

  // Confirma antes de excluir, avisando quantas tarefas serão movidas para
  // "Genérico". Só então chama o backend (DELETE /categories/{id}), que zera o
  // category_id dessas tarefas; o cache local é espelhado por moverParaGenerico.
  function excluir(id, nome, count) {
    if (!id || !temApi()) return;
    confirmarExclusao(nome, count, function () {
      aviso('');
      Api.remove(Api.endpoints.categories.remove(id))
        .then(() => {
          if (window.Tarefas && Tarefas.moverParaGenerico) Tarefas.moverParaGenerico(nome);
          notificarCategorias();
          return carregar();
        })
        .catch(err => aviso((err && (err.message || err.error)) || 'Não foi possível excluir a categoria.', true));
    });
  }

  // Modal de confirmação (reaproveita os estilos .cat-modal da sidebar).
  let onConfirmar = null;
  function confirmarExclusao(nome, count, onSim) {
    let modal = document.getElementById('catDelModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'cat-modal';
      modal.id = 'catDelModal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="cat-modal__backdrop" data-close></div>
        <div class="cat-modal__card" role="dialog" aria-modal="true" aria-label="Excluir categoria">
          <div class="cat-modal__head">
            <h3 class="cat-modal__title">Excluir categoria</h3>
          </div>
          <p class="cat-del__text" id="catDelText"></p>
          <div class="cat-modal__actions">
            <button class="btn btn--secondary btn--sm" type="button" data-close>Cancelar</button>
            <button class="btn btn--danger btn--sm" type="button" id="catDelConfirm">Excluir</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      const fechar = () => { modal.hidden = true; onConfirmar = null; };
      modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', fechar));
      modal.querySelector('#catDelConfirm').addEventListener('click', () => {
        const cb = onConfirmar; fechar(); if (cb) cb();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) fechar();
      });
    }

    const n = Number(count) || 0;
    modal.querySelector('#catDelText').innerHTML = n > 0
      ? `A categoria <strong>${esc(nome)}</strong> possui <strong>${n} ${n === 1 ? 'tarefa' : 'tarefas'}</strong>. ` +
        `Ao excluir, ${n === 1 ? 'ela será movida' : 'elas serão movidas'} para <strong>Genérico</strong>. Deseja excluir mesmo assim?`
      : `Deseja excluir a categoria <strong>${esc(nome)}</strong>?`;

    onConfirmar = onSim;
    modal.hidden = false;
    modal.querySelector('#catDelConfirm').focus();
  }

  // Edição de uma categoria. Abre a MESMA janela da criação ("Nova categoria"):
  // paleta de cores + nome. Ao salvar, chama o backend (PUT /categories/{id})
  // com o novo nome e a nova cor; as tarefas locais são reassociadas do nome
  // antigo para o novo e a sidebar é notificada para repintar.
  let modalEdit = null;
  let corEdit = CORES[0];
  function editar(id, nomeAtual) {
    if (!id || !temApi()) return;

    if (!modalEdit) {
      modalEdit = document.createElement('div');
      modalEdit.className = 'cat-modal';
      modalEdit.id = 'catEditModal';
      modalEdit.hidden = true;
      modalEdit.innerHTML = `
        <div class="cat-modal__backdrop" data-close></div>
        <div class="cat-modal__card" role="dialog" aria-modal="true" aria-label="Editar categoria">
          <div class="cat-modal__head">
            <h3 class="cat-modal__title">Editar categoria</h3>
          </div>
          <span class="cat-modal__label">Cor</span>
          <div class="cat-modal__colors" id="catEditColors">
            ${CORES.map(cor => `<span class="cat-modal__swatch" style="background:${cor}" data-color="${cor}" role="button" tabindex="0" aria-label="Selecionar cor"></span>`).join('')}
          </div>
          <label class="cat-modal__label" for="catEditInput">Nome da categoria</label>
          <input class="cat-modal__input" id="catEditInput" autocomplete="off" maxlength="60">
          <div class="cat-modal__error" id="catEditErr" hidden></div>
          <div class="cat-modal__actions">
            <button class="btn btn--secondary btn--sm" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary btn--sm" type="button" id="catEditConfirm">Salvar</button>
          </div>
        </div>`;
      document.body.appendChild(modalEdit);

      const fechar = () => { modalEdit.hidden = true; };
      modalEdit.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', fechar));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalEdit.hidden) fechar(); });
      modalEdit.querySelector('#catEditInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); modalEdit.querySelector('#catEditConfirm').click(); }
      });
      modalEdit.querySelectorAll('#catEditColors .cat-modal__swatch').forEach(sw => {
        sw.addEventListener('click', () => {
          modalEdit.querySelectorAll('#catEditColors .cat-modal__swatch').forEach(s => s.classList.remove('is-sel'));
          sw.classList.add('is-sel');
          corEdit = sw.dataset.color;
        });
      });
      modalEdit.querySelector('#catEditConfirm').addEventListener('click', () => salvarEdicao());
    }

    const campo   = modalEdit.querySelector('#catEditInput');
    const erro    = modalEdit.querySelector('#catEditErr');
    erro.hidden = true;
    campo.value = nomeAtual;
    modalEdit.dataset.id = id;
    modalEdit.dataset.nomeAtual = nomeAtual;

    // Pré-seleciona a cor atual da categoria (ou a 1ª da paleta se não estiver nela).
    const atual = categorias.find(c => c.id === id);
    corEdit = (atual && atual.color) || CORES[0];
    modalEdit.dataset.corAtual = corEdit;
    const swatches = modalEdit.querySelectorAll('#catEditColors .cat-modal__swatch');
    let achou = false;
    swatches.forEach(sw => {
      const sel = sw.dataset.color === corEdit;
      sw.classList.toggle('is-sel', sel);
      if (sel) achou = true;
    });
    if (!achou && swatches[0]) { swatches[0].classList.add('is-sel'); corEdit = swatches[0].dataset.color; }

    modalEdit.hidden = false;
    campo.focus();
    campo.select();
  }

  function salvarEdicao() {
    const id        = modalEdit.dataset.id;
    const nomeAntigo = modalEdit.dataset.nomeAtual;
    const corAntiga  = modalEdit.dataset.corAtual;
    const campo     = modalEdit.querySelector('#catEditInput');
    const erro      = modalEdit.querySelector('#catEditErr');
    const confirm   = modalEdit.querySelector('#catEditConfirm');
    const nome      = campo.value.trim();

    const mostrarErro = (t) => { erro.textContent = t; erro.hidden = false; };

    if (!nome) { mostrarErro('Informe o nome da categoria.'); return; }
    if (nome === GENERICO.nome) { mostrarErro('Este nome é reservado à categoria padrão.'); return; }
    // Nada mudou (nome e cor iguais): fecha sem chamar o backend.
    if (nome === nomeAntigo && corEdit === corAntiga) { modalEdit.hidden = true; return; }

    confirm.disabled = true;
    erro.hidden = true;
    Api.put(Api.endpoints.categories.update(id), { name: nome, color: corEdit })
      .then(() => {
        if (nome !== nomeAntigo && window.Tarefas && Tarefas.renomearCategoria) Tarefas.renomearCategoria(nomeAntigo, nome);
        modalEdit.hidden = true;
        notificarCategorias();
        return carregar();
      })
      .catch(err => mostrarErro((err && (err.message || err.error)) || 'Não foi possível salvar a categoria.'))
      .then(() => { confirm.disabled = false; });
  }

  document.getElementById('catColors').querySelectorAll('.cat-add__swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.cat-add__swatch').forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      corSel = sw.dataset.color;
    });
  });
  addBtn.addEventListener('click', adicionar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') adicionar(); });

  carregar();

  /* ---------- Excluir conta ---------- */
  // Ação irreversível: exige digitar "EXCLUIR", chama DELETE /auth/me, limpa a
  // sessão local e volta para o login.
  (function () {
    const btn = document.getElementById('deleteAccountBtn');
    if (!btn) return;

    let modal = null;
    function construir() {
      modal = document.createElement('div');
      modal.className = 'cat-modal';
      modal.id = 'accDelModal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="cat-modal__backdrop" data-close></div>
        <div class="cat-modal__card" role="dialog" aria-modal="true" aria-label="Excluir conta">
          <div class="cat-modal__head">
            <h3 class="cat-modal__title">Excluir conta</h3>
          </div>
          <p class="cat-del__text">Esta ação é <strong>permanente</strong> e remove sua conta e seus dados de acesso. Não é possível desfazer.</p>
          <p class="cat-del__text">Para confirmar, digite <strong>EXCLUIR</strong> abaixo.</p>
          <input class="cat-modal__input" id="accDelInput" placeholder="EXCLUIR" autocomplete="off">
          <div class="cat-modal__error" id="accDelErr" hidden></div>
          <div class="cat-modal__actions">
            <button class="btn btn--secondary btn--sm" type="button" data-close>Cancelar</button>
            <button class="btn btn--danger btn--sm" type="button" id="accDelConfirm" disabled>Excluir conta</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const campo   = modal.querySelector('#accDelInput');
      const confirm = modal.querySelector('#accDelConfirm');
      const erro    = modal.querySelector('#accDelErr');

      const fechar = () => { modal.hidden = true; campo.value = ''; confirm.disabled = true; erro.hidden = true; };
      modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', fechar));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) fechar(); });

      campo.addEventListener('input', () => {
        confirm.disabled = campo.value.trim().toUpperCase() !== 'EXCLUIR';
      });

      confirm.addEventListener('click', () => {
        confirm.disabled = true;
        confirm.textContent = 'Excluindo…';
        erro.hidden = true;
        Api.remove(Api.endpoints.auth.me)
          .then(() => {
            Auth.limparSessao();
            window.location.href = 'login.html';
          })
          .catch((e) => {
            confirm.textContent = 'Excluir conta';
            confirm.disabled = false;
            erro.textContent = (e && (e.error || e.message)) || 'Não foi possível excluir a conta. Tente novamente.';
            erro.hidden = false;
          });
      });
    }

    btn.addEventListener('click', () => {
      if (!modal) construir();
      modal.hidden = false;
      modal.querySelector('#accDelInput').focus();
    });
  })();
})();
