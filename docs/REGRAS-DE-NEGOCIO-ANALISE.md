# Regras de negócio: Análise semanal e Visão Geral

**Data:** 06/08/2026
**Escopo:** telas `/analise` (Análise semanal) e `/` (Visão Geral), mais os agregados que as alimentam no `task-service` (8081) e no `schedule-service` (8082).

Este documento descreve **o que os números significam**, não como a tela é montada. Cada regra aponta a fonte no código (front e backend) para que a implementação e a regra possam ser conferidas uma contra a outra.

---

## 1. Glossário: as três grandezas

O produto mede tempo de três formas distintas. Nenhuma substitui a outra, e a distância entre elas é justamente o que a Análise mostra.

| Grandeza | Significado | Origem | Unidade na API |
|---|---|---|---|
| **Agendado** | O que ganhou horário marcado no calendário | Blocos de tempo (`schedule-service`) | minutos (`estimatedMinutes` do bloco) |
| **Estimado** | O que o usuário disse que a tarefa vai custar | Estimativa da tarefa (`task-service`) | minutos |
| **Executado** | O tempo que de fato foi registrado trabalhando | Sessões de foco (Pomodoro) e intervalos do cronômetro | segundos |

Leitura das distâncias:

- **Estimado maior que agendado:** existe trabalho planejado que nunca virou compromisso na agenda.
- **Executado maior que agendado:** a semana consumiu mais tempo do que o reservado, indício de estimativa curta.

---

## 2. Definição de semana

| ID | Regra |
|---|---|
| **RN-01** | A semana vai de **segunda a domingo** e é sempre a semana que contém a data de hoje. Não há navegação para semanas anteriores nas telas. |
| **RN-02** | O primeiro dia da série de gráficos é segunda (índice 0) e domingo é o índice 6. Dias sem dado aparecem zerados, nunca ausentes. |
| **RN-03** | Todas as datas são tratadas em **hora local do navegador**. A conversão para ISO (`YYYY-MM-DD`) e de volta usa meia-noite local, sem UTC. |
| **RN-04** | O período consultado no relatório é limitado a **92 dias** pelo backend. O dashboard sempre pede 7. |

Fonte: `src/lib/utils.js` (`intervaloSemana`, `dataIso`, `deIso`), `src/features/dashboard/hooks/useAnalytics.js` (`indiceDia`), `TaskReportService.MAX_RANGE_DAYS`.

---

## 3. Estimado

| ID | Regra |
|---|---|
| **RN-05** | A estimativa de uma tarefa mora no **módulo de cronômetro** (`TaskTimer.estimatedMinutes`). A coluna antiga `Task.estimatedMinutes` só é usada como fallback de dados legados, porque nem a criação nem a edição de tarefa a escrevem. |
| **RN-06** | No relatório por período, a estimativa é atribuída ao **`dueDate`** da tarefa, ou seja, ao dia em que ela vence, e não ao dia em que foi criada ou trabalhada. |
| **RN-07** | Tarefa **sem data** tem estimativa válida, mas não tem dia. Ela entra no **total estimado da semana** (somada no cliente) e fica **fora das barras por dia**, porque pendurá-la num dia arbitrário seria mentir no gráfico. |
| **RN-08** | Os dois conjuntos são disjuntos por construção: o agregado do backend só enxerga tarefas com data, o cliente só acrescenta as sem data. Não há risco de contagem dupla. |
| **RN-09** | Sempre que houver estimativa sem data, a tela precisa **declarar isso em texto**, tanto na Análise quanto na Visão Geral, para que o total não pareça contradizer a soma das barras. |

Fonte: `TaskEstimates.java`, `TaskReportService.getReport`, `useAnalytics.js` (`semData`, `estimadoSemData`).

---

## 4. Agendado

| ID | Regra |
|---|---|
| **RN-10** | Agendado é a soma da **duração dos blocos** do calendário da semana. No cliente a duração é `fim - ini` em horas; no backend é o campo `estimatedMinutes` gravado no bloco. |
| **RN-11** | Os dois batem porque a gravação do bloco usa exatamente a mesma conta: `estimatedMinutes = (fim - ini) * 60`. Se esse campo for alterado por fora do app, as duas visões divergem. |
| **RN-12** | Um bloco **não precisa estar vinculado a uma tarefa** para contar como agendado. O calendário aceita bloco solto. |
| **RN-13** | O bloco conta no dia do campo `date` do próprio bloco, não no horário de início convertido. |

Fonte: `src/features/calendar/hooks/useTimeBlocks.js` (`blocoParaApi`, `blocoDaApi`), `ScheduleService.generateWeeklySummary`.

---

## 5. Executado

