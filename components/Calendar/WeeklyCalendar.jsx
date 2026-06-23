/* ============================================================
   JustDoIt — WeeklyCalendar.jsx
   Calendário com alternância dia / semana / mês.
   Clicar num bloco → modal pequeno centralizado.
   Clicar na seta do bloco → drawer lateral redimensionável.
   ============================================================ */
const { useState, useRef, useEffect } = React;

const START = 6, END = 23;
const ROW_H  = 56;
const CAT_LABEL  = { estudos: 'Estudos', casa: 'Casa', generico: 'Genérico' };
const CAT_MAP    = { 'Estudos': 'estudos', 'Casa': 'casa', 'Genérico': 'generico' };
const PRIO_LABEL = { urgent: 'Urgente', important: 'Importante', normal: 'Normal', low: 'Baixa' };
const MOD_LABEL  = { foco: 'Foco', ciclo: 'Ciclo', tempo: 'Tempo', notas: 'Notas' };
const DOW_JUN26  = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM']; // jun-1-2026 = Seg

function gerarDiasSemana() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dow: label, num: d.getDate(), hoje: d.toDateString() === today.toDateString() };
  });
}

function fmtHora(x) {
  const h = Math.floor(x);
  const m = Math.round((x % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Icon({ d, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ── WeekView ─────────────────────────────────────────────── */
function WeekView({ dias, eventos, mover, adicionar, onOpen, onDrawer }) {
  const [arrastando, setArrastando] = useState(null);
  const [over, setOver]             = useState(null);
  const horas = [];
  for (let h = START; h <= END; h++) horas.push(h);

  function soltar(diaIdx, e) {
    e.preventDefault();
    const taskJson = e.dataTransfer.getData('application/jdi-task');
    if (taskJson) {
      try {
        const task = JSON.parse(taskJson);
        const rect = e.currentTarget.getBoundingClientRect();
        const ini  = Math.max(START, Math.min(END - 1, START + Math.round(((e.clientY - rect.top) / ROW_H) * 2) / 2));
        adicionar({ id: 'ext-' + task.id + '-' + Date.now(), d: diaIdx, ini, fim: ini + 1, cat: CAT_MAP[task.cat] || 'generico', prio: task.prioridade || 'normal', titulo: task.titulo, mod: null, taskId: task.id });
      } catch (_) {}
      setArrastando(null); setOver(null);
      return;
    }
    if (!arrastando) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const novaIni = Math.max(START, Math.min(END - 0.5, START + Math.round(((e.clientY - rect.top) / ROW_H) * 2) / 2));
    mover(arrastando.id, diaIdx, novaIni);
    setArrastando(null); setOver(null);
  }

  return (
    <div className="cal-grid" style={{ '--cols': 7 }}>
      <div className="cal-head">
        <div className="cal-corner"></div>
        {dias.map((d, i) => (
          <div key={i} className={`cal-day ${d.hoje ? 'is-today' : ''}`}>
            <div className="cal-day__dow">{d.dow}</div>
            <div className="cal-day__num">{d.num}</div>
          </div>
        ))}
      </div>
      <div className="cal-body">
        <div className="cal-rail">
          {horas.map(h => <div key={h} className="cal-slot"><span>{String(h).padStart(2,'0')}:00</span></div>)}
        </div>
        {dias.map((d, di) => (
          <div key={di}
            className={`cal-col ${d.hoje ? 'is-today' : ''} ${over === di ? 'drag-over' : ''}`}
            style={{ height: `${(END - START) * ROW_H}px` }}
            onDragOver={e => { e.preventDefault(); setOver(di); }}
            onDragLeave={() => setOver(o => o === di ? null : o)}
            onDrop={e => soltar(di, e)}
          >
            {eventos.filter(ev => ev.d === di).map(ev => (
              <TimeBlock key={ev.id} ev={ev} rowH={ROW_H} startHour={START}
                dragging={arrastando && arrastando.id === ev.id}
                onDragStart={setArrastando}
                onDragEnd={() => { setArrastando(null); setOver(null); }}
                onOpen={onOpen} onDrawer={onDrawer} />
            ))}
            {d.hoje && <div className="cal-now" style={{ top: `${((() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })() - START) * ROW_H}px` }}></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DayView ──────────────────────────────────────────────── */
function DayView({ dia, eventos, mover, onOpen, onDrawer }) {
  const horas = [];
  for (let h = START; h <= END; h++) horas.push(h);
  const doDia = eventos.filter(ev => ev.d === dia.idx);
  return (
    <div className="cal-grid" style={{ '--cols': 1, minWidth: 'auto' }}>
      <div className="cal-head">
        <div className="cal-corner"></div>
        <div className={`cal-day ${dia.hoje ? 'is-today' : ''}`}>
          <div className="cal-day__dow">{dia.dow}</div>
          <div className="cal-day__num">{dia.num}</div>
        </div>
      </div>
      <div className="cal-body">
        <div className="cal-rail">
          {horas.map(h => <div key={h} className="cal-slot"><span>{String(h).padStart(2,'0')}:00</span></div>)}
        </div>
        <div className={`cal-col ${dia.hoje ? 'is-today' : ''}`} style={{ height: `${(END - START) * ROW_H}px` }}>
          {doDia.map(ev => <TimeBlock key={ev.id} ev={ev} rowH={ROW_H} startHour={START}
            dragging={false} onDragStart={() => {}} onDragEnd={() => {}}
            onOpen={onOpen} onDrawer={onDrawer} />)}
          {dia.hoje && <div className="cal-now" style={{ top: `${((() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })() - START) * ROW_H}px` }}></div>}
        </div>
      </div>
    </div>
  );
}

/* ── MonthView ────────────────────────────────────────────── */
function MonthView({ eventos }) {
  const totalDias = 30;
  const cells = [];
  for (let n = 1; n <= totalDias; n++) cells.push({ num: n, hoje: n === 11, evs: eventos.filter(ev => ev.num === n) });
  while (cells.length % 7 !== 0) cells.push({ out: true });
  return (
    <div className="cal-month">
      <div className="cal-month__grid">
        {DOW_JUN26.map(d => <div key={d} className="cal-month__dow">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={`cal-month__cell ${c.out ? 'is-out' : ''} ${c.hoje ? 'is-today' : ''}`}>
            {!c.out && <span className="cal-month__num">{c.num}</span>}
            {!c.out && c.evs.slice(0, 3).map(ev => (
              <span key={ev.id} className="cal-month__ev">
                <span className="cal-month__dot" style={{ background: `var(--color-cat-${ev.cat})` }}></span>
                {ev.titulo}
              </span>
            ))}
            {!c.out && c.evs.length > 3 && <span className="cal-month__ev" style={{ color: 'var(--color-text-muted)' }}>+{c.evs.length - 3} mais</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── TimePickerInline ────────────────────────────────────── */
function TimePickerInline({ ini, fim, onChange }) {
  const [open, setOpen] = useState(false);
  const h = Math.floor(ini);
  const m = Math.round((ini % 1) * 60);

  function selHora(novoH) {
    const novoIni = novoH + m / 60;
    const dur = fim - ini;
    onChange(novoIni, Math.round((novoIni + dur) * 4) / 4);
  }
  function selMin(novoM) {
    const novoIni = h + novoM / 60;
    const dur = fim - ini;
    onChange(novoIni, Math.round((novoIni + dur) * 4) / 4);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`task-modal__time-btn${open ? ' is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {fmtHora(ini)} – {fmtHora(fim)}
        <Icon d="m6 9 6 6 6-6" size={11} />
      </button>
      {open && <>
        <div className="task-modal__date-overlay" onClick={() => setOpen(false)} />
        <div className="task-modal__time-menu">
          <div className="task-modal__time-label">Hora</div>
          <div className="task-modal__time-hours">
            {Array.from({ length: 24 }, (_, i) => (
              <button key={i}
                className={`task-modal__time-cell${i === h ? ' is-on' : ''}`}
                onClick={e => { e.stopPropagation(); selHora(i); }}
              >
                {String(i).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="task-modal__time-label" style={{ marginTop: 6 }}>Minuto</div>
          <div className="task-modal__time-mins">
            {[0, 15, 30, 45].map(n => (
              <button key={n}
                className={`task-modal__time-min${n === m ? ' is-on' : ''}`}
                onClick={e => { e.stopPropagation(); selMin(n); }}
              >
                :{String(n).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      </>}
    </div>
  );
}

/* ── TaskModal (popup centralizado) ──────────────────────── */
function TaskModal({ ev, dia, onClose, onUpdate }) {
  const [dateOpen, setDateOpen] = useState(false);
  if (!ev) return null;

  const TODAY_NUM = 11;
  const WEEK_NUMS = [8,9,10,11,12,13,14];
  const curNum = ev.dateNum !== undefined ? ev.dateNum : (dia ? dia.num : TODAY_NUM);
  const curDow = ev.dow || (dia ? dia.dow : DOW_JUN26[(curNum - 1) % 7]);

  return (
    <div className="task-modal__backdrop" onClick={onClose}>
      <div className="task-modal" onClick={e => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className="task-modal__head">
          <span className="task-modal__head-cat" style={{ background: `var(--color-cat-${ev.cat})` }}></span>
          <span className={`task-modal__title${ev.done ? ' is-done' : ''}`}>{ev.titulo}</span>
          <button className="btn-icon task-modal__close" onClick={onClose} aria-label="Fechar">
            <Icon d="M18 6 6 18|M6 6l12 12" />
          </button>
        </div>

        {/* Metadados */}
        <div className="task-modal__info">
          <div className="task-modal__row">
            <span className="task-modal__label">Horário</span>
            <span className="task-modal__val">
              <TimePickerInline ini={ev.ini} fim={ev.fim} onChange={(novoIni, novoFim) => onUpdate({ ini: novoIni, fim: novoFim })} />
            </span>
          </div>
          <div className="task-modal__row">
            <span className="task-modal__label">Dia</span>
            <span className="task-modal__val">
              <div className="task-modal__date-wrap">
                <button className={`task-modal__date-btn${dateOpen ? ' is-open' : ''}`} onClick={() => setDateOpen(o => !o)}>
                  {curDow}, {curNum} jun
                  <Icon d="m6 9 6 6 6-6" size={13} />
                </button>
                {dateOpen && <>
                  <div className="task-modal__date-overlay" onClick={() => setDateOpen(false)} />
                  <div className="task-modal__date-menu">
                    <div className="task-modal__cal-head">junho 2026</div>
                    <div className="task-modal__cal-grid">
                      {DOW_JUN26.map(d => <div key={d} className="task-modal__cal-dow">{d.slice(0,1)}</div>)}
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                        <button key={n}
                          className={`task-modal__cal-day${n === curNum ? ' is-on' : ''}${n === TODAY_NUM ? ' is-today' : ''}${WEEK_NUMS.includes(n) ? ' is-week' : ''}`}
                          onClick={() => { onUpdate({ dateNum: n, dow: DOW_JUN26[(n-1)%7] }); setDateOpen(false); }}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                </>}
              </div>
            </span>
          </div>
          {ev.mod && (
            <div className="task-modal__row">
              <span className="task-modal__label">Modo</span>
              <span className="task-modal__val">{MOD_LABEL[ev.mod] || ev.mod}</span>
            </div>
          )}
        </div>

        {/* Controles interativos */}
        <div className="task-modal__controls">
          <button className={`task-modal__done-btn${ev.done ? ' is-done' : ''}`} onClick={() => onUpdate({ done: !ev.done })}>
            <Icon d={ev.done ? 'M9 12l2 2 4-4|M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0' : 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'} size={15} />
            {ev.done ? 'Reabrir tarefa' : 'Marcar como concluída'}
          </button>

          <div className="task-modal__ctrl-group">
            <div className="task-modal__ctrl-label">Prioridade</div>
            <div className="task-modal__prio-row">
              {['urgent','important','normal','low'].map(n => (
                <button key={n} className={`task-modal__prio-opt${ev.prio === n ? ' is-on' : ''}`} data-prio={n} onClick={() => onUpdate({ prio: n })}>
                  <span className="task-modal__prio-dot"></span>
                  {PRIO_LABEL[n]}
                </button>
              ))}
            </div>
          </div>

          <div className="task-modal__ctrl-group">
            <div className="task-modal__ctrl-label">Categoria</div>
            <div className="task-modal__cat-row">
              {Object.entries(CAT_LABEL).map(([key, label]) => (
                <button key={key} className={`task-modal__cat-opt${ev.cat === key ? ' is-on' : ''}`} onClick={() => onUpdate({ cat: key })}>
                  <span className="task-modal__cat-dot" style={{ background: `var(--color-cat-${key})` }}></span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {ev.taskId && (
            <a href={`task-detail.html?id=${ev.taskId}`} className="btn btn--secondary btn--sm" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none' }}>
              Ver tarefa completa
              <Icon d="m9 18 6-6-6-6" size={14} />
            </a>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── PainelDrawer (iframe da página completa na lateral) ──── */
function PainelDrawer({ ev, dias, onClose }) {
  const DRAWER_MIN = 380, DRAWER_MAX = 900;
  const [width, setWidth] = useState(520);

  const resizing    = useRef(false);
  const resizeStart = useRef({ x: 0, w: 0 });

  useEffect(() => {
    function onMove(e) {
      if (!resizing.current) return;
      const delta = resizeStart.current.x - e.clientX;
      setWidth(Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, resizeStart.current.w + delta)));
    }
    function onUp() { resizing.current = false; }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // Constrói URL do iframe
  let src;
  if (ev.taskId) {
    src = `task-detail.html?id=${ev.taskId}&embed=1`;
  } else {
    const dia = dias[ev.d];
    const p = new URLSearchParams({
      evId: ev.id, ini: ev.ini, fim: ev.fim,
      titulo: ev.titulo, cat: ev.cat, prio: ev.prio,
      dow: dia ? dia.dow : '', dateNum: dia ? dia.num : '',
      embed: '1',
    });
    src = `event-summary.html?${p.toString()}`;
  }

  return (
    <div className="cal-drawer is-open" style={{ width }}>
      <div className="cal-drawer__resize"
        onMouseDown={e => { e.preventDefault(); resizing.current = true; resizeStart.current = { x: e.clientX, w: width }; }}
      />
      <div className="cal-drawer__head">
        <button className="btn-icon" onClick={onClose} aria-label="Fechar painel">
          <Icon d="M18 6 6 18|M6 6l12 12" />
        </button>
        <span className="cal-drawer__hint">arraste a borda para redimensionar</span>
      </div>
      <iframe className="cal-drawer__frame" src={src} title="Detalhe da tarefa" />
    </div>
  );
}

/* ── WeeklyCalendar (raiz) ────────────────────────────────── */
function WeeklyCalendar() {
  const [vista,    setVista]   = useState('semana');
  const [eventos,  setEventos] = useState([]);
  const [modalEv,  setModalEv] = useState(null);
  const [drawerEv, setDrawerEv] = useState(null);
  const dias = React.useMemo(() => gerarDiasSemana(), []);

  useEffect(() => {
    if (!window.Api) return;
    Api.get(Api.endpoints.events.list)
      .then(function (data) { setEventos(Array.isArray(data) ? data : []); })
      .catch(function () { setEventos([]); });
  }, []);

  // Ouve mensagens do iframe (drawer) para atualizar hora em tempo real
  useEffect(() => {
    function onMsg(e) {
      if (!e.data || e.data.type !== 'jdi-hora-update') return;
      const { taskId, hora } = e.data;
      if (!hora) return;
      const [hh, mm] = hora.split(':').map(Number);
      const novoIni = hh + mm / 60;
      setEventos(evs => evs.map(ev => {
        if (ev.taskId !== taskId) return ev;
        const dur = ev.fim - ev.ini;
        return { ...ev, ini: novoIni, fim: Math.round((novoIni + dur) * 4) / 4 };
      }));
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const eventosComNum = eventos.map(ev => ({ ...ev, num: dias[ev.d] ? dias[ev.d].num : 0 }));

  function mover(id, novoDia, novaIni) {
    setEventos(evs => evs.map(ev => {
      if (ev.id !== id) return ev;
      const dur = ev.fim - ev.ini;
      return { ...ev, d: novoDia, ini: novaIni, fim: novaIni + dur };
    }));
  }

  function adicionar(novoEv) { setEventos(evs => [...evs, novoEv]); }

  function openModal(ev) { setDrawerEv(null); setModalEv(ev); }
  function openDrawer(ev) { setModalEv(null); setDrawerEv(ev); }

  function handleUpdate(changes) {
    if (!modalEv) return;
    const novo = { ...modalEv, ...changes };
    setEventos(evs => evs.map(e => e.id === modalEv.id ? novo : e));
    setModalEv(novo);
    if (modalEv.taskId && window.Storage) {
      const lista = window.Storage.ler('todo-tarefas', []);
      const t = lista.find(x => x.id === modalEv.taskId);
      if (t) {
        if (changes.prio !== undefined) t.prioridade = changes.prio;
        if (changes.done !== undefined) t.done = changes.done;
        if (changes.cat  !== undefined) t.cat = CAT_LABEL[changes.cat] || changes.cat;
        if (changes.ini  !== undefined) t.hora = fmtHora(changes.ini);
        window.Storage.gravar('todo-tarefas', lista);
      }
    }
  }

  function onEvUpdate(id, changes) {
    setEventos(evs => evs.map(e => e.id === id ? { ...e, ...changes } : e));
  }

  const hojeIdx = dias.findIndex(d => d.hoje);
  const diaAtual = { ...dias[hojeIdx >= 0 ? hojeIdx : 0], idx: hojeIdx >= 0 ? hojeIdx : 0 };

  return (
    <>
      <div className="cal-wrap">
        <div className="cal-top">
          <div className="cal-top__left">
            <h1 className="cal-top__title">Calendário</h1>
            <div className="cal-top__nav">
              <button className="btn-icon" aria-label="Anterior"><Icon d="m15 18-6-6 6-6" /></button>
              <span className="cal-top__range">8 – 14 jun</span>
              <button className="btn-icon" aria-label="Próximo"><Icon d="m9 18 6-6-6-6" /></button>
            </div>
            <button className="btn btn--secondary btn--sm">Hoje</button>
          </div>
          <div className="cal-top__right">
            <div className="cal-seg">
              <button className={vista === 'dia'    ? 'is-active' : ''} onClick={() => setVista('dia')}>Dia</button>
              <button className={vista === 'semana' ? 'is-active' : ''} onClick={() => setVista('semana')}>Semana</button>
              <button className={vista === 'mes'    ? 'is-active' : ''} onClick={() => setVista('mes')}>Mês</button>
            </div>
            <button className="btn btn--primary btn--md">+ Nova tarefa</button>
          </div>
        </div>

        <div className="cal-scroll">
          {vista === 'semana' && <WeekView dias={dias} eventos={eventos} mover={mover} adicionar={adicionar} onOpen={openModal} onDrawer={openDrawer} />}
          {vista === 'dia'    && <DayView dia={diaAtual} eventos={eventos} mover={mover} onOpen={openModal} onDrawer={openDrawer} />}
          {vista === 'mes'    && <MonthView eventos={eventosComNum} />}
        </div>

        <div className="cal-legend">
          {Object.entries(CAT_LABEL).map(([c, l]) => (
            <span key={c} className="cal-legend__item">
              <span className="cal-legend__dot" style={{ background: `var(--color-cat-${c})` }}></span>{l}
            </span>
          ))}
          <span style={{ flex: 1 }}></span>
          <span className="cal-legend__item" style={{ color: 'var(--color-text-muted)' }}>
            Clique para abrir · Seta para o painel lateral · Arraste para reorganizar
          </span>
        </div>
      </div>

      <TaskModal ev={modalEv} dia={modalEv ? dias[modalEv.d] : null} onClose={() => setModalEv(null)} onUpdate={handleUpdate} />
      {drawerEv && <PainelDrawer key={drawerEv.id} ev={drawerEv} dias={dias} onClose={() => setDrawerEv(null)} />}
    </>
  );
}

window.WeeklyCalendar = WeeklyCalendar;
