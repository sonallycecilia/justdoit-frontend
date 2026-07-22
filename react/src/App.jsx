import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Todo from './pages/Todo';
import TaskDetail from './pages/TaskDetail';
import Anotacoes from './pages/Anotacoes';
import Calendario from './pages/Calendario';
import VisaoGeral from './pages/VisaoGeral';
import Analise from './pages/Analise';
import Configuracoes from './pages/Configuracoes';
import { estaLogado } from './auth/session';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!estaLogado()) {
    // A home é a própria tela de login (landing à esquerda, formulário à direita).
    return <Navigate to="/" replace state={{ de: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Mantida porque o client.js manda para cá quando o refresh do token falha. */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/visao-geral" element={<RequireAuth><VisaoGeral /></RequireAuth>} />
      <Route path="/todo" element={<RequireAuth><Todo /></RequireAuth>} />
      <Route path="/anotacoes" element={<RequireAuth><Anotacoes /></RequireAuth>} />
      <Route path="/calendario" element={<RequireAuth><Calendario /></RequireAuth>} />
      <Route path="/analise" element={<RequireAuth><Analise /></RequireAuth>} />
      <Route path="/configuracoes" element={<RequireAuth><Configuracoes /></RequireAuth>} />
      <Route path="/tasks/nova" element={<RequireAuth><TaskDetail /></RequireAuth>} />
      <Route path="/tasks/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
      {/* Logado, a home do app é a Visão geral; deslogado, a landing + login. */}
      <Route path="*" element={<Navigate to={estaLogado() ? '/visao-geral' : '/'} replace />} />
    </Routes>
  );
}