| ID | Regra |
|---|---|
| **RN-14** | Executado soma **duas fontes independentes**: sessões de foco (Pomodoro) e intervalos do cronômetro (`TimeEntry`). |
| **RN-15** | Cada registro cai no dia em que **começou** (`startedAt`), mesmo que tenha atravessado a meia-noite. |
| **RN-16** | Sessão do tipo **BREAK não conta**: pausa não é tempo trabalhado. |
| **RN-17** | A duração de uma sessão de foco é o intervalo `startedAt` até `endedAt`. Se `endedAt` não existir mas a sessão estiver marcada como concluída, valem os minutos planejados. Sessões abertas ou abandonadas valem zero. |
| **RN-18** | Rodar Pomodoro e cronômetro **ao mesmo tempo conta o tempo duas vezes**. Isso é deliberado: são dois registros distintos que o usuário escolheu manter ligados. |
| **RN-19** | O relatório devolve a quebra por origem (`focusSeconds`, `timerSeconds`, `focusSessions`) para que a tela possa dizer de onde o tempo veio. Afirmar "N ciclos de Pomodoro" para tempo que saiu do cronômetro é falso. |
| **RN-20** | **Concluir uma tarefa nunca cronometrada registra a estimativa dela como tempo executado**, via `PATCH /tasks/{id}/timer/log`. Sem isso, quem toca o dia só pela lista fecharia a semana com "0h executadas". |
| **RN-21** | Duas guardas impedem que a RN-20 invente número: sem estimativa nada é gravado, e se **já existe tempo gravado ele manda** (tempo medido não é sobrescrito por estimativa, e reabrir e concluir de novo não soma duas vezes). |
| **RN-22** | A gravação da RN-20 é **acessória**: se ela falhar, a tarefa continua concluída. A conclusão não é revertida por causa do registro de tempo. |

Fonte: `TaskReportService.getReport` e `sessionSeconds`, `src/features/tasks/hooks/useTasks.js` (`registrarTempoDaConclusao`, `useToggleDone`).

---

## 6. Taxa de conclusão da semana

| ID | Regra |
|---|---|
| **RN-23** | A taxa de conclusão exibida é calculada **no cliente**, sobre as tarefas cujo `dueDate` cai na semana: `feitas / total`. |
| **RN-24** | O `completedTasks` do relatório **não é usado** para esse anel. No backend, `completedTasks` conta por `completedAt` e `totalTasks` conta por `dueDate`. São bases diferentes, então concluídas maiores que o total é possível e o anel passaria de 100%. |
| **RN-25** | A tela promete "tarefas desta semana". A conta local é a única que cumpre essa promessa. |
| **RN-26** | Sem tarefas com data na semana, o card mostra estado vazio explícito, não 0%. |

Fonte: `useAnalytics.js` (`conclusao`, `daSemana`), `TaskReportResponse` (javadoc), `RateRing.jsx`.

---

## 7. Tempo por categoria

| ID | Regra |
|---|---|
| **RN-27** | A distribuição por categoria é **100% calculada no cliente**. Nenhum endpoint agrega tempo por categoria. |
| **RN-28** | A grandeza do donut é o **tempo estimado**, não o executado. O rótulo do card precisa dizer isso. |
| **RN-29** | Entram na conta as tarefas da semana **mais** as tarefas sem data com estimativa (mesma lógica da RN-07). |
| **RN-30** | Categorias são agrupadas pelo **nome** da categoria, arredondadas a uma casa decimal, ordenadas da maior para a menor, e as de zero hora são omitidas. |
| **RN-31** | A base é a lista de tarefas já carregada pela página, então a conta custa zero requisições extras e fica limitada ao que `GET /tasks` devolve. |

Fonte: `useAnalytics.js` (`porCat`, `categorias`), `CategoryChart.jsx`.

---

## 8. Tempo de hoje (Visão Geral)

| ID | Regra |
|---|---|
| **RN-32** | "Tempo hoje" é o dia corrente **dentro do relatório da semana**, não uma consulta separada. |
| **RN-33** | A legenda descreve a origem: ciclos de Pomodoro e tempo de cronômetro aparecem juntos, separados por ponto médio. Sem nenhum dos dois, o texto é "nenhum tempo registrado hoje". |
| **RN-34** | O card "Tempo executado" da Visão Geral compara executado contra **estimado** (não contra agendado), porque a Visão Geral é sobre tarefas e a estimativa existe mesmo para quem não usa a agenda. |
| **RN-35** | A barra de progresso é **limitada a 100%** visualmente, mas o percentual numérico e o desvio podem passar disso. |
| **RN-36** | Sem estimativa nenhuma na semana, o card orienta o usuário a definir tempo estimado em vez de exibir 0%. |

Fonte: `useAnalytics.js` (`hoje`), `VisaoGeral.jsx` (`origemDoTempo`, `execPct`, `diff`).

---

## 9. Lista "Hoje, priorizadas"

