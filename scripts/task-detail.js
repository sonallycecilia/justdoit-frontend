/* ============================================================
   JustDoIt — task-detail.js
   Especificações de uma tarefa: carrega por ?id=, permite editar,
   iniciar foco, configurar módulos, subtarefas e notas.
   Modo "nova tarefa" quando nenhum id é passado na URL.
   ============================================================ */
(function () {
  'use strict';

  /* ── Semente (espelha todo.js para fallback offline) ──── */
  const SEMENTE = [
    { id: 'a1', titulo: 'Revisar Cálculo II — capítulo 4',       cat: 'Estudos',  prioridade: 'urgent',    quando: 'today', data: 'Hoje',        done: false },
    { id: 'a2', titulo: 'Entregar relatório do projeto',           cat: 'Genérico', prioridade: 'urgent',    quando: 'today', data: 'Hoje',        done: false },
    { id: 'a3', titulo: 'Pagar conta de luz',                      cat: 'Casa',     prioridade: 'important', quando: 'today', data: 'Hoje',        done: false },
    { id: 'a4', titulo: 'Responder e-mail do cliente',             cat: 'Genérico', prioridade: 'important', quando: 'week',  data: 'Amanhã',      done: false },
    { id: 'a5', titulo: 'Ler artigo de Sistemas Distribuídos',     cat: 'Estudos',  prioridade: 'normal',    quando: 'week',  data: 'Qua, 10 jun', done: false },
    { id: 'a6', titulo: 'Trocar o filtro de água',                 cat: 'Casa',     prioridade: 'normal',    quando: 'past',  data: 'Atrasada',    done: false },
    { id: 'a7', titulo: 'Planejar a próxima semana',               cat: 'Genérico', prioridade: 'low',       quando: 'week',  data: 'Dom, 14 jun', done: false },
    { id: 'a8', titulo: 'Organizar fotos do celular',              cat: 'Casa',     prioridade: 'low',       quando: 'all',   data: 'Sem data',    done: false },
    { id: 'a9', titulo: 'Caminhada de 30 minutos',                 cat: 'Casa',     prioridade: 'normal',    quando: 'today', data: 'Hoje',        done: true  },
  ];

  /* ── URL param / modo ─────────────────────────────────── */
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');

  const tarefas = Storage.ler('todo-tarefas', SEMENTE);
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
  const CATS = [
    { nome: 'Estudos',  cor: 'var(--color-cat-estudos)'  },
    { nome: 'Casa',     cor: 'var(--color-cat-casa)'     },
    { nome: 'Genérico', cor: 'var(--color-cat-generico)' },
  ];
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
  const datePick = document.getElementById('datePick');
  const dateBtn  = document.getElementById('dateBtn');

  const _hoje = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();

  const _MESES_PT    = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const _MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const _DIAS_ABREV  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  function _fmtData(d) {
    const amanha = new Date(_hoje); amanha.setDate(_hoje.getDate() + 1);
    if (d.toDateString() === _hoje.toDateString())  return 'Hoje';
    if (d.toDateString() === amanha.toDateString()) return 'Amanhã';
    return `${_DIAS_ABREV[d.getDay()]}, ${d.getDate()} ${_MESES_ABREV[d.getMonth()]}`;
  }

  function _calcQuando(d) {
    const fim = new Date(_hoje); fim.setDate(_hoje.getDate() + 7);
    if (d < _hoje) return 'past';
    if (d.toDateString() === _hoje.toDateString()) return 'today';
    if (d <= fim) return 'week';
    return 'all';
  }

  function _isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function _parseDataStr(str) {
    if (!str || str === 'Sem data') return null;
    if (str === 'Hoje')     return new Date(_hoje);
    if (str === 'Atrasada') { const d = new Date(_hoje); d.setDate(_hoje.getDate() - 1); return d; }
    if (str === 'Amanhã')   { const d = new Date(_hoje); d.setDate(_hoje.getDate() + 1); return d; }
    const match = str.match(/(\d+)\s+(\w{3})/);
    if (match) {
      const dia = parseInt(match[1]);
      const m   = _MESES_ABREV.indexOf(match[2].toLowerCase());
      if (m !== -1) {
        const d = new Date(_hoje.getFullYear(), m, dia);
        if (d < _hoje) d.setFullYear(_hoje.getFullYear() + 1);
        return d;
      }
    }
    return null;
  }

  let selectedDate = (() => {
    if (tarefa && tarefa.dataIso) {
      const [y, mo, d] = tarefa.dataIso.split('-').map(Number);
      return new Date(y, mo - 1, d);
    }
    if (tarefa && tarefa.data) {
      const parsed = _parseDataStr(tarefa.data);
      if (parsed) return parsed;
    }
    return new Date(_hoje);
  })();

  let _pickerOpen = false;
  let _pickerView = { year: selectedDate.getFullYear(), month: selectedDate.getMonth() };

  function _fecharPicker() {
    _pickerOpen = false;
    dateBtn.classList.remove('is-open');
    datePick.querySelectorAll('.date-pick__overlay, .date-pick__menu').forEach(el => el.remove());
  }

  function _renderPicker() {
    datePick.querySelectorAll('.date-pick__overlay, .date-pick__menu').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'date-pick__overlay';
    overlay.addEventListener('click', _fecharPicker);
    datePick.appendChild(overlay);

    const { year, month } = _pickerView;
    const firstDow  = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();

    const menu = document.createElement('div');
    menu.className = 'date-pick__menu';

    const head = document.createElement('div');
    head.className = 'date-pick__head';

    const btnPrev = document.createElement('button');
    btnPrev.type = 'button';
    btnPrev.className = 'date-pick__nav';
    btnPrev.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    btnPrev.addEventListener('click', e => {
      e.stopPropagation();
      _pickerView = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
      _renderPicker();
    });

    const btnNext = document.createElement('button');
    btnNext.type = 'button';
    btnNext.className = 'date-pick__nav';
    btnNext.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    btnNext.addEventListener('click', e => {
      e.stopPropagation();
      _pickerView = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
      _renderPicker();
    });

    const monthLabel = document.createElement('span');
    monthLabel.className = 'date-pick__month';
    monthLabel.textContent = _MESES_PT[month] + ' ' + year;

    head.appendChild(btnPrev);
    head.appendChild(monthLabel);
    head.appendChild(btnNext);
    menu.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'date-pick__grid';

    ['D','S','T','Q','Q','S','S'].forEach(l => {
      const el = document.createElement('div');
      el.className = 'date-pick__dow';
      el.textContent = l;
      grid.appendChild(el);
    });

    for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= totalDias; d++) {
      const date    = new Date(year, month, d);
      const isToday = date.toDateString() === _hoje.toDateString();
      const isOn    = date.toDateString() === selectedDate.toDateString();

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-pick__day' + (isToday ? ' is-today' : '') + (isOn ? ' is-on' : '');
      btn.textContent = d;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        selectedDate = new Date(year, month, d);
        document.getElementById('dataChip').textContent = _fmtData(selectedDate);
        _fecharPicker();
      });
      grid.appendChild(btn);
    }

    menu.appendChild(grid);
    datePick.appendChild(menu);
  }

  dateBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (_pickerOpen) { _fecharPicker(); return; }
    _pickerOpen = true;
    _pickerView = { year: selectedDate.getFullYear(), month: selectedDate.getMonth() };
    dateBtn.classList.add('is-open');
    _renderPicker();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _pickerOpen) _fecharPicker();
  });

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
    // Pomodoro ring inicial
    pintarPomo(25 * 60, 25 * 60, 'foco');
  } else {
    // Modo nova tarefa: inicializa ring
    pintarPomo(25 * 60, 25 * 60, 'foco');
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
      tarefa.quando      = _calcQuando(selectedDate);
      tarefa.dataIso     = _isoDate(selectedDate);
      if (cicloAtual !== 'none') tarefa.recorrencia = cicloAtual;
      Storage.gravar('todo-tarefas', tarefas);
      // Feedback visual
      const btn = document.getElementById('saveBtn');
      btn.textContent = 'Salvo ✓';
      setTimeout(() => { btn.textContent = 'Salvar alterações'; }, 1800);
    } else {
      // Cria nova tarefa
      tarefas.unshift({
        id:         't' + Date.now(),
        titulo,
        cat:        CATS[catIdx].nome,
        prioridade: prioridadeAtual,
        quando:     _calcQuando(selectedDate),
        data:       document.getElementById('dataChip').textContent,
        dataIso:    _isoDate(selectedDate),
        done:       false,
      });
      Storage.gravar('todo-tarefas', tarefas);
      Storage.remover(KEY_SUBS);
      Storage.remover(KEY_NOTAS);
      Storage.remover(KEY_DESC);
      window.location.href = 'todo.html';
    }
  });

  // Inicializa o ring do Pomodoro (necessário mesmo sem task)
  pintarPomo(25 * 60, 25 * 60, 'foco');
})();
