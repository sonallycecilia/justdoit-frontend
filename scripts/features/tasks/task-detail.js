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

  const LABEL_MOD = { foco: 'Foco', ciclo: 'Ciclo', prioridade: 'Prioridade', tempo: 'Tempo', notas: 'Notas', subtarefas: 'Subtarefas' };

  // A partir daqui todas as dependências de atualizarSpec já existem.
  specPronto = true;

  /* ── Painel de especificações ─────────────────────────── */
  function atualizarSpec() {
    if (!tarefa || !specPronto) return;
    const isDone = detail.classList.contains('is-done');
    document.getElementById('specStatus').textContent   = isDone ? 'Concluída' : 'Aberta';
    document.getElementById('specStatus').style.color   = isDone ? 'var(--color-success)' : '';
    document.getElementById('specCiclo').textContent    = cicloAtual !== 'none' ? Cycle.rotulo(cicloAtual) : '—';

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
    // Descrição (persistida separadamente)
    const descSalva = Storage.ler(KEY_DESC, '');
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
          }
          Storage.remover(KEY_SUBS);
          Storage.remover(KEY_NOTAS);
          Storage.remover(KEY_DESC);
          window.location.href = 'todo.html';
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = 'Erro ao salvar';
          console.error('Falha ao criar tarefa:', err);
          setTimeout(() => { btn.textContent = 'Registrar tarefa'; }, 1800);
        });
    }
  });

  // Inicializa o ring do Pomodoro
  pintarPomo(25 * 60, 25 * 60, 'foco');
  } // fim de iniciar()
})();
