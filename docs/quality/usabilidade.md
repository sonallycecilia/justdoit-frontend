# Usabilidade

> Gerado automaticamente.  
> Commit: `3a631346c115e4345ecead8c74c1be39a7498a2c`  
> Data UTC: `2026-08-10T02:02:16.511Z`  
> Ambiente: Local limpo / Windows 11 / Node 22.22.0 / Chrome 151 / axe-core 4.12.1

| Métrica | Situação | Denominador | Resultado | Limite/meta |
|---|---|---:|---:|---:|
| Taxa de conclusão de tarefas | NÃO IMPLEMENTADA | Jornadas iniciadas (não coletadas) | — | Não definida |
| Tempo para concluir uma operação | NÃO IMPLEMENTADA | Operações concluídas (não coletadas) | — | Não definido |
| Conformidade de acessibilidade automatizada | APROVADA | 246 verificações regra-página | 246/246 (100%) | 100%; 0 violações |

## Evidência auxiliar

| Verificação | Situação | Denominador | Resultado | Limite |
|---|---|---:|---:|---:|
| Suíte Vitest | APROVADA | 81 casos executados | 81 passaram; 0 falharam | 0 falhas |

Os testes de componentes e hooks dão suporte aos fluxos, mas não medem jornadas reais. A acessibilidade usa axe-core em Chromium sobre 11/11 rotas. O denominador soma, por rota, as regras WCAG que o axe pôde aprovar ou reprovar; itens inconclusivos (6) exigem revisão manual e ficam fora da porcentagem. Navegação por teclado dos diálogos é testada no Vitest. Leitores de tela continuam como verificação manual.