| ID | Regra |
|---|---|
| **RN-37** | A lista inclui tarefas de hoje **e as atrasadas**, porque na prática atrasada é pendência do dia. |
| **RN-38** | A ordenação é: **concluídas por último**, depois por prioridade na ordem urgente, importante, normal, baixa. |
| **RN-39** | A prioridade viaja pela matriz de Eisenhower do backend, com bijeção garantida na ida e volta. "Baixa" ocupa o quadrante urgente e não importante (delegável). |
| **RN-40** | Excluir tarefa com recorrência (`seriesId` ou `cycleType`) abre o modal de escopo em vez de excluir direto. |

Fonte: `VisaoGeral.jsx` (`doDia`), `src/features/tasks/lib/priority.js`.

---

## 10. Insights gerados

Os insights são frases derivadas dos números da semana, com limiares fixos.

| ID | Condição | Mensagem |
|---|---|---|
| **RN-41** | Existe pelo menos uma tarefa com data na semana | Concluídas sobre total e percentual. Percentual **maior ou igual a 60%** é tratado como bom ritmo; abaixo disso, sugere revisar o que ficou para trás. |
| **RN-42** | Agendado maior que zero | Compara executado contra agendado e nomeia a diferença. Executado acima do agendado é sinalizado como estimativa possivelmente curta. |
| **RN-43** | Estimado maior que zero **e** estimado menos agendado maior que **0,25h** (15 minutos) | Aponta quanto de trabalho estimado ainda não tem horário marcado. O piso de 15 minutos evita ruído por arredondamento. |
| **RN-44** | Existe alguma categoria com tempo | Nomeia a categoria com a maior fatia do tempo estimado. |
| **RN-45** | Nenhuma condição satisfeita | O card mostra "ainda não há dados suficientes nesta semana", nunca uma lista vazia sem explicação. |

Fonte: `Analise.jsx` (`montarInsights`).

---

## 11. Fechamento da semana

O fechamento é o que transforma a Análise de painel ao vivo em histórico.

| ID | Regra |
|---|---|
| **RN-46** | Enquanto a semana está **OPEN**, os números são recalculados a cada visita. Ao **CLOSED**, o backend passa a devolver o retrato congelado. Sem isso, olhar uma semana antiga mostraria o estado atual das tarefas, não como a semana foi. |
| **RN-47** | O frontend **não guarda o id do plano**. Ele acha o plano pela data da segunda (`GET /weekly-plans?weekStart=`), porque o id só existiria na resposta do POST e se perderia no primeiro reload. |
| **RN-48** | `POST /weekly-plans` é **idempotente**: abrir a mesma semana duas vezes devolve o mesmo plano, sem duplicar. |
| **RN-49** | O fechamento **gera o resumo antes** de marcar CLOSED. Sem isso, fechar uma semana sem nunca ter aberto a Análise deixaria um plano fechado com resumo zerado. |
| **RN-50** | Fechar uma semana já fechada **não recalcula nada**. O retrato congelado é devolvido como está. |
| **RN-51** | `GET /weekly-plans/{id}/summary` apenas **lê** o que está salvo. Quem calcula é o POST e o fechamento. |
| **RN-52** | **404 não é erro** nesses dois GETs: significa "esta semana ainda não foi aberta ou resumida". |
| **RN-53** | Fechar é uma ação **confirmada em dois passos**, e o texto de confirmação avisa que os totais param de mudar mesmo que o usuário edite as tarefas depois. |
| **RN-54** | `deviationSeconds` do resumo mede executado **contra o agendado**, que é o compromisso que o usuário assumiu ao marcar horário no calendário. (Repare que a Visão Geral usa outra referência, ver RN-34.) |
| **RN-55** | Se o `task-service` não responder na geração do resumo, o resumo é salvo assim mesmo, só com o agendado local e a contagem de blocos em `totalTasks`. O fechamento **nunca falha por causa do outro serviço**. |

Fonte: `src/features/dashboard/hooks/useWeeklyPlan.js`, `Analise.jsx`, `ScheduleService` (`createWeeklyPlan`, `closeWeeklyPlan`, `generateWeeklySummary`).

---

## 12. Estados de carga, erro e cache

