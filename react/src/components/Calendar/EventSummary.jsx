// Resumo compacto de um evento do calendário, exibido no drawer lateral.
// Port modernizado do event-summary do app antigo: em vez de gravar só no
// cache local (legado), persiste de verdade — prioridade/categoria/hora via
// PUT /tasks (usePatchTarefa), concluir via PATCH complete/reopen, e o bloco
// via PUT /time-blocks quando o horário muda.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategorias } from '../../hooks/useCategories';
import { useTarefas, useToggleDone } from '../../hooks/useTasks';
import { fmtHora, useAtualizarBloco, usePatchTarefa } from '../../hooks/useTimeBlocks';
import { prioridadeParaApi, COR, NIVEIS, ROTULO } from '../../lib/priority';
import { TimePickerInline } from './WeeklyCalendar';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function ehBlocoPersistido(id) {
  return typeof id === 'string' && id.indexOf('ext-') !== 0 && id.indexOf('task-') !== 0;
}

export default function EventSummary({ ev, dias }) {
  const { data: categorias } = useCategorias();
  const { data: tarefas } = useTarefas(categorias);
  const tarefa = ev.taskId ? (tarefas || []).find(t => t.id === ev.taskId) : null;

  const patchTarefa = usePatchTarefa();
  const atualizarBloco = useAtualizarBloco();
  const toggleDone = useToggleDone();

  // Horário local (edição otimista); a grade converge via invalidação.
  const [horario, setHorario] = useState({ ini: ev.ini, fim: ev.fim });
  const [salvo, setSalvo] = useState(false);

  const done = tarefa ? tarefa.done : Boolean(ev.done);
  const titulo = tarefa ? tarefa.titulo : (ev.titulo || '(sem título)');
  const prioridade = tarefa ? tarefa.prioridade : (ev.prio || 'normal');
  const catNome = tarefa ? tarefa.cat : (ev.catNome || 'Genérico');

  // Data do evento: dia da semana (vista semana) ou iso (vista mês).
  const diaEv = ev.iso ? null : (dias && dias[ev.d]);
  const iso = ev.iso || (diaEv && diaEv.iso);
  const dataRotulo = (() => {
    if (diaEv) return `${diaEv.dow}, ${diaEv.num} ${MESES[diaEv.mes]}`;
    if (ev.iso) {
      const d = new Date(ev.iso + 'T00:00:00');
      return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
    }
    return '—';
  })();

  function flashSalvo() {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2200);
  }

  // Mudar o horário persiste na hora: bloco (se real) + dueTime da tarefa.
  function mudarHorario(novoIni, novoFim) {
    setHorario({ ini: novoIni, fim: novoFim });
    if (ehBlocoPersistido(ev.id) && iso) {
      atualizarBloco.mutateAsync({ ...ev, iso, ini: novoIni, fim: novoFim }).catch(() => {});
    }
    if (ev.taskId && tarefa) {
      patchTarefa.mutateAsync({ taskId: ev.taskId, patch: { dueTime: fmtHora(novoIni) } })
        .then(flashSalvo).catch(() => {});
    }
  }

  function mudarPrioridade(nivel) {
    if (!ev.taskId) return;
    patchTarefa.mutateAsync({ taskId: ev.taskId, patch: { priority: prioridadeParaApi(nivel) } })
      .then(flashSalvo).catch(() => {});
  }

  function mudarCategoria(c) {
    if (!ev.taskId) return;
    patchTarefa.mutateAsync({ taskId: ev.taskId, patch: { categoryId: c.id === 'generico' ? null : c.id } })
      .then(flashSalvo).catch(() => {});
  }

  return (
    <div className={`evsum ${done ? 'is-done' : ''}`} style={{ padding: '16px 20px' }}>
      <div className="evsum__topbar">
        <span />
        <div className="evsum__topbar-actions">
          {ev.taskId && (
            <Link className="btn btn--secondary btn--sm" to={`/tasks/${ev.taskId}`}>Ver tarefa completa</Link>
          )}
        </div>
      </div>

      <div className="evsum__head">
        <button
          className="evsum__check"
          aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
          disabled={!ev.taskId}
          onClick={() => ev.taskId && toggleDone.mutate({ id: ev.taskId, concluir: !done })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path className="evsum__check-tick" d="m8 12 3 3 5-5" />
          </svg>
        </button>
        <h1 className="evsum__title">{titulo}</h1>
      </div>

      <div className="evsum__chips">
        <span className="evsum__time-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
          {ev.semHora
            ? <span>Sem horário</span>
            : <TimePickerInline ini={horario.ini} fim={horario.fim} onChange={mudarHorario} />}
        </span>
        <span className="evsum__date-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <span>{dataRotulo}</span>
        </span>
      </div>

      <div className="evsum__card card">
        {ev.taskId ? (
          <>
            <section className="evsum__section">
              <div className="evsum__section-head">Prioridade</div>
              <div className="evsum__prio-row">
                {NIVEIS.map(n => (
                  <button key={n} className={`evsum__prio-opt ${prioridade === n ? 'is-on' : ''}`} type="button" onClick={() => mudarPrioridade(n)}>
                    <span className="evsum__prio-dot" style={{ background: COR[n] }}></span>
                    {ROTULO[n]}
                  </button>
                ))}
              </div>
            </section>

            <section className="evsum__section">
              <div className="evsum__section-head">Categoria</div>
              <div className="evsum__cat-picker">
                {(categorias || []).map(c => (
                  <button key={c.id} className={`evsum__cat-opt ${catNome === c.nome ? 'is-on' : ''}`} type="button" onClick={() => mudarCategoria(c)}>
                    <span className="evsum__cat-dot" style={{ background: c.cor }}></span>
                    {c.nome}
                  </button>
                ))}
              </div>
            </section>

            <div className="evsum__save-row">
              <span className="evsum__section-head" style={{ opacity: 0.7 }}>As mudanças salvam automaticamente</span>
              <span className={`evsum__saved ${salvo ? 'is-visible' : ''}`}>Salvo!</span>
            </div>
          </>
        ) : (
          <section className="evsum__section">
            <div className="evsum__section-head">Bloco sem tarefa vinculada</div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Este bloco de tempo não está ligado a nenhuma tarefa — prioridade e
              categoria ficam disponíveis quando há uma tarefa vinculada.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
