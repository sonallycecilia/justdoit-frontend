# Segurança

> Gerado automaticamente.  
> Commit: `3a631346c115e4345ecead8c74c1be39a7498a2c`  
> Data UTC: `2026-08-10T02:02:16.511Z`  
> Ambiente: Local limpo / Windows 11 / Node 22.22.0 / Chrome 151 / axe-core 4.12.1

| Métrica | Situação | Denominador | Resultado | Limite/meta |
|---|---|---:|---:|---:|
| Proteção do ciclo de sessão | PARCIAL / NÃO AGREGADA | Cenários ainda não formalizados | — | Não definido |

O cliente compartilha uma renovação entre requisições concorrentes da mesma aba e preserva a sessão em falhas transitórias. Ainda faltam testes diretos de `client.js` e `session.js`, concorrência entre abas e uma fórmula agregadora. Access token e refresh token permanecem em Web Storage.
