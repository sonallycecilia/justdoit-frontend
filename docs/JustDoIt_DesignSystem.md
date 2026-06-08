# JustDoIt — Design System

> **JustDoIt** · _Gerenciador de Tarefas_
> Documentação completa do sistema de design: paleta (light + dark), tipografia,
> espaçamento, elevação, tokens e componentes base.

JustDoIt é um app de gestão de tarefas organizado em **três pilares temáticos** —
**Estudos** (ciclos Pomodoro), **Casa** (recorrência) e **Genérico** (trava de
24h). A identidade é **editorial e calma**: tinta verde-profunda sobre papel
quente, títulos em serifa, trabalho em grotesca. pt-BR, informal "você", sem emoji.

**Princípios:** foco · calma · clareza. _Less is more_ — cor usada com parcimônia,
muito respiro, tipografia faz o trabalho pesado.

---

## Sumário

1. [Paleta de cores](#1-paleta-de-cores)
2. [Light mode](#11-light-mode-padrão)
3. [Dark mode](#12-dark-mode)
4. [Pilares temáticos](#13-pilares-temáticos)
5. [Tipografia](#2-tipografia)
6. [Espaçamento e layout](#3-espaçamento-e-layout)
7. [Raios, bordas e elevação](#4-raios-bordas-e-elevação)
8. [Movimento](#5-movimento)
9. [Componentes base](#6-componentes-base)
10. [Tokens — referência completa](#7-tokens--referência-completa)

---

## 1. Paleta de cores

A marca nasce de **cinco âncoras** extraídas da identidade original. Tudo o mais
deriva delas.

| Token | Hex | Nome | Papel |
|---|---|---|---|
| `--brand-pine`  | `#012326` | Pine  | Tinta / texto primário / superfícies inversas |
| `--brand-teal`  | `#014040` | Teal  | Acento primário / ações |
| `--brand-sage`  | `#778C8A` | Sage  | Texto suave / secundário |
| `--brand-paper` | `#F2F2F0` | Paper | Fundo do app |
| `--brand-mist`  | `#BFBFBF` | Mist  | Bordas / divisores neutros |

### Rampas base

**Teal (primária)**

| Passo | Hex |
|---|---|
| `--teal-50`  | `#eef5f4` |
| `--teal-100` | `#d4e7e4` |
| `--teal-200` | `#a3cac6` |
| `--teal-300` | `#6aa9a4` |
| `--teal-400` | `#3f8b86` |
| `--teal-500` | `#1a6b68` |
| `--teal-600` | `#0b5452` |
| `--teal-700` | `#014040` |
| `--teal-800` | `#013a3a` |
| `--teal-900` | `#012e2f` |
| `--teal-950` | `#012326` |

**Neutra (cinza com tom de sage)**

| Passo | Hex |
|---|---|
| `--neutral-50`  | `#f2f2f0` |
| `--neutral-100` | `#eef0ef` |
| `--neutral-150` | `#e7eae9` |
| `--neutral-200` | `#dde1e0` |
| `--neutral-250` | `#cfd4d3` |
| `--neutral-300` | `#bfc6c5` |
| `--neutral-400` | `#98a8a6` |
| `--neutral-500` | `#778c8a` |
| `--neutral-600` | `#5a6b69` |
| `--neutral-700` | `#41514f` |
| `--neutral-800` | `#2c3837` |
| `--neutral-900` | `#1a2322` |
| `--neutral-950` | `#0c1413` |

**Acentos funcionais (suaves, para status)**

| Status | Sólido | Soft | Uso |
|---|---|---|---|
| Concluído (success) | `--green-500 #3a9469` | `--green-100 #dceee6` | tarefa feita |
| Vence em breve (warning) | `--amber-500 #c08a2e` | `--amber-100 #f4e8d2` | prazo próximo |
| Atrasada (danger) | `--rust-500 #b5543f` | `--rust-100 #f3ddd6` | prazo vencido |
| Informação | `--teal-500 #1a6b68` | `--teal-50 #eef5f4` | prioridade / destaque |

---

### 1.1 Light mode (padrão)

| Alias semântico | Valor (light) | Uso |
|---|---|---|
| **Superfícies** | | |
| `--bg-base` | `#F2F2F0` (paper) | fundo da aplicação |
| `--bg-sunken` | `#eef0ef` (neutral-100) | áreas rebaixadas / hover de linha |
| `--surface-card` | `#ffffff` | cards, painéis, controles |
| `--surface-raised` | `#ffffff` | menus, popovers |
| `--surface-overlay` | `#ffffff` | diálogos |
| `--surface-inverse` | `#012326` (pine) | painéis escuros (CTA, login) |
| `--surface-accent-soft` | `#eef5f4` (teal-50) | destaque suave |
| **Texto** | | |
| `--text-primary` | `#012326` | títulos e corpo principal |
| `--text-secondary` | `#41514f` (neutral-700) | apoio |
| `--text-muted` | `#778c8a` (neutral-500) | metadados |
| `--text-faint` | `#98a8a6` (neutral-400) | desabilitado / placeholder |
| `--text-on-accent` | `#F2F2F0` | texto sobre teal |
| `--text-on-dark` | `#F2F2F0` | texto sobre pine |
| `--text-link` | `#014040` (teal-700) | links |
| **Bordas** | | |
| `--border-subtle` | `#e7eae9` (neutral-150) | hairlines de card |
| `--border-default` | `#dde1e0` (neutral-200) | inputs, divisores |
| `--border-strong` | `#bfc6c5` (neutral-300) | ênfase / hover |
| `--border-accent` | `#014040` | foco em teal |
| **Acento** | | |
| `--accent` | `#014040` | ações primárias |
| `--accent-hover` | `#013a3a` (teal-800) | hover |
| `--accent-active` | `#012e2f` (teal-900) | pressionado |
| `--accent-soft` | `#eef5f4` | fill fantasma / hover ghost |
| `--accent-contrast` | `#F2F2F0` | texto sobre acento |

---

### 1.2 Dark mode

```css
:root[data-theme="dark"] {
  /* Superfícies — pinheiro profundo, sobe em verde-petróleo */
  --bg-base:           #06100f;
  --bg-sunken:         #040b0a;
  --surface-card:      #0c1817;
  --surface-raised:    #12211f;
  --surface-overlay:   #162725;
  --surface-inverse:   #F2F2F0;
  --surface-accent-soft:#0e2624;

  /* Texto — papel sobre tinta */
  --text-primary:   #eef5f4;
  --text-secondary: #a3cac6;
  --text-muted:     #6aa9a4;
  --text-faint:     #5a6b69;
  --text-on-accent: #012326;
  --text-on-dark:   #012326;
  --text-link:      #6aa9a4;

  /* Bordas */
  --border-subtle:  #162725;
  --border-default: #1f312f;
  --border-strong:  #2c4240;
  --border-accent:  #6aa9a4;

  /* Acento — clareia para legibilidade no escuro */
  --accent:          #3f8b86;
  --accent-hover:    #6aa9a4;
  --accent-active:   #a3cac6;
  --accent-soft:     #0e2624;
  --accent-contrast: #012326;

  /* Foco */
  --focus-ring:        #6aa9a4;
  --focus-ring-offset: #06100f;

  /* Status */
  --status-done:        #4fb085;
  --status-done-soft:   #0f2a20;
  --status-warn:        #d6a24a;
  --status-warn-soft:   #2c2210;
  --status-danger:      #d27360;
  --status-danger-soft: #2e1712;
  --status-info:        #3f8b86;
  --status-info-soft:   #0e2624;

  --shadow-color: 185 60% 3%;

  /* Pilares */
  --pillar-estudos:        #3f8b86;
  --pillar-estudos-strong: #6aa9a4;
  --pillar-estudos-soft:   #0e2624;
  --pillar-casa:           #d6a24a;
  --pillar-casa-strong:    #e3bd78;
  --pillar-casa-soft:      #2c2210;
  --pillar-generico:       #98a8a6;
  --pillar-generico-strong:#bfc6c5;
  --pillar-generico-soft:  #18211f;
}
```

**Tabela resumida (claro → escuro)**

| Alias | Light | Dark |
|---|---|---|
| `--bg-base` | `#F2F2F0` | `#06100f` |
| `--surface-card` | `#ffffff` | `#0c1817` |
| `--surface-inverse` | `#012326` | `#F2F2F0` |
| `--text-primary` | `#012326` | `#eef5f4` |
| `--text-secondary` | `#41514f` | `#a3cac6` |
| `--text-muted` | `#778c8a` | `#6aa9a4` |
| `--accent` | `#014040` | `#3f8b86` |
| `--accent-hover` | `#013a3a` | `#6aa9a4` |
| `--border-subtle` | `#e7eae9` | `#162725` |

---

### 1.3 Pilares temáticos

| Pilar | Comportamento | Token | Cor (light) | Soft |
|---|---|---|---|---|
| **Estudos** | Ciclos Pomodoro | `--pillar-estudos` | `#014040` (teal) | `#eef5f4` |
| **Casa** | Recorrência | `--pillar-casa` | `#b07b2e` (amber) | `#f4e8d2` |
| **Genérico** | Trava de 24h | `--pillar-generico` | `#778C8A` (sage) | `#eceeed` |

---

## 2. Tipografia

| Papel | Família | Token | Uso |
|---|---|---|---|
| Display | **Spectral** | `--font-serif` / `--font-display` | títulos, hero, wordmark |
| Body / UI | **Hanken Grotesk** | `--font-sans` / `--font-body` | interface, parágrafos, controles |
| Meta | **JetBrains Mono** | `--font-mono` / `--font-meta` | datas, contagens, rótulos |

### Escala de tamanhos

| Token | rem | px | Uso típico |
|---|---|---|---|
| `--text-xs` | 0.75 | 12 | metadados, rótulos mono |
| `--text-sm` | 0.8125 | 13 | helper text, labels |
| `--text-base` | 0.9375 | 15 | corpo da UI |
| `--text-md` | 1 | 16 | corpo / botão grande |
| `--text-lg` | 1.125 | 18 | subtítulos |
| `--text-xl` | 1.25 | 20 | títulos de seção |
| `--text-2xl` | 1.5 | 24 | títulos de card |
| `--text-3xl` | 1.875 | 30 | títulos de view |
| `--text-4xl` | 2.375 | 38 | títulos de página |
| `--text-5xl` | 3 | 48 | hero secundário |
| `--text-6xl` | 4 | 64 | hero |
| `--text-7xl` | 5 | 80 | display gigante |

### Pesos

| Token | Valor |
|---|---|
| `--weight-light` | 300 |
| `--weight-regular` | 400 |
| `--weight-medium` | 500 |
| `--weight-semibold` | 600 |
| `--weight-bold` | 700 |
| `--weight-extrabold` | 800 |

---

## 3. Espaçamento e layout

Grade base de **4px**.

| Token | rem | px |
|---|---|---|
| `--space-1` | 0.25 | 4 |
| `--space-2` | 0.5 | 8 |
| `--space-3` | 0.75 | 12 |
| `--space-4` | 1 | 16 |
| `--space-6` | 1.5 | 24 |
| `--space-8` | 2 | 32 |
| `--space-12` | 3 | 48 |
| `--space-16` | 4 | 64 |
| `--space-24` | 6 | 96 |
| `--space-32` | 8 | 128 |

**Shell:** sidebar fixa **264px** + conteúdo fluido (~720px) + drawer **368px**.

---

## 4. Raios, bordas e elevação

| Token | Valor | Uso |
|---|---|---|
| `--radius-xs` | 3px | tags minúsculas |
| `--radius-sm` | 5px | checkbox, chips pequenos |
| `--radius-md` | 8px | controles (botões, inputs) |
| `--radius-lg` | 12px | cards |
| `--radius-xl` | 16px | painéis grandes |
| `--radius-pill` | 999px | badges, tags, switches |
| `--radius-circle` | 50% | avatares |

| Token | Definição |
|---|---|
| `--shadow-xs` | `0 1px 2px hsl(var(--shadow-color)/.06)` |
| `--shadow-sm` | `0 1px 2px /.05, 0 2px 6px /.05` |
| `--shadow-md` | `0 2px 4px /.05, 0 6px 16px /.08` |
| `--shadow-lg` | `0 4px 8px /.05, 0 14px 32px /.10` |
| `--ring-focus` | `0 0 0 3px hsl(178 71% 26% / .35)` |

---

## 5. Movimento

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` | 120ms | hover, mudança de estado |
| `--duration-base` | 200ms | entradas padrão |
| `--duration-slow` | 360ms | drawers, transições maiores |
| `--ease-standard` | `cubic-bezier(0.2,0,0,1)` | mudanças de estado |
| `--ease-out` | `cubic-bezier(0.16,1,0.3,1)` | entradas |

---

## 6. Componentes base

Prefixo `jdi-`. Todos respondem a light/dark via aliases semânticos.

| Componente | Classe | Variantes |
|---|---|---|
| Button | `.jdi-btn` | `--primary` · `--secondary` · `--ghost` · `--danger` · `--sm/md/lg` |
| IconButton | `.jdi-iconbtn` | `--ghost` · `--solid` · `--outline` · `--sm/md/lg` |
| Input | `.jdi-field` + `.jdi-input` | `--sm` · `--invalid` |
| Checkbox | `.jdi-check` | `--circle` · `--lg` · `--plain` |
| Select | `.jdi-select` | `--sm` |
| Switch | `.jdi-switch` | — |
| Card | `.jdi-card` | `--flat` · `--raised` · `--interactive` |
| Badge | `.jdi-badge` | `--neutral` · `--done` · `--warn` · `--danger` · `--info` · `--solid` |
| Tag | `.jdi-tag` | removível · clicável |
| Pillar chip | `.jdi-pillar` | `--estudos` · `--casa` · `--generico` |
| ProgressBar | `.jdi-progress` | — |
| Tooltip | `.jdi-tip` | `--bottom` |
| Tabs | `.jdi-tabs` | — |
| Pomodoro ring | `.jdi-pomo` | via `--pct` |

---

## 7. Tokens — referência completa

> **Use sempre os aliases semânticos** no código. Os tokens de rampa são apenas
> fonte da verdade — não vão direto no produto.

```css
/* Famílias */
--font-serif  --font-sans  --font-mono
--font-display  --font-body  --font-meta

/* Tipo */
--text-xs … --text-7xl
--weight-light … --weight-extrabold
--leading-none … --leading-relaxed
--tracking-tighter … --tracking-caps

/* Espaço / layout */
--space-1 … --space-32
--container-narrow … --container-full
--sidebar-width   --control-height-sm/md/lg

/* Raio */
--radius-xs … --radius-pill   --radius-circle

/* Cor — âncoras */
--brand-pine  --brand-teal  --brand-sage  --brand-paper  --brand-mist

/* Cor — aliases semânticos (USE ESTES) */
--bg-base  --bg-sunken
--surface-card  --surface-raised  --surface-overlay
--surface-inverse  --surface-accent-soft
--text-primary  --text-secondary  --text-muted  --text-faint
--text-on-accent  --text-on-dark  --text-link
--border-subtle  --border-default  --border-strong  --border-accent
--accent  --accent-hover  --accent-active  --accent-soft  --accent-contrast
--focus-ring  --focus-ring-offset
--status-done(-soft)  --status-warn(-soft)
--status-danger(-soft)  --status-info(-soft)

/* Pilares */
--pillar-estudos(-strong/-soft)
--pillar-casa(-strong/-soft)
--pillar-generico(-strong/-soft)
--pomodoro-focus  --pomodoro-break  --pomodoro-track

/* Elevação / movimento */
--shadow-xs … --shadow-xl   --shadow-inset   --ring-focus
--ease-standard/-out/-in-out   --duration-fast/-base/-slow
```

---

### Notas & caveats

- **Light mode é a fonte da verdade.** O dark mode é uma derivação proposta —
  valide o contraste real (alvo AA, ≥4.5:1) antes de produção.
- Fontes via Google Fonts (Spectral, Hanken Grotesk, JetBrains Mono).
  Troque pelos ativos reais da marca quando disponíveis.
- Ícones em SVG estilo Lucide.

---

**Versão:** 1.0 · **Data:** Junho 2026 · **Criado para:** Claude Design
