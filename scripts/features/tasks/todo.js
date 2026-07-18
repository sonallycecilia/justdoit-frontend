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
                <button class="todo-del" data-del aria-label="Excluir tarefa" title="Excluir tarefa">${ico('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>')}</button>
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

    groups.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.closest('.todo-item').getAttribute('data-id');
        btn.disabled = true;
        Tarefas.remover(id).then(pintar).catch(err => {
          console.error('Falha ao excluir tarefa:', err);
          btn.disabled = false;
        });
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

  // Filtro de categoria como dropdown (mesmo padrão do modal do calendário).
  // Escala para qualquer número de categorias: o menu rola em vez de estourar
  // a barra de filtros. Fonte: Categorias.TODAS (backend).
  const catFilter = document.getElementById('catFilter');

  function fecharMenuCat() {
    const btn  = catFilter.querySelector('.cat-filter__btn');
    const menu = catFilter.querySelector('.cat-filter__menu');
    const ov   = catFilter.querySelector('.cat-filter__overlay');
    if (btn)  { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
    if (menu) menu.hidden = true;
    if (ov)   ov.hidden = true;
  }

  function pintarCategorias() {
    // Se a categoria filtrada deixou de existir (ex.: excluída na sidebar),
    // volta para "Todas" para não esconder todas as tarefas.
    if (filtros.cat !== 'all' && !Categorias.TODAS.some(c => c.nome === filtros.cat)) {
      filtros.cat = 'all';
    }
    const sel     = Categorias.TODAS.find(c => c.nome === filtros.cat);
    const rotulo  = filtros.cat === 'all' ? 'Todas as categorias' : filtros.cat;
    const check   = `<span class="cat-filter__check">${ico('<path d="M20 6 9 17l-5-5"/>')}</span>`;
    const chevron = `<svg class="cat-filter__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><path d="m6 9 6 6 6-6"/></svg>`;

    catFilter.innerHTML =
      `<button class="cat-filter__btn" type="button" aria-haspopup="listbox" aria-expanded="false">
        ${sel ? `<span class="cat-filter__dot" style="background:${sel.cor}"></span>` : ''}
        <span class="cat-filter__name">${rotulo}</span>
        ${chevron}
      </button>
      <div class="cat-filter__overlay" hidden></div>
      <div class="cat-filter__menu" role="listbox" hidden>
        <button class="cat-filter__item ${filtros.cat === 'all' ? 'is-on' : ''}" data-value="all" role="option">
          <span class="cat-filter__item-name">Todas as categorias</span>
          ${filtros.cat === 'all' ? check : ''}
        </button>
        ${Categorias.TODAS.map(c => `
          <button class="cat-filter__item ${filtros.cat === c.nome ? 'is-on' : ''}" data-value="${c.nome}" role="option">
            <span class="cat-filter__dot" style="background:${c.cor}"></span>
            <span class="cat-filter__item-name">${c.nome}</span>
            ${filtros.cat === c.nome ? check : ''}
          </button>`).join('')}
      </div>`;
  }

  // Delegação no contêiner estável (sobrevive aos re-renders do innerHTML).
  catFilter.addEventListener('click', e => {
    const trigger = e.target.closest('.cat-filter__btn');
    const overlay = e.target.closest('.cat-filter__overlay');
    const item    = e.target.closest('.cat-filter__item');

    if (trigger) {
      const menu = catFilter.querySelector('.cat-filter__menu');
      const ov   = catFilter.querySelector('.cat-filter__overlay');
      const abrir = menu.hidden;
      menu.hidden = !abrir;
      ov.hidden = !abrir;
      trigger.classList.toggle('is-open', abrir);
      trigger.setAttribute('aria-expanded', String(abrir));
      return;
    }
    if (overlay) { fecharMenuCat(); return; }
    if (item) {
      filtros.cat = item.getAttribute('data-value');
      pintarCategorias();   // re-render atualiza rótulo/seleção e fecha o menu
      pintar();
    }
  });

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

  // A categoria (ou outro campo) de uma tarefa mudou em outra parte da UI — ex.:
  // arrastar entre categorias na sidebar dispara 'tarefas:atualizadas'. O cache
  // local já está atualizado nesse ponto, então basta repintar a lista (sem ir
  // ao backend); a lista de categorias em si não mudou.
  window.addEventListener('tarefas:atualizadas', pintar);

  // O bloco de anotações do topo agora é um compositor de notas, cuidado por
  // components/note-composer.js (grava em /notes via Notas.criar).
})();
