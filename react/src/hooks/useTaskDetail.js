// Dados dos módulos do detalhe da tarefa — TUDO persistido no task-service.
// (No front antigo, subtarefas/nota/módulos/ciclo/timer viviam só em
// localStorage e nunca chegavam ao backend.)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getOuNull } from '../api/client';
import { endpoints } from '../api/endpoints';

// ─── Subtarefas ───────────────────────────────────────────────────────────────
export function useSubtarefas(taskId) {
  return useQuery({
    queryKey: ['subtarefas', taskId],
    queryFn: async () => {
      const lista = await api.get(endpoints.tasks.subtasks.list(taskId));
      return (Array.isArray(lista) ? lista : []).map((s) => ({
        id: s.id,
        titulo: s.title,
        done: s.status === 'COMPLETED',
        position: s.position,
      }));
    },
    enabled: Boolean(taskId),
  });
}

export function useCriarSubtarefa(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ titulo, position }) =>
      api.post(endpoints.tasks.subtasks.create(taskId), { title: titulo, position }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtarefas', taskId] }),
  });
}

export function useToggleSubtarefa(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subId) => api.patch(endpoints.tasks.subtasks.toggle(taskId, subId)),
    onMutate: async (subId) => {
      await qc.cancelQueries({ queryKey: ['subtarefas', taskId] });
      const anterior = qc.getQueryData(['subtarefas', taskId]);
      qc.setQueryData(['subtarefas', taskId], (subs) =>
        (subs || []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s)));
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) qc.setQueryData(['subtarefas', taskId], ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['subtarefas', taskId] }),
  });
}

export function useRemoverSubtarefa(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subId) => api.remove(endpoints.tasks.subtasks.remove(taskId, subId)),
    onMutate: async (subId) => {
      await qc.cancelQueries({ queryKey: ['subtarefas', taskId] });
      const anterior = qc.getQueryData(['subtarefas', taskId]);
      qc.setQueryData(['subtarefas', taskId], (subs) => (subs || []).filter((s) => s.id !== subId));
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) qc.setQueryData(['subtarefas', taskId], ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['subtarefas', taskId] }),
  });
}

// ─── Nota ─────────────────────────────────────────────────────────────────────
export function useNota(taskId) {
  return useQuery({
    queryKey: ['nota', taskId],
    queryFn: async () => {
      const nota = await getOuNull(endpoints.tasks.note(taskId));
      return nota?.content ?? '';
    },
    enabled: Boolean(taskId),
  });
}

export function useSalvarNota(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content) => api.put(endpoints.tasks.note(taskId), { content }),
    onSuccess: (resp) => qc.setQueryData(['nota', taskId], resp?.content ?? ''),
  });
}

// ─── Configuração de módulos ativos ──────────────────────────────────────────
// O backend guarda 5 flags; "subtarefas" não tem flag própria e é derivado da
// existência de subtarefas (ligado automaticamente quando há alguma).
export const MODULOS_PADRAO = { foco: false, ciclo: false, prioridade: false, tempo: false, notas: false };

export function useModulos(taskId) {
  return useQuery({
    queryKey: ['modulos', taskId],
    queryFn: async () => {
      const cfg = await getOuNull(endpoints.tasks.moduleConfig(taskId));
      if (!cfg) return { ...MODULOS_PADRAO };
      return {
        foco: Boolean(cfg.focusEnabled),
        ciclo: Boolean(cfg.cycleEnabled),
        prioridade: Boolean(cfg.priorityEnabled),
        tempo: Boolean(cfg.timerEnabled),
        notas: Boolean(cfg.notesEnabled),
      };
    },
    enabled: Boolean(taskId),
  });
}

export function useSalvarModulos(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mods) => api.put(endpoints.tasks.moduleConfig(taskId), {
      focusEnabled: mods.foco,
      cycleEnabled: mods.ciclo,
      priorityEnabled: mods.prioridade,
      timerEnabled: mods.tempo,
      notesEnabled: mods.notas,
    }),
    onMutate: async (mods) => {
      await qc.cancelQueries({ queryKey: ['modulos', taskId] });
      const anterior = qc.getQueryData(['modulos', taskId]);
      qc.setQueryData(['modulos', taskId], mods);
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) qc.setQueryData(['modulos', taskId], ctx.anterior);
    },
  });
}

// ─── Recorrência (cycle-config) ───────────────────────────────────────────────
export function useCiclo(taskId) {
  return useQuery({
    queryKey: ['ciclo', taskId],
    queryFn: async () => {
      const cfg = await getOuNull(endpoints.tasks.cycleConfig(taskId));
      return cfg?.cycleType ?? 'none';
    },
    enabled: Boolean(taskId),
  });
}

export function useSalvarCiclo(taskId) {
  const qc = useQueryClient();
  return useMutation({
    // 'none' = remover recorrência → DELETE; qualquer tipo → PUT (upsert)
    mutationFn: (tipo) => (tipo === 'none'
      ? api.remove(endpoints.tasks.cycleConfig(taskId))
      : api.put(endpoints.tasks.cycleConfig(taskId), { cycleType: tipo })),
    onMutate: async (tipo) => {
      await qc.cancelQueries({ queryKey: ['ciclo', taskId] });
      const anterior = qc.getQueryData(['ciclo', taskId]);
      qc.setQueryData(['ciclo', taskId], tipo);
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior !== undefined) qc.setQueryData(['ciclo', taskId], ctx.anterior);
    },
  });
}

// ─── Cronômetro de execução (timer) ──────────────────────────────────────────
export function useTimer(taskId) {
  return useQuery({
    queryKey: ['timer', taskId],
    queryFn: async () => {
      const t = await getOuNull(endpoints.tasks.timer(taskId));
      return Number(t?.actualSeconds ?? 0);
    },
    enabled: Boolean(taskId),
  });
}

// Soma segundos rodados (PATCH /timer/log) — chamado ao pausar/sair da página.
export function useLogarTempo(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seconds) => api.patch(endpoints.tasks.timerLog(taskId), { seconds }),
    onSuccess: (resp) => {
      if (resp?.actualSeconds != null) qc.setQueryData(['timer', taskId], Number(resp.actualSeconds));
    },
  });
}

// Zerar o total acumulado (PUT /timer com actualSeconds: 0).
export function useZerarTempo(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put(endpoints.tasks.timer(taskId), { actualSeconds: 0 }),
    onSuccess: () => qc.setQueryData(['timer', taskId], 0),
  });
}

// ─── Sessões de foco (Pomodoro) ───────────────────────────────────────────────
export function useSessoesFoco(taskId) {
  return useQuery({
    queryKey: ['foco', taskId],
    queryFn: async () => {
      const lista = await getOuNull(endpoints.tasks.focusSessions(taskId));
      return Array.isArray(lista) ? lista : [];
    },
    enabled: Boolean(taskId),
  });
}

// Registra um ciclo de foco concluído (POST /focus-sessions já completo).
export function useRegistrarCicloFoco(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ focusMinutes, startedAt, endedAt }) =>
      api.post(endpoints.tasks.focusSessions(taskId), {
        focusMinutes,
        sessionType: 'FOCUS',
        startedAt,
        endedAt,
        completed: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foco', taskId] }),
  });
}
