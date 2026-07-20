import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

// "Genérico" é a categoria padrão de todo usuário e NÃO existe no backend:
// é representada por categoryId null nas tarefas.
export const CAT_GENERICO = { id: 'generico', nome: 'Genérico', cor: 'var(--color-cat-generico)' };

function mapear(c) {
  return { id: c.id, nome: c.name, cor: c.color || CAT_GENERICO.cor };
}

// Lista de categorias do usuário, sempre com "Genérico" no topo.
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const cats = await api.get(endpoints.categories.list);
      const resto = (Array.isArray(cats) ? cats : [])
        .map(mapear)
        .filter((c) => c.nome !== CAT_GENERICO.nome);
      return [CAT_GENERICO, ...resto];
    },
  });
}

export function useCriarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nome, cor }) => api.post(endpoints.categories.create, { name: nome, color: cor }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });
}

// Resolve nome/cor de uma categoria a partir do categoryId do backend.
export function categoriaPorId(categorias, id) {
  if (!id) return CAT_GENERICO;
  return (categorias || []).find((c) => c.id === id) || CAT_GENERICO;
}
