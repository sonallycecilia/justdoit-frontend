# Relatório — Migração do front para React com persistência real (Fase 2)

**Data:** 06/07/2026
**Projetos envolvidos:** `justdoit-react` (novo front), `JustDoIt` (backend), `justdoit-frontend` (front antigo, intocado)

---

## 1. Problema original

Os dados do front não chegavam ao backend. O diagnóstico encontrou duas causas no front antigo (vanilla JS):

1. **A página de detalhe da tarefa nunca chamava a API.** Subtarefas, notas, descrição, módulos ativos, recorrência, pomodoro e cronômetro eram gravados **somente em `localStorage`** (`task-detail.js`: 26 gravações locais, zero chamadas de API) — mesmo com o backend já tendo controllers para tudo isso.
2. **Falhas de rede eram silenciadas pelo cache.** `carregarDaApi()` fazia `catch` silencioso e devolvia o cache local, então a UI "funcionava" sem persistir nada. Prioridade e recorrência viviam num "meta cache" local que se perdia entre navegadores.

Havia ainda um agravante: os endpoints que o `api.js` antigo apontava para os módulos do detalhe (`/notes`, `/cycle`, `/modules`, `/pomodoro`) **não existem no backend** — os caminhos reais são `/note`, `/cycle-config`, `/module-config` e `/focus-sessions`.

---

## 2. O que foi feito

### 2.1 Backend (`JustDoIt/services/task-service`) — endpoints que faltavam

O backend tinha suporte quase completo, mas com lacunas que impediam persistência real de subtarefas e recorrência:

| Endpoint novo | Motivo |
|---|---|
| `GET /tasks/{id}/subtasks` | Só existia POST — não dava para **listar** as subtarefas salvas |
| `PATCH /tasks/{id}/subtasks/{subId}/toggle` | Não dava para concluir/reabrir subtarefa |
| `DELETE /tasks/{id}/subtasks/{subId}` | Não dava para excluir subtarefa |
| `DELETE /tasks/{taskId}/cycle-config` | Sem ele, uma recorrência definida nunca podia ser removida |
| `PATCH /tasks/{id}/timer/log` agora faz *upsert* | Antes exigia um PUT prévio ("Timer not found" no primeiro log) |

Arquivos alterados: `TaskController.java`, `TaskService.java`, `CycleConfigController.java`, `CycleConfigService.java`, `TaskTimerService.java`.
✅ `gradlew :services:task-service:compileJava test` — **passou**.

### 2.2 Novo front (`justdoit-react`) — Vite + React + TanStack Query

```
justdoit-react/
├── vite.config.js          # porta 3000 fixa (CORS do backend só aceita localhost:3000)
├── src/
│   ├── api/
│   │   ├── endpoints.js    # URLs alinhadas aos controllers REAIS do backend
│   │   └── client.js       # fetch + refresh de token (401/403 → /auth/refresh 1x e refaz)
│   ├── auth/session.js     # sessão (tokens) em localStorage — mesma chave do app antigo
│   ├── lib/                # utils de data, prioridade (UI ↔ enum), ciclo, tema
│   ├── hooks/
│   │   ├── useCategories.js
│   │   ├── useTasks.js         # CRUD de tarefas c/ optimistic updates
│   │   └── useTaskDetail.js    # subtarefas, nota, módulos, ciclo, timer, foco
│   ├── components/         # Sidebar, DatePicker, TimePicker, CategoryModal, ícones
│   ├── pages/              # Login, Signup, Todo, TaskDetail
│   └── styles/             # CSS copiado do design system existente (inalterado)
```

**Regra de ouro implementada:** o backend é a fonte da verdade; `localStorage` guarda apenas **sessão** (tokens) e **tema**. Todo o resto vai para a API:

