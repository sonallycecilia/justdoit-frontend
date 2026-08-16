import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/Sidebar';

vi.mock('@/features/categories/hooks/useCategories', () => ({
  useCategorias: () => ({ data: [] }),
  useRemoverCategoria: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/features/tasks/hooks/useTasks', () => ({
  useTarefas: () => ({ data: [] }),
  useAtualizarTarefa: () => ({ mutate: vi.fn() }),
  useRemoverTarefa: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/features/auth/hooks/useConta', () => ({
  useConta: () => ({ data: { name: 'Usuário Teste' } }),
}));
vi.mock('@/features/auth/hooks/useSessao', () => ({
  useEncerrarSessao: () => vi.fn(),
}));
vi.mock('@/api/session', () => ({ lerSessao: () => ({ name: 'Usuário Teste' }) }));
vi.mock('@/features/categories/components/CategoryModal', () => ({ default: () => null }));
vi.mock('@/features/feedback/components/DevelopmentChatModal', () => ({
  default: ({ aberto }) => (aberto ? <div role="dialog" aria-label="Chat com o desenvolvimento" /> : null),
}));
vi.mock('@/features/notifications/components/NotificationCenter', () => ({
  default: () => <button className="floating-action floating-action--notifications" type="button" aria-label="Notificações" />,
}));

describe('Sidebar — contato com desenvolvimento', () => {
  it('exibe o botão circular de chat acima das notificações e abre a conversa', async () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    const chat = screen.getByRole('button', { name: 'Chat com o desenvolvimento' });
    const notifications = screen.getByRole('button', { name: 'Notificações' });
    expect(chat).toHaveClass('floating-action', 'floating-action--chat');
    expect(notifications).toHaveClass('floating-action', 'floating-action--notifications');
    expect(chat).toHaveAttribute('title', 'Chat com o desenvolvimento');
    expect(chat).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(chat);
    expect(screen.getByRole('dialog', { name: 'Chat com o desenvolvimento' })).toBeInTheDocument();
    expect(chat).toHaveAttribute('aria-expanded', 'true');
  });
});
