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
    const sessao = Storage.ler('sessao');
    const primeiroNome = sessao && sessao.name ? sessao.name.split(' ')[0] : '';
    greeting.innerHTML = `${Utils.saudacao()}${primeiroNome ? `, <em>${primeiroNome}.</em>` : '.'}`;
  }
  if (eyebrow && window.Utils) {
    eyebrow.textContent = `${Utils.dataCurta()} · semana de ${Utils.intervaloSemana()}`;
  }

  const lista = document.getElementById('tasklist');

  function pintar() {
    const tarefas = Tarefas.listar()
      .filter(t => t.quando === 'today')
      .sort(Priority.comparar);

    lista.innerHTML = tarefas.length
      ? tarefas.map(t => `
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
          </div>`).join('')
      : '<div style="padding:var(--space-md);color:var(--color-text-subtle)">Nenhuma tarefa para hoje.</div>';

    lista.querySelectorAll('.task__check').forEach(btn => {
      btn.addEventListener('click', () => {
        Tarefas.toggleDone(btn.closest('.task').getAttribute('data-id')).then(pintar);
      });
    });

    lista.querySelectorAll('.task__main').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const id = el.closest('.task').getAttribute('data-id');
        window.location.href = '../tasks/task-detail.html?id=' + id;
      });
    });
  }

  function fmtH(h) {
    const hh = Math.floor(h);
    const mm = Math.round((h % 1) * 60);
    return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
  }

  function atualizarStats(weekly) {
    if (!weekly) return;

    const conclusao = weekly.conclusao;
    if (conclusao) {
      const elConcl = document.getElementById('statConcl');
      if (elConcl) elConcl.innerHTML = `${conclusao.feitas} <small>/ ${conclusao.total}</small>`;
    }

    const desvio = weekly.desvio;
    if (desvio && desvio.length) {
      const totalPlan = desvio.reduce((s, d) => s + (d.plan || 0), 0);
      const totalReal = desvio.reduce((s, d) => s + (d.real || 0), 0);
      const pct = totalPlan ? Math.round((totalReal / totalPlan) * 100) : 0;
      const diff = totalReal - totalPlan;
      const sinal = diff >= 0 ? '+' : '−';
      const diffAbs = Math.abs(diff);

      const elLabel = document.getElementById('statProgressLabel');
      const elValue = document.getElementById('statProgressValue');
      const elFill  = document.getElementById('statProgressFill');
      const elHint  = document.getElementById('statProgressHint');

      if (elLabel) elLabel.textContent = `${fmtH(totalPlan)} planejadas · ${fmtH(totalReal)} executadas`;
      if (elValue) elValue.textContent = `${pct}%`;
      if (elFill)  elFill.style.width = `${Math.min(pct, 100)}%`;
      if (elHint)  elHint.textContent = `desvio de ${sinal}${fmtH(diffAbs)} esta semana`;
    }
  }

  if (lista) {
    // Categorias do usuário junto das tarefas → pontos com as cores reais.
    Promise.all([Tarefas.carregarDaApi(), Categorias.carregar()]).then(pintar);
  }

  // TODO(analytics): reativar quando os endpoints de analytics existirem no backend.
  // Hoje /analytics/weekly não está implementado (retorna 403); a função
  // atualizarStats() já está pronta para quando a feature entrar.
  // Api.get(Api.endpoints.analytics.weekly)
  //   .then(atualizarStats)
  //   .catch(function () {});
})();
