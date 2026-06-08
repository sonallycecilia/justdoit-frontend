# JustDoIt — Arquitetura Frontend

> Estrutura oficial de pastas do Design System.
> Referência para desenvolvimento, handoff e onboarding de novos membros.

---

## Árvore de arquivos

```
JustDoIt-Design-System/
├─ styles.css                        ← entrypoint do compilador (raiz)
├─ readme.md                         ← visão geral do projeto
├─ SKILL.md                          ← manifesto do design system
│
├─ tokens/                           🎨 TOKENS — fonte da verdade visual
│   ├─ colors.css                    paleta completa (âncoras + rampas)
│   ├─ dark.css                      dark mode via data-theme="dark"
│   ├─ typography.css                famílias, escala, pesos, line-height
│   ├─ spacing.css                   grade de 4px, containers, alturas
│   ├─ elevation.css                 sombras e raios
│   ├─ fonts.css                     imports das famílias (Google Fonts)
│   └─ pillars.css                   cores dos pilares + Pomodoro
│
├─ components/                       🧩 COMPONENTES — prefixo jdi-
│   ├─ actions/                      Button, IconButton
│   ├─ forms/                        Checkbox, Input, Select, Switch
│   ├─ data/                         Badge, Tag, Avatar, ProgressBar
│   ├─ surfaces/                     Card
│   ├─ feedback/                     Tooltip
│   └─ navigation/                   Tabs
│
├─ screens/                          🖥️ TELAS
│   ├─ app/                          aplicação principal (autenticado)
│   │   ├─ index.html                dashboard / home
│   │   ├─ login.html                tela de login
│   │   ├─ login.css                 estilos da tela de login
│   │   ├─ login.jsx                 componente React do login
│   │   ├─ app-main.jsx              estrutura principal do app
│   │   ├─ app-parts.jsx             partes reutilizáveis do app
│   │   ├─ app.css                   estilos globais do app
│   │   ├─ data.js                   dados mock / fixtures
│   │   └─ README.md                 instruções da tela
│   │
│   ├─ agenda/                       calendário semanal (tela principal)
│   │   ├─ agenda.html
│   │   ├─ agenda.css
│   │   └─ components.css            overrides locais de componentes
│   │
│   └─ marketing/                    landing page pública
│       ├─ index.html
│       ├─ marketing.jsx
│       ├─ marketing.css
│       └─ README.md
│
├─ documentation/                    📖 DOCUMENTAÇÃO
│   ├─ DESIGN_SYSTEM.md              spec completa (paleta, tipo, tokens, componentes)
│   └─ foundations/                  specimen cards (15 pranchas de fundação)
│
├─ assets/                           🖼️ ASSETS GLOBAIS
│   ├─ logomark.svg
│   └─ logo-justdoit-original.png
│
├─ handoff/                          📦 PACOTE DE HANDOFF
│   ├─ README.md                     guia de instalação (Vite/TS)
│   ├─ tokens.css                    cópia autossuficiente dos tokens
│   ├─ handoff-components.css        estilos dos componentes (standalone)
│   ├─ handoff-components.html       showcase de componentes (standalone)
│   ├─ assets/                       cópia dos assets para entrega
│   │   ├─ logomark.svg
│   │   └─ logo-justdoit-original.png
│   └─ screens/                      telas prontas para entrega
│       ├─ login.html
│       ├─ login.css
│       ├─ app.html
│       └─ app.css
│
└─ uploads/                          📥 REFERÊNCIAS E INSUMOS
    ├─ JustDoIt_Briefing.md          briefing do projeto
    ├─ AdobeColor-Meu tema de cores  paleta de referência
    └─ *.png                         capturas e referências visuais
```

---

## Convenções

### Nomenclatura
- **Tokens:** `kebab-case.css` — nunca use valores hex crus no produto, sempre aliases semânticos (`--accent`, `--bg-base`, etc.)
- **Componentes:** prefixo `jdi-` em todas as classes CSS
- **Telas:** pasta própria por contexto (`app/`, `agenda/`, `marketing/`)
- **Handoff:** sempre autossuficiente — não depende de imports externos

### Hierarquia de imports
```
tokens/ → components/ → screens/
```
Nunca importar tela dentro de componente. Nunca importar componente dentro de token.

### Dark mode
Ativado via `data-theme="dark"` no elemento raiz. Todos os componentes respondem automaticamente via aliases semânticos — nenhum componente precisa de lógica própria de tema.

### Pilares temáticos
| Pilar | Cor | Uso |
|---|---|---|
| Estudos | `--pillar-estudos` (teal) | ciclos Pomodoro |
| Casa | `--pillar-casa` (amber) | tarefas recorrentes |
| Genérico | `--pillar-generico` (sage) | trava de 24h |

---

## O que vai onde

| Tipo de arquivo | Pasta correta |
|---|---|
| Nova variável CSS global | `tokens/` |
| Novo componente reutilizável | `components/` na subpasta correta |
| Nova tela ou fluxo | `screens/` em pasta própria |
| Documentação de decisão | `documentation/` |
| Asset de marca | `assets/` |
| Arquivo para entrega ao dev | `handoff/` |
| Referência externa ou upload | `uploads/` |

---

**Versão:** 1.0 · **Data:** Junho 2026
