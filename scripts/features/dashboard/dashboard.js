/* ============================================================
   JustDoIt — features/dashboard/dashboard.js
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

  const lista = document.getElementById('tasklist');

  function pintar() {
    const tarefas = Tarefas.listar()
      .filter(t => t.quando === 'today')
      .sort(Priority.comparar);

    lista.innerHTML = tarefas.map(t => `
      <div class="task ${t.done ? 'is-done' : ''}" data-id="${t.id}">
        <button class="task__check" aria-label="Concluir tarefa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </button>
        <div class="task__main">
          <div class="task__title">${t.titulo}</div>
          <div class="task__meta">
            <span class="task__cat"><span class="task__cat-dot" style="background:${Categorias.cor(t.cat)}"></span>${t.cat}</span>
            ${t.hora ? `<span class="task__time">${t.hora}</span>` : ''}
          </div>
        </div>
        <span class="badge badge--${t.prioridade}">${Priority.ROTULO[t.prioridade]}</span>
      </div>`).join('');

    lista.querySelectorAll('.task__check').forEach(btn => {
      btn.addEventListener('click', () => {
        Tarefas.toggleDone(btn.closest('.task').getAttribute('data-id'));
        pintar();
      });
    });

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
