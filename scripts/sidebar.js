/* ============================================================
   JustDoIt — sidebar.js
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
    search:      ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'),
    gripDots:    ic('<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>'),
  };

  const NAV = [
    { id: 'dashboard', label: 'Visão geral', href: 'dashboard.html' },
    { id: 'calendar',  label: 'Calendário',  href: 'calendar.html', count: 14 },
    { id: 'todo',      label: 'To Do',        href: 'todo.html',     count: 9  },
    { id: 'analytics', label: 'Análise',      href: 'analytics.html' },
  ];

  const CATS = [
    { nome: 'Estudos',  cor: 'var(--color-cat-estudos)',  id: 'estudos'  },
    { nome: 'Casa',     cor: 'var(--color-cat-casa)',     id: 'casa'     },
    { nome: 'Genérico', cor: 'var(--color-cat-generico)', id: 'generico' },
  ];

  // Seed mirrors todo.js — real data comes from Storage
  const SEMENTE_TAREFAS = [
    { id: 'a1', titulo: 'Revisar Cálculo II — capítulo 4',        cat: 'Estudos',  prioridade: 'urgent',    quando: 'today', data: 'Hoje',           done: false },
    { id: 'a2', titulo: 'Entregar relatório do projeto',           cat: 'Genérico', prioridade: 'urgent',    quando: 'today', data: 'Hoje',           done: false },
    { id: 'a3', titulo: 'Pagar conta de luz',                      cat: 'Casa',     prioridade: 'important', quando: 'today', data: 'Hoje',           done: false },
    { id: 'a4', titulo: 'Responder e-mail do cliente',             cat: 'Genérico', prioridade: 'important', quando: 'week',  data: 'Amanhã',         done: false },
    { id: 'a5', titulo: 'Ler artigo de Sistemas Distribuídos',     cat: 'Estudos',  prioridade: 'normal',    quando: 'week',  data: 'Qua, 10 jun',    done: false },
    { id: 'a6', titulo: 'Trocar o filtro de água',                 cat: 'Casa',     prioridade: 'normal',    quando: 'past',  data: 'Atrasada',       done: false },
    { id: 'a7', titulo: 'Planejar a próxima semana',               cat: 'Genérico', prioridade: 'low',       quando: 'week',  data: 'Dom, 14 jun',    done: false },
    { id: 'a8', titulo: 'Organizar fotos do celular',              cat: 'Casa',     prioridade: 'low',       quando: 'all',   data: 'Sem data',       done: false },
    { id: 'a9', titulo: 'Pomodoro — Algoritmos e estruturas',      cat: 'Estudos',  prioridade: 'normal',    quando: 'week',  data: 'Qui, 11 jun',    done: false },
  ];

  // Registry allows drag handlers to access full task objects by id
  const taskRegistry = new Map();

  function carregarTarefas() {
    return (window.Storage && Storage.ler('todo-tarefas')) || SEMENTE_TAREFAS;
  }

  function renderCatTarefas(catNome, busca) {
    const todas = carregarTarefas().filter(t => !t.done && t.cat === catNome);
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
        <a class="sidebar-task" href="task-detail.html?id=${t.id}" draggable="true" data-task-id="${t.id}" title="${t.titulo}">
          <span class="sidebar-task__grip">${ICONS.gripDots}</span>
          <span class="sidebar-task__prio sidebar-task__prio--${prio}"></span>
          <span class="sidebar-task__titulo">${t.titulo}</span>
          <span class="sidebar-task__data">${t.data || ''}</span>
        </a>`;
    }).join('');
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

  function render(mount) {
    const active = mount.getAttribute('data-active') || 'dashboard';

    const navHtml = NAV.map(n => `
      <a class="nav-item ${n.id === active ? 'is-active' : ''}" href="${n.href}">
        <span class="nav-item__ic">${ICONS[n.id]}</span>
        <span class="nav-item__label">${n.label}</span>
        ${n.count != null ? `<span class="nav-item__count">${n.count}</span>` : ''}
      </a>`).join('');

    const catHtml = CATS.map(c => {
      const pendentes = carregarTarefas().filter(t => !t.done && t.cat === c.nome);
      return `
        <div class="sidebar-cat" data-cat="${c.nome}">
          <button class="sidebar-cat__header" aria-expanded="false" aria-label="Expandir ${c.nome}">
            <span class="cat-dot" style="background:${c.cor}"></span>
            <span class="nav-item__label">${c.nome}</span>
            <span class="nav-item__count">${pendentes.length}</span>
            <span class="sidebar-cat__chevron">${ICONS.chevron}</span>
          </button>
          <div class="sidebar-cat__tasks hidden" data-cat-tasks="${c.nome}">
            ${renderCatTarefas(c.nome, '')}
          </div>
        </div>`;
    }).join('');

    mount.className = 'sidebar';
    mount.innerHTML = `
      <div class="sidebar__brand">
        <span class="sidebar__mark">${MARK}</span>
        <span class="sidebar__word">JustDoIt</span>
        <button class="sidebar__collapse" id="sidebarCollapse" aria-label="Recolher menu">${ICONS.chevronLeft}</button>
      </div>
      <div class="sidebar__scroll">
        <nav class="sidebar__nav">${navHtml}</nav>
        <div class="sidebar__section">
          <span>Categorias</span>
          <button class="sidebar__cat-toggle" id="catToggle" aria-label="Ocultar categorias" aria-expanded="true">${ICONS.chevron}</button>
        </div>
        <div id="catSection">
          <div class="sidebar__search">
            <span class="sidebar__search-ic">${ICONS.search}</span>
            <input class="sidebar__search-input" id="taskSearch" type="text" placeholder="Buscar tarefas…" aria-label="Buscar tarefas" autocomplete="off">
          </div>
          <nav class="sidebar__nav sidebar__nav--cats" id="catNav">${catHtml}</nav>
        </div>
      </div>
      <div class="sidebar__foot">
        <span class="sidebar__avatar">SV</span>
        <div class="sidebar__user">
          <div class="sidebar__name">Sonally Vitorino</div>
          <div class="sidebar__plan">Plano Foco</div>
        </div>
        <button class="btn-icon" id="themeToggle" aria-label="Alternar tema" style="width:32px;height:32px">${ICONS.moon}</button>
      </div>
      <div class="sidebar__resizer" id="sidebarResizer"></div>`;

    // ── Category expand / collapse ──────────────────────────────
    mount.querySelectorAll('.sidebar-cat').forEach(catEl => {
      const header  = catEl.querySelector('.sidebar-cat__header');
      const tasksEl = catEl.querySelector('.sidebar-cat__tasks');
      header.addEventListener('click', () => {
        const expanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', String(!expanded));
        tasksEl.classList.toggle('hidden', expanded);
      });
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

    // Wire drag for initial task render
    mount.querySelectorAll('.sidebar-cat__tasks').forEach(wireTaskDrag);

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
      const w = Math.min(Math.max(startW + (e.clientX - startX), 170), 480);
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
