/* ============================================================
   JustDoIt — task-detail.js
   Liga o editor: módulos ativáveis (RF05), Pomodoro (RF06),
   cronômetro (RF13), prioridade (RF10), recorrência (RF08),
   notas e subtarefas em cascata (RF03).
   ============================================================ */
(function () {
  'use strict';

  const detail = document.getElementById('detail');

  /* ---------- Concluir tarefa ---------- */
  document.getElementById('taskCheck').addEventListener('click', () => {
    detail.classList.toggle('is-done');
  });

  /* ---------- Módulos ativáveis ---------- */
  const grid = document.getElementById('moduleGrid');
  const panels = document.getElementById('panels');
  function sincronizarPaineis() {
    grid.querySelectorAll('.module-toggle').forEach(btn => {
      const mod = btn.getAttribute('data-mod');
      const ativo = btn.classList.contains('is-on');
      const painel = panels.querySelector(`[data-panel="${mod}"]`);
      if (painel) painel.classList.toggle('hidden', !ativo);
    });
  }
  grid.querySelectorAll('.module-toggle').forEach(btn => {
    btn.addEventListener('click', () => { btn.classList.toggle('is-on'); sincronizarPaineis(); });
  });
  sincronizarPaineis();

  /* ---------- Prioridade (RF10/RF11) ---------- */
  const prioPicker = document.getElementById('prioPicker');
  const prioBadge = document.getElementById('prioBadge');
  let prioridadeAtual = 'urgent';
  prioPicker.innerHTML = Priority.NIVEIS.map(n => `
    <button class="prio-opt ${n === prioridadeAtual ? 'is-on' : ''}" data-prio="${n}" style="color:${Priority.COR[n]}">
      <span class="prio-opt__dot" style="background:${Priority.COR[n]}"></span>
      <span style="color:var(--color-text-soft)">${Priority.ROTULO[n]}</span>
    </button>`).join('');
  prioPicker.querySelectorAll('.prio-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      prioPicker.querySelectorAll('.prio-opt').forEach(o => o.classList.remove('is-on'));
      opt.classList.add('is-on');
      prioridadeAtual = opt.getAttribute('data-prio');
      prioBadge.className = `badge badge--${prioridadeAtual}`;
      prioBadge.textContent = Priority.ROTULO[prioridadeAtual];
    });
  });

  /* ---------- Recorrência (RF08) ---------- */
  const cycleOpts = document.getElementById('cycleOpts');
  const tipos = ['none', ...Object.keys(Cycle.TIPOS)];
  const rotuloTipo = (t) => t === 'none' ? 'Não repete' : Cycle.rotulo(t);
  let cicloAtual = 'none';
  cycleOpts.innerHTML = tipos.map(t => `<button class="cycle-opt ${t === cicloAtual ? 'is-on' : ''}" data-cycle="${t}">${rotuloTipo(t)}</button>`).join('');
  cycleOpts.querySelectorAll('.cycle-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      cycleOpts.querySelectorAll('.cycle-opt').forEach(o => o.classList.remove('is-on'));
      opt.classList.add('is-on');
      cicloAtual = opt.getAttribute('data-cycle');
    });
  });

  /* ---------- Cronômetro de execução (RF13) ---------- */
  const timerDisplay = document.getElementById('timerDisplay');
  const timerToggle = document.getElementById('timerToggle');
  const cron = TaskTimer.criar({ onTick: (s) => { timerDisplay.textContent = TaskTimer.formatar(s); } });
  timerToggle.addEventListener('click', () => {
    const rodando = cron.toggle();
    timerToggle.textContent = rodando ? 'Pausar' : 'Continuar';
  });
  document.getElementById('timerReset').addEventListener('click', () => {
    cron.reset(); timerToggle.textContent = 'Iniciar';
  });

  /* ---------- Foco / Pomodoro (RF06) ---------- */
  const ring = document.getElementById('pomoRing');
  const pomoTime = document.getElementById('pomoTime');
  const pomoPhase = document.getElementById('pomoPhase');
  const pomoToggle = document.getElementById('pomoToggle');
  function pintarPomo(restante, dur, fase, ciclo) {
    pomoTime.textContent = Focus.formatar(restante);
    const pct = dur ? ((dur - restante) / dur) * 100 : 0;
    ring.style.setProperty('--pct', pct.toFixed(1));
    ring.style.setProperty('--color-accent', fase === 'pausa' ? 'var(--color-success)' : '');
  }
  const pomo = Focus.criar({
    onTick: (restante, dur) => { const e = pomo.estado(); pintarPomo(restante, dur, e.fase, e.ciclo); },
    onFase: (fase, ciclo) => { pomoPhase.textContent = `${fase === 'foco' ? 'Foco' : 'Pausa'} · ciclo ${ciclo}/4`; },
  });
  pomoToggle.addEventListener('click', () => {
    const rodando = pomo.toggle();
    pomoToggle.textContent = rodando ? 'Pausar' : 'Continuar';
  });
  document.getElementById('pomoSkip').addEventListener('click', () => pomo.pular());

  /* ---------- Notas ---------- */
  const notes = document.getElementById('notes');
  notes.value = Storage.ler('detalhe-notas', '');
  notes.addEventListener('input', () => Storage.gravar('detalhe-notas', notes.value));

  /* ---------- Subtarefas com progresso em cascata (RF03) ---------- */
  const subList = document.getElementById('subList');
  const subFill = document.getElementById('subFill');
  const subCount = document.getElementById('subCount');
  const subInput = document.getElementById('subInput');
  let subs = Storage.ler('detalhe-subs', [
    { id: 's1', titulo: 'Reler a teoria', done: true },
    { id: 's2', titulo: 'Resolver exercícios 1–10', done: false },
    { id: 's3', titulo: 'Fazer resumo', done: false },
  ]);

  function pintarSubs() {
    const feitas = subs.filter(s => s.done).length;
    subList.innerHTML = subs.map(s => `
      <div class="subtask ${s.done ? 'is-done' : ''}" data-id="${s.id}">
        <button class="subtask__check" aria-label="Concluir subtarefa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></button>
        <span class="subtask__label">${s.titulo}</span>
      </div>`).join('');
    const pct = Utils.pct(feitas, subs.length);
    subFill.style.width = pct + '%';
    subFill.classList.toggle('progress__fill--success', pct === 100 && subs.length > 0);
    subCount.textContent = `${feitas}/${subs.length}`;

    subList.querySelectorAll('.subtask__check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.subtask').getAttribute('data-id');
        const s = subs.find(x => x.id === id);
        s.done = !s.done;
        Storage.gravar('detalhe-subs', subs);
        pintarSubs();
      });
    });
  }
  subInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && subInput.value.trim()) {
      subs.push({ id: 's' + Date.now(), titulo: subInput.value.trim(), done: false });
      subInput.value = '';
      Storage.gravar('detalhe-subs', subs);
      pintarSubs();
    }
  });
  pintarSubs();

  // Inicializa o ring do Pomodoro
  pintarPomo(25 * 60, 25 * 60, 'foco', 1);
})();
