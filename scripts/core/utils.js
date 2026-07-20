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
    if (h >= 5 && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite'; // 18h+ e madrugada
  }

  // "14 de jun"
  function dataCurta(data) {
    if (!data) return '';
    return `${data.getDate()} de ${MESES[data.getMonth()]}`;
  }

  // "Hoje", "Amanhã", "Ontem" ou "14 jun"
  function dataRelativa(data) {
    if (!data) return '';
    const h = hoje();
    const d = new Date(data); d.setHours(0,0,0,0);
    const diff = Math.round((d - h) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    return `${d.getDate()} ${MESES[d.getMonth()]}`;
  }

  // Classificação da tarefa em relação a hoje: 'past', 'today', 'future'
  function calcQuando(data) {
    if (!data) return 'future'; // sem data -> backlog
    const h = hoje();
    const d = new Date(data); d.setHours(0,0,0,0);
    if (d < h) return 'past';
    if (d.getTime() === h.getTime()) return 'today';
    return 'future';
  }

  // Formato AAAA-MM-DD local (evita bug de fuso do toISOString)
  function dataIso(data) {
    if (!data) return null;
    const m = String(data.getMonth() + 1).padStart(2, '0');
    const d = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${m}-${d}`;
  }

  // Parse flexível de string salva no cache ("Hoje", "14 jun") -> Date object
  function parseData(str) {
    if (!str || str === 'Sem data') return null;
    const h = hoje();
    if (str === 'Ontem')    { const d = new Date(h); d.setDate(h.getDate() - 1); return d; }
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

  // Escapa texto para interpolação segura em HTML (innerHTML/atributos).
  // TODO conteúdo vindo do usuário ou do backend deve passar por aqui antes
  // de entrar num template literal que vira innerHTML.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Percentual seguro 0–100
  function pct(parte, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((parte / total) * 100)));
  }

  function intervaloSemana(dataBase) {
    const d = dataBase ? new Date(dataBase) : new Date();
    const dow = d.getDay(); // 0=Dom
    // Assumindo semana começa na Segunda (1)
    const recuo = dow === 0 ? 6 : dow - 1;
    const seg = new Date(d); seg.setDate(d.getDate() - recuo);
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    return {
      inicio: dataIso(seg), fim: dataIso(dom),
      rotulo: `${seg.getDate()} ${MESES[seg.getMonth()]} – ${dom.getDate()} ${MESES[dom.getMonth()]}`
    };
  }

  function capitalizarNome(nomeStr) {
    if (!nomeStr) return '';
    return nomeStr.trim().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }

  // 👇 NOVO: Toast simples no canto inferior, some sozinho depois de alguns segundos.
  let _toastEl = null;
  function toast(mensagem, tipo) {
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = mensagem;
    _toastEl.className = `jdi-toast jdi-toast--${tipo || 'error'} is-visible`;
    clearTimeout(_toastEl._timer);
    _toastEl._timer = setTimeout(() => _toastEl.classList.remove('is-visible'), 4000);
  }

  return { DIAS, DIAS_CURTOS, MESES, MESES_LONGOS, hoje, saudacao, dataCurta, dataRelativa, calcQuando, dataIso, parseData, intervaloSemana, horas, esc, pct, capitalizarNome, toast };
})();

// `const` no topo de um script clássico NÃO cria window.Utils — sem esta linha,
// todo guard `window.Utils ? … : …` (sidebar, dashboard) falha em silêncio.
window.Utils = Utils;