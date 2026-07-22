// Sessão do usuário (tokens + nome/e-mail) em localStorage.
// Usa a MESMA chave do front antigo ('jdi.sessao'), então a sessão é
// compartilhada entre os dois apps durante a migração.
// Este é o ÚNICO estado de negócio que vive em localStorage: todo o resto
// (tarefas, notas, subtarefas…) é responsabilidade do backend.
const KEY = 'jdi.sessao';

export function lerSessao() {
  try {
    const bruto = localStorage.getItem(KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function gravarSessao(dados) {
  const atual = lerSessao() || {};
  localStorage.setItem(KEY, JSON.stringify({ ...atual, ...dados, em: Date.now() }));
}

export function limparSessao() {
  localStorage.removeItem(KEY);
}

export function estaLogado() {
  const s = lerSessao();
  return Boolean(s && s.accessToken);
}
