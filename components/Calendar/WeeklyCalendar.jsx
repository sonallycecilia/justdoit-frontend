/* ============================================================
   JustDoIt — WeeklyCalendar.jsx
   Calendário com alternância dia / semana / mês.
   Clicar num bloco → modal pequeno centralizado.
   Clicar na seta do bloco → drawer lateral redimensionável.
   ============================================================ */
const { useState, useRef, useEffect } = React;

// Faixa padrão da grade (6h–22h). É expandida dinamicamente por faixaHoras()
// quando existe algum evento fora disso (ex.: uma tarefa às 4h), para que ele
// não fique fora da grade (top negativo) e "suma".
const START = 6, END = 22;
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

// Constrói o objeto de dia (num/dow/iso/mes) a partir de uma data ISO. Usado
// pelo modal quando o evento vem da vista "mês" — que carrega só `iso`, sem o
// índice de dia `d` relativo à semana.
function diaDeIso(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  return { num: d.getDate(), dow: DOW[d.getDay()], iso, mes: d.getMonth() };
}

// Blocos recém-arrastados ganham um id temporário ('ext-…') antes de o POST
// retornar o id real do backend. Eventos derivados de uma tarefa agendada
// (id 'task-…') são virtuais e não existem no schedule-service. Só persistimos
// update/delete de blocos já salvos (id real do backend).
function ehPersistido(id) {
  return typeof id === 'string' && id.indexOf('ext-') !== 0 && id.indexOf('task-') !== 0;
}

/* ── HELPERS: TETO BIOLÓGICO ───────────────────────────── */
const TETO_MINUTOS_DIA = 960;

function minutosDoDia(iso, taskIdExcluir) {
  if (!window.Tarefas || !iso) return 0;
  return Tarefas.listar()
    .filter(t => t.dataIso === iso && t.id !== taskIdExcluir)
    .reduce((soma, t) => soma + (t.duracaoMin || 60), 0);
}

