/* ============================================================
   JustDoIt — todo.js
   Lista priorizada: filtros (categoria/status/data), ação rápida
   de concluir, agrupamento por prioridade (RF10/RF11).
   ============================================================ */
(function () {
  'use strict';

  const COR_CAT = {
    'Estudos': 'var(--color-cat-estudos)',
    'Casa': 'var(--color-cat-casa)',
    'Genérico': 'var(--color-cat-generico)',
  };

  // Semente — em produção viria da API/Storage
  const SEMENTE = [
    { id: 'a1', titulo: 'Revisar Cálculo II — capítulo 4', cat: 'Estudos', prioridade: 'urgent', quando: 'today', data: 'Hoje', done: false },
    { id: 'a2', titulo: 'Entregar relatório do projeto', cat: 'Genérico', prioridade: 'urgent', quando: 'today', data: 'Hoje', overdue: false, done: false },
    { id: 'a3', titulo: 'Pagar conta de luz', cat: 'Casa', prioridade: 'important', quando: 'today', data: 'Hoje', done: false },
    { id: 'a4', titulo: 'Responder e-mail do cliente', cat: 'Genérico', prioridade: 'important', quando: 'week', data: 'Amanhã', done: false },
    { id: 'a5', titulo: 'Ler artigo de Sistemas Distribuídos', cat: 'Estudos', prioridade: 'normal', quando: 'week', data: 'Qua, 10 jun', done: false },
    { id: 'a6', titulo: 'Trocar o filtro de água', cat: 'Casa', prioridade: 'normal', quando: 'past', data: 'Atrasada', overdue: true, done: false },
    { id: 'a7', titulo: 'Planejar a próxima semana', cat: 'Genérico', prioridade: 'low', quando: 'week', data: 'Dom, 14 jun', done: false },
    { id: 'a8', titulo: 'Organizar fotos do celular', cat: 'Casa', prioridade: 'low', quando: 'all', data: 'Sem data', done: false },
    { id: 'a9', titulo: 'Caminhada de 30 minutos', cat: 'Casa', prioridade: 'normal', quando: 'today', data: 'Hoje', done: true },
  ];

  const tarefas = Storage.ler('todo-tarefas', SEMENTE);

  // Estado dos filtros
  const filtros = { cat: 'all', status: 'open', date: 'all' };

  function passaFiltro(t) {
    if (filtros.cat !== 'all' && t.cat !== filtros.cat) return false;
    if (filtros.status === 'open' && t.done) return false;
    if (filtros.status === 'done' && !t.done) return false;
    if (filtros.date === 'today' && t.quando !== 'today') return false;
    if (filtros.date === 'week' && !(t.quando === 'today' || t.quando === 'week')) return false;
    return true;
  }

  const groups = document.getElementById('groups');
  const count = document.getElementById('count');

  function ico(p) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }

  function pintar() {
    const visiveis = tarefas.filter(passaFiltro).sort(Priority.comparar);
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
                  <span class="todo-cat"><span class="todo-cat__dot" style="background:${COR_CAT[t.cat]}"></span>${t.cat}</span>
                  <span class="todo-date ${t.overdue ? 'is-overdue' : ''}">${ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')}${t.data}</span>
                </div>
              </div>
              <div class="todo-right">
                <span class="badge badge--${t.prioridade}">${Priority.ROTULO[t.prioridade]}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    // Ação rápida: concluir
    groups.querySelectorAll('.todo-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.todo-item').getAttribute('data-id');
        const t = tarefas.find(x => x.id === id);
        t.done = !t.done;
        Storage.gravar('todo-tarefas', tarefas);
        pintar();
      });
    });
    // Abrir detalhe
    groups.querySelectorAll('[data-open]').forEach(el => {
      el.addEventListener('click', () => { window.location.href = 'task-detail.html'; });
    });
  }

  // Liga os filtros
  document.querySelectorAll('.filter-group').forEach(group => {
    const tipo = group.getAttribute('data-filter');
    group.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        filtros[tipo] = chip.getAttribute('data-value');
        pintar();
      });
    });
  });

  pintar();
})();
