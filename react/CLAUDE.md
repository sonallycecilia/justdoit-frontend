# justdoit-react

Front React do JustDoIt (gerenciador de tarefas). Vive em `react/` DENTRO do repo
`justdoit-frontend` e é o front ÚNICO — o app vanilla da raiz foi aposentado em
2026-07-21. Consome o backend em `../../JustDoIt` (4 serviços Spring).
Histórico da migração inicial: ver `RELATORIO.md`.

ATENÇÃO porta 3000: o CORS do backend só aceita http://localhost:3000, então o
Vite fixa essa porta (`strictPort`). Suba com `npm run dev` ou `python dev.py front`.

## Deploy

GitHub Pages via `.github/workflows/deploy.yml` (push na `main`), publicando
`react/dist`. Duas peças que não podem sumir do build:
- `react/public/CNAME` — o domínio próprio (justdoit-app.duckdns.org). Por isso
  `base` fica em '/', e não numa subpasta do github.io.
- `404.html` — gerado pelo plugin `fallbackSpa` do `vite.config.js`, que copia o
  `index.html` ao fim do build. Sem ele, recarregar `/visao-geral` dá 404 no Pages.

## Regra de ouro

**O backend é a fonte da verdade.** `localStorage` guarda APENAS sessão (`jdi.sessao`) e tema
(`jdi.tema`) — mesmas chaves do app antigo (sessão compartilhada). Nunca persistir dado de
negócio localmente; era esse o bug que motivou a migração.

## Rodar

```bash
npm run dev   # SEMPRE porta 3000 (strictPort) — o CORS do backend só aceita http://localhost:3000
```

Backend: `cd ../JustDoIt && docker-compose -f infra/docker-compose.yml up -d`, depois
`gradlew :services:auth-service:bootRun` (8080) e `:services:task-service:bootRun` (8081)
com as variáveis de `infra/.env` carregadas no ambiente. schedule=8082, notification=8083.

## Arquitetura

- `src/api/endpoints.js` — TODAS as URLs. Os caminhos refletem os controllers REAIS do backend
  (`/note`, `/cycle-config`, `/module-config`, `/timer`, `/focus-sessions`). O `api.js` do app
  antigo apontava caminhos inexistentes (`/notes`, `/cycle`, `/modules`, `/pomodoro`) — não copiar dele.
- `src/api/client.js` — fetch com refresh de token: 401/403 → `POST /auth/refresh` (promessa
  compartilhada, 1 tentativa) → refaz a requisição; refresh falhou → limpa sessão e vai pra `/login`.
  `getOuNull(url)` trata 404 como "ainda não existe" (configs de módulo/nota/timer antes do 1º PUT).
- `src/hooks/` — toda leitura é `useQuery`, toda escrita é `useMutation` com invalidação;
  toggles/deletes usam optimistic update com rollback (`onMutate`/`onError`/`onSettled`).
  Cache guarda a resposta CRUA da API; o modelo da UI é derivado no `select`.
- `src/lib/priority.js` — UI `urgent/important/normal/low` ↔ enum `URGENT_IMPORTANT/
  NOT_URGENT_IMPORTANT/NORMAL/URGENT_NOT_IMPORTANT` (bijeção; low = URGENT_NOT_IMPORTANT).
- `src/lib/cycle.js` — recorrência usa o enum do backend direto: `DAILY/WEEKLY/MONTHLY/ANNUAL`
  + `'none'` (= DELETE do cycle-config). Não existe "quinzenal" no backend.
- CSS em `src/styles/` é CÓPIA do design system do app antigo — importado globalmente no
  `main.jsx`. Ao migrar uma página, reusar as classes existentes; não criar CSS novo sem necessidade.
- Convenção de idioma: código/comentários/nomes em português, como o projeto antigo.

## Pegadinhas conhecidas

- `PUT /tasks/{id}/note` exige `content` não-vazio (`@NotBlank`) — não enviar nota vazia.
- `TaskModuleConfig` NÃO tem flag para subtarefas; o painel Subtarefas liga quando a tarefa tem
  subtarefas (estado só de UI).
- Criação de tarefa: subtarefas/nota/ciclo/módulos configurados antes do save são persistidos
  sob o id novo logo após o `POST /tasks` (ver `TaskDetail.salvar()`).
- Cronômetro: `PATCH /timer/log` soma segundos (upsert — cria o timer se não existir);
  loga o delta ao pausar e no unmount. Zerar = `PUT /timer {actualSeconds: 0}`.
- Pomodoro: cada ciclo de foco concluído → `POST /focus-sessions` com `completed: true`;
  o total exibido = sessões FOCUS completas do servidor.
- Título/descrição do detalhe são `contentEditable` não controlados (refs); ler
  `.textContent` na hora de salvar.

## Pegadinhas das features novas (jul/2026)

- **Tempo estimado**: recurso do `/timer` (`estimatedMinutes`), NÃO do TaskRequest (o
  backend descarta o campo lá). O PUT do timer faz merge parcial — enviar só
  `estimatedMinutes` não zera `actualSeconds` (verificado). O `GET /tasks` devolve
  `estimatedMinutes` → vira `duracaoMin` no modelo da UI (usado pelo calendário).
