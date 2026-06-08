/* ============================================================
   JustDoIt — TimeBlock.jsx
   Bloco de tempo alocado no calendário. Cor por categoria,
   barra de prioridade à esquerda, arrastável (drag-and-drop).
   ============================================================ */
const COR_PRIORIDADE = {
  urgent: 'var(--color-priority-urgent)',
  important: 'var(--color-priority-important)',
  normal: 'var(--color-priority-normal)',
  low: 'var(--color-priority-low)',
};

const ICONES_MOD = {
  foco: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6zm0 4a2 2 0 1 0 2 2 2 2 0 0 0-2-2z',
  ciclo: 'M3 2v6h6 M21 12A9 9 0 0 0 6 5.3L3 8 M21 22v-6h-6 M3 12a9 9 0 0 0 15 6.7l3-2.7',
  tempo: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M12 6v6l4 2',
  notas: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
};

function fmtHora(x) {
  const h = Math.floor(x);
  const m = x % 1 ? '30' : '00';
  return `${String(h).padStart(2, '0')}:${m}`;
}

function TimeBlock({ ev, rowH, startHour, onDragStart, onDragEnd, dragging }) {
  const top = (ev.ini - startHour) * rowH;
  const height = (ev.fim - ev.ini) * rowH - 4;

  return (
    <div
      className={`timeblock timeblock--${ev.cat} ${dragging ? 'is-dragging' : ''}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      draggable="true"
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(ev); }}
      onDragEnd={onDragEnd}
      title={ev.titulo}
    >
      <span className="timeblock__prio" style={{ background: COR_PRIORIDADE[ev.prio] }}></span>
      <span className="timeblock__title">{ev.titulo}</span>
      <span className="timeblock__meta">
        <span>{fmtHora(ev.ini)}</span>
        {ev.mod && ICONES_MOD[ev.mod] && (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICONES_MOD[ev.mod].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
          </svg>
        )}
      </span>
    </div>
  );
}

window.TimeBlock = TimeBlock;
window.fmtHora = fmtHora;
window.COR_PRIORIDADE = COR_PRIORIDADE;
