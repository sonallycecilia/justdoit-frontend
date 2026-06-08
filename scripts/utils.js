/* ============================================================
   JustDoIt — utils.js
   Funções utilitárias: datas, formatação, saudação, semana.
   ============================================================ */
const Utils = (function () {
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // Saudação conforme a hora do dia
  function saudacao(data = new Date()) {
    const h = data.getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // "Qui, 7 jun"
  function dataCurta(data = new Date()) {
    return `${DIAS_CURTOS[data.getDay()].slice(0, 1) + DIAS_CURTOS[data.getDay()].slice(1).toLowerCase()}, ${data.getDate()} ${MESES[data.getMonth()]}`;
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

  return { DIAS, DIAS_CURTOS, MESES, saudacao, dataCurta, intervaloSemana, horas, pct };
})();

window.Utils = Utils;
