// Tema claro/escuro — preferência de UI, o único outro dado (além da sessão)
// que fica em localStorage. Mesma chave do front antigo ('jdi.tema').
const KEY = 'jdi.tema';

export function lerTema() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export function aplicarTema(tema) {
  if (tema === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

export function iniciarTema() {
  const salvo = lerTema();
  const prefereDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  aplicarTema(salvo || (prefereDark ? 'dark' : 'light'));
}

export function alternarTema() {
  const novo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  aplicarTema(novo);
  localStorage.setItem(KEY, JSON.stringify(novo));
  return novo;
}
