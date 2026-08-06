# Relatório de segurança do frontend — JustDoIt

Data: 2026-07-22 · Escopo: **apenas o frontend** (React + Vite, raiz do repo
`justdoit-frontend`). O backend (`../JustDoIt`) não foi auditado nesta rodada.
Branch: `feature-react`.

> Todo segredo neste documento aparece **mascarado** e referido por nome/local.

## Resumo executivo

| Severidade | Encontradas | Mitigadas | Pendentes (dependem de você) |
|---|---|---|---|
| Crítica | 0 | 0 | 0 |
| Alta | 1 | 0 | 1 |
| Média | 1 | 1 | 0 |
| Baixa | 2 | 1 | 1 |
| **Total** | **4** | **2** | **2** |

Nenhum segredo real foi encontrado no código, no bundle ou no histórico do git.
O app **não usa nenhuma variável `VITE_*`** — portanto não há o risco clássico de
segredo embarcado no bundle. `npm audit`: **0 vulnerabilidades**.

## Brechas mitigadas

| # | Brecha | Local | O que foi feito | Status |
|---|---|---|---|---|
| 2 | `.gitignore` não cobria `.env*` — um `.env` criado no futuro entraria no commit sem aviso | `.gitignore` | Adicionadas as regras `.env`, `.env.*` e a exceção `!.env.example`. Verificado antes: **nenhum `.env` existe no disco, nenhum é rastreado pelo git e nenhum aparece no histórico** (`git log --all --diff-filter=A -- "*.env*"` vazio) | ✅ mitigada |
| 3 | `dangerouslySetInnerHTML` sem regra escrita sobre a origem do dado | `src/components/Ic.jsx:15` | Rastreados **todos** os call sites de `<Ic d={…} />`: os valores vêm de `ICONS` ou de arrays literais do próprio componente (`r.icone`, `f.icone`, `c.icone`, `i.icone`, `a.icon`). Nenhum dado de usuário ou da API chega ali → **não há XSS hoje**. Adicionado comentário `⚠ SEGURANÇA` fixando a invariante para quem mexer depois | ✅ mitigada (era risco latente, não brecha ativa) |

### Correções de bug feitas na mesma passada (não são segurança)

- `index.html:1` — o arquivo começava com a palavra solta **`qual`** antes do
  `<!DOCTYPE html>`. Isso jogava a página em *quirks mode* e imprimia "qual" na
  tela. Removida; o `dist/index.html` agora começa corretamente no doctype.
- `.gitignore` — removidas as linhas `.github/` e `docs/`. Os arquivos que já
  existem nessas pastas continuavam versionados (o `.gitignore` não afeta arquivo
  já rastreado), mas **qualquer arquivo novo** ali era descartado em silêncio —
  incluindo um segundo workflow de deploy.

## Pendências — ações que dependem de você

| # | Brecha | Sev. | Local | Por que não mitiguei sozinho |
|---|---|---|---|---|
| 1 | `accessToken` e `refreshToken` guardados em `localStorage` (chave `jdi.sessao`), legíveis por qualquer XSS que chegue à página | **alta** | `src/api/session.js:19` | A alternativa segura é o backend passar a emitir cookie `httpOnly` + `SameSite`, e o front parar de anexar o header `Authorization` manualmente (`src/api/client.js:43`). É mudança conjunta front+auth-service — o prompt pede sua aprovação antes |
| 4 | E-mail (dado pessoal) trafega na **query string** do `GET /auth/check-email?email=…`, então é gravado nos logs de acesso do Nginx/proxy em texto puro | baixa | `src/api/endpoints.js:18` | Corrigir = trocar por `POST` com o e-mail no body, o que exige mudar o controller do auth-service |

Nada precisa ser **rotacionado**: não há chave, token ou secret exposto no código
nem no histórico do git.

## O que foi verificado e está limpo

- **Segredos hardcoded**: nenhum. Sem chave de API, token, senha ou connection
  string no `src/`.
- **Variáveis `VITE_*`**: o projeto não define nem lê nenhuma. A URL do backend é
  escolhida em *runtime* por hostname em `src/api/endpoints.js:3-8`
  (`localhost:8080-8083` em dev, `https://justdoitapi.duckdns.org` em produção) —
  é URL pública, não segredo.
- **Logs**: **zero** ocorrências de `console.log/error/warn/info/debug` em todo o
  `src/`. Não há vazamento de token ou payload de auth por console, nem em dev
  nem em produção.
- **XSS**: nenhum `eval`, `new Function`, `innerHTML` ou `document.write`. O único
  `dangerouslySetInnerHTML` é o do item 3. Todo dado de usuário e da API é
  renderizado como texto (React escapa por padrão) — inclusive as mensagens de
  erro vindas do servidor em `LoginForm.jsx:86`.
- **Dependências**: `npm audit` → **found 0 vulnerabilities** (com e sem devDeps).
- **Build**: `npm run build` passa; `dist/` sai com **0 arquivos `.map`** (o Vite
  já usa `build.sourcemap: false` por padrão e o `vite.config.js` não sobrescreve).
  Nenhum dado sensível embutido no HTML.
- **Links externos**: nenhum `target="_blank"` no `src/`, logo não há caso de
  `rel="noopener noreferrer"` faltando.
- **Formulários de auth**: login e cadastro validam campo obrigatório e fazem
  `trim()` no e-mail antes de enviar; a senha nunca é logada nem persistida.

## Recomendações de hardening (fora do escopo desta rodada)

1. **CSP** — servir um `Content-Security-Policy` pelo Nginx (`default-src 'self'`,
   `connect-src` só o domínio da API). É a defesa em profundidade que mais reduz o
   impacto do item 1 enquanto os tokens seguirem em `localStorage`.
2. **Cabeçalhos de resposta** no Nginx: `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
   (ou `frame-ancestors 'none'` na CSP).
3. **Expiração curta do access token** + refresh rotativo com invalidação do
   refresh usado — limita a janela de um token roubado.
4. **`npm audit` no CI**, para não depender de rodar à mão.
5. **Subresource Integrity / sem CDN** — hoje o front já não carrega nada de CDN
   (o Lucide foi internalizado no `Ic.jsx`); vale manter essa regra.
