# Segurança

> Gerado automaticamente.  
> Commit: `f9b523d3565d69c7edf456cc18b4b0e2f75d633d`  
> Data UTC: `2026-08-10T01:26:15.873Z`  
> Ambiente: Local limpo / Windows 11 / Node 22.22.0 / Lighthouse desktop local

| Métrica | Situação | Denominador | Resultado | Limite/meta |
|---|---|---:|---:|---:|
| Proteção do ciclo de sessão | PARCIAL / NÃO AGREGADA | Cenários ainda não formalizados | — | Não definido |

O cliente compartilha uma renovação entre requisições concorrentes da mesma aba e preserva a sessão em falhas transitórias. Ainda faltam testes diretos de `client.js` e `session.js`, concorrência entre abas e uma fórmula agregadora. Access token e refresh token permanecem em Web Storage.
