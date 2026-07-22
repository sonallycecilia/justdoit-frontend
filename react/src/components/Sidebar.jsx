import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Ic, { ICONS, Mark } from './Ic';
import CategoryModal from './CategoryModal';
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';
import { alternarTema } from '../lib/theme';
import { lerSessao, limparSessao } from '../auth/session';
import { capitalizarNome, iniciais } from '../lib/utils';
import { useCategorias } from '../hooks/useCategories';
import { useConta } from '../hooks/useConta';
import { useTarefas } from '../hooks/useTasks';

export default function Sidebar({ ativa = 'dashboard' }) {
  const navigate = useNavigate();
  const [colapsada, setColapsada] = useState(() => localStorage.getItem('jdi-sidebar-collapsed') === 'true');
  const [catsVisiveis, setCatsVisiveis] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [expandidas, setExpandidas] = useState({});

  const { data: categorias } = useCategorias();
  const { data: tarefas } = useTarefas(categorias);

  // Nome/avatar: começa com o que há na sessão e atualiza com GET /auth/me.
  const sessao = lerSessao();
  const { data: usuario } = useConta();
  const nome = capitalizarNome(usuario?.name || sessao?.name || '') || 'Usuário';

  const pendentes = useMemo(() => (tarefas || []).filter((t) => !t.done), [tarefas]);

  function sair() {
    api.post(endpoints.auth.logout).catch(() => {}).finally(() => {
      limparSessao();
      navigate('/', { replace: true });
    });
  }

  function toggleColapso() {
    const novo = !colapsada;
    setColapsada(novo);
    localStorage.setItem('jdi-sidebar-collapsed', String(novo));
  }

  function tarefasDaCategoria(catNome) {
    const lista = pendentes.filter((t) => t.cat === catNome);
    if (!busca) return lista;
    return lista.filter((t) => t.titulo.toLowerCase().includes(busca.toLowerCase()));
  }

  return (
    <aside className={`sidebar ${colapsada ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <Link className="sidebar__mark" to="/visao-geral" aria-label="Ir para a Visão geral"><Mark /></Link>
        <span className="sidebar__word">JustDoIt</span>
        <button className="sidebar__collapse" onClick={toggleColapso} aria-label={colapsada ? 'Expandir menu' : 'Recolher menu'}>
          <Ic d={ICONS.chevronLeft} />
        </button>
      </div>

      <div className="sidebar__scroll">
        <nav className="sidebar__nav">
          <Link className={`nav-item ${ativa === 'dashboard' ? 'is-active' : ''}`} to="/visao-geral">
            <span className="nav-item__ic"><Ic d={ICONS.dashboard} /></span>
            <span className="nav-item__label">Visão geral</span>
          </Link>
          <Link className={`nav-item ${ativa === 'calendar' ? 'is-active' : ''}`} to="/calendario">
            <span className="nav-item__ic"><Ic d={ICONS.calendar} /></span>
            <span className="nav-item__label">Calendário</span>
          </Link>
          <Link className={`nav-item ${ativa === 'todo' ? 'is-active' : ''}`} to="/todo">
            <span className="nav-item__ic"><Ic d={ICONS.todo} /></span>
            <span className="nav-item__label">To Do</span>
            <span className="nav-item__count">{pendentes.length}</span>
          </Link>
          <Link className={`nav-item ${ativa === 'notes' ? 'is-active' : ''}`} to="/anotacoes">
            <span className="nav-item__ic"><Ic d={ICONS.notes} /></span>
            <span className="nav-item__label">Anotações</span>
          </Link>
          <Link className={`nav-item ${ativa === 'analytics' ? 'is-active' : ''}`} to="/analise">
            <span className="nav-item__ic"><Ic d={ICONS.analytics} /></span>
            <span className="nav-item__label">Análise</span>
          </Link>
        </nav>

        <Link className="sidebar__new-task" to="/tasks/nova" aria-label="Nova tarefa" title="Nova tarefa">
          <span className="sidebar__new-task-ic"><Ic d={ICONS.plus} /></span>
          <span className="sidebar__new-task-label">Nova tarefa</span>
        </Link>

        <div className="sidebar__section">
          <span>Categorias</span>
          <div className="sidebar__section-actions">
            <button className="sidebar__cat-toggle" onClick={() => setModalAberto(true)} aria-label="Nova categoria">
              <Ic d={ICONS.plus} />
            </button>
            <button className="sidebar__cat-toggle" onClick={() => setCatsVisiveis((v) => !v)} aria-label="Ocultar categorias" aria-expanded={catsVisiveis}>
              <Ic d={ICONS.chevron} />
            </button>
          </div>
        </div>

        {catsVisiveis && (
          <div>
            <div className="sidebar__search">
              <span className="sidebar__search-ic"><Ic d={ICONS.search} /></span>
              <input
                className="sidebar__search-input"
                type="text"
                placeholder="Buscar tarefas…"
                aria-label="Buscar tarefas"
                autoComplete="off"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <nav className="sidebar__nav sidebar__nav--cats">
              {!categorias && <div className="sidebar-cat__empty">Carregando categorias…</div>}
              {categorias?.map((c) => {
                const doGrupo = tarefasDaCategoria(c.nome);
                const aberta = Boolean(expandidas[c.id]) || Boolean(busca);
                return (
                  <div className="sidebar-cat" key={c.id}>
                    <button
                      className="sidebar-cat__header"
                      aria-expanded={aberta}
                      onClick={() => setExpandidas((m) => ({ ...m, [c.id]: !m[c.id] }))}
                    >
                      <span className="cat-dot" style={{ background: c.cor }} />
                      <span className="nav-item__label">{c.nome}</span>
                      <span className="nav-item__count">{pendentes.filter((t) => t.cat === c.nome).length}</span>
                      <span className="sidebar-cat__chevron"><Ic d={ICONS.chevron} /></span>
                    </button>
                    {aberta && (
                      <div className="sidebar-cat__tasks">
                        {doGrupo.length === 0 && (
                          <div className="sidebar-cat__empty">{busca ? 'Nenhum resultado' : 'Nenhuma tarefa pendente'}</div>
                        )}
                        {doGrupo.map((t) => (
                          <Link
                            className="sidebar-task"
                            key={t.id}
                            to={`/tasks/${t.id}`}
                            title={t.titulo}
                            // Arrastável para o calendário: o payload leva só o id;
                            // o calendário resolve a tarefa pelo cache ['tarefas'].
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('application/jdi-task', JSON.stringify({ id: t.id }))}
                          >
                            <span className={`sidebar-task__prio sidebar-task__prio--${t.prioridade}`} />
                            <span className="sidebar-task__titulo">{t.titulo}</span>
                            <span className="sidebar-task__data">{t.data || ''}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="sidebar__foot">
        <span className="sidebar__avatar">
          <span className="sidebar__avatar-initials">{iniciais(nome)}</span>
        </span>
        <div className="sidebar__user">
          <div className="sidebar__name">{nome}</div>
          <button className="sidebar__logout" type="button" onClick={sair} aria-label="Sair">
            <span className="sidebar__logout-ic"><Ic d={ICONS.logout} /></span>
            <span className="sidebar__logout-label">Sair</span>
          </button>
        </div>
        <div className="sidebar__actions">
          <Link className="btn-icon" to="/configuracoes" aria-label="Configurações"><Ic d={ICONS.settings} /></Link>
          <button className="btn-icon" onClick={alternarTema} aria-label="Alternar tema"><Ic d={ICONS.moon} /></button>
        </div>
      </div>

      <CategoryModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </aside>
  );
}