function excedeTeto(iso, taskId, duracaoMin) {
  if (!iso) return false;
  return minutosDoDia(iso, taskId) + (duracaoMin || 60) > TETO_MINUTOS_DIA;
}
/* ───────────────────────────────────────────────────────── */

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
    const duracaoH = (t.duracaoMin || 60) / 60;         // ← Lê duração real
    
    acc.push({
      id: 'task-' + t.id, taskId: t.id, ini, fim: ini + duracaoH, semHora: !t.hora,  // ← fim usa duracaoH
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

// Re-sincroniza os campos visuais de um evento com o cache de tarefas, sem
// re-buscar os blocos no backend. Usado quando 'tarefas:atualizadas' avisa que
// a tarefa mudou em outra parte da UI (ex.: categoria trocada por drag-and-drop
// na sidebar): só título/categoria/cor/prioridade/estado precisam acompanhar,
// a posição (dia/hora) do bloco não muda. Eventos sem taskId — ou de tarefa já
// removida do cache — ficam intactos.
function reaplicarTarefa(ev) {
  const t = (window.Tarefas && ev.taskId) ? Tarefas.buscar(ev.taskId) : null;
  if (!t) return ev;
  return {
    ...ev,
    titulo:  t.titulo,
    cat:     CAT_MAP[t.cat] || 'generico',
    catNome: t.cat,
    prio:    t.prioridade || 'normal',
    done:    t.done,
  };
}

function Icon({ d, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ── Pacotes de sobreposição ─────────────────────────────────
   Tarefas no mesmo horário deixam de ficar empilhadas e ilegíveis: quando duas
   ou mais se sobrepõem no tempo, viram um "pacote" — um único bloco com o total
   e um botão de expandir. Ao expandir, as tarefas aparecem lado a lado como
   blocos reais (arrastáveis, clicáveis, com lixeira) e um botão recolhe de volta. */

// Agrupa os eventos de um dia por faixa de 1 hora (balde da hora cheia de
// início): tudo que começa dentro da mesma hora — ex.: 10:00, 10:15, 10:45 —
// cai no pacote "10:00 – 11:00". Tarefa sozinha na faixa continua como bloco
// normal, na sua hora real.
function empacotarEventos(evs) {
  const baldes = new Map(); // hora inteira → cluster
  evs.slice().sort((a, b) => a.ini - b.ini).forEach(ev => {
    const h = Math.floor(ev.ini);
    let c = baldes.get(h);
    if (!c) { c = { itens: [], ini: h, fim: h + 1 }; baldes.set(h, c); }
    c.itens.push(ev);
  });
  return Array.from(baldes.values()).sort((a, b) => a.ini - b.ini);
}

// Chave estável do pacote (para lembrar se está aberto entre renders). Usa o
// horário de início + o id da 1ª tarefa do cluster.
function chavePacote(c) { return `${c.ini}-${c.itens[0].id}`; }

// Layout "lado a lado" (usado na vista Dia, onde há largura de sobra): agrupa
// os eventos que se sobrepõem no tempo e distribui cada um numa coluna paralela
// (algoritmo guloso: reaproveita a 1ª coluna cujo último evento já terminou).
// Retorna cada evento com sua posição {left, width} em fração da largura do dia.
function empacotarLadoALado(evs) {
  const ordenados = evs.slice().sort((a, b) => a.ini - b.ini || a.fim - b.fim);
  const clusters = [];
  let atual = null;
  ordenados.forEach(ev => {
    if (atual && ev.ini < atual.fim - 1e-9) { atual.itens.push(ev); atual.fim = Math.max(atual.fim, ev.fim); }
    else { atual = { itens: [ev], fim: ev.fim }; clusters.push(atual); }
  });
  const out = [];
  clusters.forEach(c => {
    const colFim = [];
    const slots = c.itens.map(ev => {
      let col = colFim.findIndex(f => f <= ev.ini + 1e-9);
      if (col === -1) { col = colFim.length; colFim.push(ev.fim); }
      else colFim[col] = ev.fim;
      return { ev, col };
    });
    const cols = colFim.length || 1;
    slots.forEach(s => out.push({ ev: s.ev, left: s.col / cols, width: 1 / cols }));
  });
  return out;
}

// Faixa de horas a desenhar na grade: parte do padrão [START, END] e expande
// para caber qualquer evento com horário fora dele (tarefas às 4h, 23h30…).
// Ignora eventos "Sem horário" (vão para a faixa do topo).
function faixaHoras(evs) {
  let ini = START, fim = END;
  (evs || []).forEach(ev => {
    if (ev.semHora) return;
    if (Number.isFinite(ev.ini)) ini = Math.min(ini, Math.floor(ev.ini));
    if (Number.isFinite(ev.fim)) fim = Math.max(fim, Math.ceil(ev.fim));
  });
  return { ini: Math.max(0, ini), fim: Math.min(24, fim) };
}

/* ── PacotePanel (pacote expandido: tarefas empilhadas) ──────
   Painel flutuante que sobrepõe a coluna mostrando as tarefas do pacote uma
   abaixo da outra. Cada linha é arrastável (mesmo fluxo de mover dos blocos):
   enquanto uma está sendo arrastada, o painel deixa passar o clique (pointer-
   events: none) para a coluna receber o "drop" e reposicionar a tarefa. */
function PacotePanel({ cluster, top, categorias, arrastandoId, onDragStart, onDragEnd, onOpen, onDrawer, onDelete, onClose }) {
  const arrastou = useRef(false);
  const itens = cluster.itens.slice().sort((a, b) => a.ini - b.ini);
  // Ao arrastar, o painel fica translúcido para revelar a grade por baixo. NÃO
  // usamos pointer-events:none aqui: como a linha arrastada é filha do painel,
  // tornar o painel não-interativo cancelaria o arraste no Chrome. O "drop" já
  // sobe (bubbling) da linha até a coluna .cal-col, que reposiciona a tarefa.
  const arrastando = !!arrastandoId;
  return (
    <div className="cal-pack-open" style={{ top: `${top}px`, opacity: arrastando ? 0.18 : 1 }}
      onClick={e => e.stopPropagation()}>
      <div className="cal-pack-open__head">
        <span className="cal-pack-open__title">{itens.length} tarefas · {fmtHora(cluster.ini)}</span>
        <button className="cal-pack-open__close" onClick={onClose} title="Recolher pacote">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </button>
      </div>
      <div className="cal-pack-open__list">
        {itens.map(ev => {
          const cor = corCategoria(categorias, ev);
          return (
            <div key={ev.id}
              className={`cal-pack-row${ev.done ? ' is-done' : ''}`}
              draggable="true"
              style={{ background: `color-mix(in srgb, ${cor} 10%, var(--color-card))`, borderColor: `color-mix(in srgb, ${cor} 40%, transparent)` }}
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(ev); arrastou.current = true; }}
              onDragEnd={() => { onDragEnd(); setTimeout(() => { arrastou.current = false; }, 0); }}
              onClick={() => { if (!arrastou.current && onOpen) onOpen(ev); }}
              title={ev.titulo}>
              <span className="cal-pack-row__prio" style={{ background: (window.COR_PRIORIDADE && window.COR_PRIORIDADE[ev.prio]) || 'var(--color-border-strong)' }} />
              <span className="cal-pack-row__main">
                <span className="cal-pack-row__title">{ev.titulo}</span>
                <span className="cal-pack-row__time">{ev.semHora ? 'Sem hora' : fmtHora(ev.ini)}</span>
              </span>
              {onDrawer && (
                <button className="cal-pack-row__act" onClick={e => { e.stopPropagation(); onDrawer(ev); }} title="Abrir painel lateral">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              )}
              {onDelete && (
                <button className="cal-pack-row__act cal-pack-row__act--del" onClick={e => { e.stopPropagation(); onDelete(ev); }} title="Excluir tarefa">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ColunaDoDia (eventos de um dia) ─────────────────────────
   modo="pacote" (padrão, vistas semana): tarefas do mesmo horário viram um
   pacote expansível. modo="lado" (vista Dia): tarefas sobrepostas ficam lado
   a lado em colunas paralelas, aproveitando a largura. */
function ColunaDoDia({ evs, categorias, rowH, startHour, arrastandoId, onDragStart, onDragEnd, onOpen, onDrawer, onDelete, modo }) {
  const [aberto, setAberto] = useState({}); // { chaveDoPacote: true }

  function bloco(ev, layout) {
    return (
      <TimeBlock key={ev.id} ev={ev} rowH={rowH} startHour={startHour}
        catCor={corCategoria(categorias, ev)}
        layout={layout}
        dragging={arrastandoId === ev.id}
        onDragStart={onDragStart} onDragEnd={onDragEnd}
        onOpen={onOpen} onDrawer={onDrawer} onDelete={onDelete} />
    );
  }

  // Vista Dia: colunas lado a lado, sem pacotes.
  if (modo === 'lado') {
    return <>{empacotarLadoALado(evs).map(s => bloco(s.ev, { left: s.left, width: s.width }))}</>;
  }

  return (
    <>
      {empacotarEventos(evs).map(c => {
        // Sem sobreposição: bloco normal, largura cheia.
        if (c.itens.length === 1) return bloco(c.itens[0]);

        const key = chavePacote(c);
        const top = (c.ini - startHour) * rowH;

        // Pacote aberto: painel com as tarefas empilhadas (uma abaixo da outra).
        if (aberto[key]) {
          return (
            <PacotePanel key={key} cluster={c} top={top} categorias={categorias}
              arrastandoId={arrastandoId}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              onOpen={onOpen} onDrawer={onDrawer} onDelete={onDelete}
              onClose={() => setAberto(a => ({ ...a, [key]: false }))} />
          );
        }

        // Pacote fechado: um único bloco com contador + botão expandir.
        const height = (c.fim - c.ini) * rowH - 4;
        return (
          <button key={key} className="cal-pack" style={{ top: `${top}px`, height: `${height}px` }}
            onClick={() => setAberto(a => ({ ...a, [key]: true }))}
            title={`Expandir ${c.itens.length} tarefas deste horário`}>
            <span className="cal-pack__stack" aria-hidden="true">
              {c.itens.slice(0, 3).map(ev => (
                <span key={ev.id} className="cal-pack__chip" style={{ background: corCategoria(categorias, ev) }} />
              ))}
            </span>
            <span className="cal-pack__body">
              <span className="cal-pack__count">{c.itens.length} tarefas</span>
              <span className="cal-pack__time">{fmtHora(c.ini)} – {fmtHora(c.fim)}</span>
            </span>
            <span className="cal-pack__expand">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </button>
        );
      })}
    </>
  );
}

/* ── LaneSemHora (faixa "Sem horário", estilo all-day) ───────
   Tarefas com data mas sem horário definido não ocupam mais a grade (antes
   caíam todas em 06:00). Ficam nesta faixa acima da grade, por dia. São
   clicáveis (abrem o modal) e arrastáveis para a grade — ao soltar num horário
   elas ganham hora e descem para o calendário. `colunas` já vem filtrado por
   dia (um array de eventos por coluna). */
function LaneSemHora({ colunas, categorias, onDragStart, onDragEnd, onOpen, onSoltar, arrastando }) {
  const arrastou = useRef(false);
  const [aberto, setAberto] = useState({}); // { indiceDaColuna: true }
  const [over, setOver] = useState(null);   // coluna sob o cursor no arraste

  // Chip arrastável de uma tarefa sem horário (arrastar para a grade dá hora).
  function chip(ev) {
    const cor = corCategoria(categorias, ev);
    return (
      <button key={ev.id}
        className={`cal-allday__chip${ev.done ? ' is-done' : ''}`}
        draggable="true"
        style={{ background: `color-mix(in srgb, ${cor} 12%, var(--color-card))`, borderColor: `color-mix(in srgb, ${cor} 40%, transparent)`, color: cor }}
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(ev); arrastou.current = true; }}
        onDragEnd={() => { onDragEnd(); setTimeout(() => { arrastou.current = false; }, 0); }}
        onClick={() => { if (!arrastou.current && onOpen) onOpen(ev); }}
        title={ev.titulo}>
        <span className="cal-allday__dot" style={{ background: cor }} />
        <span className="cal-allday__chip-title">{ev.titulo}</span>
      </button>
    );
  }

  return (
    <div className="cal-allday" style={{ '--cols': colunas.length }}>
      <div className="cal-allday__label">Sem<br />horário</div>
      {colunas.map((col, i) => (
        <div key={i}
          className={`cal-allday__col${over === i ? ' drag-over' : ''}`}
          onDragOver={onSoltar ? (e => { e.preventDefault(); setOver(i); }) : undefined}
          onDragLeave={onSoltar ? (() => setOver(o => o === i ? null : o)) : undefined}
          onDrop={onSoltar ? (e => { onSoltar(i, e); setOver(null); }) : undefined}>
          {/* Uma tarefa: chip solto. Várias: pacote (igual ao da grade). */}
          {arrastando && col.length === 0 && <span className="cal-allday__hint">soltar aqui</span>}
          {col.length <= 1 && col.map(chip)}

          {col.length > 1 && !aberto[i] && (
            <button className="cal-allday__pack" onClick={() => setAberto(a => ({ ...a, [i]: true }))}
              title={`Expandir ${col.length} tarefas sem horário`}>
              <span className="cal-allday__pack-chips" aria-hidden="true">
                {col.slice(0, 3).map(ev => (
                  <span key={ev.id} className="cal-allday__pack-dot" style={{ background: corCategoria(categorias, ev) }} />
                ))}
              </span>
              <span className="cal-allday__pack-count">{col.length} tarefas</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          )}

          {col.length > 1 && aberto[i] && (
            <div className="cal-allday__open">
              <button className="cal-allday__collapse" onClick={() => setAberto(a => ({ ...a, [i]: false }))} title="Recolher pacote">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                {col.length} tarefas
              </button>
              {col.map(chip)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── WeekView ─────────────────────────────────────────────── */
function WeekView({ dias, eventos, categorias, mover, moverSemHora, agendarSemHora, adicionar, onOpen, onDrawer, onDelete }) {
  const [arrastando, setArrastando] = useState(null);
  const [over, setOver]             = useState(null);

  const semHoraEvs = eventos.filter(ev => ev.semHora);
  const timedEvs   = eventos.filter(ev => !ev.semHora);
  // Faixa de horas visível (padrão 6–22, expandida por eventos fora do padrão).
  const { ini: gStart, fim: gEnd } = faixaHoras(timedEvs);
  const horas = [];
  for (let h = gStart; h <= gEnd; h++) horas.push(h);

  // Soltar na faixa "Sem horário": tarefa da sidebar agenda sem hora; bloco/
  // evento do calendário perde a hora e vai para a faixa do dia.
  function soltarSemHora(diaIdx, e) {
    e.preventDefault();
    const taskJson = e.dataTransfer.getData('application/jdi-task');
    if (taskJson) {
      try { agendarSemHora(JSON.parse(taskJson), diaIdx); } catch (_) {}
      setArrastando(null); setOver(null);
      return;
    }
    if (!arrastando) return;
    moverSemHora(arrastando.id, diaIdx);
    setArrastando(null); setOver(null);
  }

  function soltar(diaIdx, e) {
    e.preventDefault();
    const taskJson = e.dataTransfer.getData('application/jdi-task');
    if (taskJson) {
      try {
        const task = JSON.parse(taskJson);
        const rect = e.currentTarget.getBoundingClientRect();
        const ini  = Math.max(gStart, Math.min(gEnd - 1, gStart + Math.round(((e.clientY - rect.top) / ROW_H) * 2) / 2));
        const duracaoH = (task.duracaoMin || 60) / 60;      

        adicionar({ id: 'ext-' + task.id + '-' + Date.now(), d: diaIdx, ini, fim: ini + duracaoH, cat: CAT_MAP[task.cat] || 'generico', catNome: task.cat, prio: task.prioridade || 'normal', titulo: task.titulo, mod: null, taskId: task.id });
      } catch (_) {}
      setArrastando(null); setOver(null);
      return;
    }
    if (!arrastando) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const novaIni = Math.max(gStart, Math.min(gEnd - 0.5, gStart + Math.round(((e.clientY - rect.top) / ROW_H) * 2) / 2));
    mover(arrastando.id, diaIdx, novaIni);
    setArrastando(null); setOver(null);
  }

  return (
    <div className="cal-grid" style={{ '--cols': 7 }}>
      <div className="cal-stickytop">
        <div className="cal-head">
          <div className="cal-corner"></div>
          {dias.map((d, i) => (
            <div key={i} className={`cal-day ${d.hoje ? 'is-today' : ''}`}>
              <div className="cal-day__dow">{d.dow}</div>
              <div className="cal-day__num">{d.num}</div>
            </div>
          ))}
        </div>
        {(semHoraEvs.length > 0 || arrastando) && (
          <LaneSemHora colunas={dias.map((d, di) => semHoraEvs.filter(ev => ev.d === di))}
            categorias={categorias} onOpen={onOpen} onSoltar={soltarSemHora}
            arrastando={!!arrastando}
            onDragStart={setArrastando}
            onDragEnd={() => { setArrastando(null); setOver(null); }} />
        )}
      </div>
      <div className="cal-body">
        <div className="cal-rail">
          {horas.map(h => <div key={h} className="cal-slot"><span>{String(h).padStart(2,'0')}:00</span></div>)}
        </div>
        {dias.map((d, di) => (
          <div key={di}
            className={`cal-col ${d.hoje ? 'is-today' : ''} ${over === di ? 'drag-over' : ''}`}
            style={{ height: `${(gEnd - gStart) * ROW_H}px` }}
            onDragOver={e => { e.preventDefault(); setOver(di); }}
            onDragLeave={() => setOver(o => o === di ? null : o)}
            onDrop={e => soltar(di, e)}
          >
            <ColunaDoDia evs={timedEvs.filter(ev => ev.d === di)} categorias={categorias} rowH={ROW_H} startHour={gStart}
              arrastandoId={arrastando && arrastando.id}
              onDragStart={setArrastando}
              onDragEnd={() => { setArrastando(null); setOver(null); }}
              onOpen={onOpen} onDrawer={onDrawer} onDelete={onDelete} />
            {d.hoje && <div className="cal-now" style={{ top: `${((() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })() - gStart) * ROW_H}px` }}></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DayView ──────────────────────────────────────────────── */
function DayView({ dia, eventos, categorias, mover, onOpen, onDrawer, onDelete }) {
  const doDia = eventos.filter(ev => ev.d === dia.idx);
  const semHoraEvs = doDia.filter(ev => ev.semHora);
  const timedEvs   = doDia.filter(ev => !ev.semHora);
  const { ini: gStart, fim: gEnd } = faixaHoras(timedEvs);
  const horas = [];
  for (let h = gStart; h <= gEnd; h++) horas.push(h);
  return (
    <div className="cal-grid" style={{ '--cols': 1, minWidth: 'auto' }}>
      <div className="cal-stickytop">
        <div className="cal-head">
          <div className="cal-corner"></div>
          <div className={`cal-day ${dia.hoje ? 'is-today' : ''}`}>
            <div className="cal-day__dow">{dia.dow}</div>
            <div className="cal-day__num">{dia.num}</div>
          </div>
        </div>
        {semHoraEvs.length > 0 && (
          <LaneSemHora colunas={[semHoraEvs]} categorias={categorias} onOpen={onOpen}
            onDragStart={() => {}} onDragEnd={() => {}} />
        )}
      </div>
      <div className="cal-body">
        <div className="cal-rail">
          {horas.map(h => <div key={h} className="cal-slot"><span>{String(h).padStart(2,'0')}:00</span></div>)}
        </div>
        <div className={`cal-col ${dia.hoje ? 'is-today' : ''}`} style={{ height: `${(gEnd - gStart) * ROW_H}px` }}>
          <ColunaDoDia evs={timedEvs} categorias={categorias} rowH={ROW_H} startHour={gStart} modo="lado"
            arrastandoId={null} onDragStart={() => {}} onDragEnd={() => {}}
            onOpen={onOpen} onDrawer={onDrawer} onDelete={onDelete} />
          {dia.hoje && <div className="cal-now" style={{ top: `${((() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })() - gStart) * ROW_H}px` }}></div>}
        </div>
      </div>
    </div>
  );
}

/* ── MonthDayPopover (todas as tarefas de um dia, no mês) ────
   Painel expansível do mês: lista todas as tarefas do dia, arrastáveis para
   outro dia (mesmo fluxo de mover/persistir do mês) e clicáveis para abrir o
   modal. Durante o arraste, o painel e o backdrop ficam sem captar o mouse
   (só as linhas seguem interativas) para o "drop" chegar na célula de destino. */
function MonthDayPopover({ iso, num, rect, eventos, categorias, arrastandoId, onDragStart, onDragEnd, onOpen, onClose }) {
  const evs = eventos.filter(ev => ev.iso === iso);
  const arrastando = !!arrastandoId;
  const top  = Math.max(8, Math.min(rect.top, window.innerHeight - 340));
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 256));
  return (
    <>
      <div className="cal-monthpop__overlay" style={{ pointerEvents: arrastando ? 'none' : 'auto' }} onClick={onClose} />
      <div className="cal-monthpop" style={{ top, left, opacity: arrastando ? 0.2 : 1, pointerEvents: arrastando ? 'none' : 'auto' }}>
        <div className="cal-monthpop__head">
          <span className="cal-monthpop__title">Dia {num} · {evs.length} tarefas</span>
          <button className="cal-monthpop__close" onClick={onClose} aria-label="Fechar"><Icon d="M18 6 6 18|M6 6l12 12" size={14} /></button>
        </div>
        <div className="cal-monthpop__list">
          {evs.map(ev => (
            <div key={ev.id}
              className={`cal-monthpop__item${ev.done ? ' is-done' : ''}${arrastandoId === ev.id ? ' is-dragging' : ''}`}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ev.id); onDragStart(ev.id); }}
              onDragEnd={onDragEnd}
              onClick={() => { onClose(); onOpen(ev); }}
              title={ev.titulo}>
              <span className="cal-monthpop__dot" style={{ background: corCategoria(categorias, ev) }} />
              <span className="cal-monthpop__item-title">{ev.titulo}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── MonthView ────────────────────────────────────────────── */
// Clicar num evento → modal (onOpen). Arrastar um evento para outro dia →
// mover (muda a data ISO do bloco/tarefa).
function MonthView({ mesData, eventos, categorias, onOpen, mover }) {
  const [arrastando, setArrastando] = useState(null); // id do evento em arraste
  const [over, setOver]             = useState(null); // iso do dia sob o cursor

  function soltar(iso, e) {
    e.preventDefault();
    setOver(null);
    if (arrastando) mover(arrastando, iso);
    setArrastando(null);
  }

  const [expandido, setExpandido]   = useState(null); // { iso, num, rect } popover

  return (
    <div className="cal-month">
      <div className="cal-month__grid">
        {rotulosDow().map(d => <div key={d} className="cal-month__dow">{d}</div>)}
        {mesData.cells.map((c, i) => {
          const evs = c.out ? [] : eventos.filter(ev => ev.iso === c.iso);
          return (
            <div key={i}
              className={`cal-month__cell ${c.out ? 'is-out' : ''} ${c.hoje ? 'is-today' : ''} ${(!c.out && over === c.iso) ? 'drag-over' : ''}`}
              onDragOver={c.out ? undefined : (e => { e.preventDefault(); if (arrastando) setOver(c.iso); })}
              onDragLeave={c.out ? undefined : (() => setOver(o => o === c.iso ? null : o))}
              onDrop={c.out ? undefined : (e => soltar(c.iso, e))}
            >
              {!c.out && <span className="cal-month__num">{c.num}</span>}
              {evs.slice(0, 3).map(ev => (
                <span key={ev.id}
                  className={`cal-month__ev${ev.done ? ' cal-month__ev--done' : ''}${arrastando === ev.id ? ' is-dragging' : ''}`}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ev.id); setArrastando(ev.id); }}
                  onDragEnd={() => { setArrastando(null); setOver(null); }}
                  onClick={() => onOpen(ev)}
                  title={ev.titulo}
                >
                  <span className="cal-month__dot" style={{ background: corCategoria(categorias, ev) }}></span>
                  <span className="cal-month__ev-title">{ev.titulo}</span>
                </span>
              ))}
              {evs.length > 3 && (
                <button className="cal-month__ev cal-month__ev--more"
                  onClick={e => { e.stopPropagation(); setExpandido({ iso: c.iso, num: c.num, rect: e.currentTarget.getBoundingClientRect() }); }}
                  title="Ver todas as tarefas do dia">
                  +{evs.length - 3} mais
                </button>
              )}
            </div>
          );
        })}
      </div>
      {expandido && (
        <MonthDayPopover iso={expandido.iso} num={expandido.num} rect={expandido.rect}
          eventos={eventos} categorias={categorias} arrastandoId={arrastando}
          onDragStart={setArrastando} onDragEnd={() => { setArrastando(null); setOver(null); }}
          onOpen={onOpen} onClose={() => setExpandido(null)} />
      )}
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
  const [catOpen, setCatOpen] = useState(false);
  if (!ev) return null;

  // Categoria atual do evento, por nome (cai para o rótulo do slug em blocos
  // sem tarefa vinculada). Lista de opções vem das categorias reais do usuário.
  const cats = (categorias && categorias.length) ? categorias : [{ id: 'generico', nome: 'Genérico', cor: 'var(--color-cat-generico)' }];
  const catAtual = ev.catNome || CAT_LABEL[ev.cat] || 'Genérico';

  // Mês/ano de referência do seletor de data: derivado do dia do evento
  // (dia.iso na semana; ev.iso no mês). Sem data → mês atual. Antes era fixo
  // em "junho 2026", o que fazia tarefas de outros meses abrirem em junho.
  const refDate = (dia && dia.iso) ? new Date(dia.iso + 'T00:00:00')
                : ev.iso           ? new Date(ev.iso + 'T00:00:00')
                :                     new Date();
  const calAno = refDate.getFullYear();
  const calMes = refDate.getMonth();
  const diasNoMes = new Date(calAno, calMes + 1, 0).getDate();
  const primeiroDow = inicioDomingo()
    ? new Date(calAno, calMes, 1).getDay()
    : (new Date(calAno, calMes, 1).getDay() + 6) % 7;
  const DOW_FULL = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const dowDe = n => DOW_FULL[new Date(calAno, calMes, n).getDay()];
  const curNum = ev.dateNum !== undefined ? ev.dateNum : (dia ? dia.num : refDate.getDate());
  const curDow = ev.dow || dowDe(curNum);

  // "Hoje" só destaca quando o mês exibido é o corrente.
  const agora = new Date();
  const hojeNum = (agora.getFullYear() === calAno && agora.getMonth() === calMes) ? agora.getDate() : -1;

  // Dias da mesma semana do dia selecionado (destaque leve), limitados ao mês.
  const semanaNums = (() => {
    const sdow = new Date(calAno, calMes, curNum).getDay();
    const recuo = inicioDomingo() ? sdow : (sdow === 0 ? 6 : sdow - 1);
    const nums = [];
    for (let k = 0; k < 7; k++) {
      const d = new Date(calAno, calMes, curNum - recuo + k);
      if (d.getMonth() === calMes) nums.push(d.getDate());
    }
    return nums;
  })();

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
            <span className="task-modal__label">Categoria</span>
            <span className="task-modal__val">
              <div className="task-modal__cat-wrap">
                <button className={`task-modal__cat-btn${catOpen ? ' is-open' : ''}`} onClick={() => setCatOpen(o => !o)}>
                  <span className="task-modal__cat-dot" style={{ background: corCategoria(categorias, ev) }}></span>
                  <span className="task-modal__cat-btn-name">{catAtual}</span>
                  <Icon d="m6 9 6 6 6-6" size={13} />
                </button>
                {catOpen && <>
                  <div className="task-modal__cat-overlay" onClick={() => setCatOpen(false)} />
                  <div className="task-modal__cat-menu">
                    {cats.map(c => (
                      <button key={c.id} className={`task-modal__cat-item${catAtual === c.nome ? ' is-on' : ''}`}
                        onClick={() => { onUpdate({ catNome: c.nome, categoriaId: c.id, cat: CAT_MAP[c.nome] || ev.cat }); setCatOpen(false); }}>
                        <span className="task-modal__cat-dot" style={{ background: c.cor }}></span>
                        <span className="task-modal__cat-item-name">{c.nome}</span>
                        {catAtual === c.nome && <Icon d="M20 6 9 17l-5-5" size={14} />}
                      </button>
                    ))}
                  </div>
                </>}
              </div>
            </span>
          </div>
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
                  {curDow}, {curNum} {MESES[calMes]}
                  <Icon d="m6 9 6 6 6-6" size={13} />
                </button>
                {dateOpen && <>
                  <div className="task-modal__date-overlay" onClick={() => setDateOpen(false)} />
                  <div className="task-modal__date-menu">
                    <div className="task-modal__cal-head">{MESES_LONGOS[calMes]} {calAno}</div>
                    <div className="task-modal__cal-grid">
                      {rotulosDow().map(d => <div key={d} className="task-modal__cal-dow">{d.slice(0,1)}</div>)}
                      {Array.from({ length: primeiroDow }, (_, i) => <span key={'b' + i} />)}
                      {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(n => (
                        <button key={n}
                          className={`task-modal__cal-day${n === curNum ? ' is-on' : ''}${n === hojeNum ? ' is-today' : ''}${semanaNums.includes(n) ? ' is-week' : ''}`}
                          onClick={() => { onUpdate({ dateNum: n, dow: dowDe(n) }); setDateOpen(false); }}
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

  // Sincroniza cor/categoria/título dos eventos quando a tarefa muda em outra
  // parte da UI (ex.: arrastar entre categorias na sidebar dispara
  // 'tarefas:atualizadas'). Re-mapeia em memória a partir do cache de tarefas,
  // já atualizado nesse ponto — sem re-buscar os blocos no backend.
  useEffect(() => {
    function onTarefas() {
      setEventos(evs => evs.map(reaplicarTarefa));
      setEventosMes(evs => evs.map(reaplicarTarefa));
    }
    window.addEventListener('tarefas:atualizadas', onTarefas);
    return () => window.removeEventListener('tarefas:atualizadas', onTarefas);
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
  function sincronizarAgendaTarefa(taskId, iso, ini) {
    if (!taskId || !window.Tarefas) return;
    const tarefa = Tarefas.buscar(taskId);
    if (!tarefa || !iso) return;
    const hora = fmtHora(ini);
    // Atualiza o cache local na hora (otimista): abrir o detalhe logo após
    // arrastar já mostra a nova data/hora, sem esperar o PUT responder.
    const lista = Tarefas.listar();
    const i = lista.findIndex(x => x.id === taskId);
    if (i >= 0) {
      const dataObj = new Date(iso + 'T00:00:00');
      lista[i] = { ...lista[i], dataIso: iso, hora,
        data:   window.Utils ? Utils.dataRelativa(dataObj) : lista[i].data,
        quando: window.Utils ? Utils.calcQuando(dataObj)  : lista[i].quando };
      Tarefas.salvar(lista);
    }
    Tarefas.atualizar(taskId, { ...tarefa, dataIso: iso, hora }).catch(() => {});
  }

  function mover(id, novoDia, novaIni) {
    const atual = eventos.find(e => e.id === id);
    if (!atual) return;
    const dur = atual.fim - atual.ini;

    // 👇 NOVO: Bloqueio do Teto Biológico
    const iso  = dias[novoDia] && dias[novoDia].iso;
    const duracaoMin = atual.taskId
      ? (Tarefas.buscar(atual.taskId) || {}).duracaoMin || Math.round(dur * 60)
      : Math.round(dur * 60);
    
    if (excedeTeto(iso, atual.taskId, duracaoMin)) {
      if (window.Utils) Utils.toast('Teto biológico atingido: esse dia já tem 16h agendadas.', 'error');
      return; // não altera `eventos` → card volta pra posição original
    }

    // Soltar na grade define um horário: a tarefa deixa de ser "Sem horário".
    const novo = { ...atual, d: novoDia, ini: novaIni, fim: novaIni + dur, semHora: false };
    setEventos(evs => evs.map(ev => ev.id === id ? novo : ev));
    if (window.Blocos && ehPersistido(id)) Blocos.atualizar(novo, dias).catch(() => {});
    sincronizarAgendaTarefa(atual.taskId, dias[novoDia] && dias[novoDia].iso, novaIni);
  }

  // Zera a hora da tarefa (mantendo a data) — usado ao mover para "Sem horário".
  // Reflete no cache local (otimista) e persiste no task-service (dueTime = null).
  function limparHoraTarefa(taskId, iso) {
    if (!taskId || !window.Tarefas) return;
    const tarefa = Tarefas.buscar(taskId);
    if (!tarefa) return;
    const lista = Tarefas.listar();
    const i = lista.findIndex(x => x.id === taskId);
    if (i >= 0) { lista[i] = { ...lista[i], hora: undefined, dataIso: iso || lista[i].dataIso }; Tarefas.salvar(lista); }
    Tarefas.atualizar(taskId, { ...tarefa, hora: null, dataIso: iso || tarefa.dataIso })
      .then(() => window.dispatchEvent(new CustomEvent('tarefas:atualizadas')))
      .catch(() => {});
  }

  // Move um evento do calendário para a faixa "Sem horário" do dia destino:
  // remove o bloco de tempo (se persistido) e zera a hora da tarefa. O evento
  // vira "virtual" (id 'task-…'), já que não há mais bloco no schedule-service.
  function moverParaSemHora(id, novoDia) {
    const atual = eventos.find(e => e.id === id);
    if (!atual || atual.semHora === true && atual.d === novoDia) return;
    const iso = dias[novoDia] && dias[novoDia].iso;
    const novoId = atual.taskId ? ('task-' + atual.taskId) : atual.id;
    const novo = { ...atual, id: novoId, d: novoDia, semHora: true };
    setEventos(evs => evs.map(ev => ev.id === id ? novo : ev));
    if (window.Blocos && ehPersistido(id)) Blocos.remover(id).catch(() => {});
    limparHoraTarefa(atual.taskId, iso);
  }

  // Arrastar uma tarefa da sidebar direto para a faixa "Sem horário": agenda no
  // dia (sem hora). Se já estiver no calendário, reaproveita moverParaSemHora.
  function agendarSemHora(task, novoDia) {
    // 👇 NOVO: Bloqueio do Teto Biológico
    const iso = dias[novoDia] && dias[novoDia].iso;
    const duracaoMin = task.duracaoMin || 60;
    
    if (excedeTeto(iso, task.id, duracaoMin)) {
      if (window.Utils) Utils.toast('Teto biológico atingido: esse dia já tem 16h agendadas.', 'error');
      return;
    }

    const existente = eventos.find(e => e.taskId === task.id);
    if (existente) { moverParaSemHora(existente.id, novoDia); return; }
    
    setEventos(evs => [...evs, {
      id: 'task-' + task.id, taskId: task.id, d: novoDia, ini: START, fim: START + 1,
      semHora: true, titulo: task.titulo, cat: CAT_MAP[task.cat] || 'generico',
      catNome: task.cat, prio: task.prioridade || 'normal', done: false, mod: null,
    }]);
    limparHoraTarefa(task.id, iso);
  }

  // Move um evento da vista "mês" para outro dia (só muda a data ISO; a hora é
  // preservada). Persiste o bloco no schedule-service e sincroniza a data da
  // tarefa vinculada. Blocos.atualizar espera índice de dia + array `dias`, então
  // montamos um `dias` sintético de um elemento com o iso de destino.
  function moverMes(id, novoIso) {
    const atual = eventosMes.find(e => e.id === id);
    if (!atual || atual.iso === novoIso) return;

    // 👇 NOVO: Bloqueio do Teto Biológico
    const duracaoMin = atual.taskId ? (Tarefas.buscar(atual.taskId) || {}).duracaoMin || 60 : 60;
    
    if (excedeTeto(novoIso, atual.taskId, duracaoMin)) {
      if (window.Utils) Utils.toast('Teto biológico atingido: esse dia já tem 16h agendadas.', 'error');
      return;
    }

    const novo = { ...atual, iso: novoIso };
    setEventosMes(evs => evs.map(ev => ev.id === id ? novo : ev));
    if (window.Blocos && ehPersistido(id)) Blocos.atualizar({ ...novo, d: 0 }, [{ iso: novoIso }]).catch(() => {});
    sincronizarAgendaTarefa(atual.taskId, novoIso, atual.ini);
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
    // Arrastar uma tarefa da sidebar para o calendário. Regra "copiar só se já
    // agendada": se a tarefa ainda não tem data, agenda a PRÓPRIA tarefa (sem
    // duplicar); se já está agendada em outro horário, cria uma cópia para o novo
    // horário (permite o mesmo afazer em vários blocos).
    const dia  = dias[novoEv.d];
    const orig = window.Tarefas ? Tarefas.buscar(novoEv.taskId) : null;

    // 👇 NOVO: Bloqueio do Teto Biológico
    const duracaoMin = orig ? (orig.duracaoMin || 60) : 60;
    
    if (dia && excedeTeto(dia.iso, novoEv.taskId, duracaoMin)) {
      if (window.Utils) Utils.toast('Teto biológico atingido: esse dia já tem 16h agendadas.', 'error');
      return; // não adiciona nada — o card volta a não existir no grid (Revert visual)
    }

    setEventos(evs => [...evs, novoEv]); // mostra na hora (otimista)

    // Sem módulo de tarefas: cria só o bloco ligado à tarefa de origem (fallback).
    if (!window.Tarefas) { criarBlocoDoEvento(novoEv); return; }

    // Tarefa de origem ainda sem data → agenda ela mesma (não duplica).
    if (orig && !orig.dataIso) {
      sincronizarAgendaTarefa(orig.id, dia && dia.iso, novoEv.ini); // PUT data/hora
      criarBlocoDoEvento(novoEv);                             // bloco ligado a orig.id
      window.dispatchEvent(new CustomEvent('tarefas:atualizadas'));
      return;
    }

    // Já agendada (ou sem cache da origem) → cria uma nova tarefa (cópia).
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
    setEventosMes(evs => evs.filter(e => e.id !== ev.id));
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
    const ref = modalEv.iso || (dias[modalEv.d] && dias[modalEv.d].iso) || (dias[0] && dias[0].iso);
    if (!ref) return null;
    return ref.slice(0, 8) + String(n).padStart(2, '0'); // "AAAA-MM-" + "DD"
  }

  // Persiste um bloco no schedule-service, aceitando tanto o modelo da semana
  // (índice `d` + array `dias`) quanto o do mês (data `iso` absoluta).
  function persistirBloco(ev) {
    if (!window.Blocos || !ehPersistido(ev.id)) return;
    if (ev.iso != null && ev.d == null) Blocos.atualizar({ ...ev, d: 0 }, [{ iso: ev.iso }]).catch(() => {});
    else Blocos.atualizar(ev, dias).catch(() => {});
  }

  function handleUpdate(changes) {
    if (!modalEv) return;
    const novo = { ...modalEv, ...changes };
    // Evento do mês: mudar o dia no seletor também move o bloco na grade (o
    // modelo do mês localiza pelo `iso`, não pelo índice de dia).
    if (changes.dateNum !== undefined && modalEv.iso != null) {
      const iso = isoDoDiaDoMes(changes.dateNum);
      if (iso) novo.iso = iso;
    }
    setEventos(evs => evs.map(e => e.id === modalEv.id ? novo : e));
    setEventosMes(evs => evs.map(e => e.id === modalEv.id ? novo : e));
    setModalEv(novo);

    // Mudança de horário (ou do dia, na vista mês) → persiste no schedule-service.
    if ((changes.ini !== undefined || changes.fim !== undefined || novo.iso !== modalEv.iso) && window.Blocos && ehPersistido(novo.id)) {
      persistirBloco(novo);
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
          {vista === 'semana' && <WeekView dias={dias} eventos={eventos} categorias={categorias} mover={mover} moverSemHora={moverParaSemHora} agendarSemHora={agendarSemHora} adicionar={adicionar} onOpen={openModal} onDrawer={openDrawer} onDelete={pedirRemover} />}
          {vista === 'dia'    && <DayView dia={diaAtual} eventos={eventos} categorias={categorias} mover={mover} onOpen={openModal} onDrawer={openDrawer} onDelete={pedirRemover} />}
          {vista === 'mes'    && <MonthView mesData={mesData} eventos={eventosMes} categorias={categorias} onOpen={openModal} mover={moverMes} />}
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

      <TaskModal ev={modalEv} dia={modalEv ? (modalEv.iso != null ? diaDeIso(modalEv.iso) : dias[modalEv.d]) : null} categorias={categorias} onClose={() => setModalEv(null)} onUpdate={handleUpdate} onDelete={pedirRemover} />
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