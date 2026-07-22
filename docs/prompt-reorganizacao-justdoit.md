# TAREFA: Reorganização e deduplicação da estrutura de arquivos do JustDoIt (frontend React + TS + Vite)

Você é um engenheiro frontend sênior. O projeto foi migrado para React e ficou com estrutura duplicada: existe uma pasta `react/` com seu próprio `src`/`public`/`dist`/`node_modules`, **E TAMBÉM** pastas soltas na raiz (`components/`, `pages/`, `landing/`, `styles/`, `scripts/`) mais `index.html`, `package.json` e `vite.config.js` na raiz. Há páginas duplicadas.

Seu objetivo é consolidar tudo em **UMA única estrutura feature-based limpa**, sem quebrar o build.

## REGRAS ABSOLUTAS (não violar)

1. Trabalhe em 4 FASES. **NÃO** passe para a fase seguinte sem eu escrever "aprovado".
2. **NUNCA** delete arquivos na Fase 1 ou 2. Deleção só acontece na Fase 3, após minha aprovação.
3. **NUNCA** toque em: `node_modules/`, `dist/`, `.git/`, `__pycache__/`. Ignore-os na análise.
4. Ao mover arquivos, use `git mv` (nunca `mv` puro) para preservar o histórico.
5. Respeite o `.gitignore` existente.
6. Não invente: baseie toda classificação em **EVIDÊNCIA** do filesystem (imports, entrypoint, config do Vite/`package.json`), não em suposição.
7. **NUNCA vaze segredos.** Em nenhum relatório, log, mensagem ou arquivo você deve imprimir o valor real de tokens, chaves de API, secrets, senhas, JWTs, connection strings ou conteúdo de `.env`. Sempre **mascare** (ex.: `VITE_API_URL = https://***`, `token = "eyJ***...***"`). Ao encontrar um segredo, refira-se a ele por **nome/local**, nunca pelo valor.

## FASE 1 — DIAGNÓSTICO (somente leitura)

Faça, sem alterar nada:

1. Mapeie a árvore real de pastas/arquivos (excluindo `node_modules`, `dist`, `.git`, `__pycache__`).
2. Identifique a **ÚNICA fonte da verdade** do app React:
   - Onde está o entrypoint real? (qual `index.html` o Vite usa, o que `vite.config.js` aponta, o que `package.json` → scripts `dev`/`build` executam)
   - O app roda a partir da raiz ou de dentro de `react/`? Prove com o conteúdo dos configs.
3. Se houver DOIS `vite.config` / `package.json` (raiz e `react/`), diga qual está ativo e qual é órfão.
4. Rastreie os imports reais a partir do entrypoint para saber quais arquivos estão efetivamente sendo usados (vivos) vs. quais estão órfãos (nenhum import aponta pra eles).
5. Detecte DUPLICATAS reais:
   - mesmo nome/propósito em locais diferentes (ex.: `pages/` na raiz vs `react/src/pages/`)
   - para cada par duplicado, compare o conteúdo e diga qual é a versão mais recente/completa (por conteúdo e por data de modificação), não apenas pelo caminho.
6. Classifique também os arquivos legados da versão vanilla (`landing.js`, `landing.css`, `dev.py`, `scripts/`, `styles/` soltos) — se ainda são usados ou são resquício da migração.

## FASE 2 — RELATÓRIO E PLANO (parar e esperar aprovação)

Entregue de forma **ENXUTA** (economize tokens, sem repetição):

**(a)** Uma tabela com colunas:

| Caminho | Status (ativo / órfão / duplicado / legado) | Evidência (1 linha) | Ação proposta (manter / mover→destino / deletar) |

**(b)** A **ESTRUTURA-ALVO** proposta, feature-based, em árvore. Sugestão de base a adaptar:

