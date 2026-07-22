// Sessão do usuário (tokens + nome/e-mail) no navegador.
// "Manter conectado" marcado  → localStorage   (sobrevive ao fechar o navegador)
// "Manter conectado" desmarcado → sessionStorage (morre junto com a aba)
// Usa a MESMA chave do front antigo ('jdi.sessao'), então a sessão é
// compartilhada entre os dois apps durante a migração.
// Este é o ÚNICO estado de negócio que vive no navegador: todo o resto
// (tarefas, notas, subtarefas…) é responsabilidade do backend.
const KEY = 'jdi.sessao';

// Onde a sessão atual mora. localStorage tem prioridade porque é o storage de
// uma sessão "lembrada"; sessionStorage é a sessão só desta aba. Os acessos vão
// em try/catch porque o storage pode estar bloqueado (modo privado, cookies off).
function storageAtual() {
  try {
    if (localStorage.getItem(KEY)) return localStorage;
    if (sessionStorage.getItem(KEY)) return sessionStorage;
  } catch { /* storage indisponível */ }
  return null;
}

export function lerSessao() {
  try {
    const bruto = storageAtual()?.getItem(KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

/**
 * `lembrar` só é informado no login/cadastro, onde a escolha existe. Nas demais
 * gravações (renovação de token, nome/e-mail vindos do GET /auth/me) fica
 * undefined e a sessão permanece no storage em que já estava.
 */
export function gravarSessao(dados, { lembrar } = {}) {
  const inicioDeSessao = lembrar !== undefined;
  // Num login não se herda nada da sessão anterior: senão o nome do usuário
  // anterior sobrevive até o GET /auth/me responder, e a tela pisca o nome errado.
  const base = inicioDeSessao ? {} : (lerSessao() || {});
  const destino = inicioDeSessao
    ? (lembrar ? localStorage : sessionStorage)
    : (storageAtual() || localStorage);

  try {
    // Trocar de storage exige apagar o anterior, senão as duas cópias coexistem
    // e storageAtual() passa a devolver a errada (localStorage tem prioridade).
    limparSessao();
    destino.setItem(KEY, JSON.stringify({ ...base, ...dados, em: Date.now() }));
  } catch { /* storage indisponível: segue sem persistir */ }
}

export function limparSessao() {
  try { localStorage.removeItem(KEY); } catch { /* storage indisponível */ }
  try { sessionStorage.removeItem(KEY); } catch { /* storage indisponível */ }
}

export function estaLogado() {
  const s = lerSessao();
  return Boolean(s && s.accessToken);
}
