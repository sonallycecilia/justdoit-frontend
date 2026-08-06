// Aba "Análise": agendado vs. estimado vs. executado, alocação por categoria,
// taxa de conclusão e insights — tudo derivado de dados reais do backend.
//
// Enquanto a semana está aberta os números são ao vivo. Ao fechar a semana
// (PATCH /weekly-plans/{id}/close), o schedule-service grava o retrato e a tela
// passa a exibi-lo congelado: é assim que uma semana antiga deixa de depender do
// estado ATUAL das tarefas.
import { useState } from 'react';
import Ic, { ICONS } from '@/components/Ic';
import Sidebar from '@/components/Sidebar';
import CategoryChart from '@/features/dashboard/components/CategoryChart';
import DeviationChart, { SERIES } from '@/features/dashboard/components/DeviationChart';
import RateRing from '@/features/dashboard/components/RateRing';
import { useAnaliseSemanal } from '@/features/dashboard/hooks/useAnalytics';
import { usePlanoSemanal } from '@/features/dashboard/hooks/useWeeklyPlan';
import { useCategorias } from '@/features/categories/hooks/useCategories';
import { useTarefas } from '@/features/tasks/hooks/useTasks';
import { horas } from '@/lib/utils';

function Vazio({ children }) {
  return <div style={{ color: 'var(--color-text-subtle)', padding: 'var(--space-md)' }}>{children}</div>;
}

// Erro precisa aparecer com a causa. Um 404 aqui quase sempre é serviço parado ou
// não reiniciado, e 401/403 é sessão; sem dizer isso, "não funciona" vira adivinhação.
function explicarErro(erro) {
  if (erro?.status === 404) {
    return 'Endpoint não encontrado (404). O task-service ou o schedule-service pode estar desatualizado: reinicie os dois.';
  }
  if (erro?.status === 401 || erro?.status === 403) {
    return 'Sua sessão não foi aceita (401/403). Entre novamente.';
  }
  if (erro?.status) return `O servidor respondeu ${erro.status}.`;
  return 'Sem conexão com o servidor. Confira se o task-service (8081) e o schedule-service (8082) estão de pé.';
}

// Frases geradas a partir dos números da semana.
function montarInsights({ conclusao, categorias, totalAgendado, totalEstimado, totalExecutado }) {
  const itens = [];

  if (conclusao.total) {
    const pct = Math.round((conclusao.feitas / conclusao.total) * 100);
    itens.push({
      tipo: pct >= 60 ? 'up' : 'down',
      icone: pct >= 60 ? ICONS.checkCircle : ICONS.flag,
      texto: (
        <>
          Você concluiu <strong>{conclusao.feitas} de {conclusao.total}</strong> tarefas da semana
          (<strong>{pct}%</strong>).{' '}
          {pct >= 60 ? 'Bom ritmo, siga assim.' : 'Vale revisar o que ficou para trás.'}
        </>
      ),
    });
  }

  if (totalAgendado > 0) {
    const diff = totalExecutado - totalAgendado;
    const excedeu = diff > 0;
    itens.push({
      tipo: excedeu ? 'down' : 'up',
      icone: ICONS.clock,
      texto: (
        <>
          Você agendou <strong>{horas(totalAgendado)}</strong> e executou <strong>{horas(totalExecutado)}</strong>,{' '}
          {excedeu
            ? <><strong>{horas(diff)}</strong> a mais que o previsto. Suas estimativas podem estar curtas.</>
            : <><strong>{horas(Math.abs(diff))}</strong> a menos que o previsto.</>}
        </>
      ),
    });
  }

  // A distância entre estimado e agendado é o que não saiu do papel: tarefas com
  // duração definida que nunca ganharam horário no calendário.
  if (totalEstimado > 0 && totalEstimado - totalAgendado > 0.25) {
    itens.push({
      tipo: 'info',
      icone: ICONS.calendar,
      texto: (
        <>
          Você estimou <strong>{horas(totalEstimado)}</strong> em tarefas, mas só{' '}
          <strong>{horas(totalAgendado)}</strong> foram para a agenda.{' '}
          <strong>{horas(totalEstimado - totalAgendado)}</strong> ainda não têm horário marcado.
        </>
      ),
    });
  }

  if (categorias.length) {
    const top = categorias[0];
    itens.push({
      tipo: 'info',
      icone: ICONS.target,
      texto: (
        <>
          A maior fatia do seu tempo estimado está em <strong>{top.nome}</strong>
          {' '}(<strong>{top.horas}h</strong> de {horas(totalEstimado)}).
        </>
      ),
    });
  }

  return itens;
}

