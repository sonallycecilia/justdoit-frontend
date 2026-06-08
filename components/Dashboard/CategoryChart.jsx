/* ============================================================
   JustDoIt — CategoryChart.jsx  (RF18)
   Donut de alocação de tempo por categoria. SVG puro.
   ============================================================ */
function CategoryChart({ dados }) {
  const total = dados.reduce((s, d) => s + d.horas, 0);
  const size = 180, raio = 70, stroke = 26, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Alocação por categoria">
        <circle cx={cx} cy={cy} r={raio} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={stroke} />
        {dados.map((d) => {
          const frac = d.horas / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={d.nome}
              cx={cx} cy={cy} r={raio} fill="none"
              stroke={d.cor} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-acumulado * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          acumulado += frac;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--color-text)" style={{ fontFamily: 'var(--font-display)' }}>{total.toFixed(0)}h</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10">na semana</text>
      </svg>
      <div className="an-legend" style={{ flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {dados.map((d) => (
          <span key={d.nome} className="an-legend__item">
            <span className="an-legend__sw" style={{ background: d.cor }}></span>
            {d.nome}
            <strong style={{ color: 'var(--color-text)', marginLeft: 4 }}>{d.horas}h</strong>
            <span style={{ color: 'var(--color-text-faint)' }}>· {Math.round((d.horas / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

window.CategoryChart = CategoryChart;
