/* ============================================================
   JustDoIt — WeeklyCalendar.jsx
   Calendário com alternância dia / semana / mês, blocos de
   tempo arrastáveis e cor por categoria + prioridade.
   ============================================================ */
const { useState, useRef } = React;

const START = 7, END = 21;           // 07:00 → 21:00
const ROW_H = 56;
const CAT_LABEL = { estudos: 'Estudos', casa: 'Casa', generico: 'Genérico' };

function Icon({ d, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function WeekView({ dias, eventos, mover }) {
  const [arrastando, setArrastando] = useState(null);
  const [over, setOver] = useState(null);
  const horas = [];
  for (let h = START; h <= END; h++) horas.push(h);

  function soltar(diaIdx, e) {
    e.preventDefault();
    if (!arrastando) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const novaIni = Math.max(START, Math.min(END - 0.5, START + Math.round((y / ROW_H) * 2) / 2));
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
          {horas.map((h) => (
            <div key={h} className="cal-slot"><span>{String(h).padStart(2, '0')}:00</span></div>
          ))}
        </div>
        {dias.map((d, di) => (
          <div
            key={di}
            className={`cal-col ${d.hoje ? 'is-today' : ''} ${over === di ? 'drag-over' : ''}`}
            style={{ height: `${(END - START) * ROW_H}px` }}
            onDragOver={(e) => { e.preventDefault(); setOver(di); }}
            onDragLeave={() => setOver((o) => (o === di ? null : o))}
            onDrop={(e) => soltar(di, e)}
          >
            {eventos.filter((ev) => ev.d === di).map((ev) => (
              <TimeBlock
                key={ev.id} ev={ev} rowH={ROW_H} startHour={START}
                dragging={arrastando && arrastando.id === ev.id}
                onDragStart={setArrastando}
                onDragEnd={() => { setArrastando(null); setOver(null); }}
              />
            ))}
            {d.hoje && <div className="cal-now" style={{ top: `${(15 + 40 / 60 - START) * ROW_H}px` }}></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({ dia, eventos, mover }) {
  const horas = [];
  for (let h = START; h <= END; h++) horas.push(h);
  const doDia = eventos.filter((ev) => ev.d === dia.idx);
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
          {horas.map((h) => <div key={h} className="cal-slot"><span>{String(h).padStart(2, '0')}:00</span></div>)}
        </div>
        <div className={`cal-col ${dia.hoje ? 'is-today' : ''}`} style={{ height: `${(END - START) * ROW_H}px` }}>
          {doDia.map((ev) => <TimeBlock key={ev.id} ev={ev} rowH={ROW_H} startHour={START} dragging={false} onDragStart={() => {}} onDragEnd={() => {}} />)}
          {dia.hoje && <div className="cal-now" style={{ top: `${(15 + 40 / 60 - START) * ROW_H}px` }}></div>}
        </div>
      </div>
    </div>
  );
}

function MonthView({ eventos }) {
  // Junho 2026: 1/jun = segunda. Grade 5 semanas a partir de seg.
  const dow = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const totalDias = 30;
  const cells = [];
  for (let n = 1; n <= totalDias; n++) {
    const evs = eventos.filter((ev) => ev.num === n);
    cells.push({ num: n, hoje: n === 11, evs });
  }
  // completa última semana
  while (cells.length % 7 !== 0) cells.push({ out: true });

  return (
    <div className="cal-month">
      <div className="cal-month__grid">
        {dow.map((d) => <div key={d} className="cal-month__dow">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={`cal-month__cell ${c.out ? 'is-out' : ''} ${c.hoje ? 'is-today' : ''}`}>
            {!c.out && <span className="cal-month__num">{c.num}</span>}
            {!c.out && c.evs.slice(0, 3).map((ev) => (
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

function WeeklyCalendar() {
  const [vista, setVista] = useState('semana');
  const [eventos, setEventos] = useState(window.CAL_DATA.eventos);
  const dias = window.CAL_DATA.dias;

  // anexa num do mês a cada evento (para a visão mês)
  const eventosComNum = eventos.map((ev) => ({ ...ev, num: dias[ev.d].num }));

  function mover(id, novoDia, novaIni) {
    setEventos((evs) => evs.map((ev) => {
      if (ev.id !== id) return ev;
      const dur = ev.fim - ev.ini;
      return { ...ev, d: novoDia, ini: novaIni, fim: novaIni + dur };
    }));
  }

  const hojeIdx = dias.findIndex((d) => d.hoje);
  const diaAtual = { ...dias[hojeIdx], idx: hojeIdx };

  return (
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
            <button className={vista === 'dia' ? 'is-active' : ''} onClick={() => setVista('dia')}>Dia</button>
            <button className={vista === 'semana' ? 'is-active' : ''} onClick={() => setVista('semana')}>Semana</button>
            <button className={vista === 'mes' ? 'is-active' : ''} onClick={() => setVista('mes')}>Mês</button>
          </div>
          <button className="btn btn--primary btn--md">+ Nova tarefa</button>
        </div>
      </div>

      <div className="cal-scroll">
        {vista === 'semana' && <WeekView dias={dias} eventos={eventos} mover={mover} />}
        {vista === 'dia' && <DayView dia={diaAtual} eventos={eventos} mover={mover} />}
        {vista === 'mes' && <MonthView eventos={eventosComNum} />}
      </div>

      <div className="cal-legend">
        {Object.keys(CAT_LABEL).map((c) => (
          <span key={c} className="cal-legend__item"><span className="cal-legend__dot" style={{ background: `var(--color-cat-${c})` }}></span>{CAT_LABEL[c]}</span>
        ))}
        <span style={{ flex: 1 }}></span>
        <span className="cal-legend__item" style={{ color: 'var(--color-text-muted)' }}>Arraste os blocos para reorganizar a semana</span>
      </div>
    </div>
  );
}

window.WeeklyCalendar = WeeklyCalendar;
