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

// Preferência "Início da semana" (Configurações). 'dom' = domingo, qualquer
// outro valor = segunda (padrão). Lida a cada render para refletir mudanças.
const DOW_SEG = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
const DOW_DOM = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
function inicioDomingo() {
  return !!(window.Storage && Storage.ler('inicio-semana', 'seg') === 'dom');
}
function rotulosDow() { return inicioDomingo() ? DOW_DOM : DOW_SEG; }

function isoData(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Cor real da categoria de um evento. Procura nas categorias do usuário pelo
// nome (catNome); cai para a variável de token do slug builtin quando a lista
// ainda não carregou ou a categoria não é encontrada.
function corCategoria(categorias, ev) {
  const nome = ev.catNome || CAT_LABEL[ev.cat] || 'Genérico';
  const c = (categorias || []).find(x => x.nome === nome);
  return c ? c.cor : `var(--color-cat-${ev.cat})`;
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function gerarDiasSemana(offsetSemanas = 0) {
  const domingo = inicioDomingo();
  const today = new Date();
  const dow = today.getDay(); // 0 = domingo
  const inicio = new Date(today);
  // Recua até o primeiro dia da semana conforme a preferência.
  const recuo = domingo ? dow : (dow === 0 ? 6 : dow - 1);
  inicio.setDate(today.getDate() - recuo + offsetSemanas * 7);
  const labels = rotulosDow();
  return labels.map((label, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return { dow: label, num: d.getDate(), mes: d.getMonth(), iso: isoData(d), hoje: d.toDateString() === today.toDateString() };
  });
}

// Rótulo do intervalo da semana: "8 – 14 jun" ou "29 jun – 5 jul".
function rotuloSemana(dias) {
  const ini = dias[0], fim = dias[6];
  if (ini.mes === fim.mes) return `${ini.num} – ${fim.num} ${MESES[fim.mes]}`;
  return `${ini.num} ${MESES[ini.mes]} – ${fim.num} ${MESES[fim.mes]}`;
}

const MESES_LONGOS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Grade do mês (offset em meses a partir do atual). Segunda-feira como 1ª coluna.
function gerarMes(offsetMeses = 0) {
  const today = new Date();
  const base  = new Date(today.getFullYear(), today.getMonth() + offsetMeses, 1);
  const ano   = base.getFullYear();
  const mes   = base.getMonth();
  const diasNoMes  = new Date(ano, mes + 1, 0).getDate();
  const dow0 = new Date(ano, mes, 1).getDay(); // 0 = domingo
  // Colunas vazias antes do dia 1, conforme o primeiro dia da semana.
  const primeiroDow = inicioDomingo() ? dow0 : (dow0 + 6) % 7;

  const cells = [];
  for (let i = 0; i < primeiroDow; i++) cells.push({ out: true });
  for (let n = 1; n <= diasNoMes; n++) {
    const d = new Date(ano, mes, n);
    cells.push({ num: n, iso: isoData(d), hoje: d.toDateString() === today.toDateString() });
  }
  while (cells.length % 7 !== 0) cells.push({ out: true });
  return { ano, mes, cells };
}

function fmtHora(x) {
  const h = Math.floor(x);
  const m = Math.round((x % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Blocos recém-arrastados ganham um id temporário ('ext-…') antes de o POST
// retornar o id real do backend. Eventos derivados de uma tarefa agendada
// (id 'task-…') são virtuais e não existem no schedule-service. Só persistimos
// update/delete de blocos já salvos (id real do backend).
function ehPersistido(id) {
  return typeof id === 'string' && id.indexOf('ext-') !== 0 && id.indexOf('task-') !== 0;
}

// Tarefas com data viram eventos "virtuais" no calendário, para que uma tarefa
// agendada apareça no dia mesmo sem ter um bloco de tempo criado. Tarefas sem
// hora caem no início da grade (START); no mês a hora é irrelevante (lista por
// data). Deduplica contra os blocos reais (por taskId) para não desenhar duas
// vezes. `posicionar` mapeia a tarefa → posição no modelo da UI (semana usa
// índice de dia `d`; mês usa data ISO). Retorna null para descartar a tarefa.
function tarefasComoEventos(blocosExistentes, posicionar) {
  if (!window.Tarefas) return [];
  const comBloco = new Set((blocosExistentes || []).map(b => b.taskId).filter(Boolean));
  return Tarefas.listar().reduce(function (acc, t) {
    if (!t.dataIso || comBloco.has(t.id)) return acc;
    const pos = posicionar(t);
    if (!pos) return acc;
    const [hh, mm] = t.hora ? String(t.hora).split(':').map(Number) : [START, 0];
    const ini = (hh || 0) + (mm || 0) / 60;
    acc.push({
      id: 'task-' + t.id, taskId: t.id, ini, fim: ini + 1, semHora: !t.hora,
      titulo: t.titulo, cat: CAT_MAP[t.cat] || 'generico', catNome: t.cat,
      prio: t.prioridade || 'normal', done: t.done, mod: null,
      ...pos,
    });
    return acc;
  }, []);
}

// Campos visuais do bloco (título/categoria/prioridade/concluído) não ficam no
// schedule-service — vêm da tarefa vinculada (taskId).
function enriquecerComTarefa(b) {
  const t = (window.Tarefas && b.taskId) ? Tarefas.buscar(b.taskId) : null;
  return {
    ...b,
    titulo:  t ? t.titulo : 'Bloco',
    cat:     t ? (CAT_MAP[t.cat] || 'generico') : 'generico',
    catNome: t ? t.cat : 'Genérico',
    prio:    t ? t.prioridade : 'normal',
    done:    t ? t.done : false,
    mod:     null,
  };
}

function Icon({ d, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ── WeekView ─────────────────────────────────────────────── */
function WeekView({ dias, eventos, categorias, mover, adicionar, onOpen, onDrawer, onDelete }) {
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
                catCor={corCategoria(categorias, ev)}
                dragging={arrastando && arrastando.id === ev.id}
                onDragStart={setArrastando}
                onDragEnd={() => { setArrastando(null); setOver(null); }}
                onOpen={onOpen} onDrawer={onDrawer} onDelete={onDelete} />
            ))}
            {d.hoje && <div className="cal-now" style={{ top: `${((() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })() - START) * ROW_H}px` }}></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DayView ──────────────────────────────────────────────── */
function DayView({ dia, eventos, categorias, mover, onOpen, onDrawer, onDelete }) {
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
            catCor={corCategoria(categorias, ev)}
            dragging={false} onDragStart={() => {}} onDragEnd={() => {}}
            onOpen={onOpen} onDrawer={onDrawer} onDelete={onDelete} />)}
          {dia.hoje && <div className="cal-now" style={{ top: `${((() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })() - START) * ROW_H}px` }}></div>}
        </div>
      </div>
    </div>
  );
}

/* ── MonthView ────────────────────────────────────────────── */
function MonthView({ mesData, eventos, categorias }) {
  return (
    <div className="cal-month">
      <div className="cal-month__grid">
        {rotulosDow().map(d => <div key={d} className="cal-month__dow">{d}</div>)}
        {mesData.cells.map((c, i) => {
          const evs = c.out ? [] : eventos.filter(ev => ev.iso === c.iso);
          return (
            <div key={i} className={`cal-month__cell ${c.out ? 'is-out' : ''} ${c.hoje ? 'is-today' : ''}`}>
              {!c.out && <span className="cal-month__num">{c.num}</span>}
              {evs.slice(0, 3).map(ev => (
                <span key={ev.id} className="cal-month__ev">
                  <span className="cal-month__dot" style={{ background: corCategoria(categorias, ev) }}></span>
                  {ev.titulo}
                </span>
              ))}
              {evs.length > 3 && <span className="cal-month__ev" style={{ color: 'var(--color-text-muted)' }}>+{evs.length - 3} mais</span>}
            </div>
          );
        })}
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
function TaskModal({ ev, dia, categorias, onClose, onUpdate, onDelete }) {
  const [dateOpen, setDateOpen] = useState(false);
  if (!ev) return null;

  // Categoria atual do evento, por nome (cai para o rótulo do slug em blocos
  // sem tarefa vinculada). Lista de opções vem das categorias reais do usuário.
  const cats = (categorias && categorias.length) ? categorias : [{ id: 'generico', nome: 'Genérico', cor: 'var(--color-cat-generico)' }];
  const catAtual = ev.catNome || CAT_LABEL[ev.cat] || 'Genérico';

  const TODAY_NUM = 11;
  const WEEK_NUMS = [8,9,10,11,12,13,14];
  const curNum = ev.dateNum !== undefined ? ev.dateNum : (dia ? dia.num : TODAY_NUM);
  const curDow = ev.dow || (dia ? dia.dow : DOW_JUN26[(curNum - 1) % 7]);

  return (
    <div className="task-modal__backdrop" onClick={onClose}>
      <div className="task-modal" onClick={e => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className="task-modal__head">
          <span className="task-modal__head-cat" style={{ background: corCategoria(categorias, ev) }}></span>
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
              {cats.map(c => (
                <button key={c.id} className={`task-modal__cat-opt${catAtual === c.nome ? ' is-on' : ''}`}
                  onClick={() => onUpdate({ catNome: c.nome, categoriaId: c.id, cat: CAT_MAP[c.nome] || ev.cat })}>
                  <span className="task-modal__cat-dot" style={{ background: c.cor }}></span>
                  {c.nome}
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

          {onDelete && (
            <button className="btn btn--ghost btn--sm" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:'var(--color-danger, #d33)' }} onClick={() => onDelete(ev)}>
              <Icon d="M3 6h18|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" size={14} />
              Excluir tarefa
            </button>
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

  // Constrói URL do iframe. Tarefa vinculada → página de detalhe completa
  // (subtarefas, notas, foco, ciclo…), embedada. Passa a data e a hora do
  // bloco (posição no calendário) para o detalhe refletir o dia/horário da
  // grade. Bloco sem tarefa → resumo simples do evento.
  let src;
  if (ev.taskId) {
    const p = new URLSearchParams({ id: ev.taskId, embed: '1' });
    if (ev.ini != null) p.set('hora', fmtHora(ev.ini));
    const diaEv = dias[ev.d];
    if (diaEv) p.set('data', diaEv.iso);
    src = `task-detail.html?${p.toString()}`;
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

/* ── ConfirmDialog (confirmação estilizada) ───────────────── */
const TRASH_PATH = 'M3 6h18|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6';
function ConfirmDialog({ titulo, confirmar, onConfirm, onCancel, children }) {
  return (
    <div className="task-modal__backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog__title">
          <span className="confirm-dialog__ic"><Icon d={TRASH_PATH} size={17} /></span>
          {titulo}
        </div>
        <div className="confirm-dialog__msg">{children}</div>
        <div className="confirm-dialog__actions">
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancelar</button>
          <button className="confirm-dialog__danger" onClick={onConfirm}>
            <Icon d={TRASH_PATH} size={14} />{confirmar || 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── WeeklyCalendar (raiz) ────────────────────────────────── */
function WeeklyCalendar() {
  const [vista,    setVista]   = useState('semana');
  const [eventos,  setEventos] = useState([]);
  const [modalEv,  setModalEv] = useState(null);
  const [drawerEv, setDrawerEv] = useState(null);
  const [confirmarEv, setConfirmarEv] = useState(null); // evento aguardando confirmação de exclusão
  const [semana,   setSemana]  = useState(0); // deslocamento em semanas a partir da atual
  const [mes,      setMes]     = useState(0); // deslocamento em meses a partir do atual
  const [eventosMes, setEventosMes] = useState([]); // blocos do mês (vista "mês")
  const [categorias, setCategorias] = useState([]); // categorias reais do usuário (backend)
  const dias    = React.useMemo(() => gerarDiasSemana(semana), [semana]);
  const mesData = React.useMemo(() => gerarMes(mes), [mes]);

  // Categorias reais do usuário (Genérico + cadastradas no task-service).
  // Usadas tanto na legenda quanto no seletor de categoria do modal.
  useEffect(() => {
    if (!window.Categorias) return;
    Categorias.carregar()
      .then(function (cats) { setCategorias(cats.slice()); })
      .catch(function () { setCategorias([]); });
  }, []);

  // Carrega os blocos da semana visível (vistas dia/semana).
  useEffect(() => {
    if (!window.Blocos) return;
    // Garante o cache de tarefas antes de enriquecer os blocos.
    const pronto = window.Tarefas ? Tarefas.carregarDaApi().catch(function () {}) : Promise.resolve();
    pronto
      .then(function () { return Blocos.carregarSemana(dias); })
      .then(function (blocos) {
        const reais = blocos.map(enriquecerComTarefa);
        const virtuais = tarefasComoEventos(reais, function (t) {
          const d = dias.findIndex(x => x.iso === t.dataIso);
          return d >= 0 ? { d } : null;
        });
        setEventos(reais.concat(virtuais));
      })
      .catch(function () { setEventos([]); });
  }, [dias]);

  // Carrega os blocos do mês visível (só quando a vista "mês" está ativa).
  useEffect(() => {
    if (vista !== 'mes' || !window.Blocos) return;
    const reais = mesData.cells.filter(c => !c.out);
    const from = reais[0].iso, to = reais[reais.length - 1].iso;
    const pronto = window.Tarefas ? Tarefas.carregarDaApi().catch(function () {}) : Promise.resolve();
    pronto
      .then(function () { return Blocos.carregarIntervalo(from, to); })
      .then(function (blocos) {
        const reais = blocos.map(enriquecerComTarefa);
        const virtuais = tarefasComoEventos(reais, function (t) {
          return (t.dataIso >= from && t.dataIso <= to) ? { iso: t.dataIso } : null;
        });
        setEventosMes(reais.concat(virtuais));
      })
      .catch(function () { setEventosMes([]); });
  }, [vista, mesData]);

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

  // Navegação adapta-se à vista: "mês" passa meses; demais passam semanas.
  const emMes = vista === 'mes';
  const rotuloNav = emMes ? `${MESES_LONGOS[mesData.mes]} ${mesData.ano}` : rotuloSemana(dias);
  const navNoInicio = emMes ? mes === 0 : semana === 0;
  function navAnterior() { emMes ? setMes(m => m - 1) : setSemana(s => s - 1); }
  function navProximo()  { emMes ? setMes(m => m + 1) : setSemana(s => s + 1); }
  function irHoje() { setSemana(0); setMes(0); }

  // Mantém o dueDate/dueTime da tarefa em sincronia com a posição do bloco no
  // calendário (PUT /tasks no task-service). Chamado ao arrastar do sidebar
  // (cria bloco) e ao mover um bloco já existente.
  function sincronizarAgendaTarefa(taskId, d, ini) {
    if (!taskId || !window.Tarefas) return;
    const tarefa = Tarefas.buscar(taskId);
    const dia = dias[d];
    if (!tarefa || !dia) return;
    const hora = fmtHora(ini);
    // Atualiza o cache local na hora (otimista): abrir o detalhe logo após
    // arrastar já mostra a nova data/hora, sem esperar o PUT responder.
    const lista = Tarefas.listar();
    const i = lista.findIndex(x => x.id === taskId);
    if (i >= 0) {
      const dataObj = new Date(dia.iso + 'T00:00:00');
      lista[i] = { ...lista[i], dataIso: dia.iso, hora,
        data:   window.Utils ? Utils.dataRelativa(dataObj) : lista[i].data,
        quando: window.Utils ? Utils.calcQuando(dataObj)  : lista[i].quando };
      Tarefas.salvar(lista);
    }
    Tarefas.atualizar(taskId, { ...tarefa, dataIso: dia.iso, hora }).catch(() => {});
  }

  function mover(id, novoDia, novaIni) {
    const atual = eventos.find(e => e.id === id);
    if (!atual) return;
    const dur = atual.fim - atual.ini;
    const novo = { ...atual, d: novoDia, ini: novaIni, fim: novaIni + dur };
    setEventos(evs => evs.map(ev => ev.id === id ? novo : ev));
    if (window.Blocos && ehPersistido(id)) Blocos.atualizar(novo, dias).catch(() => {});
    sincronizarAgendaTarefa(atual.taskId, novoDia, novaIni);
  }

  // Cria o bloco no schedule-service para um evento já vinculado a uma tarefa.
  function criarBlocoDoEvento(ev) {
    if (!window.Blocos) return;
    Blocos.criar(ev, dias).then(salvo => {
      // Substitui o id temporário ('ext-…') pelo id real devolvido pelo backend.
      if (salvo && salvo.id && salvo.id !== ev.id) {
        setEventos(evs => evs.map(e => e.id === ev.id ? { ...ev, id: salvo.id } : e));
      }
    }).catch(() => {});
  }

  function adicionar(novoEv) {
    // Arrastar uma tarefa da sidebar cria uma NOVA tarefa independente no banco
    // (cópia da tarefa de origem, agendada na posição onde foi solta). Cada
    // arraste gera sua própria tarefa + bloco — duplicatas são permitidas.
    setEventos(evs => [...evs, novoEv]); // mostra na hora (otimista)

    const dia  = dias[novoEv.d];
    const orig = window.Tarefas ? Tarefas.buscar(novoEv.taskId) : null;

    // Sem módulo de tarefas: cria só o bloco ligado à tarefa de origem (fallback).
    if (!window.Tarefas) { criarBlocoDoEvento(novoEv); return; }

    Tarefas.criar({
      titulo:      orig ? orig.titulo : novoEv.titulo,
      descricao:   orig ? orig.descricao : '',
      cat:         orig ? orig.cat : (CAT_LABEL[novoEv.cat] || 'Genérico'),
      categoriaId: orig ? orig.categoriaId : 'generico',
      prioridade:  orig ? orig.prioridade : (novoEv.prio || 'normal'),
      dataIso:     dia ? dia.iso : null,
      hora:        fmtHora(novoEv.ini),
    }).then(nova => {
      // Liga o evento/bloco à nova tarefa criada e persiste o bloco.
      const evNovo = { ...novoEv, taskId: nova.id };
      setEventos(evs => evs.map(e => e.id === novoEv.id ? evNovo : e));
      criarBlocoDoEvento(evNovo);
      // Avisa a sidebar (e demais ouvintes) para refletir a nova tarefa.
      window.dispatchEvent(new CustomEvent('tarefas:atualizadas'));
    }).catch(() => {});
  }

  function removerEvento(ev) {
    setEventos(evs => evs.filter(e => e.id !== ev.id));
    setModalEv(null);
    if (window.Blocos && ehPersistido(ev.id)) Blocos.remover(ev.id).catch(() => {});
    // Remover o bloco do calendário também exclui a tarefa vinculada no banco
    // (Tarefas.remover já avisa a sidebar via 'tarefas:atualizadas').
    if (ev.taskId && window.Tarefas) Tarefas.remover(ev.taskId).catch(() => {});
  }

  // Pede confirmação (caixa estilizada) antes de excluir de fato.
  function pedirRemover(ev) { setModalEv(null); setConfirmarEv(ev); }
  function confirmarRemocao() { if (confirmarEv) removerEvento(confirmarEv); setConfirmarEv(null); }

  function openModal(ev) { setDrawerEv(null); setModalEv(ev); }
  function openDrawer(ev) { setModalEv(null); setDrawerEv(ev); }

  // Dia-do-mês escolhido no seletor do modal → data ISO, herdando ano/mês do
  // dia atual do evento (o seletor cobre apenas esse mês).
  function isoDoDiaDoMes(n) {
    const ref = (dias[modalEv.d] && dias[modalEv.d].iso) || (dias[0] && dias[0].iso);
    if (!ref) return null;
    return ref.slice(0, 8) + String(n).padStart(2, '0'); // "AAAA-MM-" + "DD"
  }

  function handleUpdate(changes) {
    if (!modalEv) return;
    const novo = { ...modalEv, ...changes };
    setEventos(evs => evs.map(e => e.id === modalEv.id ? novo : e));
    setModalEv(novo);

    // Mudança de horário do bloco → persiste no schedule-service.
    if ((changes.ini !== undefined || changes.fim !== undefined) && window.Blocos && ehPersistido(novo.id)) {
      Blocos.atualizar(novo, dias).catch(() => {});
    }

    // Sem tarefa vinculada (bloco avulso) não há o que persistir no task-service.
    const taskId = modalEv.taskId;
    if (!taskId || !window.Tarefas) return;

    // Concluir/reabrir tem endpoint próprio (PATCH complete/reopen) e já avisa a UI.
    if (changes.done !== undefined) {
      Tarefas.toggleDone(taskId).catch(() => {});
      return;
    }

    // Categoria, prioridade, data e hora → PUT /tasks. Monta o corpo completo a
    // partir da tarefa em cache para não zerar os demais campos no backend.
    const tarefa = Tarefas.buscar(taskId);
    if (!tarefa) return;
    const patch = {};
    if (changes.catNome     !== undefined) patch.cat = changes.catNome;
    else if (changes.cat    !== undefined) patch.cat = CAT_LABEL[changes.cat] || changes.cat;
    if (changes.categoriaId !== undefined) patch.categoriaId = changes.categoriaId;
    if (changes.prio        !== undefined) patch.prioridade = changes.prio;
    if (changes.ini         !== undefined) patch.hora = fmtHora(changes.ini);
    if (changes.dateNum     !== undefined) { const iso = isoDoDiaDoMes(changes.dateNum); if (iso) patch.dataIso = iso; }
    if (!Object.keys(patch).length) return;

    // Reflete no cache local na hora (otimista) e persiste no backend; recalcula
    // os campos derivados de data quando o dia muda.
    if (patch.dataIso && window.Utils) {
      const dataObj = new Date(patch.dataIso + 'T00:00:00');
      patch.data   = Utils.dataRelativa(dataObj);
      patch.quando = Utils.calcQuando(dataObj);
    }
    const lista = Tarefas.listar();
    const i = lista.findIndex(x => x.id === taskId);
    if (i >= 0) { lista[i] = { ...lista[i], ...patch }; Tarefas.salvar(lista); }
    Tarefas.atualizar(taskId, { ...tarefa, ...patch })
      .then(() => window.dispatchEvent(new CustomEvent('tarefas:atualizadas')))
      .catch(() => {});
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
              <button className="btn-icon" aria-label="Anterior" onClick={navAnterior}><Icon d="m15 18-6-6 6-6" /></button>
              <span className="cal-top__range">{rotuloNav}</span>
              <button className="btn-icon" aria-label="Próximo" onClick={navProximo}><Icon d="m9 18 6-6-6-6" /></button>
            </div>
            <button className="btn btn--secondary btn--sm" onClick={irHoje} disabled={navNoInicio}>Hoje</button>
          </div>
          <div className="cal-top__right">
            <div className="cal-seg">
              <button className={vista === 'dia'    ? 'is-active' : ''} onClick={() => setVista('dia')}>Dia</button>
              <button className={vista === 'semana' ? 'is-active' : ''} onClick={() => setVista('semana')}>Semana</button>
              <button className={vista === 'mes'    ? 'is-active' : ''} onClick={() => setVista('mes')}>Mês</button>
            </div>
            <a href="task-detail.html" className="btn btn--primary btn--md" style={{ textDecoration:'none' }}>+ Nova tarefa</a>
          </div>
        </div>

        <div className="cal-scroll">
          {vista === 'semana' && <WeekView dias={dias} eventos={eventos} categorias={categorias} mover={mover} adicionar={adicionar} onOpen={openModal} onDrawer={openDrawer} onDelete={pedirRemover} />}
          {vista === 'dia'    && <DayView dia={diaAtual} eventos={eventos} categorias={categorias} mover={mover} onOpen={openModal} onDrawer={openDrawer} onDelete={pedirRemover} />}
          {vista === 'mes'    && <MonthView mesData={mesData} eventos={eventosMes} categorias={categorias} />}
        </div>

        <div className="cal-legend">
          {categorias.filter(c => c.id !== 'generico').map(c => (
            <span key={c.id} className="cal-legend__item">
              <span className="cal-legend__dot" style={{ background: c.cor }}></span>{c.nome}
            </span>
          ))}
          <span style={{ flex: 1 }}></span>
          <span className="cal-legend__item" style={{ color: 'var(--color-text-muted)' }}>
            Clique para abrir · Seta para o painel lateral · Arraste para reorganizar
          </span>
        </div>
      </div>

      <TaskModal ev={modalEv} dia={modalEv ? dias[modalEv.d] : null} categorias={categorias} onClose={() => setModalEv(null)} onUpdate={handleUpdate} onDelete={pedirRemover} />
      {drawerEv && <PainelDrawer key={drawerEv.id} ev={drawerEv} dias={dias} onClose={() => setDrawerEv(null)} />}
      {confirmarEv && (
        <ConfirmDialog titulo="Excluir tarefa" confirmar="Excluir"
          onConfirm={confirmarRemocao} onCancel={() => setConfirmarEv(null)}>
          Tem certeza que deseja excluir <strong>{confirmarEv.titulo}</strong>? Essa ação não pode ser desfeita.
        </ConfirmDialog>
      )}
    </>
  );
}

window.WeeklyCalendar = WeeklyCalendar;
