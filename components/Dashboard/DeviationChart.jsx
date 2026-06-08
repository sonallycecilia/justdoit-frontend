/* ============================================================
   JustDoIt — DeviationChart.jsx  (RF16)
   Gráfico de barras agrupadas: tempo planejado vs. executado
   por dia da semana. SVG puro, sem dependências.
   ============================================================ */
function DeviationChart({ dados }) {
  const W = 560, H = 240, padX = 36, padY = 28;
  const innerW = W - padX * 2, innerH = H - padY * 2;
  const max = Math.max(...dados.flatMap(d => [d.plan, d.real])) * 1.1;
  const grupoW = innerW / dados.length;
  const barW = Math.min(18, grupoW / 3.2);
  const y = (v) => padY + innerH - (v / max) * innerH;

  // linhas de grade horizontais
  const ticks = [0, 1, 2, 3, 4].filter(t => t <= max);

  return (
    <svg className="an-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Planejado vs. executado">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padX} x2={W - padX} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth="1" />
          <text x={padX - 8} y={y(t) + 4} textAnchor="end" fontSize="10">{t}h</text>
        </g>
      ))}
      {dados.map((d, i) => {
        const cx = padX + grupoW * i + grupoW / 2;
        return (
          <g key={d.dia}>
            <rect x={cx - barW - 2} y={y(d.plan)} width={barW} height={padY + innerH - y(d.plan)} rx="3" fill="var(--color-border-strong)" />
            <rect x={cx + 2} y={y(d.real)} width={barW} height={padY + innerH - y(d.real)} rx="3" fill="var(--color-accent)" />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10">{d.dia}</text>
          </g>
        );
      })}
    </svg>
  );
}

window.DeviationChart = DeviationChart;
