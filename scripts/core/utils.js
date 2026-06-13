/* ============================================================
   JustDoIt — core/utils.js
   Funções utilitárias: datas, formatação, saudação, semana.
   ============================================================ */
const Utils = (function () {
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // Hoje à meia-noite (para comparações de dia)
  function hoje() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Saudação conforme a hora do dia
  function saudacao(data = new Date()) {
    const h = data.getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // "Qui, 7 jun"
  function dataCurta(data = new Date()) {
    const dia = DIAS_CURTOS[data.getDay()];
    return `${dia[0] + dia.slice(1).toLowerCase()}, ${data.getDate()} ${MESES[data.getMonth()]}`;
  }

  // Intervalo da semana atual: "8 – 14 jun"
  function intervaloSemana(data = new Date()) {
    const inicio = new Date(data);
    inicio.setDate(data.getDate() - ((data.getDay() + 6) % 7)); // segunda
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    const mesIgual = inicio.getMonth() === fim.getMonth();
    return mesIgual
      ? `${inicio.getDate()} – ${fim.getDate()} ${MESES[fim.getMonth()]}`
      : `${inicio.getDate()} ${MESES[inicio.getMonth()]} – ${fim.getDate()} ${MESES[fim.getMonth()]}`;
  }

  // "Hoje", "Amanhã" ou "Qua, 10 jun"
  function dataRelativa(data) {
    const h = hoje();
    const amanha = new Date(h);
    amanha.setDate(h.getDate() + 1);
    if (data.toDateString() === h.toDateString()) return 'Hoje';
    if (data.toDateString() === amanha.toDateString()) return 'Amanhã';
    return dataCurta(data);
  }

  // Classifica uma data: 'past' | 'today' | 'week' | 'all'
  function calcQuando(data) {
    const h = hoje();
    const fim = new Date(h);
    fim.setDate(h.getDate() + 7);
    if (data < h) return 'past';
    if (data.toDateString() === h.toDateString()) return 'today';
    if (data <= fim) return 'week';
    return 'all';
  }

  // "2026-06-09"
  function dataIso(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  // Inverso de dataRelativa: "Hoje" / "Amanhã" / "Atrasada" / "Qua, 10 jun" → Date (ou null)
  function parseData(str) {
    const h = hoje();
    if (!str || str === 'Sem data') return null;
    if (str === 'Hoje')     return new Date(h);
    if (str === 'Atrasada') { const d = new Date(h); d.setDate(h.getDate() - 1); return d; }
    if (str === 'Amanhã')   { const d = new Date(h); d.setDate(h.getDate() + 1); return d; }
    const match = str.match(/(\d+)\s+(\w{3})/);
    if (match) {
      const dia = parseInt(match[1]);
      const m = MESES.indexOf(match[2].toLowerCase());
      if (m !== -1) {
        const d = new Date(h.getFullYear(), m, dia);
        if (d < h) d.setFullYear(h.getFullYear() + 1);
        return d;
      }
    }
    return null;
  }

  // Converte horas decimais (1.5) → "1h30"
  function horas(decimal) {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }

  // Percentual seguro 0–100
  function pct(parte, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((parte / total) * 100)));
  }

  return { DIAS, DIAS_CURTOS, MESES, MESES_LONGOS, hoje, saudacao, dataCurta, dataRelativa, calcQuando, dataIso, parseData, intervaloSemana, horas, pct };
})();

window.Utils = Utils;
