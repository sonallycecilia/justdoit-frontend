# JustDoIt — Frontend

Interface web do **JustDoIt**, plataforma de gerenciamento de tarefas e produtividade pessoal por meio de blocos de tempo (*time-blocking*). É uma **SPA React** que consome os 4 microserviços Spring do repositório `JustDoIt`.

> **Regra de ouro:** o backend é a fonte da verdade. O `localStorage` guarda apenas sessão e preferências de UI — **nunca** dado de negócio. Era exatamente esse o bug que motivou a migração do front antigo (vanilla JS) para React.

---

## Estrutura do Projeto

Aplicação **React 18 / Vite 6** de página única, em JavaScript + JSX (o projeto **não** usa TypeScript). O `src/` é organizado **por feature**, não por tipo de arquivo: tudo que pertence a um assunto — página, componentes, hooks e libs próprias — mora na mesma pasta.

```
justdoit-frontend/
├── index.html                 # Entrypoint do Vite (monta #root com src/main.jsx)
├── vite.config.js             # Plugin React, porta 3000 fixa, alias @, fallback SPA
├── jsconfig.json              # Resolução do alias @ para o editor
├── public/                    # Copiado cru para o build
│   ├── CNAME                  # Domínio próprio (justdoit-app.duckdns.org)
│   └── favicon.svg
├── dev.py                     # Sobe backend + frontend de uma vez (uso local)
└── src/
    ├── main.jsx               # Bootstrap: QueryClient, BrowserRouter, CSS global
    ├── App.jsx                # Tabela de rotas + guarda de autenticação
    ├── api/                   # Camada de acesso ao backend
    ├── components/            # UI compartilhada, sem dono
    ├── lib/                   # Utilitários genéricos
    ├── styles/                # Design system global
    └── features/              # Um diretório por assunto do produto
```

Cada feature segue o mesmo layout interno, criando só o que precisa:

```
src/features/<nome>/
├── pages/        # Componente de rota (o que o App.jsx importa)
├── components/   # Componentes exclusivos da feature
├── hooks/        # useQuery / useMutation do assunto
└── lib/          # Regras e conversões próprias (quando houver)
```

---

## Features

| Feature | Rota(s) | Conteúdo |
|---|---|---|
| `landing` | `/` | Home dividida: landing à esquerda, login à direita. `LandingPane`, `Overlays` (Recursos/Sobre/Legal) e `FeatureShowcase` (vitrine animada) |
| `auth` | `/signup`, `/onboarding` | Cadastro, onboarding e `LoginForm` (renderizado dentro da home). `useConta` — dados do usuário logado |
| `tasks` | `/todo`, `/tasks/nova`, `/tasks/:id` | To Do e detalhe da tarefa. `TaskEditor` é o corpo único de edição; `lib/priority` e `lib/cycle` traduzem os enums do backend |
| `categories` | — | `CategoryModal` (cria/edita), `CategorySelect` (dropdown) e `useCategories` |
| `calendar` | `/calendario` | Grade semanal com arrastar-e-soltar. `WeeklyCalendar`, `TimeBlock`, `EventDrawer`, `EventSummary` |
| `dashboard` | `/visao-geral`, `/analise` | Visão geral e análise. Gráficos `CategoryChart`, `DeviationChart`, `RateRing` |
| `notes` | `/anotacoes` | Anotações livres + `NoteComposer` (também usado no To Do) |
| `settings` | `/configuracoes` | Conta, tema, categorias e exclusão de conta |

### Três decisões de estrutura que não são óbvias

- **`categories/` é feature própria, não filha de `tasks/`.** `useCategories` é consumido por tasks, calendar, dashboard, settings **e** pela `Sidebar`. Enterrá-lo dentro de `tasks/` faria cinco consumidores importarem de dentro de uma feature alheia.
- **`session.js` vive em `api/`, não em `features/auth/`.** Quem o importa é o `api/client.js`, para o refresh de token. Se morasse na feature, a camada compartilhada passaria a depender de uma feature — inversão de dependência.
- **Cruzamentos deliberados entre features:** `calendar/EventSummary` usa o `TaskEditor` de `tasks/` (é o mesmo corpo de edição da página, propositalmente), e `tasks/Todo` usa o `NoteComposer` de `notes/`.

---

## Camada de API

Três arquivos, sem exceção — não há `fetch` solto espalhado pelas páginas.

| Arquivo | Responsabilidade |
|---|---|
| `api/endpoints.js` | **Todas** as URLs. Os caminhos refletem os controllers reais do backend (`/tasks/{id}/note`, `/cycle-config`, `/module-config`, `/timer`, `/focus-sessions`) |
| `api/client.js` | `fetch` com refresh automático de token e `ApiError` tipado |
| `api/session.js` | Leitura/escrita da sessão em `localStorage` |

O endereço do backend é resolvido **em tempo de execução** pelo hostname, sem variável de ambiente:

| Ambiente | Destino |
|---|---|
| `localhost` / `127.0.0.1` | `:8080` auth · `:8081` tasks · `:8082` schedule · `:8083` notification |
| Qualquer outro | `https://justdoitapi.duckdns.org` (todos os serviços atrás do Nginx) |

**Refresh de token:** um `401`/`403` dispara `POST /auth/refresh` (promessa compartilhada entre requisições concorrentes, uma única tentativa) e refaz a chamada original. Se o refresh falhar, a sessão é limpa e o usuário volta para `/`. O helper `getOuNull(url)` trata `404` como "ainda não existe" — necessário para configs de módulo, nota e timer antes do primeiro `PUT`.

---

## Estado do servidor

Todo dado remoto passa pelo **TanStack Query**; não há Redux, Zustand ou Context de dados.

