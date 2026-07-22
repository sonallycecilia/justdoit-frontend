// Anotações livres do usuário (aba "Anotações" + compositor no To Do).
// Fonte da verdade = backend (/notes, task-service). Só o RASCUNHO do
// compositor (texto que ainda não virou nota) fica em localStorage, na
// mesma chave do app antigo — o que se está escrevendo é o mesmo nos dois.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';

// NoteResponse → modelo da UI
function notaDaApi(n) {
  return {
    id: n.id,
    titulo: n.title || '',
    conteudo: n.content || '',
    fixada: Boolean(n.pinned),
    criadaEm: n.createdAt || null,
    atualizadaEm: n.updatedAt || null,
  };
}

// modelo da UI → NoteRequest (strings vazias viram null — @NotBlank no backend)
function notaParaApi(d) {
  return {
    title: d.titulo && d.titulo.trim() ? d.titulo.trim() : null,
    content: d.conteudo != null && String(d.conteudo).trim() ? d.conteudo : null,
  };
}

export function useNotas() {
  return useQuery({
    queryKey: ['notas'],
    queryFn: () => api.get(endpoints.notes.list),
    select: (dados) => (Array.isArray(dados) ? dados : []).map(notaDaApi),
  });
}

export function useCriarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados) => api.post(endpoints.notes.create, notaParaApi(dados)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notas'] }),
  });
}

export function useAtualizarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }) => api.put(endpoints.notes.update(id), notaParaApi(dados)),
    onMutate: async ({ id, titulo, conteudo }) => {
      await qc.cancelQueries({ queryKey: ['notas'] });
      const anterior = qc.getQueryData(['notas']);
      qc.setQueryData(['notas'], (notas) =>
        (notas || []).map((n) => (n.id === id ? { ...n, title: titulo, content: conteudo } : n)));
      return { anterior };
    },
    onError: (_e, _v, ctx) => { if (ctx?.anterior) qc.setQueryData(['notas'], ctx.anterior); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notas'] }),
  });
}

export function useRemoverNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.remove(endpoints.notes.remove(id)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notas'] });
      const anterior = qc.getQueryData(['notas']);
      qc.setQueryData(['notas'], (notas) => (notas || []).filter((n) => n.id !== id));
      return { anterior };
    },
    onError: (_e, _v, ctx) => { if (ctx?.anterior) qc.setQueryData(['notas'], ctx.anterior); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notas'] }),
  });
}

// Fixar: o backend despina a anterior (só 1 fixada por usuário) e a ordem da
// lista muda — por isso NÃO há optimistic update; refetch traz o estado real.
export function useFixarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(endpoints.notes.pin(id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['notas'] }),
  });
}

// ── Rascunho do compositor (compartilhado com o app antigo) ──────────────────
// Mesma chave e mesmo encoding (JSON) do Store do vanilla: 'jdi.' + 'todo-notas'.
const KEY_RASCUNHO = 'jdi.todo-notas';

export function lerRascunho() {
  try {
    const bruto = localStorage.getItem(KEY_RASCUNHO);
    return bruto === null ? '' : JSON.parse(bruto);
  } catch { return ''; }
}
export function gravarRascunho(txt) {
  try { localStorage.setItem(KEY_RASCUNHO, JSON.stringify(txt)); } catch { /* cheio/indisponível */ }
}
export function limparRascunho() { localStorage.removeItem(KEY_RASCUNHO); }
