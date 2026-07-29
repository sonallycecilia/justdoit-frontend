import { useMutation } from '@tanstack/react-query';
import { baixarArquivo } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { nomePadrao, salvarArquivo } from '@/features/settings/lib/exportacao';

// Exportação das tarefas do usuário. Não é useQuery: nada fica em cache — cada
// clique é um efeito colateral (baixar um arquivo), não uma leitura de estado.
export function useExportarDados() {
  return useMutation({
    mutationFn: async (formato) => {
      const { blob, nomeArquivo } = await baixarArquivo(endpoints.dados.exportar(formato));
      const nome = nomeArquivo || nomePadrao(formato);
      salvarArquivo(blob, nome);
      return nome;
    },
  });
}
