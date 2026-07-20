# justdoit-react

Front React do JustDoIt (gerenciador de tarefas). Substitui gradualmente o front antigo
(`../justdoit-frontend`, vanilla JS) consumindo o backend em `../JustDoIt` (4 serviços Spring).
Histórico completo da migração: ver `RELATORIO.md`.

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

## Status da migração

Migrado: Login, Signup, To Do, Task Detail. Sidebar funcional (sem drag-drop entre categorias
e sem resize). Falta: Dashboard, Calendário (usa schedule-service `/time-blocks`), Análise,
Configurações, Onboarding —  fontes em `../justdoit-frontend/pages/` + `scripts/features/`.
Ao migrar uma página: portar o HTML pra JSX reusando as classes CSS, mover o estado para
hooks (query/mutation), adicionar a rota no `App.jsx` e habilitar o item na `Sidebar.jsx`.
