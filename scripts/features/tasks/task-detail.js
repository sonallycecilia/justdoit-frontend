/* ============================================================
   JustDoIt — features/tasks/task-detail.js
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

  // Se a tarefa já está no cache local, monta a tela na hora (caso comum, ex.:
  // vindo do TODO). Se NÃO está (aberto por link direto, cache vazio, iframe do
  // drawer do calendário…), busca do backend e só então monta — evitando o
  // formulário vazio, sem travar o caso comum esperando a rede.
  if (taskId && !Tarefas.buscar(taskId) && window.Api) {
    Tarefas.carregarDaApi().then(iniciar, iniciar);
  } else {
    iniciar();
  }

  function iniciar() {
  const tarefas = Tarefas.listar();
  const tarefa  = taskId ? tarefas.find(t => t.id === taskId) : null;

  // Storage keys — por tarefa quando editando, genérico para nova
  const KEY_NOTAS = Storage.KEYS.detalheNotas(taskId);
  const KEY_SUBS  = Storage.KEYS.detalheSubs(taskId);
  const KEY_DESC  = Storage.KEYS.detalheDesc(taskId);
  const KEY_MODS  = taskId ? Storage.KEYS.detalheMods(taskId)  : null;
  const KEY_CICLO = taskId ? Storage.KEYS.detalheCiclo(taskId) : null;

  // atualizarSpec() usa variáveis declaradas mais abaixo (cicloAtual, subs,
  // LABEL_MOD). Como sincronizarPaineis() o chama cedo, este flag evita rodá-lo
  // antes de tudo estar inicializado (senão dá TDZ e a tela não monta).
  let specPronto = false;

  const detail = document.getElementById('detail');

  /* ── Categoria ────────────────────────────────────────── */
  // CATS aponta para a lista viva do módulo (Genérico + categorias do usuário).
  // Categorias.carregar() a preenche com os dados do backend mais abaixo.
  const CATS = Categorias.TODAS;
  const catPick    = document.getElementById('catPick');
  const catChip    = document.getElementById('catChip');
  const catDot     = document.getElementById('catDot');
  const catLabel   = document.getElementById('catLabel');
  const catMenu    = document.getElementById('catMenu');
  const catOverlay = document.getElementById('catOverlay');
  let catIdx = 0;

  function fecharMenuCat() {
    catMenu.hidden = true;
    catOverlay.hidden = true;
    catChip.classList.remove('is-open');
    catChip.setAttribute('aria-expanded', 'false');
  }

  function pintarMenuCat() {
    catMenu.innerHTML = CATS.map((c, i) => `
      <button class="cat-pick__item ${i === catIdx ? 'is-on' : ''}" type="button" role="option"
              aria-selected="${i === catIdx}" data-idx="${i}">
        <span class="cat-pick__dot" style="background:${c.cor}"></span>
        <span class="cat-pick__name">${c.nome}</span>
        ${i === catIdx ? `<span class="cat-pick__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>` : ''}
      </button>`).join('');
  }

  function setCat(idx) {
    catIdx = ((idx % CATS.length) + CATS.length) % CATS.length;
    const cat = CATS[catIdx];
    catChip.setAttribute('data-cat', cat.nome);
    catDot.style.background = cat.cor;
    catLabel.textContent = cat.nome;
    pintarMenuCat();
  }

  // Delegação no contêiner: o menu é re-renderizado a cada seleção.
  catPick.addEventListener('click', e => {
    if (e.target.closest('.cat-pick__overlay')) { fecharMenuCat(); return; }

    const item = e.target.closest('.cat-pick__item');
    if (item) {
      setCat(Number(item.getAttribute('data-idx')));
      fecharMenuCat();
      return;
    }

    if (e.target.closest('.cat-pick__btn')) {
      const abrir = catMenu.hidden;
      catMenu.hidden = !abrir;
      catOverlay.hidden = !abrir;
      catChip.classList.toggle('is-open', abrir);
      catChip.setAttribute('aria-expanded', String(abrir));
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !catMenu.hidden) fecharMenuCat();
  });

  // Carrega as categorias do usuário e seleciona a da tarefa (ou Genérico).
  Categorias.carregar().then(() => {
    const ci = tarefa ? CATS.findIndex(c => c.nome === tarefa.cat) : -1;
    setCat(ci >= 0 ? ci : 0);
  });

  /* ── Concluir tarefa ──────────────────────────────────── */
  document.getElementById('taskCheck').addEventListener('click', () => {
    detail.classList.toggle('is-done');
    atualizarSpec();
  });

  /* ── Seletor de data ─────────────────────────────────────── */
  // Data vinda do calendário (?data=YYYY-MM-DD) tem prioridade: ao abrir pela
  // seta, o detalhe deve refletir o dia mostrado no bloco da grade.
  const dataParam = params.get('data');
  let selectedDate;
  if (dataParam) {
    const [y, mo, d] = dataParam.split('-').map(Number);
    selectedDate = new Date(y, mo - 1, d);
  } else if (tarefa && tarefa.dataIso) {
    const [y, mo, d] = tarefa.dataIso.split('-').map(Number);
    selectedDate = new Date(y, mo - 1, d);
  } else if (tarefa && tarefa.data) {
    const parsed = Utils.parseData(tarefa.data);
    selectedDate = parsed || Utils.hoje();
  } else {
    selectedDate = Utils.hoje();
  }

  DatePicker.criar({
    container:   document.getElementById('datePick'),
    botao:       document.getElementById('dateBtn'),
    selecionada: selectedDate,
    onSelect: (d) => {
      selectedDate = d;
      document.getElementById('dataChip').textContent = Utils.dataRelativa(d);
      
      // Valida o teto ao trocar a data
      if (typeof validarTeto === 'function') {
        validarTeto();
      }
    },
  });

  /* ── Seletor de hora ─────────────────────────────────── */
  // Hora vinda do calendário (?hora=HH:mm) tem prioridade: ao abrir pela seta,
  // o detalhe deve refletir o horário mostrado no bloco da grade.
  const horaParam = params.get('hora');
  const horaFonte = horaParam || (tarefa && tarefa.hora);
  let horaInicial = null, minInicial = 0;
  if (horaFonte) {
    const parts = horaFonte.split(':').map(Number);
    horaInicial = parts[0];
    minInicial  = parts[1] || 0;
  }

  function fmtHora(h, m) { return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

  function onTimeChange(h, m) {
    if (tarefa) { tarefa.hora = fmtHora(h, m); Tarefas.salvar(tarefas); }
    if (taskId && window.parent !== window) {
      window.parent.postMessage({ type: 'jdi-hora-update', taskId, hora: fmtHora(h, m) }, '*');
    }
  }

  function onTimeClear() {
    if (tarefa) { delete tarefa.hora; Tarefas.salvar(tarefas); }
    if (taskId && window.parent !== window) {
      window.parent.postMessage({ type: 'jdi-hora-update', taskId, hora: null }, '*');
    }
  }

  const timePicker = TimePicker.criar({
    container: document.getElementById('timePick'),
    botao:     document.getElementById('timeBtn'),
    chip:      document.getElementById('horaChip'),
    hora:      horaInicial,
    min:       minInicial,
    onSelect:  onTimeChange,
    onClear:   onTimeClear,
  });

  /* ── Duração estimada (Time-Boxing) + Teto biológico ────── */
  const durHoras   = document.getElementById('durHoras');
  const durMinutos = document.getElementById('durMinutos');
  const saveBtnRef = document.getElementById('saveBtn');
  const tetoAlert  = document.getElementById('tetoAlert');

  const TETO_MINUTOS_DIA = 960; // 16h úteis

  function preencherDuracao(min) {
    if (min == null || !durHoras || !durMinutos) return;
    durHoras.value   = Math.floor(min / 60);
    durMinutos.value = min % 60;
  }

  // Pré-popula com o valor do cache, se estiver editando…
  if (tarefa) preencherDuracao(tarefa.duracaoMin);

  // …e confirma com o backend (o tempo estimado vem do timer da tarefa, não da
  // listagem de tarefas — sem isso, o valor some em outro dispositivo/cache novo).
  if (taskId) {
    Tarefas.carregarTempoEstimado(taskId).then(function (min) {
      if (min == null) return;
      if (tarefa) tarefa.duracaoMin = min;
      preencherDuracao(min);
      validarTeto();
    });
  }

  function duracaoAtualMin() {
    if (!durHoras || !durMinutos) return 0;
    const h = parseInt(durHoras.value, 10) || 0;
    const m = parseInt(durMinutos.value, 10) || 0;
    return h * 60 + m;
  }

  // Soma os minutos já ocupados no dia selecionado, ignorando a própria tarefa
  // (importante ao editar: senão ela conta duas vezes).
  function minutosOcupadosNoDia(iso, idExcluir) {
    return Tarefas.listar()
      .filter(t => t.dataIso === iso && t.id !== idExcluir)
      .reduce((soma, t) => soma + (t.duracaoMin || 60), 0); // fallback para 60 min se vazio
  }

  function validarTeto() {
    if (!durHoras || !durMinutos || !saveBtnRef || !tetoAlert) return false;
    const iso     = Utils.dataIso(selectedDate);
    const ocupado = minutosOcupadosNoDia(iso, taskId);
    const excedeu = (ocupado + duracaoAtualMin()) > TETO_MINUTOS_DIA;
    saveBtnRef.disabled = excedeu;
    tetoAlert.classList.toggle('hidden', !excedeu);
    return excedeu;
  }

  if (durHoras && durMinutos) {
    durHoras.addEventListener('input', validarTeto);
    durMinutos.addEventListener('input', validarTeto);
    validarTeto();
  }

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
  let prioridadeAtual = tarefa ? tarefa.prioridade : 'normal';

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
  const tipos     = ['none', ...Object.keys(Cycle.TIPOS), 'custom'];
  const rotuloTipo = t => t === 'none' ? 'Não repete'
                        : t === 'custom' ? 'Personalizado'
                        : Cycle.rotulo(t);
  // Preferimos o rascunho local (KEY_CICLO); se vazio (ex.: outro dispositivo),
  // caímos na recorrência que veio da tarefa (meta/backend); senão "none".
  let cicloAtual = (KEY_CICLO && Storage.ler(KEY_CICLO, null)) || (tarefa && tarefa.recorrencia) || 'none';

  // ── Ciclo personalizado (intervalo × repetições) ──────────────
  const KEY_CICLO_CUSTOM = KEY_CICLO ? KEY_CICLO + '-custom' : null;
  const CICLO_CUSTOM_PADRAO = { count: 12, unit: 'horas', occurrences: 7, startIso: null, startTime: null };
  let cicloCustom = (tarefa && tarefa.recorrenciaCustom)
                 || (KEY_CICLO_CUSTOM && Storage.ler(KEY_CICLO_CUSTOM, null))
                 || Object.assign({}, CICLO_CUSTOM_PADRAO);

  const cycleCustom   = document.getElementById('cycleCustom');
  const cycleInterval = document.getElementById('cycleInterval');
  const cycleUnitBtn  = document.getElementById('cycleUnit');
  const cycleUnitLabel = document.getElementById('cycleUnitLabel');
  const cycleUnitMenu = document.getElementById('cycleUnitMenu');
  const cycleUnitOverlay = document.getElementById('cycleUnitOverlay');
  const cycleReps     = document.getElementById('cycleReps');
  const cycleSummary  = document.getElementById('cycleSummary');
  const cycleStartChip = document.getElementById('cycleStartChip');

  // Data-âncora do ciclo: começa na data da própria tarefa (ou na guardada).
  let cycleStartDate = cicloCustom.startIso
    ? new Date(cicloCustom.startIso + 'T00:00:00')
    : new Date(selectedDate);

  // Preenche os controles com o rascunho atual.
  cycleInterval.value = cicloCustom.count;
  cycleReps.value     = cicloCustom.occurrences;
  cycleUnitBtn.setAttribute('data-unit', cicloCustom.unit);
  cycleUnitLabel.textContent = cicloCustom.unit; // 'horas' | 'dias'
  cycleStartChip.textContent = Utils.dataRelativa(cycleStartDate);

  DatePicker.criar({
    container:   document.getElementById('cycleStartPick'),
    botao:       document.getElementById('cycleStartBtn'),
    selecionada: cycleStartDate,
    onSelect: (d) => { cycleStartDate = d; cycleStartChip.textContent = Utils.dataRelativa(d); sincronizarCustom(); },
  });

  // Data prevista da última ocorrência (informativo do resumo).
  function fimPrevisto(c, inicio) {
    const n = Math.max(0, Number(c.occurrences) - 1);
    const step = Number(c.count) * n;
    const d = new Date(inicio);
    if (c.unit === 'horas') d.setHours(d.getHours() + step);
    else d.setDate(d.getDate() + step);
    return d;
  }

  // Lê os controles → objeto cicloCustom; atualiza resumo, rascunho local e spec.
  function sincronizarCustom() {
    const unit = cycleUnitBtn.getAttribute('data-unit');
    const tv = timePicker.valor();
    cicloCustom = {
      count:       Math.max(1, parseInt(cycleInterval.value, 10) || 1),
      unit:        unit,
      occurrences: Math.max(2, parseInt(cycleReps.value, 10) || 2),
      startIso:    Utils.dataIso(cycleStartDate),
      startTime:   (unit === 'horas' && tv.hora !== null) ? fmtHora(tv.hora, tv.min) : null,
    };
    if (KEY_CICLO_CUSTOM) Storage.gravar(KEY_CICLO_CUSTOM, cicloCustom);

    const u = cicloCustom.unit === 'horas' ? 'h' : (cicloCustom.count === 1 ? ' dia' : ' dias');
    const fim = fimPrevisto(cicloCustom, cycleStartDate);
    cycleSummary.textContent =
      cicloCustom.occurrences + ' ocorrências · a cada ' + cicloCustom.count + u +
      ' · termina ' + Utils.dataRelativa(fim);
    atualizarSpec();
  }

  function toggleCustomVisivel() {
    cycleCustom.hidden = cicloAtual !== 'custom';
    if (cicloAtual === 'custom') sincronizarCustom();
  }

  cycleInterval.addEventListener('input', sincronizarCustom);
  cycleReps.addEventListener('input', sincronizarCustom);

  // Dropdown de unidade (horas ⇄ dias) — menu com chevron, padrão do sistema.
  function abrirMenuUnidade(abrir) {
    cycleUnitMenu.hidden = !abrir;
    cycleUnitOverlay.hidden = !abrir;
    cycleUnitBtn.setAttribute('aria-expanded', String(abrir));
    cycleUnitBtn.classList.toggle('is-open', abrir);
  }
  function selecionarUnidade(u) {
    cycleUnitBtn.setAttribute('data-unit', u);
    cycleUnitLabel.textContent = u;
    cycleUnitMenu.querySelectorAll('.cycle-unit__opt')
      .forEach(o => o.classList.toggle('is-on', o.getAttribute('data-unit') === u));
    abrirMenuUnidade(false);
    sincronizarCustom();
  }
  cycleUnitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirMenuUnidade(cycleUnitMenu.hidden);
  });
  cycleUnitOverlay.addEventListener('click', () => abrirMenuUnidade(false));
  cycleUnitMenu.querySelectorAll('.cycle-unit__opt').forEach(opt => {
    opt.addEventListener('click', (e) => { e.stopPropagation(); selecionarUnidade(opt.getAttribute('data-unit')); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirMenuUnidade(false); });
  selecionarUnidade(cicloCustom.unit); // marca a opção ativa inicial (sem abrir menu)

  cycleOpts.innerHTML = tipos.map(t =>
    `<button class="cycle-opt ${t === cicloAtual ? 'is-on' : ''}" data-cycle="${t}">${rotuloTipo(t)}</button>`
  ).join('');
  cycleOpts.querySelectorAll('.cycle-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      cycleOpts.querySelectorAll('.cycle-opt').forEach(o => o.classList.remove('is-on'));
      opt.classList.add('is-on');
      cicloAtual = opt.getAttribute('data-cycle');
      if (KEY_CICLO) Storage.gravar(KEY_CICLO, cicloAtual);
      toggleCustomVisivel();
      atualizarSpec();
    });
  });
  toggleCustomVisivel(); // estado inicial (mostra o painel se já era custom)

  /* ── Cronômetro de execução (RF13) ───────────────────── */
  const timerDisplay = document.getElementById('timerDisplay');
  const timerToggle  = document.getElementById('timerToggle');
  const timerInitial = taskId ? Storage.ler(Storage.KEYS.detalheTimer(taskId), 0) : 0;

  // Acumula o tempo de execução por dia (lido pelo card "Tempo executado" do
  // dashboard). O cronômetro guarda o total acumulado da tarefa sem data, então
  // registramos só o delta de cada tick no dia de hoje.
  let ultimoTimer = timerInitial;
  function registrarTempoDiario(deltaSeg) {
    if (deltaSeg <= 0) return;
    const log = Storage.ler(Storage.KEYS.TEMPO_DIARIO, {});
    const hoje = Utils.dataIso(new Date());
    log[hoje] = (log[hoje] || 0) + deltaSeg;
    Storage.gravar(Storage.KEYS.TEMPO_DIARIO, log);
  }

  const cron = TaskTimer.criar({
    inicial: timerInitial,
    onTick: (s) => {
      timerDisplay.textContent = TaskTimer.formatar(s);
      if (taskId) Storage.gravar(Storage.KEYS.detalheTimer(taskId), s);
      document.getElementById('specTempo').textContent = TaskTimer.formatar(s);
      registrarTempoDiario(s - ultimoTimer); // ignora reset (delta ≤ 0)
      ultimoTimer = s;
    },
  });
  timerDisplay.textContent = document.getElementById('specTempo').textContent = TaskTimer.formatar(timerInitial);

  timerToggle.addEventListener('click', () => {
    const rodando = cron.toggle();
    timerToggle.textContent = rodando ? 'Pausar' : 'Continuar';
  });
  document.getElementById('timerReset').addEventListener('click', () => {
    cron.reset();
    timerToggle.textContent = 'Iniciar';
    if (taskId) Storage.gravar(Storage.KEYS.detalheTimer(taskId), 0);
  });

  /* ── Foco / Pomodoro (RF06) ───────────────────────────── */
  const pomoRing   = document.getElementById('pomoRing');
  const pomoTime   = document.getElementById('pomoTime');
  const pomoPhase  = document.getElementById('pomoPhase');
  const pomoToggle = document.getElementById('pomoToggle');
  const pomoReset  = document.getElementById('pomoReset');
  let ciclosPomodoro = taskId ? Storage.ler(Storage.KEYS.detalheCiclos(taskId), 0) : 0;

  function pintarPomo(restante, dur, fase) {
    pomoTime.textContent = Focus.formatar(restante);
    const pct = dur ? ((dur - restante) / dur) * 100 : 0;
    pomoRing.style.setProperty('--pct', pct.toFixed(1));
    pomoRing.style.setProperty('--color-accent', fase === 'pausa' ? 'var(--color-success)' : '');
  }

  const FOCO_MIN = 25;

  // Cada bloco de foco concluído entra no log diário (lido pelo card
  // "Foco hoje" do dashboard), agregado por dia.
  function registrarFocoDiario() {
    const log = Storage.ler(Storage.KEYS.FOCO_DIARIO, {});
    const hoje = Utils.dataIso(new Date());
    const dia = log[hoje] || { ciclos: 0, minutos: 0 };
    dia.ciclos += 1;
    dia.minutos += FOCO_MIN;
    log[hoje] = dia;
    Storage.gravar(Storage.KEYS.FOCO_DIARIO, log);
  }

  const pomo = Focus.criar({
    focoMin: FOCO_MIN,
    onTick: (restante, dur) => {
      const e = pomo.estado();
      pintarPomo(restante, dur, e.fase);
    },
    onFase: (fase, ciclo) => {
      pomoPhase.textContent = `${fase === 'foco' ? 'Foco' : 'Pausa'} · ciclo ${ciclo}/4`;
      if (fase === 'pausa') {
        ciclosPomodoro++;
        if (taskId) Storage.gravar(Storage.KEYS.detalheCiclos(taskId), ciclosPomodoro);
        document.getElementById('specPomos').textContent = String(ciclosPomodoro);
        registrarFocoDiario();
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
        sincronizarConclusaoPorSubs();
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

  // Conclusão em cascata (RF03): quando TODAS as subtarefas ficam concluídas, a
  // tarefa é marcada como concluída — e persistida no backend na hora (não só ao
  // clicar "Salvar"). Se uma subtarefa é reaberta, a tarefa volta a ficar aberta.
  // Só dispara quando o estado realmente muda, evitando toggles redundantes.
  function sincronizarConclusaoPorSubs() {
    if (subs.length === 0) return;               // sem subtarefas: não interfere
    const todasFeitas = subs.every(s => s.done);
    const estaDone    = detail.classList.contains('is-done');
    if (todasFeitas === estaDone) return;        // já está no estado desejado

    detail.classList.toggle('is-done', todasFeitas);
    atualizarSpec();

    // Mantém a referência local em sincronia para o "Salvar" não re-alternar o
    // status (ele compara detail.is-done com tarefa.done).
    if (tarefa) tarefa.done = todasFeitas;

    // Persiste no banco na hora (só faz sentido p/ tarefa já existente).
    // toggleDone alterna com base no cache; só chamamos se o cache diverge do
    // alvo, senão inverteríamos o estado por engano.
    if (taskId) {
      const cache = Tarefas.buscar(taskId);
      if (cache && cache.done !== todasFeitas) {
        Tarefas.toggleDone(taskId).catch(err => {
          console.error('Falha ao sincronizar conclusão por subtarefas:', err);
        });
      }
    }
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

  const LABEL_MOD = { foco: 'Foco', ciclo: 'Ciclo', prioridade: 'Prioridade', tempo: 'Tempo', notas: 'Notas', subtarefas: 'Subtarefas' };

  // A partir daqui todas as dependências de atualizarSpec já existem.
  specPronto = true;

  /* ── Painel de especificações ─────────────────────────── */
  function atualizarSpec() {
    if (!tarefa || !specPronto) return;
    const isDone = detail.classList.contains('is-done');
    document.getElementById('specStatus').textContent   = isDone ? 'Concluída' : 'Aberta';
    document.getElementById('specStatus').style.color   = isDone ? 'var(--color-success)' : '';
    document.getElementById('specCiclo').textContent    =
      cicloAtual === 'custom' ? Cycle.rotuloCustom(cicloCustom)
      : cicloAtual !== 'none' ? Cycle.rotulo(cicloAtual) : '—';

    const feitas = subs.filter(s => s.done).length;
    document.getElementById('specSubs').textContent = `${feitas} / ${subs.length}`;

    const ativos = [...grid.querySelectorAll('.module-toggle.is-on')].map(b => {
      const mod = b.getAttribute('data-mod');
      return LABEL_MOD[mod] || mod;
    });
    document.getElementById('specMods').textContent = ativos.length ? ativos.join(', ') : '—';
  }

  /* ── Botão "Iniciar foco" (opcional — pode não existir no HTML) ── */
  const focoBtn = document.getElementById('focoBtn');
  if (focoBtn) {
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
  }

  /* ── Pré-popular campos da tarefa existente ──────────────*/
  if (tarefa) {
    // Título
    document.getElementById('title').textContent = tarefa.titulo;
    // Descrição: prioriza o rascunho local (KEY_DESC); se vazio, usa a que o
    // backend guardou (tarefa.descricao) — assim ela aparece mesmo em outro
    // dispositivo ou quando o save local foi pulado.
    const descSalva = Storage.ler(KEY_DESC, '') || tarefa.descricao || '';
    if (descSalva) document.getElementById('desc').textContent = descSalva;
    // Done
    if (tarefa.done) detail.classList.add('is-done');
    // Categoria: selecionada de forma assíncrona após Categorias.carregar()
    // Prioridade
    setPrio(tarefa.prioridade || 'normal');
    // Data — a do calendário (?data) tem prioridade sobre a salva na tarefa.
    document.getElementById('dataChip').textContent = dataParam
      ? Utils.dataRelativa(selectedDate)
      : (tarefa.data || 'Hoje');
    // Botões de modo edição
    document.getElementById('saveBtn').textContent = 'Salvar alterações';
  }

  // Persiste descrição ao editar
  document.getElementById('desc').addEventListener('input', () => {
    Storage.gravar(KEY_DESC, document.getElementById('desc').textContent);
  });

  /* ── Registrar / Salvar alterações ───────────────────── */
  document.getElementById('saveBtn').addEventListener('click', () => {
    const titulo = document.getElementById('title').textContent.trim();
    if (!titulo) { document.getElementById('title').focus(); return; }

    const tv = timePicker.valor();
    const horaValor = tv.hora !== null ? fmtHora(tv.hora, tv.min) : undefined;

    const descricao = document.getElementById('desc').textContent.trim();
    const recorrencia = cicloAtual !== 'none' ? cicloAtual : undefined;
    // Objeto do ciclo custom quando ativo; null limpa o rascunho salvo ao trocar
    // para um preset/"não repete".
    const recorrenciaCustom = cicloAtual === 'custom' ? cicloCustom : null;
    const btn = document.getElementById('saveBtn');

    if (tarefa) {
      // Atualiza tarefa existente — PUT no backend (task-service).
      const querConcluir = detail.classList.contains('is-done');
      const doneMudou    = querConcluir !== tarefa.done;
      const rotuloPadrao = 'Salvar alterações';

      btn.disabled = true;
      Tarefas.atualizar(taskId, {
        titulo,
        descricao,
        cat:         CATS[catIdx].nome,
        categoriaId: CATS[catIdx].id,
        prioridade:  prioridadeAtual,
        dataIso:     Utils.dataIso(selectedDate),
        hora:        horaValor,
        recorrencia,
        recorrenciaCustom,
        duracaoMin:  duracaoAtualMin(), // 👈 Tempo estimado enviado ao backend
      })
        // Status (concluída/aberta) é persistido por endpoint próprio.
        .then(() => doneMudou ? Tarefas.toggleDone(taskId) : null)
        .then(() => {
          btn.disabled = false;
          btn.textContent = 'Salvo ✓';
          setTimeout(() => { btn.textContent = rotuloPadrao; }, 1800);
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = 'Erro ao salvar';
          
          // 👇 NOVO: Chamada do Toast para erro 400
          if (err && err.status === 400) {
            Utils.toast(err.error || err.message || 'Limite de tempo do dia excedido.', 'error');
          }
          console.error('Falha ao salvar tarefa:', err);
          
          setTimeout(() => { btn.textContent = rotuloPadrao; }, 1800);
        });
    } else {
      // Cria nova tarefa — POST no backend. Só navega DEPOIS que a
      // requisição conclui, senão a navegação aborta o fetch em andamento.
      btn.disabled = true;
      Tarefas.criar({
        titulo,
        descricao,
        cat:         CATS[catIdx].nome,
        categoriaId: CATS[catIdx].id,
        prioridade:  prioridadeAtual,
        quando:      Utils.calcQuando(selectedDate),
        data:        document.getElementById('dataChip').textContent,
        dataIso:     Utils.dataIso(selectedDate),
        hora:        horaValor,
        recorrencia,
        recorrenciaCustom,
        duracaoMin:  duracaoAtualMin(), // 👈 Tempo estimado enviado ao backend
      })
        .then((nova) => {
          const novoId = nova && nova.id;
          // As configurações de detalhe (subtarefas, notas, descrição, módulos
          // ativos, ciclo) foram criadas sob as chaves genéricas de "nova
          // tarefa" — ou nem chegaram a ser gravadas (módulos/ciclo, cujas
          // KEY_* são null quando não há id). Grava tudo sob o id definitivo,
          // senão a tarefa reabre sem essas configurações.
          if (novoId) {
            Storage.gravar(Storage.KEYS.detalheSubs(novoId), subs);
            Storage.gravar(Storage.KEYS.detalheNotas(novoId), notes.value);
            Storage.gravar(Storage.KEYS.detalheDesc(novoId), descricao);
            const modsAtivos = [...grid.querySelectorAll('.module-toggle.is-on')]
              .map(b => b.getAttribute('data-mod'));
            Storage.gravar(Storage.KEYS.detalheMods(novoId), modsAtivos);
            Storage.gravar(Storage.KEYS.detalheCiclo(novoId), cicloAtual);
            if (cicloAtual === 'custom') {
              Storage.gravar(Storage.KEYS.detalheCiclo(novoId) + '-custom', cicloCustom);
            }
          }
          Storage.remover(KEY_SUBS);
          Storage.remover(KEY_NOTAS);
          Storage.remover(KEY_DESC);
          window.location.href = 'todo.html';
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = 'Erro ao salvar';
          
          // 👇 NOVO: Chamada do Toast para erro 400
          if (err && err.status === 400) {
            Utils.toast(err.error || err.message || 'Limite de tempo do dia excedido.', 'error');
          }
          console.error('Falha ao criar tarefa:', err);
          
          setTimeout(() => { btn.textContent = 'Registrar tarefa'; }, 1800);
        });
    }
  });

  // Inicializa o ring do Pomodoro
  pintarPomo(25 * 60, 25 * 60, 'foco');
  } // fim de iniciar()
})();