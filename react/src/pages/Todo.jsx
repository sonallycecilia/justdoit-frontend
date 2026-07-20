import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Ic, { ICONS } from '../components/Ic';
import Sidebar from '../components/Sidebar';
import { useCategorias } from '../hooks/useCategories';
import { useRemoverTarefa, useTarefas, useToggleDone } from '../hooks/useTasks';
import * as Priority from '../lib/priority';

// Filtros de status/data (chips fixos) — mesmos do front antigo.
const STATUS = [
  { valor: 'open', rotulo: 'Abertas' },
  { valor: 'done', rotulo: 'Concluídas' },
  { valor: 'all', rotulo: 'Todas' },
];
const DATAS = [
  { valor: 'all', rotulo: 'Qualquer data' },
  { valor: 'today', rotulo: 'Hoje' },
  { valor: 'week', rotulo: 'Esta semana' },
];

export default function Todo() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState({ cat: 'all', status: 'open', date: 'all' });
  const [catMenuAberto, setCatMenuAberto] = useState(false);

  const { data: categorias } = useCategorias();
  const { data: tarefas, isLoading, isError, refetch } = useTarefas(categorias);
  const toggleDone = useToggleDone();
  const remover = useRemoverTarefa();

  const visiveis = useMemo(() => {
    const passa = (t) => {
      if (filtros.cat !== 'all' && t.cat !== filtros.cat) return false;
      if (filtros.status === 'open' && t.done) return false;
      if (filtros.status === 'done' && !t.done) return false;
      // Atrasadas contam como pendências de hoje/da semana.
      if (filtros.date === 'today' && !['today', 'past'].includes(t.quando)) return false;
      if (filtros.date === 'week' && !['past', 'today', 'week'].includes(t.quando)) return false;
      return true;
    };
    return (tarefas || []).filter(passa).sort(Priority.comparar);
  }, [tarefas, filtros]);

  const grupos = useMemo(() => Priority.agrupar(visiveis), [visiveis]);
  const catSelecionada = categorias?.find((c) => c.nome === filtros.cat);

  return (
    <div className="app">
      <Sidebar ativa="todo" />

      <main className="app__main">
        <div className="page">
          <header className="page__head">
            <div>
              <h1 className="page__title">To Do</h1>
              <div className="page__eyebrow">Todas as tarefas</div>
            </div>
          </header>

          <div className="page__head-actions">
            <Link className="btn btn--primary btn--md" to="/tasks/nova">+ Nova tarefa</Link>
          </div>

          <div className="filters">
            {/* Categoria: dropdown preenchido com as categorias do backend */}
            <div className="cat-filter">
              <button
                className={`cat-filter__btn ${catMenuAberto ? 'is-open' : ''}`}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={catMenuAberto}
                onClick={() => setCatMenuAberto((v) => !v)}
              >
                {catSelecionada && <span className="cat-filter__dot" style={{ background: catSelecionada.cor }} />}
                <span className="cat-filter__name">{filtros.cat === 'all' ? 'Todas as categorias' : filtros.cat}</span>
                <Ic d={ICONS.chevron} className="cat-filter__chevron" size={13} strokeWidth={2} />
              </button>
              {catMenuAberto && (
                <>
                  <div className="cat-filter__overlay" onClick={() => setCatMenuAberto(false)} />
                  <div className="cat-filter__menu" role="listbox">
                    <button
                      className={`cat-filter__item ${filtros.cat === 'all' ? 'is-on' : ''}`}
                      role="option"
                      onClick={() => { setFiltros((f) => ({ ...f, cat: 'all' })); setCatMenuAberto(false); }}
                    >
                      <span className="cat-filter__item-name">Todas as categorias</span>
                      {filtros.cat === 'all' && <span className="cat-filter__check"><Ic d={ICONS.check} /></span>}
                    </button>
                    {categorias?.map((c) => (
                      <button
                        key={c.id}
                        className={`cat-filter__item ${filtros.cat === c.nome ? 'is-on' : ''}`}
                        role="option"
                        onClick={() => { setFiltros((f) => ({ ...f, cat: c.nome })); setCatMenuAberto(false); }}
                      >
                        <span className="cat-filter__dot" style={{ background: c.cor }} />
                        <span className="cat-filter__item-name">{c.nome}</span>
                        {filtros.cat === c.nome && <span className="cat-filter__check"><Ic d={ICONS.check} /></span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="filter-group">
              {STATUS.map((s) => (
                <button
                  key={s.valor}
                  className={`filter-chip ${filtros.status === s.valor ? 'is-active' : ''}`}
                  onClick={() => setFiltros((f) => ({ ...f, status: s.valor }))}
                >
                  {s.rotulo}
                </button>
              ))}
            </div>
            <div className="filter-group">
              {DATAS.map((d) => (
                <button
                  key={d.valor}
                  className={`filter-chip ${filtros.date === d.valor ? 'is-active' : ''}`}
                  onClick={() => setFiltros((f) => ({ ...f, date: d.valor }))}
                >
                  {d.rotulo}
                </button>
              ))}
            </div>
            <div className="filters__spacer" />
            <span className="filters__count">{visiveis.length} {visiveis.length === 1 ? 'tarefa' : 'tarefas'}</span>
          </div>

          {isLoading && <div className="empty"><p>Carregando tarefas…</p></div>}

          {isError && (
            <div className="empty">
              <p>Sem conexão com o servidor — não foi possível carregar suas tarefas.</p>
              <button className="btn btn--secondary btn--md" onClick={() => refetch()}>Tentar de novo</button>
            </div>
          )}

          {!isLoading && !isError && visiveis.length === 0 && (
            <div className="empty">
              <Ic d={ICONS.checkCircle} />
              <p>Nada por aqui — aproveite.</p>
            </div>
          )}

          <div>
            {grupos.map((g) => (
              <div className="prio-group" key={g.nivel}>
                <div className="prio-group__head">
                  <span className="prio-group__bar" style={{ background: g.cor }} />
                  <span className="prio-group__title">{g.rotulo}</span>
                  <span className="prio-group__n">{g.itens.length}</span>
                </div>
                <div className="todo-list">
                  {g.itens.map((t) => (
                    <div className={`todo-item ${t.done ? 'is-done' : ''}`} key={t.id}>
                      <button
                        className="todo-check"
                        aria-label="Concluir"
                        onClick={() => toggleDone.mutate({ id: t.id, concluir: !t.done })}
                      >
                        <Ic d={ICONS.check} />
                      </button>
                      <div className="todo-main" onClick={() => navigate(`/tasks/${t.id}`)}>
                        <div className="todo-title">{t.titulo}</div>
                        <div className="todo-meta">
                          <span className="todo-cat">
                            <span className="todo-cat__dot" style={{ background: t.catCor }} />
                            {t.cat}
                          </span>
                          <span className={`todo-date ${t.overdue ? 'is-overdue' : ''}`}>
                            <Ic d={ICONS.calendar} />{t.data}
                          </span>
                          {t.hora && <span className="todo-time"><Ic d={ICONS.clock} />{t.hora}</span>}
                        </div>
                      </div>
                      <div className="todo-right">
                        <span className={`badge badge--${Priority.normalizar(t.prioridade)}`}>
                          {Priority.ROTULO[Priority.normalizar(t.prioridade)]}
                        </span>
                        <button
                          className="todo-del"
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
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