- Leitura é `useQuery`, escrita é `useMutation` com invalidação.
- Toggles e deleções usam *optimistic update* com rollback (`onMutate` / `onError` / `onSettled`).
- O cache guarda a resposta **crua** da API; o modelo da UI é derivado no `select`.
- `staleTime` de 30 s e retry que desiste em erro 4xx (não adianta repetir "sem permissão").

O que fica em `localStorage`, e só isso:

| Chave | Conteúdo |
|---|---|
| `jdi.sessao` | Tokens + nome/e-mail do usuário |
| `jdi.tema` | Tema escolhido (a ausência da chave significa "Sistema") |
| `jdi.inicio-semana` | Preferência de início da semana do calendário |
| `jdi.todo-notas` | Rascunho não salvo do compositor de notas |

---

## Autenticação

O `App.jsx` envolve as rotas privadas em `RequireAuth`, que redireciona para `/` quando não há `accessToken` na sessão. A home **é** a tela de login — não existe página `/login` separada; a rota `/login` só redireciona, porque o `client.js` aponta para lá quando o refresh falha.

> ⚠️ Os tokens ficam em `localStorage`, o que os expõe a XSS. É uma decisão herdada do app antigo (a sessão era compartilhada entre os dois fronts durante a migração). A alternativa mais segura é cookie `httpOnly` emitido pelo backend.

---

## Estilos

CSS puro, sem Tailwind, CSS-in-JS ou pré-processador. Todos os arquivos de `src/styles/` são importados globalmente no `main.jsx`:

- `tokens.css` — variáveis de design (cores, espaçamentos, tipografia)
- `reset.css`, `global.css` — base
- `components/` e `pages/` — folhas por componente e por página

Ao criar tela nova, **reusar as classes existentes** antes de escrever CSS.

---

## Como Rodar

**Pré-requisitos:** Node 20+ e o backend `JustDoIt` rodando ao lado.

```bash
npm install
npm run dev      # http://localhost:3000
```

> ⚠️ **A porta 3000 é obrigatória.** O CORS dos serviços Spring só aceita `http://localhost:3000`, por isso o Vite usa `strictPort` — se a porta estiver ocupada ele falha, de propósito, em vez de subir em outra e ver toda requisição bloqueada. Não use o Live Server do VS Code (porta 5500, e ele não compila JSX).

Para subir backend e frontend juntos:

```bash
python dev.py start    # infra + 4 serviços + front
python dev.py front    # só o front
python dev.py back     # só o backend
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` para conferência |

---

## Deploy

> ⚠️ **Ação manual pendente antes do primeiro merge na `main`.** O GitHub Pages ainda está configurado como *deploy from a branch* (`build_type: legacy`, servindo a raiz da `main`), herança de quando o site era HTML puro. Nessa configuração o `deploy.yml` não vale, e o `index.html` da raiz — que hoje é o entrypoint do Vite — seria servido cru, resultando em página em branco. É preciso trocar em **Settings → Pages → Source → GitHub Actions**. Enquanto isso não for feito, o `CNAME` da raiz é o que sustenta o domínio e não pode ser removido. Detalhes em `docs/ENTENDENDO-O-FRONTEND.md`.

GitHub Pages via `.github/workflows/deploy.yml`, disparado por push na `main`. Duas peças não podem sumir do build:

- **`public/CNAME`** — domínio próprio (`justdoit-app.duckdns.org`). É por isso que o `base` do Vite fica em `/`, e não numa subpasta do `github.io`.
- **`404.html`** — gerado pelo plugin `fallbackSpa` do `vite.config.js`, que copia o `index.html` ao fim do build. Sem ele, recarregar `/visao-geral` devolve 404, porque o Pages não conhece as rotas do React Router.

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | JavaScript (ES2022) + JSX — sem TypeScript |
| Biblioteca de UI | React 18.3 |
| Build | Vite 6 (`@vitejs/plugin-react`, Babel) |
| Roteamento | React Router 6 (`BrowserRouter`) |
| Estado do servidor | TanStack Query 5 |
| Estado local | `useState` / `useReducer` — sem store global |
| Estilos | CSS puro com custom properties |
| Ícones | SVG inline via componente `Ic` — sem biblioteca externa |
| Gráficos | SVG escrito à mão — sem Chart.js/Recharts |
| Hospedagem | GitHub Pages + domínio próprio |

O projeto **não** tem dependências de runtime além de React, React DOM, React Router e TanStack Query. Ícones e gráficos são feitos à mão em SVG de propósito, para manter o bundle pequeno e evitar CDN.

---

## Convenções

- **Idioma:** código, comentários, nomes de variáveis e de arquivos em **português** (`useTarefas`, `salvar`, `duracaoMin`).
- **Imports:** entre features, sempre com o alias `@/` (`@/components/Ic`, `@/features/tasks/hooks/useTasks`). Dentro da mesma feature, caminho relativo (`./TimeBlock`) é aceitável. Nada de `../../../`.
- **Nada de dado de negócio em `localStorage`** — ver a regra de ouro no topo.
- **Validação de regra de negócio é do backend.** O teto biológico de horas por dia, por exemplo, nunca é validado no cliente: o `400` do task-service vira toast e alerta na UI.
- **Branch:** `feature/JD-XX-nome-da-tarefa`; tudo entra por Pull Request.

## Documentação

| Documento | Conteúdo |
|---|---|
| `docs/CLAUDE.md` | Fonte da verdade da arquitetura: pegadinhas de cada feature, contratos do backend, decisões e seus porquês |
| `docs/ENTENDENDO-O-FRONTEND.md` | Explicação didática de build, Vite, anatomia da raiz e da reorganização por feature |
| `docs/RELATORIO.md` | Relatório da migração inicial de vanilla JS para React |
