// Página /tasks/:id e /tasks/nova — casca em volta do <TaskEditor />, que é o
// mesmo corpo usado pelo drawer lateral do calendário.
//
// Em edição não há botão de salvar: o editor persiste cada mudança sozinho.
// Em criação ainda existe o botão, porque sem id não há o que atualizar — o
// POST acontece ali e só depois os módulos configurados são gravados.
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Ic, { ICONS } from '@/components/Ic';
import Sidebar from '@/components/Sidebar';
import TaskEditor from '@/features/tasks/components/TaskEditor';

export default function TaskDetail() {
  const { id: taskId } = useParams(); // undefined em /tasks/nova
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [criando, setCriando] = useState(false);

  async function registrar() {
    setCriando(true);
    const novoId = await editorRef.current?.criar();
    setCriando(false);
    if (novoId) navigate('/todo');
  }

  return (
    <div className="app">
      <Sidebar ativa="todo" />

      <main className="app__main">
        <div className="detail">
          <div className="detail__topbar">
            <Link className="detail__back" to="/todo">
              <Ic d={ICONS.back} /> Ir para To Do
            </Link>
            <div className="detail__topbar-actions">
              {taskId ? (
                <span className="text-soft" style={{ fontSize: 'var(--font-size-sm)' }}>
                  As mudanças salvam automaticamente
                </span>
              ) : (
                <button className="btn btn--primary btn--md" onClick={registrar} disabled={criando}>
                  {criando ? 'Salvando…' : 'Registrar tarefa'}
                </button>
              )}
            </div>
          </div>

          <TaskEditor ref={editorRef} taskId={taskId} />
        </div>
      </main>
    </div>
  );
}