```
src/
  features/        (auth/, dashboard/, tasks/, calendar/ — cada uma com components/, hooks/, api/, types/)
  components/      (UI compartilhada, genérica)
  pages/           (composição de rotas, se aplicável)
  lib/ ou services/ (ex.: api.ts centralizado)
  styles/
  assets/
public/
index.html, vite.config.ts, package.json, tsconfig na raiz do app
```

> Se a fonte da verdade for `react/`, o alvo é "promover" `react/` para a raiz e remover a duplicação; explique isso.

**(c)** Lista explícita de arquivos a **DELETAR**, com a razão de cada um.

**(d)** Riscos: qualquer arquivo cuja classificação você não teve 100% de certeza — **pergunte antes**.

**DEPOIS DISSO, PARE.** Escreva: `"Aguardando 'aprovado' para executar a Fase 3."`

## FASE 3 — EXECUÇÃO (somente após eu escrever "aprovado")

1. Execute as movimentações com `git mv`, uma etapa lógica por vez.
2. Corrija todos os imports/paths quebrados pelas movimentações (relativos e aliases).
3. Ajuste `vite.config`, `tsconfig` (paths/alias) e `package.json` se necessário.
4. Delete os órfãos/duplicados aprovados.
5. Rode o build (`npm run build` ou equivalente) para provar que nada quebrou. Se quebrar, conserte e rode de novo até passar.
6. **Verifique a configuração da conexão com o backend e CONFIRME comigo qual backend você encontrou** (a reorganização mexe no `api.ts` e nos paths, então isso pode quebrar sem aviso). Você faz apenas a verificação a nível de código/config — **quem testa a conexão/rotas de fato no navegador sou eu**:
   - Localize a camada de API centralizada (`api.ts` ou equivalente). **Diga o caminho exato do arquivo que você encontrou.** Se houver mais de um candidato, liste todos e diga qual está de fato em uso (rastreando os imports) — não escolha por adivinhação.
   - Extraia a `baseURL` / URL do backend efetivamente usada e diga **de onde ela vem** (hardcoded no `api.ts`? de `VITE_API_URL`? de qual `.env`? do proxy do Vite?).
   - **CHECKPOINT OBRIGATÓRIO — PARE e confirme comigo antes de dar o passo por encerrado.** Reporte de forma direta:
     - `api.ts` (ou equivalente) encontrado em: `<caminho>`
     - Backend detectado: `<URL mascarada se tiver segredo, senão a URL/host>`
     - Origem dessa URL: `<hardcoded / env var / proxy>`
     - E pergunte: **"Esse é o backend correto? (s/n)"**
   - Se eu responder que **não** é o backend certo, **NÃO** altere nada por conta própria — pergunte qual é o correto e espere.
   - Confirme também que as env vars (ex.: `VITE_API_URL`) e o proxy do Vite (se ainda houver) continuam sendo lidos corretamente pela estrutura nova, e que nenhum import/path da camada de API ficou quebrado.
   - **NÃO** suba a aplicação nem faça chamadas reais ao backend — isso eu testo no navegador depois.
7. Atualize o `CLAUDE.md` documentando a nova estrutura feature-based.
8. **NÃO** faça commit nem push — deixe as mudanças staged e me mostre um resumo final com `git status`, para eu revisar antes de commitar.

**DEPOIS DISSO, PARE.** Escreva: `"Fase 3 concluída. Aguardando 'aprovado' para a Fase 4 (auditoria de segurança do frontend)."`

## FASE 4 — AUDITORIA DE SEGURANÇA DO FRONTEND E MITIGAÇÃO

Objetivo: encontrar brechas de segurança no **frontend** (só front — não audite o backend aqui), mitigar os danos e me entregar um relatório do que foi mitigado. **Regra de ouro: nenhum segredo do usuário pode vazar** — nem no código, nem no bundle, nem no próprio relatório (ver Regra Absoluta nº 7: sempre mascarar).

### 4.1 — Diagnóstico de brechas (somente leitura, NÃO altere nada ainda)

Procure e liste, com caminho + linha:

