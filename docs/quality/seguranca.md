# Segurança

> Gerado automaticamente.
>
> Commit-base: `cf311101cb0b2e2f7da92eb16183ee51e143bed1`
>
> Data UTC: `2026-08-11T12:33:33.837Z`
>
> Ambiente: Local / Windows 11 / Node 22 / Vitest 2.1.9 / jsdom

| Métrica | Situação | Numerador | Denominador | Resultado | Limite/meta |
|---|---|---:|---:|---:|---:|
| Proteção do ciclo de sessão — backend | IMPLEMENTADA / APROVADA | 5 cenários corretos | 5 cenários obrigatórios | 5/5 (100%) | 100% exatos |
| Proteção do ciclo de sessão — frontend | IMPLEMENTADA / APROVADA | 7 cenários corretos | 7 cenários obrigatórios | 7/7 (100%) | 100% exatos |
| TPS sistêmica | IMPLEMENTADA / APROVADA | 12 cenários corretos | 12 cenários testados | 12/12 (100%) | 100% exatos |

## Definição do denominador

A TPS usa `cenários corretos ÷ cenários testados × 100`.

- Backend (5): JWT expirado, rotação do refresh token, detecção de reutilização, logout e rate limiting.
- Frontend (7): promessa única para renovações concorrentes, token atualizado por outra aba, rotação preservando o storage escolhido, refresh 401, refresh 429, refresh 5xx e falha de rede.

Os gates são distribuídos: o pipeline do backend exige 5/5 e o pipeline do frontend exige 7/7. A métrica sistêmica só está aprovada quando ambos atingem 100%.

## Risco residual e migração

O risco das credenciais em Web Storage está registrado em [`RISK-SESSION-001`](../security/session-storage-risk.md). O estudo para migrar o refresh token para cookie `HttpOnly`, `Secure` e `SameSite`, com proteção CSRF, está planejado no ticket [`SEC-001`](../backlog/SEC-001-http-only-session.md).
