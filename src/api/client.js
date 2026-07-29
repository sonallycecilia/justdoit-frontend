// Cliente HTTP único do app. Porta a lógica de renovação de token do front
// antigo (scripts/core/api.js): 401/403 → tenta /auth/refresh UMA vez (promessa
// compartilhada entre requisições concorrentes) e refaz a requisição original.
// Se o refresh responder 401, a sessão acabou → limpa e manda para a home;
// qualquer outra falha (rede, 5xx, 429) é passageira e preserva a sessão.
import { endpoints } from '@/api/endpoints';
import { lerSessao, gravarSessao, limparSessao } from '@/api/session';

let refreshing = null; // promessa compartilhada p/ evitar refresh duplicado

function refreshTokens() {
  if (refreshing) return refreshing; // correção -  atua como uma trava: se já tem refresh em andamento, espera ele terminar e devolve o access token novo.
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

// quando algo da errado emite o aviso e retorna o status code e o corpo da resposta (JSON ou null)
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
// pega a resposta e transforma em JSON ( ou null se não houver corpo)
// injeta o acess token no header Authorization 
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

// Faz a requisição com renovação de token e devolve a Response crua. Quem chama
// decide como ler o corpo — JSON (request) ou binário (baixarArquivo).
async function requisitar(method, url, body) {
  const sessao = lerSessao();
  const res = await enviar(method, url, body, sessao?.accessToken);

  const podeRenovar = (res.status === 401 || res.status === 403)
    && sessao?.refreshToken
    && url !== endpoints.auth.refresh;
  if (!podeRenovar) return res;

  // antes da correção: ter duas abas abertas com a mesma sessão podia levar a um refresh token ser descartado,
  // se ambas abas tentassem renovar ao mesmo tempo.
  //  A primeira aba que chegasse no backend ganhava, a segunda recebia 401 e perdia a sessão.
  // 
  // 
  // correção: agora o localStorage é monitorado e lido novamente antes de tentar renovar, 
  // para que a aba que perdeu o refresh token não tente renovar e derrube a sessão.
  const atual = lerSessao();
  if (atual?.accessToken && atual.accessToken !== sessao.accessToken) {
    return enviar(method, url, body, atual.accessToken);
  }

  let novoAccess;
  try {
    novoAccess = await refreshTokens();
  } catch (e) {
    // antes da correção: qualquer erro de rede, falha no servidor, erro 500 (internal server error) 
    // ou 429 (too many requests) derrubava o usuário.
    // Agora, só encerra a sessão quando o servidor diz que o refresh token não vale mais (401). 
    if (e instanceof ApiError && e.status === 401) {
      limparSessao();
      window.location.assign('/');
    }
    throw e;
  }
  // Refresh OK: refaz a requisição original; se ainda falhar, propaga o erro.
  return enviar(method, url, body, novoAccess);
}

async function request(method, url, body) {
  return tratarResposta(await requisitar(method, url, body));
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  remove: (url) => request('DELETE', url),
};

// Extrai o nome do arquivo do Content-Disposition. O backend expõe esse cabeçalho
// no CORS; se algum proxy o engolir, devolve null e quem chama usa um nome padrão.
function nomeNoCabecalho(disposition) {
  if (!disposition) return null;
  const casou = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (!casou) return null;
  try { return decodeURIComponent(casou[1]); } catch { return casou[1]; }
}

// Baixa um arquivo (exportação de dados) pelo mesmo caminho de renovação de
// token das demais chamadas. Devolve o corpo cru como Blob — nada de JSON.parse,
// porque o CSV quebraria — junto do nome sugerido pelo servidor.
export async function baixarArquivo(url) {
  const res = await requisitar('GET', url);
  if (!res.ok) {
    // Mesmo quando o sucesso viria em CSV, o erro do backend vem em JSON.
    let corpo = null;
    try { corpo = await res.json(); } catch { /* corpo vazio/não-JSON */ }
    throw new ApiError(corpo?.error || corpo?.message || `Erro ${res.status}`, res.status, corpo);
  }
  return {
    blob: await res.blob(),
    nomeArquivo: nomeNoCabecalho(res.headers.get('Content-Disposition')),
  };
}

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