| ID | Regra |
|---|---|
| **RN-56** | Um card só pode **afirmar algo sobre a semana** quando não está carregando e não há erro. Carregando ainda não sabe; com erro, os zeros não significam "vazio". |
| **RN-57** | Erro de rede **nunca vira zero silencioso**. A tela mostra a causa provável e um botão de tentar de novo. |
| **RN-58** | A tradução de erro é: **404** sugere serviço desatualizado ou parado (reiniciar task-service e schedule-service), **401 e 403** sugerem sessão não aceita, outros status são exibidos crus, e ausência de status vira "sem conexão". |
| **RN-59** | Há dado para o gráfico mesmo sem tarefa com data: **blocos na agenda ou tempo executado já bastam** para renderizar. |
| **RN-60** | O relatório da semana, o plano e o resumo têm `staleTime` de **60 segundos**. |
| **RN-61** | Toda mutação que muda tarefa, estimativa ou tempo **invalida o relatório** (`invalidarMetricas`). Sem isso, criar tarefa com tempo estimado não mudava número nenhum na tela até o minuto vencer, e o app parecia não computar nada. |
| **RN-62** | A Análise reaproveita a mesma `queryKey` de blocos do calendário (`['blocos', from, to]`), então quem vem do calendário já chega com a semana em cache. |
| **RN-63** | O painel inteiro custa **duas requisições** (relatório e blocos) mais as tarefas que a página já carregava. |

Fonte: `Analise.jsx` (`pronto`, `explicarErro`), `useAnalytics.js` (`temDados`, `erro`, `recarregar`), `useTasks.js` (`invalidarMetricas`).

---

## 13. Fontes de dados

| Endpoint | Serviço | O que alimenta |
|---|---|---|
| `GET /tasks` | task-service (8081) | Tarefas da semana, categorias, estimativas sem data, lista de hoje |
| `GET /tasks/report?from=&to=` | task-service (8081) | Estimado e executado por dia, ciclos, quebra Pomodoro e cronômetro |
| `GET /time-blocks?from=&to=` | schedule-service (8082) | Agendado por dia |
| `GET /weekly-plans?weekStart=` | schedule-service (8082) | Status da semana (OPEN ou CLOSED) |
| `POST /weekly-plans` | schedule-service (8082) | Abre a semana (idempotente) |
| `PATCH /weekly-plans/{id}/close` | schedule-service (8082) | Congela o retrato |
| `GET /weekly-plans/{id}/summary` | schedule-service (8082) | Retrato da semana fechada |
| `PATCH /tasks/{id}/timer/log` | task-service (8081) | Registro de tempo na conclusão (RN-20) |

O `schedule-service` chama `GET /tasks/report` **repassando o token do próprio usuário**, sem credencial de serviço.

---

## 14. Divergências conhecidas e limitações

Estas não são falhas: são consequências assumidas das regras acima. Estão listadas porque cada uma já pareceu bug em algum momento.

1. **O total estimado não bate com a soma das barras** quando existem tarefas sem data (RN-07). A tela declara a diferença em texto.
2. **Pomodoro e cronômetro simultâneos contam duas vezes** (RN-18).
3. **Visão Geral e resumo do backend usam referências diferentes** para desvio: estimado (RN-34) contra agendado (RN-54).
4. **Categorias ficam limitadas ao que `GET /tasks` devolve** (RN-31). Não há paginação considerada aqui.
5. **Com a semana fechada, a tela continua exibindo os cards ao vivo** além do retrato congelado. O retrato é um card adicional, identificado como "gravado no fechamento, não muda mais".
6. **Não há navegação para semanas anteriores** (RN-01). O histórico só existe através dos planos fechados, que hoje não têm tela de listagem.
7. **`totalTasks` do resumo cai para "quantidade de blocos"** quando o task-service não responde (RN-55). O número existe, mas significa outra coisa.

---

## 15. Rastreabilidade

| Arquivo | Regras |
|---|---|
| `src/lib/utils.js` | RN-01 a RN-03 |
| `src/features/dashboard/hooks/useAnalytics.js` | RN-02, RN-06 a RN-09, RN-10, RN-23, RN-27 a RN-32, RN-59, RN-62, RN-63 |
| `src/features/dashboard/hooks/useWeeklyPlan.js` | RN-46 a RN-52 |
| `src/features/dashboard/pages/Analise.jsx` | RN-41 a RN-45, RN-53, RN-56 a RN-58 |
| `src/features/dashboard/pages/VisaoGeral.jsx` | RN-33 a RN-38, RN-40 |
| `src/features/dashboard/components/DeviationChart.jsx` | RN-02 |
| `src/features/dashboard/components/CategoryChart.jsx` | RN-28, RN-30 |
| `src/features/dashboard/components/RateRing.jsx` | RN-25, RN-26 |
| `src/features/calendar/hooks/useTimeBlocks.js` | RN-10 a RN-13 |
| `src/features/tasks/hooks/useTasks.js` | RN-20 a RN-22, RN-61 |
| `src/features/tasks/lib/priority.js` | RN-38, RN-39 |
| `task-service/.../report/TaskReportService.java` | RN-04, RN-06, RN-14 a RN-19, RN-24 |
| `task-service/.../task/TaskEstimates.java` | RN-05 |
| `schedule-service/.../schedule/ScheduleService.java` | RN-10, RN-48 a RN-51, RN-55 |
| `schedule-service/.../shared/WeeklySummaryResponse.java` | RN-54 |
