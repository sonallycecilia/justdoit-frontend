// Vitrine animada da landing — substitui o mock estático "Hoje".
// Carrossel estilo menu: a cena em foco fica centralizada e as vizinhas
// aparecem menores e esmaecidas nas laterais. Passa sozinha em looping por
// três funcionalidades REAIS (Pomodoro, subtarefas e ciclo de repetição).
//
// Os timers são só de demonstração: rodam acelerados para a cena caber em
// poucos segundos. A lógica de verdade vive em TaskEditor/useTaskDetail.
import { useEffect, useState } from 'react';
import Ic, { ICONS } from '@/components/Ic';
import { formatarMinSeg } from '@/lib/utils';

const DURACAO_CENA = 7000; // ms que cada cena fica em foco

// Respeita quem pediu menos movimento no sistema: sem auto-avanço e sem loop.
function usaMenosMovimento() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/* ── Cena 1: Pomodoro ─────────────────────────────────────────────────────── */
const FOCO_TOTAL = 25 * 60;

function CenaFoco({ animar }) {
  // 25 min comprimidos em ~6,5s: 12 segundos "reais" a cada tick de 50ms.
  const [restante, setRestante] = useState(FOCO_TOTAL);

  useEffect(() => {
    if (!animar) return;
    const h = setInterval(() => {
      setRestante((s) => (s <= 12 ? FOCO_TOTAL : s - 12));
    }, 50);
    return () => clearInterval(h);
  }, [animar]);

  const pct = ((FOCO_TOTAL - restante) / FOCO_TOTAL) * 100;
  // Um "pip" aceso a cada quarto do ciclo, como os 4 blocos do Pomodoro.
  const ciclos = Math.min(4, Math.floor(pct / 25) + 1);

  return (
    <div className="sc-foco">
      <div className="pomo__ring" style={{ '--pct': pct.toFixed(1) }}>
        <div className="pomo__inner">
          <div className="pomo__time">{formatarMinSeg(restante)}</div>
          <div className="pomo__phase">Foco</div>
        </div>
      </div>
      <div className="sc-foco__tarefa">Revisar a proposta</div>
      <p className="sc-foco__desc">Blocos de 25 minutos com pausas curtas.</p>
      <div className="sc-foco__ciclos" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`sc-foco__pip ${n <= ciclos ? 'is-on' : ''}`} />
        ))}
      </div>
    </div>
  );
}

/* ── Cena 2: Subtarefas ───────────────────────────────────────────────────── */
const SUBS = ['Levantar requisitos', 'Montar o orçamento', 'Revisar com a equipe', 'Enviar para aprovação'];

