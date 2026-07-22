# Entendendo o frontend — build, Vite e a organização dos arquivos

Documento explicativo, escrito para quem conhece o backend do JustDoIt (Spring/Gradle) mas não convive com o ferramental do mundo JavaScript. Explica **o que acontece quando o front é compilado**, **o que o Vite faz**, **por que a raiz do projeto tem os arquivos que tem** e **o que mudou na reorganização de 22/07/2026**.

Para a referência da estrutura em si, ver `README.md`. Para pegadinhas de cada feature, ver `docs/CLAUDE.md`.

---

## 1. O que é "build"

O código-fonte **não é** o que vai para o ar. O navegador não entende JSX (`<TaskEditor />`), não sabe resolver um import como `@/features/tasks/hooks/useTasks`, e carregar 148 arquivos separados seria lento.

O **build** é o processo que traduz o código-fonte em arquivos que o navegador entende — o análogo do `./gradlew build` do backend, que transforma `.java` em `.jar`.

```bash
npm run build
```

```
✓ 145 modules transformed
dist/index.html                   0.43 kB │ gzip:   0.29 kB
dist/assets/index-BapivpAH.css  144.27 kB │ gzip:  19.93 kB
dist/assets/index-DZXpCk4t.js   372.69 kB │ gzip: 111.07 kB
```

O que ele fez nessas quatro linhas:

1. Leu os 145 arquivos de `src/` alcançáveis a partir do `index.html`
2. Converteu o JSX em JavaScript comum
3. Resolveu todos os imports (inclusive o alias `@/`)
4. Juntou tudo em **um** `.js` e **um** `.css`
5. Gravou o resultado em `dist/`

**É o conteúdo de `dist/` que o GitHub Pages publica.** A pasta `src/` nunca vai para o servidor.

### O hash no nome do arquivo

`index-DZXpCk4t.js` — aquele trecho aleatório é um **hash do conteúdo**. Se o código mudar, o nome muda; se não mudar, o nome permanece.

Isso existe para o *cache* do navegador (nome novo = o usuário baixa a versão nova em vez de usar a antiga), mas serve também como ferramenta de verificação: **se o hash não muda, o JavaScript final é byte a byte o mesmo.** Foi assim que se provou que a reorganização da seção 4 não alterou o comportamento do app.

---

## 2. O que é o Vite

O Vite é o *build tool* do projeto — o equivalente do Gradle no backend. Tem dois modos:

| Comando | Modo | O que faz |
|---|---|---|
| `npm run dev` | desenvolvimento | Sobe um servidor em `localhost:3000` que recompila assim que um arquivo é salvo, refletindo a mudança no navegador em milissegundos, sem recarregar a página (*hot reload*) |
| `npm run build` | produção | Gera o `dist/` otimizado para publicação |
| `npm run preview` | conferência | Serve o `dist/` já construído, para ver o resultado final antes de publicar |

### O que está no `vite.config.js`

Três configurações do projeto que vale conhecer:

| Configuração | Por que existe |
|---|---|
| `server: { port: 3000, strictPort: true }` | O CORS dos serviços Spring só aceita `http://localhost:3000`. Com `strictPort`, se a porta estiver ocupada o Vite **falha de propósito**, em vez de subir em outra porta e ver toda requisição ser bloqueada — um erro claro na hora é melhor que um app que carrega e não funciona |
| `resolve: { alias: { '@': .../src } }` | Faz `@/components/Ic` significar `src/components/Ic`. Sem isso, um import entre features viraria `../../../components/Ic`, que quebra toda vez que um arquivo muda de pasta |
| plugin `fallbackSpa` | Copia o `index.html` como `404.html` ao fim do build. O GitHub Pages não conhece as rotas do React Router: sem esse arquivo, recarregar `/visao-geral` faz o servidor procurar um arquivo com esse nome e devolver 404 |

---

## 3. Anatomia da raiz

Cada arquivo da raiz e por que está ali:

| Item | Natureza | Por que na raiz |
|---|---|---|
| `index.html` | obrigatório | É o entrypoint — o Vite procura esse arquivo especificamente na raiz |
| `package.json` | obrigatório | Dependências e scripts; o npm procura na raiz |
| `package-lock.json` | obrigatório | Trava as versões exatas instaladas — garante que todo mundo (e o CI) instale o mesmo |
| `vite.config.js` | obrigatório | Configuração do build |
| `jsconfig.json` | convenção | Ensina o alias `@` ao editor, para o autocomplete e o "ir para definição" funcionarem |
| `.gitignore`, `README.md` | convenção | Padrão de qualquer repositório |
| `src/`, `public/`, `docs/`, `.github/` | convenção | Código-fonte, arquivos servidos crus, documentação e CI |
| `node_modules/`, `dist/`, `__pycache__/` | gerados | Não versionados (estão no `.gitignore`); podem ser apagados e recriados a qualquer momento |
| `dev.py` | ferramenta local | Incomum num repo JavaScript, mas sobe backend + frontend de uma vez; na raiz é onde é cômodo rodar |

### `public/` vs `src/`

Distinção que costuma confundir:

- **`src/`** — passa pelo build. É processado, transformado e empacotado.
- **`public/`** — é copiado **cru** para o `dist/`, com o mesmo nome. Serve para arquivos que precisam existir com um caminho previsível: o `favicon.svg` e o `CNAME` (que informa o domínio próprio ao GitHub Pages).

