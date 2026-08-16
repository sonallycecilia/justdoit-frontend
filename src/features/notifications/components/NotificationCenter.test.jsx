import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import NotificationCenter from '@/features/notifications/components/NotificationCenter';

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

function renderCenter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NotificationCenter />
    </QueryClientProvider>,
  );
}

const unreadNotification = {
  id: 'notification-1',
  title: 'Tarefa próxima do prazo',
  message: 'A tarefa Revisar relatório vence em breve.',
  read: false,
  createdAt: '2026-08-15T10:30:00',
};

describe('NotificationCenter', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.patch.mockReset();
  });

  it('mantém o sino visível e mostra o estado vazio quando não há notificações', async () => {
    api.get.mockResolvedValue([]);
    renderCenter();

    const trigger = screen.getByRole('button', { name: 'Notificações' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('floating-action--notifications');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(endpoints.notifications.list));

    await userEvent.click(trigger);
    expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
    expect(screen.getByText('Quando houver uma atualização importante, ela aparecerá aqui.')).toBeInTheDocument();
  });

  it('exibe o contador somente para notificações não lidas', async () => {
    api.get.mockResolvedValue([
      unreadNotification,
      { ...unreadNotification, id: 'notification-2', title: 'Já lida', read: true },
    ]);
    renderCenter();

    expect(await screen.findByRole('button', { name: 'Notificações, 1 não lida' })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('marca uma notificação como lida e remove o contador pelo cache', async () => {
    api.get.mockResolvedValue([unreadNotification]);
    api.patch.mockResolvedValue({ ...unreadNotification, read: true });
    renderCenter();

    const trigger = await screen.findByRole('button', { name: 'Notificações, 1 não lida' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como lida' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(endpoints.notifications.markAsRead(unreadNotification.id)));
    expect(await screen.findByRole('button', { name: 'Notificações' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como lida' })).not.toBeInTheDocument();
  });

  it('informa falha de carregamento e permite tentar novamente', async () => {
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderCenter();

    await userEvent.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as notificações.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
