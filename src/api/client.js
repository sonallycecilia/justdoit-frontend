// Cliente HTTP único do app. Porta a lógica de renovação de token do front
// antigo (scripts/core/api.js): 401/403 → tenta /auth/refresh UMA vez (promessa
// compartilhada entre requisições concorrentes) e refaz a requisição original.
// Se o refresh responder 401, a sessão acabou → limpa e manda para a home;
// qualquer outra falha (rede, 5xx, 429) é passageira e preserva a sessão.
import { endpoints } from '@/api/endpoints';
import { lerSessao, gravarSessao, limparSessao } from '@/api/session';

let refreshing = null; // promessa compartilhada p/ evitar refresh duplicado

function refreshTokens() {
  if (refreshing) return refreshing;
  const sessao = lerSessao();
  if (!sessao?.refreshToken) return Promise.reject(new ApiError('Sessão expirada', 401));

  refreshing = fetch(endpoints.auth.refresh, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: sessao.refreshToken }),
  })
    .then((res) => {
      if (!res.ok) throw new ApiError('Falha ao renovar sessão', res.status);
      return res.json();
    })
    .then((data) => {
      gravarSessao({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    })
    .finally(() => { refreshing = null; });

  return refreshing;
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function enviar(method, url, body, accessToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const options = { method, headers };
  if (body !== undefined) options.body = JSON.stringify(body);
  return fetch(url, options);
}

async function tratarResposta(res) {
  if (!res.ok) {
    let corpo = null;
    try { corpo = await res.json(); } catch { /* corpo vazio/não-JSON */ }
    throw new ApiError(corpo?.error || corpo?.message || `Erro ${res.status}`, res.status, corpo);
  }
  if (res.status === 204) return null;
  // Alguns endpoints respondem 200/201 com corpo vazio; res.json() quebraria.
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function request(method, url, body) {
  const sessao = lerSessao();
  const res = await enviar(method, url, body, sessao?.accessToken);

  const podeRenovar = (res.status === 401 || res.status === 403)
    && sessao?.refreshToken
    && url !== endpoints.auth.refresh;
  if (!podeRenovar) return tratarResposta(res);

  // Outra aba pode ter renovado enquanto esta requisição estava em voo. Nesse
  // caso já existe um access token novo no storage, e refrescar de novo queimaria
  // o refresh token à toa — é justamente o que dispara a detecção de reuso do
  // backend, que revoga todas as sessões do usuário.
  const atual = lerSessao();
  if (atual?.accessToken && atual.accessToken !== sessao.accessToken) {
    return enviar(method, url, body, atual.accessToken).then(tratarResposta);
  }

  let novoAccess;
  try {
    novoAccess = await refreshTokens();
  } catch (e) {
    // Só encerra a sessão quando o servidor diz que o refresh token não vale mais
    // (401). Erro de rede, 5xx e 429 são falhas passageiras — deslogar nesses
    // casos derrubava o usuário a cada instabilidade do servidor.
    if (e instanceof ApiError && e.status === 401) {
      limparSessao();
      window.location.assign('/');
    }
    throw e;
  }
  // Refresh OK: refaz a requisição original; se ainda falhar, propaga o erro.
  return enviar(method, url, body, novoAccess).then(tratarResposta);
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  remove: (url) => request('DELETE', url),
};

// GET que trata 404 como "ainda não existe" (configs de módulo, nota, timer…)
// em vez de erro — o backend responde 404 até o primeiro PUT.
export async function getOuNull(url) {
  try {
    return await api.get(url);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
