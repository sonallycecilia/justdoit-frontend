// Painel lateral do calendário (port do PainelDrawer, sem iframe): shell
// redimensionável arrastando a borda esquerda; o conteúdo vem como children.
import { useEffect, useRef, useState } from 'react';

const DRAWER_MIN = 380, DRAWER_MAX = 900;

export default function EventDrawer({ onClose, children }) {
  const [width, setWidth] = useState(520);
  const resizing = useRef(false);
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

  return (
    <div className="cal-drawer is-open" style={{ width }}>
      <div className="cal-drawer__resize"
        onMouseDown={e => { e.preventDefault(); resizing.current = true; resizeStart.current = { x: e.clientX, w: width }; }}
      />
      <div className="cal-drawer__head">
        <button className="btn-icon" onClick={onClose} aria-label="Fechar painel">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
        </button>
        <span className="cal-drawer__hint">arraste a borda para redimensionar</span>
      </div>
      <div className="cal-drawer__body" style={{ overflow: 'auto', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
