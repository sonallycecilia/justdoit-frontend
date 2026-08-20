# Segurança

> Gerado automaticamente.
>
> Commit: `be973b197b93bb6a9503699cb0ab0a1075ea0dff`
>
> Árvore de trabalho: com alterações não commitadas
>
> Execução: `30d397ad-1d18-4755-9b92-b2a60d0291cd`
>
> Data UTC: `2026-08-20T13:32:12.110Z`
>
> Ambiente: win32 x64 / Node v22.22.0

| Métrica | Situação | Denominador | Resultado | Limite/meta |
|---|---|---:|---:|---:|
| Proteção do ciclo de sessão (frontend) | IMPLEMENTADA / APROVADA | 11 cenários obrigatórios | 11/11 (100%) | 100% exatos |

A TPS usa `cenários corretos ÷ cenários testados × 100`. O cliente testa 11/11 cenários: renovações concorrentes, token atualizado por outra aba, rotação preservando o storage escolhido, refresh 401, 429, 5xx e falha de rede, rejeição após rotação, respostas 403 de sessão e de regra de negócio, além de sessão legada sem refresh token. O backend possui gate complementar de 5/5 para JWT expirado, rotação, reutilização, logout e rate limiting. O contrato sistêmico esperado é 16/16, mas permanece NÃO AGREGADO enquanto os dois artefatos não forem validados na mesma execução sistêmica.

O risco de access token e refresh token em Web Storage está registrado em `docs/security/session-storage-risk.md`; a migração para cookies HttpOnly está planejada no ticket `docs/backlog/SEC-001-http-only-session.md`.