- **Teto biológico**: NUNCA validar no cliente. O task-service devolve 400 no save
  quando o dia estoura → toast + alerta "Teto biológico atingido" (TaskDetail) ou
  revert otimista (calendário, `aoFalharPorTeto`).
- **Ciclo personalizado**: `PUT /cycle-config` com `{cycleType:'CUSTOM', intervalUnit:
  HOURS|DAYS, intervalCount, totalOccurrences, startDate, startTime}`. Os detalhes são
  RELIDOS do `GET /cycle-config` (sem cache espelho). `startTime` só quando a unidade é
  horas (âncora = hora da tarefa). O enum tem BIWEEKLY (Quinzenal) — o comentário antigo
  dizendo que não existia estava errado.
  ⚠ Banco local: a coluna `cycle_config.cycle_type` precisa do ALTER para aceitar
  BIWEEKLY/CUSTOM (ver seção "Banco local" abaixo) — sem ele o PUT CUSTOM dá 500.
- **Notas livres** (aba Anotações): `/notes` no task-service (GET/POST/PUT/DELETE +
  PATCH `/notes/{id}/pin`). Só 1 fixada por usuário — regra server-side; o GET devolve a
  fixada primeiro, então fixar NÃO usa optimistic update de ordenação (refetch).
  Rascunho do compositor: única exceção de localStorage (chave `jdi.todo-notas`,
  compartilhada com o app antigo).
- **Calendário**: blocos do schedule-service (`/time-blocks`) enriquecidos com as
  tarefas. O `WeeklyCalendar` mantém estado local `eventos` semeado das queries e
  otimista nos arrastes (desvio deliberado do padrão puro — documentado no arquivo).
  Toda escrita dupla (bloco + tarefa) usa `usePatchTarefa`, que monta o PUT /tasks a
  partir do TaskResponse cru do cache para não zerar campos.
- Preferência "início da semana" é lida de `localStorage['jdi.inicio-semana']`
  (gravada pelas Configurações, ainda vanilla — mesmo origin, chave compartilhada).

## Banco local (dev)

A coluna `cycle_type` foi criada antes de BIWEEKLY/CUSTOM existirem no enum Java.
Uma vez por banco, rodar:

```sql
ALTER TABLE justdoit_db.cycle_config
  MODIFY cycle_type ENUM('DAILY','WEEKLY','BIWEEKLY','MONTHLY','ANNUAL','CUSTOM') NOT NULL;
```

## Status da migração

**Todas as páginas do app antigo estão migradas** (jul/2026). Rotas em `App.jsx`:
`/login`, `/signup`, `/onboarding`, `/visao-geral`, `/todo`, `/anotacoes`,
`/calendario`, `/analise`, `/configuracoes`, `/tasks/nova`, `/tasks/:id`.

A home do app logado é `/visao-geral` (login e o catch-all caem lá, como no front
antigo); o Signup vai para `/onboarding`. A `Sidebar.jsx` não tem mais itens
desabilitados — o bloco `NAV_PENDENTE` foi removido.

Falta: **deploy unificado** (GH Pages com build em subpasta + fallback SPA) e
aposentar o app vanilla da raiz.

Ao migrar/portar mais alguma coisa: reusar as classes CSS existentes (SEMPRE
re-copiar o CSS da raiz antes — a raiz é a fonte mais nova), mover o estado para
hooks (query/mutation) e adicionar a rota no `App.jsx`.

## Home dividida (jul/2026)

A rota `/` é `pages/Home.jsx`: **landing à esquerda, login à direita**. Substitui
o `index.html` vanilla da raiz, que ocupava a tela toda e mandava o visitante
para uma tela de login separada.

- `components/Landing/LandingPane.jsx` — port do `index.html` + `landing/landing.js`.
- `components/Landing/Overlays.jsx` — Recursos, Sobre e o modal Legal
  (port de `scripts/features/auth/legal.js`), como componentes controlados.
- `components/Landing/FeatureShowcase.jsx` — vitrine animada que substituiu o
  mock estático "Hoje". Roda em looping 3 cenas (Pomodoro, Subtarefas, Ciclo),
  7s cada, pausando no hover e desligada em `prefers-reduced-motion`.
  ⚠ Os timers são **só de demonstração** (rodam acelerados); a lógica real é a
  do `TaskEditor`/`useTaskDetail`. Se uma feature mudar, a cena é decorativa e
  não quebra nada — mas vale manter coerente com o produto.
  ⚠ Nada de animação de saída terminando em `opacity: 0` com `forwards`: foi o
  que deixou o card do Ciclo invisível ~800ms por volta. A troca é feita pela
  `key` do elemento, com animação de ENTRADA.
- `components/LoginForm.jsx` — o formulário, extraído da antiga `pages/Login.jsx`
  (que foi REMOVIDA). `/login` agora só redireciona para `/`, porque o
  `api/client.js` manda para lá quando o refresh do token falha.
