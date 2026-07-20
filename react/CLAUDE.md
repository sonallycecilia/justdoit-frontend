# justdoit-react

Front React do JustDoIt (gerenciador de tarefas). Vive em `react/` DENTRO do repo
`justdoit-frontend` (branch feature-react) e substitui gradualmente o app vanilla da raiz,
consumindo o backend em `../../JustDoIt` (4 serviços Spring).
Histórico da migração inicial: ver `RELATORIO.md`.

ATENÇÃO porta 3000: o CORS do backend só aceita http://localhost:3000, e tanto o
`python dev.py front` (vanilla) quanto o `npm run dev` (Vite) usam essa porta —
**um por vez**. Por isso a sidebar do vanilla ainda NÃO aponta para as rotas React
(e vice-versa o item "Visão geral" da sidebar React segue desabilitado): os links
cruzados só fazem sentido após o deploy unificado (build do Vite servido junto).

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

Migrado: Login, Signup, To Do, Task Detail (com tempo estimado + ciclo personalizado),
**Calendário** (`/calendario` — vistas dia/semana/mês, drag-and-drop, faixa Sem horário,
pacotes, modal, drawer lateral com EventSummary) e **Anotações** (`/anotacoes` + compositor
no To Do). Sidebar com botão "Nova tarefa" e tarefas arrastáveis para o calendário
(payload `application/jdi-task` = `{id}`).
Falta: Dashboard, Análise, Configurações, Onboarding — fontes em `../pages/` +
`../scripts/features/`. Ao migrar uma página: portar o HTML pra JSX reusando as classes
CSS (SEMPRE re-copiar o CSS da raiz antes — a raiz é a fonte mais nova), mover o estado
para hooks (query/mutation), adicionar a rota no `App.jsx` e habilitar o item na
`Sidebar.jsx`. Deploy unificado (GH Pages com build em subpasta + fallback SPA) ainda
pendente.
