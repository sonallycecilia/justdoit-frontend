# Desempenho

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

| Métrica | Situação | Denominador | Amostras | Resultado | Limite/meta |
|---|---|---:|---|---:|---:|
| LCP no percentil 75 | APROVADA | 4/4 execuções válidas | 1041, 1058, 1095, 1163 ms | 1095 ms | 2500 ms |

O P75 usa nearest rank: posição `ceil(0,75 × N)` das amostras ordenadas. O gate exige exatamente quatro relatórios da URL configurada, gerados depois do início desta execução. A coleta usa build de produção, Lighthouse desktop e somente a página inicial servida localmente.