- ⚠ A landing usava **Lucide via CDN** (`<i data-lucide>`), que não entra no
  bundle. Os ícones viraram entradas do `ICONS` em `Ic.jsx` — `sun`, `layers`,
  `folderTree` e `arrowUp` foram criados para isso. Não reintroduzir o CDN.
- `styles/pages/home.css` tem os ajustes de meia tela. ⚠ Use **`padding-block`**
  ali, nunca o atalho `padding`: o atalho zera o `padding-inline` herdado de
  `.mkt__wrap` e o conteúdo cola na borda (foi exatamente esse o bug do hero).
  O recuo lateral é um `clamp()` único no `.mkt__wrap`, para que marca, tema e
  links do rodapé fiquem alinhados nas duas extremidades.

## Editor de tarefa compartilhado (jul/2026)

`src/components/TaskEditor.jsx` é o corpo ÚNICO de edição de tarefa. Quem usa:
- `pages/TaskDetail.jsx` — casca (Sidebar + topbar) em volta de `<TaskEditor />`.
- `components/Calendar/EventSummary.jsx` — drawer lateral, `<TaskEditor compacto />`.

Antes o drawer tinha uma versão própria e reduzida (só prioridade e categoria),
que divergia da página. Não recriar isso: mexeu no editor, mexeu nos dois.

- **Nada de botão Salvar em edição.** Com `taskId` definido tudo persiste sozinho:
  título/descrição com debounce de 700 ms (e no blur), o resto na hora. O botão
  "Registrar tarefa" só existe em `/tasks/nova`, porque sem id não há o que
  atualizar — o POST acontece lá e só então os módulos configurados são gravados.
- `persistir(mudancas)` recebe a mudança explicitamente porque o state do React
  só vale no próximo render — passar `{prioridade: n}` em vez de confiar no
  `setPrioridade(n)` que acabou de rodar.
- `onSalvo(dados)` avisa o caller do que foi persistido. O drawer usa para mover
  o bloco de tempo (`/time-blocks`) junto quando a data/hora da tarefa muda —
  sem isso o card ficaria parado na grade.
- `compacto` esconde a grade `detail__spec` e faz as colunas dos módulos fluírem
  (o CSS fixa 6 colunas, que espremem no drawer).
- Teto biológico continua com o backend: o 400 vira toast + `dur-alert`, nunca
  validação no cliente. No drawer, `aoFalharPorTeto` (exportado do
  `WeeklyCalendar`) reverte o bloco.
- `CategorySelect` (`components/CategorySelect.jsx`) é o dropdown de categoria do
  To Do, do editor e do drawer. `incluirTodas` liga a opção "Todas as categorias"
  (só o filtro do To Do usa).

## Pegadinhas das páginas migradas por último (jul/2026)

- **Análise e os números da Visão geral**: o backend NÃO tem analytics
  (`/analytics/weekly` e `/analytics/categories` respondem 403). Tudo é calculado
  no cliente em `src/hooks/useAnalytics.js` — **o único ponto a trocar** quando os
  endpoints existirem. Ele deriva de `GET /tasks` (conclusão, estimativa, categoria),
  `GET /tasks/{id}/timer` (executado) e `GET /tasks/{id}/focus-sessions` (Pomodoro).
  ⚠ Custo: 2 requisições por tarefa da semana, em paralelo, com teto `MAX_TAREFAS`.
- O dashboard antigo somava foco/tempo de `localStorage` (`Store.KEYS.FOCO_DIARIO`
  e `TEMPO_DIARIO`). Isso é dado de negócio local — proibido pela regra de ouro.
  Não reintroduzir ao mexer na Visão geral.
- Cada tarefa é atribuída ao dia do seu `dueDate`: o timer guarda só o total
  acumulado, sem quebra por dia. É a granularidade honesta possível hoje.
- O donut "Tempo por categoria" mostra tempo **estimado**, não executado (o timer
  não separa por categoria) — por isso o rótulo "tempo estimado" no card.
- **CategoryModal** faz criar E editar: passar `categoria` liga o modo edição
  (PUT /categories/{id}); sem ela, cria. Editar invalida `['categorias']` **e**
  `['tarefas']`, porque a tarefa guarda `categoryId` e o rótulo exibido muda.
- Excluir categoria não mexe nas tarefas no cliente: o `DELETE /categories/{id}`
  zera o `category_id` no backend e elas voltam para "Genérico" no refetch.
- **Tema**: a preferência "Sistema" é a AUSÊNCIA da chave `jdi.tema` (mesma
  convenção do app antigo). Ver `preferenciaTema()` / `definirTema()` em `lib/theme.js`.
- **Foto de perfil**: redimensionada para 256px (JPEG data URL) e persistida via
  `PUT /auth/me {avatarUrl}`. Remover = enviar string vazia — `null` é ignorado
  pelo backend. Nada de base64 em localStorage.
- `useConta()` (`hooks/useConta.js`) usa a queryKey `['usuario']`, a mesma da
  Sidebar — as duas compartilham o cache do `GET /auth/me`.
