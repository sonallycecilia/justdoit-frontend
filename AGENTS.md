# Repository Guidelines

## Project Structure & Module Organization

This repository contains a React 18/Vite 6 single-page application written in JavaScript and JSX. Application code lives in `src/`, static assets in `public/`, automation in `scripts/`, and project documentation in `docs/`.

Organize product code by domain under `src/features/<name>/`, using `pages/`, `components/`, `hooks/`, and `lib/` only as needed. Shared UI belongs in `src/components`; generic helpers belong in `src/lib`; backend access stays in `src/api`. Global design tokens and styles live in `src/styles`.

## Documentation Placement

Place all new documentation in `docs/`, using a relevant subdirectory when helpful. Do not add plans, reports, screenshots, evidence, or other documentation files to the project root. Reserve the root for essential project and tooling files such as `README.md`, `AGENTS.md`, `package.json`, and Vite configuration.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts Vite on the required port 3000.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the production build locally.
- `npm test` runs the Vitest suite once; `npm run test:watch` runs it interactively.
- `npm run quality:lcp` builds the app and validates the Lighthouse LCP P75 target.

## Coding Style & Naming Conventions

Match existing two-space indentation and ES module syntax. Use `PascalCase` for React components, `camelCase` for functions and values, and the `use<Name>` pattern for hooks. Code, comments, variables, and filenames are generally in Portuguese. Use `@/` imports across features and relative imports within a feature; avoid deep `../../../` paths. Reuse existing CSS classes and design tokens before adding styles.

Keep server state in TanStack Query. Route requests through `src/api/client.js` and define URLs in `src/api/endpoints.js`; do not scatter raw `fetch` calls. Never store business data in `localStorage`.

## Testing Guidelines

Tests use Vitest, Testing Library, and jsdom. Keep tests beside related code and name them `*.test.jsx`. Test user-visible behavior, query invalidation, optimistic updates, and regressions. Run `npm test` and `npm run build` before opening a pull request.

## Commit & Pull Request Guidelines

History favors short Portuguese summaries focused on one outcome. Use branches such as `feature/JD-XX-nome-da-tarefa`. Submit changes through pull requests; include a concise summary, linked issue, test evidence, and screenshots for visual changes. Do not commit secrets, generated `dist/`, or quality-report output.
