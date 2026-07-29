// Caminho do download: a escolha do usuário vira ?format= e o arquivo é salvo
// com o nome que o servidor mandou.
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { baixarArquivo } from '@/api/client';
import { useExportarDados } from '@/features/settings/hooks/useExportarDados';
import { nomePadrao, salvarArquivo } from '@/features/settings/lib/exportacao';

vi.mock('@/api/client', () => ({ baixarArquivo: vi.fn() }));
vi.mock('@/features/settings/lib/exportacao', async (original) => ({
  ...(await original()),
  salvarArquivo: vi.fn(),
}));

// O client precisa ser criado fora do componente: recriá-lo a cada render
// descartaria o estado da mutação no meio do caminho.
function criarWrapper() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function exportar(formato) {
  const { result } = renderHook(() => useExportarDados(), { wrapper: criarWrapper() });
  await act(async () => {
    await result.current.mutateAsync(formato).catch(() => { /* asserção fica no teste */ });
  });
  return result;
}

describe('useExportarDados', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['csv', 'export_tarefas_2026-07-27.csv'],
    ['json', 'export_tarefas_2026-07-27.json'],
  ])('pede %s e salva com o nome vindo do servidor', async (formato, nome) => {
    const blob = new Blob(['x']);
    baixarArquivo.mockResolvedValue({ blob, nomeArquivo: nome });

    const result = await exportar(formato);

    expect(baixarArquivo).toHaveBeenCalledWith(expect.stringContaining(`/me/export?format=${formato}`));
    expect(salvarArquivo).toHaveBeenCalledWith(blob, nome);
    // O React Query publica o resultado num tick próprio (notifyManager).
    await waitFor(() => expect(result.current.data).toBe(nome));
  });

  it('usa o nome padrão quando o Content-Disposition não chega ao JS', async () => {
    baixarArquivo.mockResolvedValue({ blob: new Blob(['x']), nomeArquivo: null });

    await exportar('csv');

    expect(salvarArquivo).toHaveBeenCalledWith(expect.any(Blob), nomePadrao('csv'));
  });

  it('propaga o erro do backend sem salvar arquivo nenhum', async () => {
    baixarArquivo.mockRejectedValue(new Error('Erro 500'));

    const result = await exportar('json');

    await waitFor(() => expect(result.current.error?.message).toBe('Erro 500'));
    expect(salvarArquivo).not.toHaveBeenCalled();
  });
});

describe('nomePadrao', () => {
  it('carimba a data local (não UTC) e a extensão do formato', () => {
    // 23h no fuso local: em UTC já seria o dia seguinte, e o nome ficaria errado.
    const noite = new Date(2026, 6, 27, 23, 30);
    expect(nomePadrao('csv', noite)).toBe('export_tarefas_2026-07-27.csv');
    expect(nomePadrao('json', noite)).toBe('export_tarefas_2026-07-27.json');
  });
});
