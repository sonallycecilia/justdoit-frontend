// Análise semanal derivada de dados REAIS do backend.
//
// São TRÊS grandezas distintas por dia, e nenhuma substitui a outra:
//   • AGENDADO  → blocos que o usuário pôs no calendário (schedule-service,
//     GET /time-blocks?from=&to=). É o compromisso com horário marcado.
//   • ESTIMADO  → soma das estimativas das tarefas que vencem no dia
//     (task-service, GET /tasks/report). Uma tarefa pode ter estimativa sem
//     nunca ter entrado na agenda.
//   • EXECUTADO → tempo trabalhado de fato (mesmo relatório), somando as duas
//     formas de registrar trabalho: ciclos de Pomodoro e intervalos do
//     cronômetro. Cada um cai no dia em que COMEÇOU.
//
// Duas requisições no total. Antes eram 2 POR TAREFA (/timer + /focus-sessions),
// limitadas a um teto de 60 tarefas, e o "planejado" saía de Task.estimatedMinutes,
// coluna legada que o backend não escreve — ou seja, nascia zerado.
//
// O que NÃO vem do backend agregado, e por quê:
//   • categorias → nenhum endpoint quebra tempo por categoria;
//   • conclusão da semana → no relatório, completedTasks conta o que foi
//     concluído no período (por completedAt) enquanto totalTasks conta o que
//     vence no período (por dueDate). Bases diferentes, então feitas > total é
//     possível e o anel passaria de 100%. A tela promete "tarefas desta semana",
//     que é a conta local abaixo.
// As duas saem de `tarefas`, que a página já carregou: custo zero de rede.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { useBlocos } from '@/features/calendar/hooks/useTimeBlocks';
import { dataIso, deIso, intervaloSemana } from '@/lib/utils';

export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Índice 0–6 com a semana começando na segunda.
function indiceDia(data) {
  return data.getDay() === 0 ? 6 : data.getDay() - 1;
}

export function useAnaliseSemanal(tarefas) {
  const semana = intervaloSemana();

  const relatorio = useQuery({
    queryKey: ['relatorio', semana.inicioIso, semana.fimIso],
    queryFn: () => api.get(endpoints.tasks.report(semana.inicioIso, semana.fimIso)),
    staleTime: 60_000,
  });

  // Mesma queryKey do calendário (['blocos', from, to]): quem vem de lá já tem
  // a semana em cache.
  const blocos = useBlocos(semana.inicioIso, semana.fimIso);

  const daSemana = (tarefas || []).filter((t) => {
    if (!t.dataIso) return false;
    const d = deIso(t.dataIso);
    return d >= semana.inicio && d <= semana.fim;
  });

  // Tarefa com tempo estimado e SEM data. O relatório do backend agrega por
  // dueDate, então essas nunca entravam em conta nenhuma: o usuário definia o
  // tempo, olhava o painel e não via nada mudar. Elas contam no TOTAL (o tempo
  // que ele planeja gastar existe), mas ficam fora das séries por dia — não há
  // dia onde pendurá-las, e inventar um mentiria no gráfico.
  const semData = (tarefas || []).filter((t) => !t.dataIso && t.duracaoMin > 0);

  const porDia = relatorio.data?.byDay || [];

  // ── As três séries, por dia da semana ──
  const desvio = DIAS_SEMANA.map((dia) => ({ dia, agendado: 0, estimado: 0, executado: 0 }));

  porDia.forEach((d) => {
    const i = indiceDia(deIso(d.date));
    if (!desvio[i]) return;
    desvio[i].estimado += (d.estimatedMinutes || 0) / 60;
    desvio[i].executado += (d.actualSeconds || 0) / 3600;
  });

  // fim - ini é a duração do bloco em horas: é exatamente o que blocoParaApi
  // grava em estimatedMinutes, então bate com o totalScheduledMinutes do resumo.
  (blocos.data || []).forEach((b) => {
    const i = indiceDia(deIso(b.iso));
    if (desvio[i]) desvio[i].agendado += Math.max(0, b.fim - b.ini);
  });

  // ── Tempo estimado por categoria (nenhum endpoint agrega por categoria) ──
  const porCat = new Map();
  [...daSemana, ...semData].forEach((t) => {
    if (!t.duracaoMin) return;
    const atual = porCat.get(t.cat) || { nome: t.cat, cor: t.catCor, horas: 0 };
    atual.horas += t.duracaoMin / 60;
    porCat.set(t.cat, atual);
  });
  const categorias = [...porCat.values()]
    .map((c) => ({ ...c, horas: Math.round(c.horas * 10) / 10 }))
    .filter((c) => c.horas > 0)
    .sort((a, b) => b.horas - a.horas);

  // ── Tempo de hoje: o dia corrente dentro do relatório da semana ──
  // Vem quebrado por origem porque a tela precisa dizer de onde veio: "2 ciclos
  // de Pomodoro" seria mentira se o tempo tivesse saído do cronômetro.
  const hojeIso = dataIso(new Date());
  const hoje = porDia.find((d) => d.date === hojeIso);

  const conclusao = {
    feitas: daSemana.filter((t) => t.done).length,
    total: daSemana.length,
  };

  const totalAgendado = desvio.reduce((s, d) => s + d.agendado, 0);
  // O agregado do backend continua mandando no que ele consegue ver (tarefa com
  // data, somada por dueDate); o cliente só ACRESCENTA o que aquela consulta
  // descarta por construção, que são as sem data. Os dois conjuntos são
  // disjuntos, então não há risco de contar a mesma tarefa duas vezes, e a
  // agregação não fica duplicada aqui.
  const estimadoSemData = semData.reduce((s, t) => s + (t.duracaoMin || 0), 0) / 60;
  const totalEstimado = (relatorio.data?.totalEstimatedMinutes || 0) / 60 + estimadoSemData;
  const totalExecutado = (relatorio.data?.totalActualSeconds || 0) / 3600;

  return {
    semana,
    conclusao,
    desvio,
    categorias,
    totalAgendado,
    totalEstimado,
    // Quanto do estimado veio de tarefa sem data. A tela precisa disso para
    // explicar por que o total não bate com a soma das barras do gráfico.
    estimadoSemData,
    tarefasSemData: semData.length,
    totalExecutado,
    hoje: {
      minutos: (hoje?.actualSeconds || 0) / 60,
      focoMinutos: (hoje?.focusSeconds || 0) / 60,
      cronometroMinutos: (hoje?.timerSeconds || 0) / 60,
      ciclos: hoje?.focusSessions || 0,
    },
    temTarefas: daSemana.length > 0,
    // Há o que mostrar no gráfico mesmo sem tarefa com data: blocos na agenda
    // ou tempo executado já bastam.
    temDados: desvio.some((d) => d.agendado || d.estimado || d.executado) || estimadoSemData > 0,
    carregando: relatorio.isLoading || blocos.isLoading,
    // Sem isto, uma requisição que falha produz zeros e a tela fica idêntica a
    // uma semana vazia — o pior tipo de erro, o silencioso.
    erro: relatorio.error || blocos.error || null,
    recarregar: () => { relatorio.refetch(); blocos.refetch(); },
  };
}
