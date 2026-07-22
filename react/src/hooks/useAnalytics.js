// Análise semanal derivada de dados REAIS do backend.
//
// O backend não tem endpoints de analytics (/analytics/weekly e
// /analytics/categories não existem — respondem 403). Em vez de exibir
// "Em breve" como o app antigo, os números são calculados no cliente a partir
// do que existe de verdade:
//   • GET /tasks                       → conclusão da semana, estimativa, categoria
//   • GET /tasks/{id}/timer            → actualSeconds (tempo executado)
//   • GET /tasks/{id}/focus-sessions   → ciclos de Pomodoro concluídos
//
// Isso substitui o cálculo do dashboard antigo, que lia os totais de
// localStorage (Store.KEYS.FOCO_DIARIO / TEMPO_DIARIO) — dado de negócio local,
// proibido pela regra de ouro do app React.
//
// Custo: 2 requisições por tarefa da semana (timer + foco), em paralelo e
// limitadas a MAX_TAREFAS. Cada tarefa é atribuída ao dia do seu dueDate — o
// timer guarda só o total acumulado, sem quebra por dia, então essa é a
// granularidade honesta possível. Quando os endpoints de analytics existirem,
// este hook é o único ponto a trocar.
import { useQuery } from '@tanstack/react-query';
import { getOuNull } from '../api/client';
import { endpoints } from '../api/endpoints';
import { dataIso, deIso, intervaloSemana } from '../lib/utils';

export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Teto de fan-out. Semanas normais têm bem menos que isso; o corte evita uma
// rajada absurda se a semana estiver lotada.
const MAX_TAREFAS = 60;

// Índice 0–6 com a semana começando na segunda.
function indiceDia(data) {
  return data.getDay() === 0 ? 6 : data.getDay() - 1;
}

export function useAnaliseSemanal(tarefas) {
  const semana = intervaloSemana();

  const daSemana = (tarefas || []).filter((t) => {
    if (!t.dataIso) return false;
    const d = deIso(t.dataIso);
    return d >= semana.inicio && d <= semana.fim;
  });

  const ids = daSemana.slice(0, MAX_TAREFAS).map((t) => t.id);

  const execucao = useQuery({
    queryKey: ['analise-execucao', semana.inicioIso, ids.join(',')],
    queryFn: async () => {
      const pares = await Promise.all(ids.map(async (id) => {
        const [timer, foco] = await Promise.all([
          getOuNull(endpoints.tasks.timer(id)).catch(() => null),
          getOuNull(endpoints.tasks.focusSessions(id)).catch(() => null),
        ]);
        return [id, {
          segundos: Number(timer?.actualSeconds ?? 0),
          sessoes: Array.isArray(foco) ? foco : [],
        }];
      }));
      return Object.fromEntries(pares);
    },
    enabled: Boolean(tarefas),
    staleTime: 60_000,
  });

  const dadosDe = (id) => execucao.data?.[id] || { segundos: 0, sessoes: [] };

  // ── Planejado vs. executado, por dia da semana ──
  const desvio = DIAS_SEMANA.map((dia) => ({ dia, plan: 0, real: 0 }));
  daSemana.forEach((t) => {
    const i = indiceDia(deIso(t.dataIso));
    desvio[i].plan += (t.duracaoMin || 0) / 60;
    desvio[i].real += dadosDe(t.id).segundos / 3600;
  });

  // ── Tempo estimado por categoria (o timer não separa por categoria) ──
  const porCat = new Map();
  daSemana.forEach((t) => {
    if (!t.duracaoMin) return;
    const atual = porCat.get(t.cat) || { nome: t.cat, cor: t.catCor, horas: 0 };
    atual.horas += t.duracaoMin / 60;
    porCat.set(t.cat, atual);
  });
  const categorias = [...porCat.values()]
    .map((c) => ({ ...c, horas: Math.round(c.horas * 10) / 10 }))
    .filter((c) => c.horas > 0)
    .sort((a, b) => b.horas - a.horas);

  // ── Foco de hoje: ciclos FOCUS concluídos com término no dia ──
  const hojeIso = dataIso(new Date());
  let focoMinutos = 0;
  let focoCiclos = 0;
  daSemana.forEach((t) => {
    dadosDe(t.id).sessoes.forEach((s) => {
      if (!s.completed || s.sessionType !== 'FOCUS') return;
      const quando = s.endedAt || s.startedAt;
      if (!quando || String(quando).slice(0, 10) !== hojeIso) return;
      focoMinutos += Number(s.focusMinutes || 0);
      focoCiclos += 1;
    });
  });

  const conclusao = {
    feitas: daSemana.filter((t) => t.done).length,
    total: daSemana.length,
  };

  const totalPlan = desvio.reduce((s, d) => s + d.plan, 0);
  const totalReal = desvio.reduce((s, d) => s + d.real, 0);

  return {
    semana,
    conclusao,
    desvio,
    categorias,
    totalPlan,
    totalReal,
    foco: { minutos: focoMinutos, ciclos: focoCiclos },
    temTarefas: daSemana.length > 0,
    carregando: execucao.isLoading,
  };
}