---

## 4. A reorganização de 22/07/2026

### O problema

O repositório tinha **duas aplicações competindo pelo mesmo espaço**: o app React em `react/` (com o próprio `package.json`, `vite.config.js` e `index.html`) e as sobras do site antigo, em HTML/JS puro, espalhadas pela raiz (`pages/`, `scripts/`, `styles/`, `components/`, `landing/`, `assets/`).

Havia páginas duplicadas — `styles/` da raiz era cópia byte a byte de `react/src/styles/`, e `components/Calendar/WeeklyCalendar.jsx` existia nas duas versões, com a da raiz desatualizada.

### O que mudou

1. **O app React saiu de `react/` e virou a raiz do repositório.** Não existe mais subpasta `react/`.
2. **`src/` passou a ser organizado por feature.** Antes os arquivos eram agrupados por *tipo* (`components/`, `hooks/`, `pages/`); agora por *assunto* (`features/calendar/` tem a página, os componentes e os hooks do calendário juntos).
3. **O site antigo foi removido** — 67 arquivos que não entravam em build nenhum e não eram publicados.

Total: 151 arquivos alterados, 11.793 linhas removidas.

### Camada vs. feature

O ponto da mudança nº 2, em uma frase: **antes, mexer no calendário exigia abrir 4 pastas; agora, uma.**

```
ANTES (por camada)                 DEPOIS (por feature)
src/                               src/
  components/                        features/
    Calendar/WeeklyCalendar.jsx        calendar/
    Dashboard/CategoryChart.jsx          pages/Calendario.jsx
    TaskEditor.jsx                       components/WeeklyCalendar.jsx
    Sidebar.jsx                          hooks/useTimeBlocks.js
  hooks/                                 ...
    useTimeBlocks.js                   tasks/
    useTasks.js                          pages/Todo.jsx
    ...                                  components/TaskEditor.jsx
  pages/                                 hooks/useTasks.js
    Calendario.jsx                       lib/priority.js
    Todo.jsx                           ...
    ...                              components/   ← só o que é usado por todas
```

### Como se provou que nada quebrou

O build foi executado a cada etapa. A verificação decisiva foi o hash descrito na seção 1: o bundle final saiu como `index-DZXpCk4t.js` **antes e depois** da reorganização. Mesmo hash = mesmo JavaScript = o comportamento do app não mudou, só o endereço dos arquivos.

> ⚠️ O build prova que os imports resolvem e que o código compila. **Não** prova que a interface está correta — isso exige abrir o app no navegador.

---

## 5. ⚠️ O deploy precisa de uma mudança manual antes do merge

**Esta é a pendência mais importante do projeto, e ela não pode ser resolvida por código.**

### O que está configurado hoje

Consultando a API do GitHub (`gh api repos/:owner/:repo/pages`):

```json
{ "build_type": "legacy", "source": { "branch": "main", "path": "/" },
  "cname": "justdoit-app.duckdns.org" }
```

`build_type: "legacy"` significa **"deploy from a branch"**: o GitHub Pages está servindo, cru, o conteúdo da raiz da branch `main`. Hoje isso funciona porque a `main` ainda contém o site vanilla — HTML e JS puros, que o navegador executa sem build.

O `.github/workflows/deploy.yml` (que constrói e publica o `dist/`) **nunca chegou a valer**: a action `deploy-pages` exige que a fonte do Pages seja *GitHub Actions*, e ela não é.

### Por que isso quebra no merge

Depois desta reorganização, o `index.html` da raiz é o **entrypoint do Vite**, não uma página pronta. Ele contém:

```html
<script type="module" src="/src/main.jsx"></script>
```

Servido cru pelo Pages, o navegador pediria `/src/main.jsx` — JSX não compilado, que ele não sabe executar. **Resultado: página em branco no domínio de produção.**

### A correção

No GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Feito isso, o `deploy.yml` assume: instala as dependências, roda `npm run build` e publica o `dist/`, com o domínio vindo de `public/CNAME`.

### Consequência para o `CNAME` da raiz

Enquanto a fonte for *branch*, **o `CNAME` da raiz é o que sustenta o domínio próprio — não pode ser apagado.** Ele só se torna redundante depois da troca para GitHub Actions, quando quem passa a carregar o domínio é o `public/CNAME`.

> Uma avaliação anterior classificou esse arquivo como "inerte" com base na existência do `deploy.yml`. Estava errada: a existência do workflow não implica que ele esteja em uso. A configuração real do Pages é a fonte da verdade, e só a API (ou a tela de Settings) a revela.

---

## 6. Outras observações

- **Assets de marca:** `logo.png` (ícone do app) e `logo-name.png` (logotipo com o nome) viviam soltos na raiz sem nenhuma referência em código. Foram movidos para `public/`, ficando acessíveis pela web. Ainda não são usados como `og:image` no `index.html` — sem isso, compartilhar o link do app em redes sociais não exibe imagem de prévia.
- **`docs/CLAUDE.md` está fora da raiz.** O Claude Code carrega automaticamente apenas um `CLAUDE.md` que esteja **na raiz** do projeto; em `docs/`, ele passa a ser um documento de leitura manual.
