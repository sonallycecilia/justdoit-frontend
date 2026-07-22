// Aba "Visão geral" (home semanal): saudação, resumo da semana, tarefas de
// hoje priorizadas e atalhos.
//
// As estatísticas vêm do backend via useAnaliseSemanal — o dashboard antigo
// somava totais guardados em localStorage (FOCO_DIARIO / TEMPO_DIARIO), que a
// regra de ouro do app React não permite.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Ic, { ICONS } from '@/components/Ic';
import Sidebar from '@/components/Sidebar';
import { useAnaliseSemanal } from '@/features/dashboard/hooks/useAnalytics';
import { useCategorias } from '@/features/categories/hooks/useCategories';
import { useConta } from '@/features/auth/hooks/useConta';
import { useRemoverTarefa, useTarefas, useToggleDone } from '@/features/tasks/hooks/useTasks';
import { lerSessao } from '@/api/session';
import * as Priority from '@/features/tasks/lib/priority';
import { capitalizarNome, dataCurta, horas, saudacao } from '@/lib/utils';

const ATALHOS = [
  { to: '/calendario', icon: ICONS.calendar, titulo: 'Calendário', desc: 'Blocos da semana' },
  { to: '/todo', icon: ICONS.todo, titulo: 'To Do', desc: 'Lista priorizada' },
  { to: '/analise', icon: ICONS.analytics, titulo: 'Análise', desc: 'Desvio semanal' },
  { to: '/configuracoes', icon: ICONS.settings, titulo: 'Configurações', desc: 'Perfil e categorias' },
];

export default function VisaoGeral() {
  const navigate = useNavigate();

  const { data: categorias } = useCategorias();
  const { data: tarefas, isLoading, isError, refetch } = useTarefas(categorias);
  const { data: usuario } = useConta();
  const analise = useAnaliseSemanal(tarefas);

  const toggleDone = useToggleDone();
  const remover = useRemoverTarefa();

  // Atrasadas entram junto das de hoje — são pendências do dia na prática.
  const doDia = useMemo(
    () => (tarefas || []).filter((t) => ['today', 'past'].includes(t.quando)).sort(Priority.comparar),
    [tarefas],
  );

  const primeiroNome = capitalizarNome(usuario?.name || lerSessao()?.name || '').split(' ')[0];
  const execPct = analise.totalPlan ? Math.round((analise.totalReal / analise.totalPlan) * 100) : 0;
  const diff = analise.totalReal - analise.totalPlan;

  return (
    <div className="app">
      <Sidebar ativa="dashboard" />

      <main className="app__main">
        <div className="page">
          <header className="page__head">
            <div>
              <div className="page__eyebrow">{dataCurta()} · semana de {analise.semana.rotulo}</div>
              <h1 className="page__title">
                {saudacao()}{primeiroNome ? <>, <em>{primeiroNome}.</em></> : '.'}
              </h1>
            </div>
            <div className="page__head-actions">
              <Link className="btn btn--secondary btn--md" to="/calendario">Ver semana</Link>
              <Link className="btn btn--primary btn--md" to="/tasks/nova">+ Nova tarefa</Link>
            </div>
          </header>

          <section className="section">
            <div className="stats-grid">
              <div className="stat">
                <span className="stat__label"><Ic d={ICONS.checkCircle} /> Concluídas</span>
                <span className="stat__value">
                  {analise.conclusao.feitas} <small>/ {analise.conclusao.total}</small>
                </span>
                <span className="stat__hint">tarefas desta semana</span>
              </div>

              <div className="stat">
                <span className="stat__label"><Ic d={ICONS.clock} /> Foco hoje</span>
                <span className="stat__value">{horas(analise.foco.minutos / 60)}</span>
                <span className="stat__hint">
                  em {analise.foco.ciclos} {analise.foco.ciclos === 1 ? 'ciclo' : 'ciclos'} de Pomodoro
                </span>
              </div>

              <div className="stat stat--wide">
                <span className="stat__label"><Ic d={ICONS.analytics} /> Tempo executado</span>
                <div className="progress" style={{ marginTop: 6 }}>
                  <div className="progress__head">
                    <span className="progress__label">
                      {horas(analise.totalPlan)} planejadas · {horas(analise.totalReal)} executadas
                    </span>
                    <span className="progress__value">{execPct}%</span>
                  </div>
                  <div className="progress__track">
                    <div className="progress__fill" style={{ width: `${Math.min(execPct, 100)}%` }} />
                  </div>
                </div>
                <span className="stat__hint">
                  {analise.totalPlan
                    ? `desvio de ${diff >= 0 ? '+' : '−'}${horas(Math.abs(diff))} esta semana`
                    : 'defina o tempo estimado das tarefas para acompanhar o desvio'}
                </span>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="row row--between" style={{ marginBottom: 'var(--space-md)' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Hoje, priorizadas</h2>
              <Link className="link" to="/todo">Ver todas →</Link>
            </div>
            <div className="card">
              <div className="tasklist">
                {isLoading && (
                  <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-subtle)' }}>
                    Carregando tarefas…
                  </div>
                )}

                {isError && (
                  <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-subtle)' }}>
                    Sem conexão com o servidor.{' '}
                    <button className="link" type="button" onClick={() => refetch()}>Tentar de novo</button>
                  </div>
                )}

                {!isLoading && !isError && doDia.length === 0 && (
                  <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-subtle)' }}>
                    Nenhuma tarefa para hoje.
                  </div>
                )}

                {doDia.map((t) => (
                  <div className={`task ${t.done ? 'is-done' : ''}`} key={t.id}>
                    <button
                      className="task__check"
                      aria-label="Concluir tarefa"
                      onClick={() => toggleDone.mutate({ id: t.id, concluir: !t.done })}
                    >
                      <Ic d={ICONS.check} strokeWidth={3} />
                    </button>
                    <div className="task__main" style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>
                      <div className="task__title">{t.titulo}</div>
                      <div className="task__meta">
                        <span className="task__cat">
                          <span className="task__cat-dot" style={{ background: t.catCor }} />
                          {t.cat}
                        </span>
                        {t.hora && <span className="task__time">{t.hora}</span>}
                      </div>
                    </div>
                    <div className="task__right">
                      <span className={`badge badge--${Priority.normalizar(t.prioridade)}`}>
                        {Priority.ROTULO[Priority.normalizar(t.prioridade)]}
                      </span>
                      <button
                        className="task__del"
                        aria-label="Excluir tarefa"
                        title="Excluir tarefa"
                        disabled={remover.isPending}
                        onClick={(e) => { e.stopPropagation(); remover.mutate(t.id); }}
                      >
                        <Ic d={ICONS.trash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">Atalhos</h2>
            <div className="shortcut-grid">
              {ATALHOS.map((a) => (
                <Link className="shortcut" key={a.to} to={a.to}>
                  <span className="shortcut__ic"><Ic d={a.icon} /></span>
                  <span>
                    <span className="shortcut__title">{a.titulo}</span><br />
                    <span className="shortcut__desc">{a.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