export default function Analise() {
  const { data: categorias } = useCategorias();
  const { data: tarefas, isLoading } = useTarefas(categorias);
  const analise = useAnaliseSemanal(tarefas);
  const semanaPlano = usePlanoSemanal(analise.semana);
  const [confirmando, setConfirmando] = useState(false);

  const carregando = isLoading || analise.carregando;
  // "Pronto" é o único estado em que um card pode afirmar algo sobre a semana:
  // carregando ainda não sabe, e com erro os zeros não significam "vazio".
  const pronto = !carregando && !analise.erro;
  const insights = montarInsights(analise);
  const { fechada, resumo, fechar } = semanaPlano;

  return (
    <div className="app">
      <Sidebar ativa="analytics" />

      <main className="app__main">
        <div className="page">
          <header className="page__head">
            <div>
              <div className="page__eyebrow">
                Semana de {analise.semana.rotulo}
                {fechada && ' · fechada'}
              </div>
              <h1 className="page__title">Análise semanal</h1>
            </div>
            <div className="page__head-actions">
              {!fechada && !confirmando && (
                <button className="btn btn--secondary btn--md" onClick={() => setConfirmando(true)}>
                  Fechar semana
                </button>
              )}
              {!fechada && confirmando && (
                <>
                  <button className="btn btn--secondary btn--md" onClick={() => setConfirmando(false)}>
                    Cancelar
                  </button>
                  <button className="btn btn--primary btn--md"
                          disabled={fechar.isPending}
                          onClick={() => fechar.mutate(undefined, { onSuccess: () => setConfirmando(false) })}>
                    {fechar.isPending ? 'Fechando…' : 'Confirmar fechamento'}
                  </button>
                </>
              )}
            </div>
          </header>

          {confirmando && !fechada && (
            <div className="card an-card" style={{ marginBottom: 'var(--space-md)' }}>
              Fechar a semana guarda o retrato dela como está agora. Depois disso os
              totais param de mudar, mesmo que você edite as tarefas.
            </div>
          )}

          {fechar.isError && (
            <div className="card an-card" style={{ marginBottom: 'var(--space-md)' }}>
              Não foi possível fechar a semana. {explicarErro(fechar.error)}
            </div>
          )}

          {analise.erro && (
            <div className="card an-card" style={{ marginBottom: 'var(--space-md)' }}>
              <div className="an-card__head">
                <span className="an-card__title">Não foi possível carregar a análise</span>
                <button className="btn btn--secondary btn--sm" onClick={analise.recarregar}>
                  Tentar de novo
                </button>
              </div>
              {explicarErro(analise.erro)}
            </div>
          )}

          <div className="an-grid">
            <div className="card an-card an-wide">
              <div className="an-card__head">
                <span className="an-card__title">Agendado, estimado e executado</span>
                <div className="an-legend">
                  {SERIES.map((s) => (
                    <span className="an-legend__item" key={s.chave}>
                      <span className="an-legend__sw" style={{ background: s.cor }} />{s.rotulo}
                    </span>
                  ))}
                </div>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && analise.erro && <Vazio>Dados indisponíveis.</Vazio>}
              {pronto && !analise.temDados && (
                <Vazio>Nada agendado nem executado nesta semana.</Vazio>
              )}
              {pronto && analise.temDados && <DeviationChart dados={analise.desvio} />}
              {/* O gráfico é por DIA, então tarefa sem data não cabe nele — mas
                  entra no total estimado. Sem esta linha, o total pareceria não
                  bater com as barras. */}
              {pronto && analise.estimadoSemData > 0 && (
                <p className="an-card__hint" style={{ marginTop: 'var(--space-sm)' }}>
                  Mais {horas(analise.estimadoSemData)} estimadas em{' '}
                  {analise.tarefasSemData}{' '}
                  {analise.tarefasSemData === 1 ? 'tarefa sem data' : 'tarefas sem data'},
                  que contam no total mas não têm dia no gráfico.
                </p>
              )}
            </div>

            <div className="card an-card">
              <div className="an-card__head">
                <span className="an-card__title">Tempo por categoria</span>
                <span className="an-card__hint">tempo estimado</span>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && analise.erro && <Vazio>Dados indisponíveis.</Vazio>}
              {pronto && !analise.categorias.length && (
                <Vazio>Defina o tempo estimado das tarefas para ver a distribuição.</Vazio>
              )}
              {pronto && analise.categorias.length > 0 && <CategoryChart dados={analise.categorias} />}
            </div>

            <div className="card an-card">
              <div className="an-card__head">
                <span className="an-card__title">Conclusão da semana</span>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && analise.erro && <Vazio>Dados indisponíveis.</Vazio>}
              {pronto && !analise.temTarefas && <Vazio>Sem tarefas nesta semana.</Vazio>}
              {pronto && analise.temTarefas && <RateRing conclusao={analise.conclusao} />}
            </div>

            {fechada && resumo && (
              <div className="card an-card an-wide">
                <div className="an-card__head">
                  <span className="an-card__title">Retrato da semana fechada</span>
                  <span className="an-card__hint">gravado no fechamento, não muda mais</span>
                </div>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat__label">Agendado</span>
                    <span className="stat__value">{horas((resumo.totalScheduledMinutes || 0) / 60)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">Estimado</span>
                    <span className="stat__value">{horas((resumo.totalEstimatedMinutes || 0) / 60)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">Executado</span>
                    <span className="stat__value">{horas((resumo.totalActualSeconds || 0) / 3600)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">Concluídas</span>
                    <span className="stat__value">
                      {resumo.completedTasks || 0} <small>/ {resumo.totalTasks || 0}</small>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="card an-card an-wide">
              <div className="an-card__head">
                <span className="an-card__title">Resumo e insights</span>
                <span className="an-card__hint">Gerado a partir da sua semana</span>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && analise.erro && <Vazio>Dados indisponíveis.</Vazio>}
              {pronto && !insights.length && <Vazio>Ainda não há dados suficientes nesta semana.</Vazio>}
              {pronto && insights.length > 0 && (
                <div className="an-insights">
                  {insights.map((i, idx) => (
                    <div className="an-insight" key={idx}>
                      <span className={`an-insight__ic an-insight__ic--${i.tipo}`}><Ic d={i.icone} /></span>
                      <span className="an-insight__text">{i.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
