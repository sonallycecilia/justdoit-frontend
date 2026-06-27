/* ============================================================
   JustDoIt — features/tasks/todo.js
   Lista priorizada: filtros (categoria/status/data), ação rápida
   de concluir, agrupamento por prioridade (RF10/RF11).
   ============================================================ */
(function () {
  'use strict';

  const filtros = { cat: 'all', status: 'open', date: 'all' };

  function passaFiltro(t) {
    if (filtros.cat !== 'all' && t.cat !== filtros.cat) return false;
    if (filtros.status === 'open' && t.done) return false;
    if (filtros.status === 'done' && !t.done) return false;
    // Atrasadas (past) contam como pendências de hoje/esta semana: são coisas que
    // já venceram e precisam de ação agora, então aparecem em ambos os filtros.
    if (filtros.date === 'today' && !['today', 'past'].includes(t.quando)) return false;
    if (filtros.date === 'week' && !['past', 'today', 'week'].includes(t.quando)) return false;
    return true;
  }

  const groups = document.getElementById('groups');
  const count = document.getElementById('count');

  function ico(p) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }

  function pintar() {
    const visiveis = Tarefas.listar().filter(passaFiltro).sort(Priority.comparar);
    count.textContent = `${visiveis.length} ${visiveis.length === 1 ? 'tarefa' : 'tarefas'}`;

    if (!visiveis.length) {
      groups.innerHTML = `<div class="empty">${ico('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>')}<p>Nada por aqui — aproveite.</p></div>`;
      return;
    }

    groups.innerHTML = Priority.agrupar(visiveis).map(g => `
      <div class="prio-group">
        <div class="prio-group__head">
          <span class="prio-group__bar" style="background:${g.cor}"></span>
          <span class="prio-group__title">${g.rotulo}</span>
          <span class="prio-group__n">${g.itens.length}</span>
        </div>
        <div class="todo-list">
          ${g.itens.map(t => `
            <div class="todo-item ${t.done ? 'is-done' : ''}" data-id="${t.id}">
              <button class="todo-check" aria-label="Concluir">${ico('<path d="M5 13l4 4L19 7"/>')}</button>
              <div class="todo-main" data-open>
                <div class="todo-title">${t.titulo}</div>
                <div class="todo-meta">
                  <span class="todo-cat"><span class="todo-cat__dot" style="background:${Categorias.cor(t.cat)}"></span>${t.cat}</span>
                  <span class="todo-date ${t.overdue ? 'is-overdue' : ''}">${ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')}${t.data}</span>
                  ${t.hora ? `<span class="todo-time">${ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>')}${t.hora}</span>` : ''}
                </div>
              </div>
              <div class="todo-right">
                <span class="badge badge--${Priority.normalizar(t.prioridade)}">${Priority.ROTULO[Priority.normalizar(t.prioridade)]}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    groups.querySelectorAll('.todo-check').forEach(btn => {
      btn.addEventListener('click', () => {
        Tarefas.toggleDone(btn.closest('.todo-item').getAttribute('data-id')).then(pintar);
      });
    });

    groups.querySelectorAll('[data-open]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.closest('.todo-item').getAttribute('data-id');
        window.location.href = 'task-detail.html?id=' + id;
      });
    });
  }

  // Event-delegation por grupo: funciona tanto para os chips fixos (status/data)
  // quanto para os de categoria, que são criados em runtime.
  document.querySelectorAll('.filter-group').forEach(group => {
    const tipo = group.getAttribute('data-filter');
    group.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip || !group.contains(chip)) return;
      group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      filtros[tipo] = chip.getAttribute('data-value');
      pintar();
    });
  });

  // Renderiza os chips de categoria a partir das categorias reais do backend
  // (Categorias.TODAS, preenchido por Categorias.carregar). Mantém o "Todas"
  // no início e marca o chip ativo conforme o filtro atual.
  const catGroup = document.querySelector('.filter-group[data-filter="cat"]');
  function pintarCategorias() {
    // Se a categoria filtrada deixou de existir (ex.: excluída na sidebar),
    // volta para "Todas" para não esconder todas as tarefas.
    if (filtros.cat !== 'all' && !Categorias.TODAS.some(c => c.nome === filtros.cat)) {
      filtros.cat = 'all';
    }
    catGroup.innerHTML =
      `<button class="filter-chip ${filtros.cat === 'all' ? 'is-active' : ''}" data-value="all">Todas</button>` +
      Categorias.TODAS.map(c =>
        `<button class="filter-chip ${filtros.cat === c.nome ? 'is-active' : ''}" data-value="${c.nome}">` +
          `<span class="filter-chip__dot" style="background:${c.cor}"></span>${c.nome}</button>`
      ).join('');
  }

  // Carrega tarefas e categorias do usuário (para as cores reais dos pontos)
  // antes do primeiro render. As cores ficam cacheadas em Categorias.TODAS.
  Promise.all([Tarefas.carregarDaApi(), Categorias.carregar()]).then(() => {
    pintarCategorias();
    pintar();
  });

  // A lista de categorias mudou em outra parte da UI (sidebar/settings criou ou
  // excluiu uma categoria) → rebusca e repinta os chips de filtro.
  window.addEventListener('categorias:atualizadas', () => {
    Categorias.carregar().then(() => {
      pintarCategorias();
      pintar();
    });
  });

  // Bloco de anotações — persiste via Storage
  const notepadArea = document.getElementById('notepadArea');
  const notepadHint = document.getElementById('notepadHint');
  notepadArea.value = Storage.ler(Storage.KEYS.NOTAS, '');
  let hintTimer;
  notepadArea.addEventListener('input', () => {
    Storage.gravar(Storage.KEYS.NOTAS, notepadArea.value);
    notepadHint.classList.add('is-visible');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => notepadHint.classList.remove('is-visible'), 2000);
  });
})();