function CenaSubtarefas({ animar }) {
  const [feitas, setFeitas] = useState(0);

  useEffect(() => {
    if (!animar) return;
    const h = setInterval(() => {
      // Completa uma a uma e recomeça depois de um respiro no 100%.
      setFeitas((n) => (n >= SUBS.length + 1 ? 0 : n + 1));
    }, 1100);
    return () => clearInterval(h);
  }, [animar]);

  const marcadas = Math.min(feitas, SUBS.length);
  const pct = Math.round((marcadas / SUBS.length) * 100);

  return (
    <div>
      <div className="sc-sub__titulo">Preparar a proposta</div>
      <div className="sc-sub__lista">
        {SUBS.map((s, i) => (
          <div className={`sc-sub__item ${i < marcadas ? 'is-done' : ''}`} key={s}>
            <span className="sc-sub__check"><Ic d={ICONS.check} strokeWidth={3} /></span>
            <span className="sc-sub__label">{s}</span>
          </div>
        ))}
      </div>
      <div className="sc-progress">
        <div className="sc-progress__track">
          <div
            className={`sc-progress__fill ${pct === 100 ? 'sc-progress__fill--done' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="sc-progress__n">{marcadas}/{SUBS.length}</span>
      </div>
    </div>
  );
}

/* ── Cena 3: Ciclo de repetição ───────────────────────────────────────────── */
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function rotuloData(d) {
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
}

function CenaCiclo({ animar }) {
  const [passo, setPasso] = useState(0); // quantas vezes a tarefa já voltou
  const [concluida, setConcluida] = useState(false);

  useEffect(() => {
    if (!animar) return;
    // Marca como concluída, segura um instante para dar de ler, e então troca
    // pela próxima ocorrência (que entra animada pela key do elemento).
    const marcar = setTimeout(() => setConcluida(true), 1500);
    const proxima = setTimeout(() => {
      setConcluida(false);
      setPasso((p) => p + 1);
    }, 2600);
    return () => { clearTimeout(marcar); clearTimeout(proxima); };
  }, [passo, animar]);

  const data = new Date();
  data.setDate(data.getDate() + passo * 7);
  const proxima = new Date(data);
  proxima.setDate(data.getDate() + 7);

  return (
    <div>
      <span className="sc-ciclo__tag">
        <Ic d={ICONS.cycle} /> a cada 7 dias
      </span>
      <div className={`sc-ciclo__card ${concluida ? 'is-done' : ''}`} key={passo}>
        <span className="sc-sub__check"><Ic d={ICONS.check} strokeWidth={3} /></span>
        <span className="sc-ciclo__t">Reunião de acompanhamento</span>
        <span className="sc-ciclo__data">{rotuloData(data)}</span>
      </div>
      <p className="sc-ciclo__prox">
        Ao concluir, volta sozinha em <strong>{rotuloData(proxima)}</strong>.
      </p>
    </div>
  );
}

/* ── Vitrine ──────────────────────────────────────────────────────────────── */
const CENAS = [
  { id: 'foco', titulo: 'Foco', icone: ICONS.target, hint: 'POMODORO', legenda: 'Cronômetro de 25 minutos', Cena: CenaFoco },
  { id: 'subtarefas', titulo: 'Subtarefas', icone: ICONS.list, hint: 'PASSOS', legenda: 'Quebre a tarefa em partes', Cena: CenaSubtarefas },
  { id: 'ciclo', titulo: 'Ciclo', icone: ICONS.cycle, hint: 'RECORRÊNCIA', legenda: 'A tarefa volta sozinha', Cena: CenaCiclo },
];

// Distância circular até a cena em foco: com 3 cenas, a última precisa aparecer
// à ESQUERDA da primeira (-1) e não lá na ponta direita (+2).
function distanciaCircular(n, i, total) {
  let d = n - i;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

// Posição de cada card em relação ao que está em foco. O deslocamento é em %
// da largura do próprio card, então acompanha o clamp() da largura sem contas.
function estiloDoCard(distancia) {
  const escala = distancia === 0 ? 1 : 0.82;
  return {
    transform: `translateX(calc(-50% + ${distancia * 80}%)) scale(${escala})`,
    opacity: distancia === 0 ? 1 : 0.3,
  };
}

export default function FeatureShowcase() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const estatico = usaMenosMovimento();

  const irPara = (n) => setI(((n % CENAS.length) + CENAS.length) % CENAS.length);

  useEffect(() => {
    if (estatico || pausado) return;
    const h = setTimeout(() => setI((n) => (n + 1) % CENAS.length), DURACAO_CENA);
    return () => clearTimeout(h);
  }, [i, pausado, estatico]);

  return (
    // Passar o mouse pausa o rodízio, para dar tempo de ler a cena.
    <div className="showcase" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
      <button className="showcase__nav showcase__nav--prev" type="button" onClick={() => irPara(i - 1)} aria-label="Cena anterior">
        <Ic d={ICONS.chevronLeft} />
      </button>

      <div className="showcase__viewport">
        {CENAS.map((c, n) => {
          const ativo = n === i;
          const { Cena } = c;
          return (
            <article
              key={c.id}
              className={`showcase__card ${ativo ? 'is-active' : ''}`}
              style={estiloDoCard(distanciaCircular(n, i, CENAS.length))}
              aria-hidden={!ativo}
            >
              <div className="showcase__head">
                <span className="showcase__ic"><Ic d={c.icone} /></span>
                <span className="showcase__title">{c.titulo}</span>
                <span className="showcase__hint">{c.hint}</span>
              </div>
              <div className="showcase__stage">
                {/* Só a cena em foco anima — evita 3 timers rodando à toa. */}
                <div className="showcase__cena">
                  <Cena animar={ativo && !estatico} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button className="showcase__nav showcase__nav--next" type="button" onClick={() => irPara(i + 1)} aria-label="Próxima cena">
        <Ic d={ICONS.chevronRight} />
      </button>

      <div className="showcase__dots">
        {CENAS.map((c, n) => (
          <button
            key={c.id}
            type="button"
            className={`showcase__dot ${n === i ? 'is-on' : ''}`}
            aria-label={`Ver ${c.titulo}`}
            aria-current={n === i}
            onClick={() => irPara(n)}
          />
        ))}
      </div>
      <p className="showcase__legenda">{CENAS[i].legenda}</p>
    </div>
  );
}
