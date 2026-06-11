/* ============================================================
   JustDoIt — pages/task-detail.js
   Especificações de uma tarefa: carrega por ?id=, permite editar,
   iniciar foco, configurar módulos, subtarefas e notas.
   Modo "nova tarefa" quando nenhum id é passado na URL.
   Depende de: core/storage.js, core/utils.js, modules/tarefas.js,
   modules/categorias.js, components/date-picker.js.
   ============================================================ */
(function () {
  'use strict';

  /* ── URL param / modo ─────────────────────────────────── */
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');

  const tarefas = Tarefas.listar();
  const tarefa  = taskId ? tarefas.find(t => t.id === taskId) : null;

  // Storage keys — por tarefa quando editando, genérico para nova
  const KEY_NOTAS = taskId ? 'detalhe-notas-' + taskId : 'detalhe-notas';
  const KEY_SUBS  = taskId ? 'detalhe-subs-'  + taskId : 'detalhe-subs';
  const KEY_DESC  = taskId ? 'detalhe-desc-'  + taskId : 'detalhe-desc';
  const KEY_MODS  = taskId ? 'detalhe-mods-'  + taskId : null;
  const KEY_CICLO = taskId ? 'detalhe-ciclo-' + taskId : null;
  const KEY_POMO  = taskId ? 'detalhe-pomos-' + taskId : null;

  const detail = document.getElementById('detail');

  /* ── Categoria ────────────────────────────────────────── */
  const CATS = Categorias.TODAS;
  const catChip  = document.getElementById('catChip');
  const catDot   = document.getElementById('catDot');
  const catLabel = document.getElementById('catLabel');
  let catIdx = 0;

  function setCat(idx) {
    catIdx = ((idx % CATS.length) + CATS.length) % CATS.length;
    const cat = CATS[catIdx];
    catChip.setAttribute('data-cat', cat.nome);
    catDot.style.background = cat.cor;
    catLabel.textContent = cat.nome;
  }
  catChip.addEventListener('click', () => setCat(catIdx + 1));

  /* ── Concluir tarefa ──────────────────────────────────── */
  document.getElementById('taskCheck').addEventListener('click', () => {
    detail.classList.toggle('is-done');
    atualizarSpec();
  });

  /* ── Seletor de data ─────────────────────────────────────── */
  let selectedDate = (() => {
    if (tarefa && tarefa.dataIso) {
      const [y, mo, d] = tarefa.dataIso.split('-').map(Number);
      return new Date(y, mo - 1, d);
    }
    if (tarefa && tarefa.data) {
      const parsed = Utils.parseData(tarefa.data);
      if (parsed) return parsed;
    }
    return Utils.hoje();
  })();

  DatePicker.criar({
    container:   document.getElementById('datePick'),
    botao:       document.getElementById('dateBtn'),
    selecionada: selectedDate,
    onSelect: (d) => {
      selectedDate = d;
      document.getElementById('dataChip').textContent = Utils.dataRelativa(d);
    },
  });

  /* ── Seletor de hora ─────────────────────────────────── */
  let selectedHour = null;
  let selectedMin  = 0;

  if (tarefa && tarefa.hora) {
    const parts = tarefa.hora.split(':').map(Number);
    selectedHour = parts[0];
    selectedMin  = parts[1] || 0;
  }

  const timePick = document.getElementById('timePick');
  const timeBtn  = document.getElementById('timeBtn');
  const horaChip = document.getElementById('horaChip');

  function formatHora(h, m) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function atualizarHoraChip() {
    if (selectedHour !== null) {
      horaChip.textContent = formatHora(selectedHour, selectedMin);
      timeBtn.removeAttribute('data-empty');
    } else {
      horaChip.textContent = 'Hora';
      timeBtn.setAttribute('data-empty', '');
    }

    // Auto-salva no objeto da tarefa imediatamente
    if (tarefa) {
      if (selectedHour !== null) tarefa.hora = formatHora(selectedHour, selectedMin);
      else delete tarefa.hora;
      Tarefas.salvar(tarefas);
    }

    // Notifica o calendário pai (quando aberto em drawer/iframe)
    if (taskId && window.parent !== window) {
      window.parent.postMessage({
        type: 'jdi-hora-update',
        taskId,
        hora: selectedHour !== null ? formatHora(selectedHour, selectedMin) : null,
      }, '*');
    }
  }

  function fecharTimePick() {
    timeBtn.classList.remove('is-open');
    timePick.querySelector('.time-pick__overlay')?.remove();
    timePick.querySelector('.time-pick__menu')?.remove();
  }

  function abrirTimePick() {
    if (timeBtn.classList.contains('is-open')) { fecharTimePick(); return; }
    timeBtn.classList.add('is-open');

    const overlay = document.createElement('div');
    overlay.className = 'time-pick__overlay';
    overlay.addEventListener('click', fecharTimePick);

    const menu = document.createElement('div');
    menu.className = 'time-pick__menu';

    const hoursLabel = document.createElement('div');
    hoursLabel.className = 'time-pick__section-label';
    hoursLabel.textContent = 'Hora';

    const hoursGrid = document.createElement('div');
    hoursGrid.className = 'time-pick__hours';

    for (let h = 0; h < 24; h++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-pick__hour' + (h === selectedHour ? ' is-on' : '');
      btn.textContent = String(h).padStart(2, '0');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedHour = h;
        hoursGrid.querySelectorAll('.time-pick__hour').forEach(b => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        atualizarHoraChip();
      });
      hoursGrid.appendChild(btn);
    }

    const minsLabel = document.createElement('div');
    minsLabel.className = 'time-pick__section-label';
    minsLabel.style.marginTop = '4px';
    minsLabel.textContent = 'Minuto';

    const minsRow = document.createElement('div');
    minsRow.className = 'time-pick__mins';

    [0, 15, 30, 45].forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-pick__min' + (m === selectedMin ? ' is-on' : '');
      btn.textContent = ':' + String(m).padStart(2, '0');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedMin = m;
        minsRow.querySelectorAll('.time-pick__min').forEach(b => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        atualizarHoraChip();
      });
      minsRow.appendChild(btn);
    });

    const divider = document.createElement('hr');
    divider.className = 'time-pick__divider';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'time-pick__clear';
    clearBtn.textContent = 'Remover hora';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedHour = null;
      selectedMin  = 0;
      atualizarHoraChip();
      fecharTimePick();
    });

    menu.appendChild(hoursLabel);
    menu.appendChild(hoursGrid);
    menu.appendChild(minsLabel);
    menu.appendChild(minsRow);
    menu.appendChild(divider);
    menu.appendChild(clearBtn);

    timePick.appendChild(overlay);
    timePick.appendChild(menu);
  }

  timeBtn.addEventListener('click', abrirTimePick);
  atualizarHoraChip();

  /* ── Módulos ativáveis ────────────────────────────────── */
  const grid   = document.getElementById('moduleGrid');
  const panels = document.getElementById('panels');

  function sincronizarPaineis() {
    grid.querySelectorAll('.module-toggle').forEach(btn => {
      const mod    = btn.getAttribute('data-mod');
      const ativo  = btn.classList.contains('is-on');
      const painel = panels.querySelector(`[data-panel="${mod}"]`);
      if (painel) painel.classList.toggle('hidden', !ativo);
    });
    if (KEY_MODS) {
      const ativos = [...grid.querySelectorAll('.module-toggle.is-on')].map(b => b.getAttribute('data-mod'));
      Storage.gravar(KEY_MODS, ativos);
    }
    atualizarSpec();
  }

  grid.querySelectorAll('.module-toggle').forEach(btn => {
    btn.addEventListener('click', () => { btn.classList.toggle('is-on'); sincronizarPaineis(); });
  });

  // Restaurar módulos salvos
  if (KEY_MODS) {
    const savedMods = Storage.ler(KEY_MODS, null);
    if (savedMods) {
      grid.querySelectorAll('.module-toggle').forEach(btn => {
        btn.classList.toggle('is-on', savedMods.includes(btn.getAttribute('data-mod')));
      });
    }
  }
  sincronizarPaineis();

  /* ── Prioridade (RF10/RF11) ───────────────────────────── */
  const prioPicker  = document.getElementById('prioPicker');
  const prioBadge   = document.getElementById('prioBadge');
  let prioridadeAtual = tarefa ? tarefa.prioridade : 'urgent';

  prioPicker.innerHTML = Priority.NIVEIS.map(n => `
    <button class="prio-opt ${n === prioridadeAtual ? 'is-on' : ''}" data-prio="${n}" style="color:${Priority.COR[n]}">
      <span class="prio-opt__dot" style="background:${Priority.COR[n]}"></span>
      <span style="color:var(--color-text-soft)">${Priority.ROTULO[n]}</span>
    </button>`).join('');

  function setPrio(prio) {
    prioridadeAtual = prio;
    prioPicker.querySelectorAll('.prio-opt').forEach(o => o.classList.toggle('is-on', o.getAttribute('data-prio') === prio));
    prioBadge.className = `badge badge--${prio}`;
    prioBadge.textContent = Priority.ROTULO[prio];
  }
  prioPicker.querySelectorAll('.prio-opt').forEach(opt => {
    opt.addEventListener('click', () => setPrio(opt.getAttribute('data-prio')));
  });
  setPrio(prioridadeAtual);

  /* ── Recorrência (RF08) ───────────────────────────────── */
  const cycleOpts = document.getElementById('cycleOpts');
  const tipos     = ['none', ...Object.keys(Cycle.TIPOS)];
  const rotuloTipo = t => t === 'none' ? 'Não repete' : Cycle.rotulo(t);
  let cicloAtual = (KEY_CICLO && Storage.ler(KEY_CICLO, null)) || 'none';

  cycleOpts.innerHTML = tipos.map(t =>
    `<button class="cycle-opt ${t === cicloAtual ? 'is-on' : ''}" data-cycle="${t}">${rotuloTipo(t)}</button>`
  ).join('');
  cycleOpts.querySelectorAll('.cycle-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      cycleOpts.querySelectorAll('.cycle-opt').forEach(o => o.classList.remove('is-on'));
      opt.classList.add('is-on');
      cicloAtual = opt.getAttribute('data-cycle');
      if (KEY_CICLO) Storage.gravar(KEY_CICLO, cicloAtual);
      atualizarSpec();
    });
  });

  /* ── Cronômetro de execução (RF13) ───────────────────── */
  const timerDisplay = document.getElementById('timerDisplay');
  const timerToggle  = document.getElementById('timerToggle');
  const timerInitial = KEY_POMO ? Storage.ler(KEY_POMO + '-timer', 0) : 0;

  const cron = TaskTimer.criar({
    inicial: timerInitial,
    onTick: (s) => {
      timerDisplay.textContent = TaskTimer.formatar(s);
      if (KEY_POMO) Storage.gravar(KEY_POMO + '-timer', s);
      document.getElementById('specTempo').textContent = TaskTimer.formatar(s);
    },
  });
  timerDisplay.textContent = TaskTimer.formatar(timerInitial);
  document.getElementById('specTempo').textContent = TaskTimer.formatar(timerInitial);

  timerToggle.addEventListener('click', () => {
    const rodando = cron.toggle();
    timerToggle.textContent = rodando ? 'Pausar' : 'Continuar';
  });
  document.getElementById('timerReset').addEventListener('click', () => {
    cron.reset();
    timerToggle.textContent = 'Iniciar';
    if (KEY_POMO) Storage.gravar(KEY_POMO + '-timer', 0);
  });

  /* ── Foco / Pomodoro (RF06) ───────────────────────────── */
  const pomoRing   = document.getElementById('pomoRing');
  const pomoTime   = document.getElementById('pomoTime');
  const pomoPhase  = document.getElementById('pomoPhase');
  const pomoToggle = document.getElementById('pomoToggle');
  const pomoReset  = document.getElementById('pomoReset');
  let ciclosPomodoro = KEY_POMO ? Storage.ler(KEY_POMO + '-ciclos', 0) : 0;

  function pintarPomo(restante, dur, fase) {
    pomoTime.textContent = Focus.formatar(restante);
    const pct = dur ? ((dur - restante) / dur) * 100 : 0;
    pomoRing.style.setProperty('--pct', pct.toFixed(1));
    pomoRing.style.setProperty('--color-accent', fase === 'pausa' ? 'var(--color-success)' : '');
  }

  const pomo = Focus.criar({
    onTick: (restante, dur) => {
      const e = pomo.estado();
      pintarPomo(restante, dur, e.fase);
    },
    onFase: (fase, ciclo) => {
      pomoPhase.textContent = `${fase === 'foco' ? 'Foco' : 'Pausa'} · ciclo ${ciclo}/4`;
      if (fase === 'pausa') {
        ciclosPomodoro++;
        if (KEY_POMO) Storage.gravar(KEY_POMO + '-ciclos', ciclosPomodoro);
        document.getElementById('specPomos').textContent = String(ciclosPomodoro);
      }
    },
  });

  pomoToggle.addEventListener('click', () => {
    const rodando = pomo.toggle();
    pomoToggle.textContent = rodando ? 'Pausar' : 'Continuar';
  });
  document.getElementById('pomoSkip').addEventListener('click', () => pomo.pular());
  pomoReset.addEventListener('click', () => {
    pomo.reset();
    pomoToggle.textContent = 'Iniciar';
  });

  document.getElementById('specPomos').textContent = String(ciclosPomodoro);

  /* ── Notas ────────────────────────────────────────────── */
  const notes = document.getElementById('notes');
  notes.value = Storage.ler(KEY_NOTAS, '');
  notes.addEventListener('input', () => Storage.gravar(KEY_NOTAS, notes.value));

  /* ── Subtarefas com progresso em cascata (RF03) ───────── */
  const subList       = document.getElementById('subList');
  const subFill       = document.getElementById('subFill');
  const subCount      = document.getElementById('subCount');
  const subInput      = document.getElementById('subInput');
  const chipsProgress = document.getElementById('chipsProgress');
  const chipsSubFill  = document.getElementById('chipsSubFill');
  const chipsSubCount = document.getElementById('chipsSubCount');
  let subs = Storage.ler(KEY_SUBS, []);

  function pintarSubs() {
    const feitas = subs.filter(s => s.done).length;
    subList.innerHTML = subs.map(s => `
      <div class="subtask ${s.done ? 'is-done' : ''}" data-id="${s.id}">
        <button class="subtask__check" aria-label="Concluir subtarefa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </button>
        <span class="subtask__label">${s.titulo}</span>
        <button class="subtask__del" aria-label="Remover subtarefa" data-del="${s.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>`).join('');

    const pct = Utils.pct(feitas, subs.length);
    subFill.style.width = pct + '%';
    subFill.classList.toggle('progress__fill--success', pct === 100 && subs.length > 0);
    subCount.textContent = `${feitas}/${subs.length}`;

    chipsProgress.classList.toggle('hidden', subs.length === 0);
    chipsSubFill.style.width = pct + '%';
    chipsSubFill.classList.toggle('chips-progress__fill--success', pct === 100 && subs.length > 0);
    chipsSubCount.textContent = `${pct}%`;

    subList.querySelectorAll('.subtask__check').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = subs.find(x => x.id === btn.closest('.subtask').getAttribute('data-id'));
        s.done = !s.done;
        Storage.gravar(KEY_SUBS, subs);
        pintarSubs();
        atualizarSpec();
      });
    });
    subList.querySelectorAll('.subtask__del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del');
        subs = subs.filter(x => x.id !== id);
        Storage.gravar(KEY_SUBS, subs);
        pintarSubs();
        atualizarSpec();
      });
    });
  }

  subInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && subInput.value.trim()) {
      subs.push({ id: 's' + Date.now(), titulo: subInput.value.trim(), done: false });
      subInput.value = '';
      Storage.gravar(KEY_SUBS, subs);
      pintarSubs();
      atualizarSpec();
    }
  });
  pintarSubs();

  /* ── Painel de especificações ─────────────────────────── */
  function atualizarSpec() {
    if (!tarefa) return;
    const isDone = detail.classList.contains('is-done');
    document.getElementById('specStatus').textContent   = isDone ? 'Concluída' : 'Aberta';
    document.getElementById('specStatus').style.color   = isDone ? 'var(--color-success)' : '';
    document.getElementById('specCiclo').textContent    = cicloAtual !== 'none' ? Cycle.rotulo(cicloAtual) : '—';

    const feitas = subs.filter(s => s.done).length;
    document.getElementById('specSubs').textContent = `${feitas} / ${subs.length}`;

    const ativos = [...grid.querySelectorAll('.module-toggle.is-on')].map(b => {
      const label = { foco: 'Foco', ciclo: 'Ciclo', prioridade: 'Prioridade', tempo: 'Tempo', notas: 'Notas', subtarefas: 'Subtarefas' };
      return label[b.getAttribute('data-mod')] || b.getAttribute('data-mod');
    });
    document.getElementById('specMods').textContent = ativos.length ? ativos.join(', ') : '—';
  }

  /* ── Botão "Iniciar foco" ─────────────────────────────── */
  const focoBtn = document.getElementById('focoBtn');
  focoBtn.addEventListener('click', () => {
    // Ativa o módulo Foco se estiver desligado
    const focoToggle = grid.querySelector('[data-mod="foco"]');
    if (!focoToggle.classList.contains('is-on')) {
      focoToggle.classList.add('is-on');
      sincronizarPaineis();
    }
    // Inicia o Pomodoro
    if (!pomo.estado().rodando) {
      pomo.play();
      pomoToggle.textContent = 'Pausar';
      focoBtn.textContent = 'Em foco…';
      focoBtn.disabled = true;
    }
    // Rola até o painel
    panels.querySelector('[data-panel="foco"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ── Pré-popular campos da tarefa existente ──────────────*/
  if (tarefa) {
    // Título
    document.getElementById('title').textContent = tarefa.titulo;
    // Descrição (persistida separadamente)
    const descSalva = Storage.ler(KEY_DESC, '');
    if (descSalva) document.getElementById('desc').textContent = descSalva;
    // Done
    if (tarefa.done) detail.classList.add('is-done');
    // Categoria
    const ci = CATS.findIndex(c => c.nome === tarefa.cat);
    setCat(ci >= 0 ? ci : 0);
    // Prioridade
    setPrio(tarefa.prioridade || 'urgent');
    // Data
    document.getElementById('dataChip').textContent = tarefa.data || 'Hoje';
    // Botões de modo edição
    document.getElementById('saveBtn').textContent = 'Salvar alterações';
    // Mostra painel de especificações
    document.getElementById('specPanel').classList.remove('hidden');
    atualizarSpec();
  }

  // Persiste descrição ao editar
  document.getElementById('desc').addEventListener('input', () => {
    Storage.gravar(KEY_DESC, document.getElementById('desc').textContent);
  });

  /* ── Registrar / Salvar alterações ───────────────────── */
  document.getElementById('saveBtn').addEventListener('click', () => {
    const titulo = document.getElementById('title').textContent.trim();
    if (!titulo) { document.getElementById('title').focus(); return; }

    if (tarefa) {
      // Atualiza tarefa existente
      tarefa.titulo      = titulo;
      tarefa.cat         = CATS[catIdx].nome;
      tarefa.prioridade  = prioridadeAtual;
      tarefa.done        = detail.classList.contains('is-done');
      tarefa.data        = document.getElementById('dataChip').textContent;
      tarefa.quando      = Utils.calcQuando(selectedDate);
      tarefa.dataIso     = Utils.dataIso(selectedDate);
      if (selectedHour !== null) tarefa.hora = formatHora(selectedHour, selectedMin);
      else delete tarefa.hora;
      if (cicloAtual !== 'none') tarefa.recorrencia = cicloAtual;
      Tarefas.salvar(tarefas);
      // Feedback visual
      const btn = document.getElementById('saveBtn');
      btn.textContent = 'Salvo ✓';
      setTimeout(() => { btn.textContent = 'Salvar alterações'; }, 1800);
    } else {
      // Cria nova tarefa
      Tarefas.criar({
        titulo,
        cat:        CATS[catIdx].nome,
        prioridade: prioridadeAtual,
        quando:     Utils.calcQuando(selectedDate),
        data:       document.getElementById('dataChip').textContent,
        dataIso:    Utils.dataIso(selectedDate),
        hora:       selectedHour !== null ? formatHora(selectedHour, selectedMin) : undefined,
      });
      Storage.remover(KEY_SUBS);
      Storage.remover(KEY_NOTAS);
      Storage.remover(KEY_DESC);
      window.location.href = 'todo.html';
    }
  });

  // Inicializa o ring do Pomodoro
  pintarPomo(25 * 60, 25 * 60, 'foco');
})();
