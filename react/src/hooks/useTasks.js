import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';
import { calcQuando, dataRelativa, deIso } from '../lib/utils';
import { prioridadeDaApi, prioridadeParaApi } from '../lib/priority';
import { categoriaPorId } from './useCategories';

// ─── Mapeamento backend (TaskResponse) ↔ modelo da UI ────────────────────────
// O backend é a fonte da verdade; não há mais "meta cache" em localStorage.
// Prioridade agora viaja no campo priority; categoria resolve por categoryId.
export function tarefaDaApi(t, categorias) {
  const cat = categoriaPorId(categorias, t.categoryId);
  const dataObj = t.dueDate ? deIso(t.dueDate) : null;
  const quando = dataObj ? calcQuando(dataObj) : 'all';
  const concluida = t.status === 'COMPLETED';
  return {
    id: t.id,
    titulo: t.title,
    descricao: t.description || '',
    cat: cat.nome,
    catCor: cat.cor,
    categoriaId: t.categoryId || 'generico',
    prioridade: prioridadeDaApi(t.priority),
    done: concluida,
    dataIso: t.dueDate || null,
    data: dataObj ? dataRelativa(dataObj) : 'Sem data',
    quando,
    overdue: !concluida && quando === 'past',
    hora: t.dueTime ? String(t.dueTime).slice(0, 5) : undefined,
    // Duração estimada (minutos) — vem do timer da tarefa; usada pelo
    // calendário para dimensionar blocos criados por arraste.
    duracaoMin: t.estimatedMinutes || null,
  };
}

// modelo da UI → corpo aceito pelo backend (TaskRequest)
export function tarefaParaApi(d) {
  const catId = d.categoriaId && d.categoriaId !== 'generico' ? d.categoriaId : null;
  return {
    title: d.titulo,
    description: d.descricao || null,
    categoryId: catId,
    priority: prioridadeParaApi(d.prioridade),
    dueDate: d.dataIso || null,
    dueTime: d.hora || null, // "HH:mm" — aceito como LocalTime
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export function useTarefas(categorias) {
  return useQuery({
    queryKey: ['tarefas'],
    queryFn: () => api.get(endpoints.tasks.list),
    // O select roda a cada render com o resultado cacheado: a lista crua fica
    // no cache e o modelo da UI é derivado, já com as categorias resolvidas.
    select: (dados) => (Array.isArray(dados) ? dados : []).map((t) => tarefaDaApi(t, categorias)),
    enabled: Boolean(categorias),
  });
}

export function useTarefa(id, categorias) {
  return useQuery({
    queryKey: ['tarefas', id],
    queryFn: () => api.get(endpoints.tasks.detail(id)),
    select: (t) => (t ? tarefaDaApi(t, categorias) : null),
    enabled: Boolean(id && categorias),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function useCriarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados) => api.post(endpoints.tasks.create, tarefaParaApi(dados)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarefas'] }),
  });
}

export function useAtualizarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }) => api.put(endpoints.tasks.update(id), tarefaParaApi(dados)),
    onSuccess: (_resp, { id }) => {
      qc.invalidateQueries({ queryKey: ['tarefas'] });
      qc.invalidateQueries({ queryKey: ['tarefas', id] });
    },
  });
}

// Concluir/reabrir com atualização otimista: a UI responde na hora e o cache
// volta ao estado anterior se o backend recusar.
export function useToggleDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, concluir }) =>
      api.patch(concluir ? endpoints.tasks.complete(id) : endpoints.tasks.reopen(id)),
    onMutate: async ({ id, concluir }) => {
      await qc.cancelQueries({ queryKey: ['tarefas'] });
      const anterior = qc.getQueryData(['tarefas']);
      qc.setQueryData(['tarefas'], (lista) =>
        (lista || []).map((t) => (t.id === id ? { ...t, status: concluir ? 'COMPLETED' : 'PENDING' } : t)));
      return { anterior };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.anterior) qc.setQueryData(['tarefas'], ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tarefas'] }),
  });
}

export function useRemoverTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.remove(endpoints.tasks.remove(id)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tarefas'] });
      const anterior = qc.getQueryData(['tarefas']);
      qc.setQueryData(['tarefas'], (lista) => (lista || []).filter((t) => t.id !== id));
      return { anterior };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.anterior) qc.setQueryData(['tarefas'], ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tarefas'] }),
  });
}
