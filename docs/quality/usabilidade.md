# Usabilidade

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
| Taxa de conclusão de tarefas | NÃO IMPLEMENTADA | Jornadas iniciadas (não coletadas) | — | Não definida |
| Tempo para concluir uma operação | NÃO IMPLEMENTADA | Operações concluídas (não coletadas) | — | Não definido |
| Cobertura de acessibilidade automatizada | APROVADA COM REVISÃO MANUAL | 299 verificações regra-página | 294/299 (98.33%) | 0 violações; 0 inconclusivos sem justificativa |

## Evidência auxiliar

| Verificação | Situação | Denominador | Resultado | Limite |
|---|---|---:|---:|---:|
| Suíte Vitest | APROVADA | 124 casos executados | 124 passaram; 0 falharam | 0 falhas |

Os testes de componentes e hooks dão suporte aos fluxos, mas não medem jornadas reais. A acessibilidade usa axe-core em Chromium sobre 13/13 rotas do manifesto da aplicação. O denominador inclui regras aprovadas, violadas e inconclusivas; por isso não é publicado 100% enquanto houver revisão manual. Inconclusivos justificados: 5; sem justificativa: 0. Navegação por teclado dos diálogos é testada no Vitest. Leitores de tela continuam como verificação manual.
