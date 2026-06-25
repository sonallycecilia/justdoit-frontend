/* ============================================================
   JustDoIt — components/sidebar.js
   Renderiza a navegação lateral compartilhada e cuida do tema.
   Use: <aside data-sidebar data-active="dashboard"></aside>
   ============================================================ */
(function () {
  'use strict';

  const MARK = '<svg width="22" height="22" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M33 7 L46.5 21 L39.6 21 L39.6 36.4 C39.6 44.2 34.6 48.9 27 48.3 C19.8 47.7 15.3 42.6 15.9 37.5 C16.3 33.9 18.9 31.9 21.9 32.5 C24.4 33 25.6 35.4 24.2 37.4 C23.2 38.8 21.4 38.7 20.6 37.6 M33 7 L19.5 21 L26.4 21 L26.4 36.4 C26.4 40 28.8 42.3 32.2 42.3"/></svg>';

  function ic(paths) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }
  const ICONS = {
    dashboard:   ic('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
    calendar:    ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    todo:        ic('<path d="M11 12H3M16 6H3M21 18H3"/><path d="m15 9 2 2 4-4"/>'),
    analytics:   ic('<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="13" y="6" width="3" height="11"/>'),
    settings:    ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14H3.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.6h.1A1.65 1.65 0 0 0 11.4 3.6V3.5a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1.82 1.17 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>'),
    moon:        ic('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
    chevron:     ic('<path d="m6 9 6 6 6-6"/>'),
    chevronLeft: ic('<path d="m15 6-6 6 6 6"/>'),
    plus:        ic('<path d="M12 5v14M5 12h14"/>'),
    close:       ic('<path d="M18 6 6 18M6 6l12 12"/>'),
    search:      ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'),
    gripDots:    ic('<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>'),
    logout:      ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
  };

  // Compute path prefix based on how deep the current page sits under the project root.
  // Pages at pages/<feature>/page.html need ../../; pages/settings.html needs ../
  var BASE = (function () {
    var p = window.location.pathname.replace(/\\/g, '/');
    var m = p.match(/\/pages\/([^/]+\/)[^/]+\.html/);
    return m ? '../../' : '../';
  })();

  const NAV = [
    { id: 'dashboard', label: 'Visão geral', href: BASE + 'pages/dashboard/dashboard.html' },
    { id: 'calendar',  label: 'Calendário',  href: BASE + 'pages/tasks/calendar.html' },
    { id: 'todo',      label: 'To Do',        href: BASE + 'pages/tasks/todo.html' },
    { id: 'analytics', label: 'Análise',      href: BASE + 'pages/dashboard/analytics.html' },
  ];

  // Registry allows drag handlers to access full task objects by id
  const taskRegistry = new Map();

  function carregarTarefas() {
    return window.Tarefas ? Tarefas.listar() : [];
  }

  // Contadores dos badges da navegação, a partir das tarefas reais:
  // Calendário → pendentes com data agendada; To Do → todas as pendentes.
  function contarNav(tarefas) {
    const pendentes = (tarefas || []).filter(t => !t.done);
    return {
      calendar: pendentes.filter(t => t.dataIso).length,
      todo:     pendentes.length,
    };
  }

  // Atualiza os badges já renderizados com a contagem das tarefas informadas.
  function atualizarNavCounts(mount, tarefas) {
    const c = contarNav(tarefas);
    mount.querySelectorAll('.nav-item__count[data-nav-count]').forEach(el => {
      const id = el.getAttribute('data-nav-count');
      if (c[id] != null) el.textContent = c[id];
    });
  }

  // "Genérico" é a categoria padrão de todo usuário: aparece sempre, no topo,
  // e não é armazenada no backend (igual a settings.html).
  const GENERICO = { id: 'generico', nome: 'Genérico', cor: 'var(--color-cat-generico)' };

  // Busca as categorias do usuário no backend (task-service: GET /categories)
  // e garante "Genérico" no topo. Sem outras categorias → só "Genérico".
  function carregarCategorias() {
    if (!(window.Api && Api.endpoints.categories)) return Promise.resolve([GENERICO]);
    return Api.get(Api.endpoints.categories.list).then(function (cats) {
      var resto = (Array.isArray(cats) ? cats : []).map(function (c) {
        return {
          id:   c.id,
          nome: c.name,
          cor:  c.color || 'var(--color-cat-generico)',
        };
      }).filter(function (c) { return c.nome !== GENERICO.nome; });
      return [GENERICO].concat(resto);
    }).catch(function () { return [GENERICO]; });
  }

  // Iniciais a partir do nome completo (ex.: "Ana Silva" → "AS")
  function iniciais(nome) {
    if (!nome) return '–';
    var partes = nome.trim().split(/\s+/);
    var ini = partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '');
    return ini.toUpperCase();
  }

  // Preenche nome + avatar com os dados da sessão e, se possível, busca os
  // dados atualizados do usuário no backend (auth/me).
  function preencherUsuario(mount) {
    const nameEl   = mount.querySelector('#userName');
    const avatarEl = mount.querySelector('#userAvatar');
    const avatarImgEl = mount.querySelector('#userAvatarImg');
    if (!nameEl || !avatarEl) return;

    function aplicar(dados) {
      const nome = (dados && dados.name) || '';
      nameEl.textContent   = nome || 'Usuário';
      avatarEl.textContent = iniciais(nome);
      if (avatarImgEl) {
        const url = dados && dados.avatarUrl;
        if (url) { avatarImgEl.src = url; avatarImgEl.hidden = false; }
        else     { avatarImgEl.removeAttribute('src'); avatarImgEl.hidden = true; }
      }
    }

    // Render imediato com o que já temos em sessão
    const sessao = window.Auth && Auth.lerSessao();
    aplicar(sessao);

    // Atualiza com os dados reais do backend (e salva na sessão)
    if (window.Api && sessao && sessao.accessToken) {
      Api.get(Api.endpoints.auth.me).then(function (user) {
        if (!user) return;
        if (window.Auth) Auth.gravarSessao({ name: user.name, email: user.email });
        aplicar(user);
      }).catch(function () { /* mantém o que já está na tela */ });
    }
  }

  function renderCatTarefas(catNome, busca, allTarefas) {
    const todas = (allTarefas || carregarTarefas()).filter(t => !t.done && t.cat === catNome);
    const lista = busca
      ? todas.filter(t => t.titulo.toLowerCase().includes(busca.toLowerCase()))
      : todas;

    if (!lista.length) {
      return `<div class="sidebar-cat__empty">${busca ? 'Nenhum resultado' : 'Nenhuma tarefa pendente'}</div>`;
    }

    return lista.map(t => {
      taskRegistry.set(t.id, t);
      const prio = t.prioridade || 'normal';
      return `
        <a class="sidebar-task" href="${BASE}pages/tasks/task-detail.html?id=${t.id}" draggable="true" data-task-id="${t.id}" title="${t.titulo}">
          <span class="sidebar-task__grip">${ICONS.gripDots}</span>
          <span class="sidebar-task__prio sidebar-task__prio--${prio}"></span>
          <span class="sidebar-task__titulo">${t.titulo}</span>
          <span class="sidebar-task__data">${t.data || ''}</span>
        </a>`;
    }).join('');
  }

  // HTML de uma categoria (cabeçalho + lista de tarefas pendentes).
  function catHtml(c, allTarefas) {
    const pendentes = allTarefas.filter(t => !t.done && t.cat === c.nome);
    return `
      <div class="sidebar-cat" data-cat="${c.nome}">
        <button class="sidebar-cat__header" aria-expanded="false" aria-label="Expandir ${c.nome}">
          <span class="cat-dot" style="background:${c.cor}"></span>
          <span class="nav-item__label">${c.nome}</span>
          <span class="nav-item__count">${pendentes.length}</span>
          <span class="sidebar-cat__chevron">${ICONS.chevron}</span>
        </button>
        <div class="sidebar-cat__tasks hidden" data-cat-tasks="${c.nome}">
          ${renderCatTarefas(c.nome, '', allTarefas)}
        </div>
      </div>`;
  }

  // Liga o expandir/recolher de uma categoria.
  function wireCatExpand(catEl) {
    const header  = catEl.querySelector('.sidebar-cat__header');
    const tasksEl = catEl.querySelector('.sidebar-cat__tasks');
    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      tasksEl.classList.toggle('hidden', expanded);
    });
  }

  function wireTaskDrag(container) {
    container.querySelectorAll('.sidebar-task[draggable="true"]').forEach(el => {
      el.addEventListener('dragstart', e => {
        const task = taskRegistry.get(el.getAttribute('data-task-id'));
        if (!task) return;
        e.dataTransfer.setData('application/jdi-task', JSON.stringify(task));
        e.dataTransfer.effectAllowed = 'copy';
        el.classList.add('is-dragging');
        // Prevent the browser from dragging the link URL
        e.dataTransfer.clearData('text/uri-list');
      });
      el.addEventListener('dragend', () => el.classList.remove('is-dragging'));
    });
  }

  // Modal "Nova categoria" — janelinha flutuante (não é uma página).
  // Espelha a seção de criar categoria de settings.html: paleta de cores +
  // nome, criando a categoria de verdade no backend (POST /categories).
  function wireNovaCategoria(mount, onCreated) {
    const abrir = mount.querySelector('#catAddOpen');
    if (!abrir) return;

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

    let modal = document.getElementById('catModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'cat-modal';
      modal.id = 'catModal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="cat-modal__backdrop" data-close></div>
        <div class="cat-modal__card" role="dialog" aria-modal="true" aria-label="Nova categoria">
          <div class="cat-modal__head">
            <h3 class="cat-modal__title">Nova categoria</h3>
            <button class="cat-modal__close" type="button" data-close aria-label="Fechar">${ICONS.close}</button>
          </div>
          <span class="cat-modal__label">Cor</span>
          <div class="cat-modal__colors">
            ${CORES.map((cor, i) => `<span class="cat-modal__swatch ${i === 0 ? 'is-sel' : ''}" style="background:${cor}" data-color="${cor}" role="button" tabindex="0" aria-label="Selecionar cor"></span>`).join('')}
          </div>
          <input class="cat-modal__input" id="catModalInput" type="text" placeholder="Nome da categoria…" autocomplete="off" maxlength="40">
          <div class="cat-modal__error" id="catModalError" hidden></div>
          <div class="cat-modal__actions">
            <button class="btn btn--secondary btn--sm" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary btn--sm" id="catModalAdd" type="button">Adicionar</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    const input    = modal.querySelector('#catModalInput');
    const erroEl   = modal.querySelector('#catModalError');
    const addBtn   = modal.querySelector('#catModalAdd');
    const swatches = modal.querySelectorAll('.cat-modal__swatch');
    let corSel = CORES[0];

    function mostrarErro(msg) {
      erroEl.textContent = msg || '';
      erroEl.hidden = !msg;
    }
    function fechar() {
      modal.hidden = true;
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') fechar(); }
    function abrirModal() {
      mostrarErro('');
      input.value = '';
      corSel = CORES[0];
      swatches.forEach((s, i) => s.classList.toggle('is-sel', i === 0));
      addBtn.disabled = false;
      modal.hidden = false;
      document.addEventListener('keydown', onKey);
      input.focus();
    }

    function salvar() {
      const nome = input.value.trim();
      if (!nome) { mostrarErro('Dê um nome à categoria.'); input.focus(); return; }
      if (!(window.Api && Api.endpoints.categories)) { mostrarErro('Serviço indisponível.'); return; }

      addBtn.disabled = true;
      mostrarErro('');
      Api.post(Api.endpoints.categories.create, { name: nome, color: corSel })
        .then(() => { fechar(); if (onCreated) onCreated(); })
        .catch(err => {
          addBtn.disabled = false;
          mostrarErro((err && (err.message || err.error)) || 'Não foi possível criar a categoria.');
        });
    }

    abrir.addEventListener('click', abrirModal);
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', fechar));
    swatches.forEach(sw => sw.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      corSel = sw.getAttribute('data-color');
    }));
    addBtn.addEventListener('click', salvar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') salvar(); });
  }

  function render(mount) {
    const active = mount.getAttribute('data-active') || 'dashboard';

    const counts = contarNav(carregarTarefas());
    const navHtml = NAV.map(n => `
      <a class="nav-item ${n.id === active ? 'is-active' : ''}" href="${n.href}">
        <span class="nav-item__ic">${ICONS[n.id]}</span>
        <span class="nav-item__label">${n.label}</span>
        ${counts[n.id] != null ? `<span class="nav-item__count" data-nav-count="${n.id}">${counts[n.id]}</span>` : ''}
      </a>`).join('');

    taskRegistry.clear();

    mount.className = 'sidebar';
    mount.innerHTML = `
      <div class="sidebar__brand">
        <a class="sidebar__mark" href="${BASE}pages/dashboard/dashboard.html" aria-label="Ir para o dashboard">${MARK}</a>
        <span class="sidebar__word">JustDoIt</span>
        <button class="sidebar__collapse" id="sidebarCollapse" aria-label="Recolher menu">${ICONS.chevronLeft}</button>
      </div>
      <div class="sidebar__scroll">
        <nav class="sidebar__nav">${navHtml}</nav>
        <div class="sidebar__section">
          <span>Categorias</span>
          <div class="sidebar__section-actions">
            <button class="sidebar__cat-toggle" id="catAddOpen" aria-label="Nova categoria">${ICONS.plus}</button>
            <button class="sidebar__cat-toggle" id="catToggle" aria-label="Ocultar categorias" aria-expanded="true">${ICONS.chevron}</button>
          </div>
        </div>
        <div id="catSection">
          <div class="sidebar__search">
            <span class="sidebar__search-ic">${ICONS.search}</span>
            <input class="sidebar__search-input" id="taskSearch" type="text" placeholder="Buscar tarefas…" aria-label="Buscar tarefas" autocomplete="off">
          </div>
          <nav class="sidebar__nav sidebar__nav--cats" id="catNav"><div class="sidebar-cat__empty">Carregando categorias…</div></nav>
        </div>
      </div>
      <div class="sidebar__foot">
        <span class="sidebar__avatar">
          <span class="sidebar__avatar-initials" id="userAvatar">–</span>
          <img class="sidebar__avatar-img" id="userAvatarImg" alt="" hidden>
        </span>
        <div class="sidebar__user">
          <div class="sidebar__name" id="userName">Carregando…</div>
          <button class="sidebar__logout" id="logoutBtn" type="button" aria-label="Sair">
            <span class="sidebar__logout-ic">${ICONS.logout}</span>
            <span class="sidebar__logout-label">Sair</span>
          </button>
        </div>
        <div class="sidebar__actions">
          <a class="btn-icon" href="${BASE}pages/auth/settings.html" aria-label="Configurações">${ICONS.settings}</a>
          <button class="btn-icon" id="themeToggle" aria-label="Alternar tema">${ICONS.moon}</button>
        </div>
      </div>
      <div class="sidebar__resizer" id="sidebarResizer"></div>`;

    // ── Categorias + contadores (dados reais do backend) ────────
    const catNav = mount.querySelector('#catNav');

    function pintarCategorias(cats) {
      const allTarefas = carregarTarefas();
      taskRegistry.clear();
      if (!cats.length) {
        catNav.innerHTML = '<div class="sidebar-cat__empty">Nenhuma categoria ainda</div>';
        return;
      }
      catNav.innerHTML = cats.map(c => catHtml(c, allTarefas)).join('');
      catNav.querySelectorAll('.sidebar-cat').forEach(wireCatExpand);
      catNav.querySelectorAll('.sidebar-cat__tasks').forEach(wireTaskDrag);
    }

    const tarefasPromise = (window.Tarefas && Tarefas.carregarDaApi)
      ? Tarefas.carregarDaApi().catch(() => carregarTarefas())
      : Promise.resolve(carregarTarefas());

    Promise.all([carregarCategorias(), tarefasPromise]).then(([cats, allTarefas]) => {
      atualizarNavCounts(mount, allTarefas);
      pintarCategorias(cats);
    });

    // Outra parte da UI mudou a lista (Tarefas.toggleDone) → atualiza badges e
    // tarefas pendentes nas categorias JÁ renderizadas, lendo o cache local.
    // Não repintamos a lista de categorias (isso apagaria "Genérico" enquanto
    // elas ainda não foram buscadas); só atualizamos o conteúdo de cada uma.
    window.addEventListener('tarefas:atualizadas', () => {
      const allTarefas = carregarTarefas();
      atualizarNavCounts(mount, allTarefas);
      const busca = searchInput ? searchInput.value.trim() : '';
      mount.querySelectorAll('.sidebar-cat').forEach(catEl => {
        const catNome = catEl.getAttribute('data-cat');
        const countEl = catEl.querySelector('.sidebar-cat__header .nav-item__count');
        const tasksEl = catEl.querySelector('.sidebar-cat__tasks');
        if (countEl) countEl.textContent = allTarefas.filter(t => !t.done && t.cat === catNome).length;
        tasksEl.innerHTML = renderCatTarefas(catNome, busca, allTarefas);
        wireTaskDrag(tasksEl);
      });
    });

    // A lista de categorias mudou em outra parte da UI (ex.: settings.html criou
    // ou excluiu uma categoria). Aqui SIM repintamos a lista inteira, buscando de
    // novo no backend — ao contrário de 'tarefas:atualizadas', que só atualiza
    // contadores/tarefas das categorias já renderizadas.
    window.addEventListener('categorias:atualizadas', () => {
      carregarCategorias().then(pintarCategorias);
    });

    // ── Modal "Nova categoria" ──────────────────────────────────
    wireNovaCategoria(mount, function () {
      carregarCategorias().then(pintarCategorias);
    });

    // ── Task search ─────────────────────────────────────────────
    const searchInput = mount.querySelector('#taskSearch');
    searchInput.addEventListener('input', () => {
      const busca = searchInput.value.trim();
      mount.querySelectorAll('.sidebar-cat').forEach(catEl => {
        const catNome = catEl.getAttribute('data-cat');
        const tasksEl = catEl.querySelector('.sidebar-cat__tasks');
        tasksEl.innerHTML = renderCatTarefas(catNome, busca);
        wireTaskDrag(tasksEl);
        if (busca) {
          catEl.querySelector('.sidebar-cat__header').setAttribute('aria-expanded', 'true');
          tasksEl.classList.remove('hidden');
        }
      });
    });

    // ── Hide / show full categories section ─────────────────────
    const catSection = mount.querySelector('#catSection');
    const catToggle  = mount.querySelector('#catToggle');
    catToggle.addEventListener('click', () => {
      const oculto = catSection.classList.toggle('hidden');
      catToggle.setAttribute('aria-expanded', String(!oculto));
    });

    // ── Theme (persistent) ──────────────────────────────────────
    const raiz   = document.documentElement;
    const btnTema = mount.querySelector('#themeToggle');
    btnTema.addEventListener('click', () => {
      const dark = raiz.getAttribute('data-theme') === 'dark';
      const novo  = dark ? 'light' : 'dark';
      if (novo === 'dark') raiz.setAttribute('data-theme', 'dark');
      else raiz.removeAttribute('data-theme');
      if (window.Storage) Storage.gravarTema(novo);
    });

    // ── Logout ──────────────────────────────────────────────────
    const btnSair = mount.querySelector('#logoutBtn');
    btnSair.addEventListener('click', () => {
      if (window.Auth && Auth.logout) Auth.logout(BASE + 'pages/auth/login.html');
      else window.location.href = BASE + 'pages/auth/login.html';
    });

    // ── Dados do usuário (nome + avatar) ────────────────────────
    preencherUsuario(mount);

    // ── Restore saved sidebar width ─────────────────────────────
    const larguraSalva = localStorage.getItem('jdi-sidebar-width');
    if (larguraSalva) mount.style.width = larguraSalva;

    // ── Collapse sidebar ────────────────────────────────────────
    const collapseBtn = mount.querySelector('#sidebarCollapse');
    if (localStorage.getItem('jdi-sidebar-collapsed') === 'true') {
      mount.classList.add('sidebar--collapsed');
      collapseBtn.setAttribute('aria-label', 'Expandir menu');
    }
    collapseBtn.addEventListener('click', () => {
      const collapsed = mount.classList.toggle('sidebar--collapsed');
      collapseBtn.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');
      localStorage.setItem('jdi-sidebar-collapsed', String(collapsed));
    });

    // ── Resize sidebar ──────────────────────────────────────────
    const resizer = mount.querySelector('#sidebarResizer');
    let isResizing = false, startX = 0, startW = 0;

    resizer.addEventListener('mousedown', e => {
      isResizing = true;
      startX = e.clientX;
      startW = mount.offsetWidth;
      resizer.classList.add('is-dragging');
      mount.classList.add('is-resizing');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isResizing) return;
      const w = Math.min(Math.max(startW + (e.clientX - startX), 180), 480);
      mount.style.width = w + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      resizer.classList.remove('is-dragging');
      mount.classList.remove('is-resizing');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      localStorage.setItem('jdi-sidebar-width', mount.style.width);
    });
  }

  // Apply saved theme before first paint
  const salvo      = window.Storage && Storage.lerTema();
  const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (salvo === 'dark' || (!salvo && prefereDark)) document.documentElement.setAttribute('data-theme', 'dark');

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-sidebar]').forEach(render);
  });
})();
