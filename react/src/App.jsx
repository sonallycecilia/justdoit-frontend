import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Todo from './pages/Todo';
import TaskDetail from './pages/TaskDetail';
import { estaLogado } from './auth/session';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!estaLogado()) {
    return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/todo" element={<RequireAuth><Todo /></RequireAuth>} />
      <Route path="/tasks/nova" element={<RequireAuth><TaskDetail /></RequireAuth>} />
      <Route path="/tasks/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
      <Route path="*" element={<Navigate to={estaLogado() ? '/todo' : '/login'} replace />} />
    </Routes>
  );
}