| Dado | Antes (vanilla) | Agora (React) |
|---|---|---|
| Tarefas (CRUD, concluir) | API + cache espelho | TanStack Query + *optimistic updates* |
| **Prioridade** | meta cache local (se perdia) | campo `priority` do backend (mapeado p/ matriz de Eisenhower) |
| **Subtarefas** | só localStorage | `GET/POST/PATCH/DELETE /tasks/{id}/subtasks` |
| **Notas da tarefa** | só localStorage | `PUT /tasks/{id}/note` (debounce de 800 ms) |
| **Módulos ativos** | só localStorage | `PUT /tasks/{id}/module-config` |
| **Recorrência** | só localStorage | `PUT/DELETE /tasks/{id}/cycle-config` (enum `CycleType`) |
| **Cronômetro** | só localStorage | `PATCH /tasks/{id}/timer/log` ao pausar/sair da página |
| **Ciclos Pomodoro** | só localStorage | `POST /tasks/{id}/focus-sessions` a cada ciclo concluído |
| Erros de rede | silenciados | visíveis (estado de erro + botão "Tentar de novo") |

**Fluxo de criação de tarefa:** subtarefas/nota/ciclo/módulos configurados antes de salvar são persistidos sob o id definitivo logo após o `POST /tasks` — nada fica preso no navegador.

### 2.3 Ajustes de contrato descobertos na migração

- **Prioridade:** UI (`urgent/important/normal/low`) ↔ backend (`URGENT_IMPORTANT/NOT_URGENT_IMPORTANT/NORMAL/URGENT_NOT_IMPORTANT`) — bijeção, agora persiste de verdade.
- **Recorrência:** a opção "Quinzenal" do front antigo não existe no backend; substituída por "Anual" (enum: `DAILY/WEEKLY/MONTHLY/ANNUAL`).
- **Módulo "Subtarefas":** o `TaskModuleConfig` do backend não tem flag para subtarefas (só foco/ciclo/prioridade/tempo/notas); o painel liga automaticamente quando a tarefa tem subtarefas.

---

## 3. Verificação

### 3.1 API de ponta a ponta (script `e2e.sh`) — ✅ tudo passou

Registro → login → criar tarefa com prioridade → subtarefa (criar/listar/toggle/excluir) → nota → module-config → cycle-config (PUT + DELETE) → timer/log sem PUT prévio → focus-session → concluir/excluir tarefa.

```
TODOS OS TESTES PASSARAM
```

### 3.2 No navegador (app React em localhost:3000) — ✅

- `/login` e `/signup` renderizam com o design system existente (tema escuro OK).
- Cadastro completo pela UI (date picker ano→mês→dia funcionando) → conta criada no auth-service → redirecionado ao `/todo`.
- `/todo` carrega categorias e tarefas do backend, sidebar com nome do usuário via `GET /auth/me`.

---

## 4. Como rodar

```bash
# 1. Banco (MySQL + Redis)
cd JustDoIt && docker-compose -f infra/docker-compose.yml up -d

# 2. Serviços (carregue infra/.env no ambiente antes)
./gradlew :services:auth-service:bootRun    # 8080
./gradlew :services:task-service:bootRun    # 8081

# 3. Front React (SEMPRE na porta 3000 — CORS)
cd justdoit-react && npm install && npm run dev
```

> O app antigo (`justdoit-frontend`) continua intacto e compartilha a mesma sessão
> (mesma chave no localStorage), mas não pode rodar ao mesmo tempo que o novo na porta 3000.

---

## 5. O que ainda falta (próximos passos)

1. **Páginas não migradas:** Dashboard, Calendário, Análise, Configurações e Onboarding ainda são do app antigo (aparecem desabilitadas na sidebar). Migrar seguindo o mesmo padrão (query + mutation por página).
2. **Recursos da sidebar não portados:** arrastar tarefa entre categorias (drag & drop) e redimensionar a largura.
3. **Bloco de anotações rápidas do To Do:** ficou de fora por ser um rascunho local; se for desejado, o ideal é criar um endpoint próprio no backend em vez de voltar ao localStorage.
4. **Flag `subtasksEnabled` no `TaskModuleConfig`** (backend) se quiserem que o toggle do módulo Subtarefas persista explicitamente.
5. **Deploy:** ajustar o Nginx/GitHub Pages para servir o build (`npm run build` → `dist/`) com fallback de SPA (todas as rotas → `index.html`).

## 6. Conta de teste criada na verificação

- `teste.react.jdi@gmail.com` (nome "Teste React") no banco local — pode ser removida à vontade.
