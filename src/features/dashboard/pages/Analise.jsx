// Aba "Análise": desvio planejado vs. executado, alocação por categoria,
// taxa de conclusão e insights — tudo derivado de dados reais (useAnaliseSemanal).
import Ic, { ICONS } from '@/components/Ic';
import Sidebar from '@/components/Sidebar';
import CategoryChart from '@/features/dashboard/components/CategoryChart';
import DeviationChart from '@/features/dashboard/components/DeviationChart';
import RateRing from '@/features/dashboard/components/RateRing';
import { useAnaliseSemanal } from '@/features/dashboard/hooks/useAnalytics';
import { useCategorias } from '@/features/categories/hooks/useCategories';
import { useTarefas } from '@/features/tasks/hooks/useTasks';
import { horas } from '@/lib/utils';

function Vazio({ children }) {
  return <div style={{ color: 'var(--color-text-subtle)', padding: 'var(--space-md)' }}>{children}</div>;
}

// Frases geradas a partir dos números da semana — substituem o "Em breve"
// que o app antigo mostrava enquanto o backend de analytics não existe.
function montarInsights({ conclusao, categorias, totalPlan, totalReal }) {
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
          {pct >= 60 ? 'Bom ritmo — siga assim.' : 'Vale revisar o que ficou para trás.'}
        </>
      ),
    });
  }

  if (totalPlan > 0) {
    const diff = totalReal - totalPlan;
    const excedeu = diff > 0;
    itens.push({
      tipo: excedeu ? 'down' : 'up',
      icone: ICONS.clock,
      texto: (
        <>
          Você planejou <strong>{horas(totalPlan)}</strong> e executou <strong>{horas(totalReal)}</strong> —
          {excedeu
            ? <> <strong>{horas(diff)}</strong> a mais que o previsto. Suas estimativas podem estar curtas.</>
            : <> <strong>{horas(Math.abs(diff))}</strong> a menos que o previsto.</>}
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
          {' '}(<strong>{top.horas}h</strong> de {horas(totalPlan)}).
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

  const carregando = isLoading || analise.carregando;
  const insights = montarInsights(analise);

  return (
    <div className="app">
      <Sidebar ativa="analytics" />

      <main className="app__main">
        <div className="page">
          <header className="page__head">
            <div>
              <div className="page__eyebrow">Semana de {analise.semana.rotulo}</div>
              <h1 className="page__title">Análise semanal</h1>
            </div>
          </header>

          <div className="an-grid">
            <div className="card an-card an-wide">
              <div className="an-card__head">
                <span className="an-card__title">Planejado vs. executado</span>
                <div className="an-legend">
                  <span className="an-legend__item">
                    <span className="an-legend__sw" style={{ background: 'var(--color-border-strong)' }} />Planejado
                  </span>
                  <span className="an-legend__item">
                    <span className="an-legend__sw" style={{ background: 'var(--color-accent)' }} />Executado
                  </span>
                </div>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && !analise.temTarefas && <Vazio>Nenhuma tarefa com data nesta semana.</Vazio>}
              {!carregando && analise.temTarefas && <DeviationChart dados={analise.desvio} />}
            </div>

            <div className="card an-card">
              <div className="an-card__head">
                <span className="an-card__title">Tempo por categoria</span>
                <span className="an-card__hint">tempo estimado</span>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && !analise.categorias.length && (
                <Vazio>Defina o tempo estimado das tarefas para ver a distribuição.</Vazio>
              )}
              {!carregando && analise.categorias.length > 0 && <CategoryChart dados={analise.categorias} />}
            </div>

            <div className="card an-card">
              <div className="an-card__head">
                <span className="an-card__title">Conclusão da semana</span>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && !analise.temTarefas && <Vazio>Sem tarefas nesta semana.</Vazio>}
              {!carregando && analise.temTarefas && <RateRing conclusao={analise.conclusao} />}
            </div>

            <div className="card an-card an-wide">
              <div className="an-card__head">
                <span className="an-card__title">Resumo e insights</span>
                <span className="an-card__hint">Gerado a partir da sua semana</span>
              </div>
              {carregando && <Vazio>Calculando…</Vazio>}
              {!carregando && !insights.length && <Vazio>Ainda não há dados suficientes nesta semana.</Vazio>}
              {!carregando && insights.length > 0 && (
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
