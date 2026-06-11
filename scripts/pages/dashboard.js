/* ============================================================
   JustDoIt — pages/dashboard.js
   Saudação dinâmica + render das tarefas do dia priorizadas.
   ============================================================ */
(function () {
  'use strict';

  // Saudação e semana
  const greeting = document.getElementById('greeting');
  const eyebrow = document.getElementById('eyebrow');
  if (greeting && window.Utils) {
    greeting.innerHTML = `${Utils.saudacao()}, <em>Sonally.</em>`;
  }
  if (eyebrow && window.Utils) {
    eyebrow.textContent = `${Utils.dataCurta()} · semana de ${Utils.intervaloSemana()}`;
  }

  // Tarefas do dia (semente; em produção viriam do Storage/API)
  const SEMENTE = [
    { id: 't1', titulo: 'Revisar Cálculo II — capítulo 4', cat: 'Estudos', cor: 'var(--color-cat-estudos)', prioridade: 'urgent', hora: '08:00', done: false },
    { id: 't2', titulo: 'Entregar relatório do projeto', cat: 'Genérico', cor: 'var(--color-cat-generico)', prioridade: 'urgent', hora: '11:00', done: false },
    { id: 't3', titulo: 'Responder e-mail do cliente', cat: 'Genérico', cor: 'var(--color-cat-generico)', prioridade: 'important', hora: '14:00', done: false },
    { id: 't4', titulo: 'Pagar conta de luz', cat: 'Casa', cor: 'var(--color-cat-casa)', prioridade: 'important', hora: '16:00', done: false },
    { id: 't5', titulo: 'Regar as plantas', cat: 'Casa', cor: 'var(--color-cat-casa)', prioridade: 'normal', hora: '17:30', done: true },
  ];

  const ROTULO = { urgent: 'Urgente', important: 'Importante', normal: 'Normal', low: 'Baixa' };

  // Ordena por prioridade (urgent > important > normal > low), concluídas ao fim
  const ORDEM = { urgent: 0, important: 1, normal: 2, low: 3 };
  const tarefas = Storage.ler('tarefas-hoje', SEMENTE);
  tarefas.sort((a, b) => (a.done - b.done) || (ORDEM[a.prioridade] - ORDEM[b.prioridade]));

  const lista = document.getElementById('tasklist');
  function pintar() {
    lista.innerHTML = tarefas.map(t => `
      <div class="task ${t.done ? 'is-done' : ''}" data-id="${t.id}">
        <button class="task__check" aria-label="Concluir tarefa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </button>
        <div class="task__main">
          <div class="task__title">${t.titulo}</div>
          <div class="task__meta">
            <span class="task__cat"><span class="task__cat-dot" style="background:${t.cor}"></span>${t.cat}</span>
            <span class="task__time">${t.hora}</span>
          </div>
        </div>
        <span class="badge badge--${t.prioridade}">${ROTULO[t.prioridade]}</span>
      </div>`).join('');

    lista.querySelectorAll('.task__check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.task').getAttribute('data-id');
        const t = tarefas.find(x => x.id === id);
        t.done = !t.done;
        tarefas.sort((a, b) => (a.done - b.done) || (ORDEM[a.prioridade] - ORDEM[b.prioridade]));
        Storage.gravar('tarefas-hoje', tarefas);
        pintar();
      });
    });

    // Abrir especificações ao clicar no título
    lista.querySelectorAll('.task__main').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const id = el.closest('.task').getAttribute('data-id');
        window.location.href = 'task-detail.html?id=' + id;
      });
    });
  }
  if (lista) pintar();
})();