1. **Segredos expostos no frontend.** Chaves de API, tokens, secrets, senhas hardcoded no código ou em `VITE_*`.
   - ⚠️ Lembre: **toda variável `VITE_*` vai parar no bundle final e fica pública.** Portanto qualquer segredo *real* (chave privada, secret de serviço) NÃO pode viver no frontend — a mitigação correta é **removê-lo do front e movê-lo para o backend**, não "escondê-lo". Sinalize cada caso desses.
2. **`.env` / segredos versionados no git.** Verifique se algum `.env` (ou similar com segredo) está sendo rastreado pelo git ou já foi commitado no histórico. Confirme que o `.gitignore` cobre `.env*`.
3. **Armazenamento inseguro de credenciais.** JWT/tokens em `localStorage`/`sessionStorage` e exposição a XSS. Aponte o risco e a alternativa mais segura (ex.: cookie httpOnly setado pelo backend), mas **não** troque o mecanismo de auth sem me avisar — isso é mudança grande.
4. **XSS.** Uso de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, injeção de HTML não sanitizado, renderização de dados do usuário sem escape.
5. **Vazamento por logs.** `console.log`/`console.error` imprimindo tokens, respostas de auth, dados pessoais ou payloads sensíveis — inclusive os que sobrariam no build de produção.
6. **Dependências vulneráveis.** Rode `npm audit` e resuma as vulnerabilidades relevantes (com severidade). **Não** rode `npm audit fix --force` automaticamente (pode quebrar). Liste primeiro.
7. **Exposição no build.** Source maps publicados em produção, comentários/segredos deixados no bundle, dados sensíveis embutidos no HTML.
8. **Configuração de chamadas à API.** URLs sensíveis ou credenciais em query string, ausência de validação básica de input em formulários (login/registro), links externos sem `rel="noopener noreferrer"`.

### 4.2 — Plano de mitigação (parar e esperar aprovação)

Entregue uma tabela **ENXUTA**:

| # | Brecha | Severidade (crítica/alta/média/baixa) | Local (arquivo:linha) | Mitigação proposta | Risco de quebrar algo? |

Marque claramente:
- O que você mitiga com segurança de forma automática (ex.: remover `console.log` sensível, adicionar `rel="noopener"`, ajustar `.gitignore`, desabilitar source map em prod).
- O que **exige minha decisão** antes (ex.: mover segredo pro backend, trocar `localStorage` por cookie, rotacionar uma chave já exposta, `npm audit fix`).

**DEPOIS DISSO, PARE.** Escreva: `"Aguardando 'aprovado' para aplicar as mitigações."`

### 4.3 — Aplicar mitigações (somente após eu escrever "aprovado")

1. Aplique **apenas** as mitigações que aprovei.
2. Para segredos já expostos no histórico do git: **não tente reescrever o histórico sozinho.** Sinalize que a chave deve ser considerada comprometida e **rotacionada por mim** no serviço de origem, e me diga isso explicitamente.
3. Rode o build novamente para garantir que nada quebrou.
4. **NÃO** faça commit nem push — deixe staged.

### 4.4 — Relatório final de mitigação (`RELATORIO_SEGURANCA_FRONT.md`)

Gere um arquivo markdown com:

- **Resumo executivo:** nº de brechas encontradas por severidade, nº mitigadas, nº pendentes (que dependem de mim).
- **Tabela de brechas mitigadas:** brecha, local, o que foi feito, status.
- **Pendências / ações manuais suas:** ex.: "rotacionar a chave X no serviço Y", "revisar histórico do git", "aprovar `npm audit fix`".
- **Recomendações** de hardening que ficaram fora do escopo desta rodada.

⚠️ **No relatório, TODO segredo aparece mascarado** (`***`), referido por nome/local — **nunca** o valor real. Se para explicar uma brecha você sentir vontade de colar o valor de um token/chave, **não cole**: descreva o local e mascare.

Ao final, me mostre `git status` para eu revisar antes de commitar.
