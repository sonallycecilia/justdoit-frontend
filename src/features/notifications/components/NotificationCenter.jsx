import { useEffect, useMemo, useRef, useState } from 'react';
import Ic, { ICONS } from '@/components/Ic';
import { useMarkNotificationAsRead, useNotifications } from '@/features/notifications/hooks/useNotifications';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { data: notifications = [], isPending, isError, refetch } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const buttonLabel = unreadCount
    ? `Notificações, ${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}`
    : 'Notificações';

  return (
    <div ref={containerRef} className="notification-center">
      <button
        className="floating-action floating-action--notifications"
        type="button"
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-controls="notification-panel"
        title="Notificações"
        onClick={() => setOpen((current) => !current)}
      >
        <Ic d={ICONS.bell} />
        {unreadCount > 0 && (
          <span className="notification-center__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section id="notification-panel" className="notification-center__panel" aria-labelledby="notification-title">
          <header className="notification-center__head">
            <div>
              <h2 id="notification-title">Notificações</h2>
              <p>{unreadCount ? `${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia'}</p>
            </div>
            <button className="notification-center__close" type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}>
              <Ic d={ICONS.close} />
            </button>
          </header>

          <div className="notification-center__content">
            {isPending && <p className="notification-center__state">Carregando notificações…</p>}
            {isError && (
              <div className="notification-center__state" role="alert">
                <p>Não foi possível carregar as notificações.</p>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => refetch()}>Tentar novamente</button>
              </div>
            )}
            {!isPending && !isError && notifications.length === 0 && (
              <div className="notification-center__empty">
                <span><Ic d={ICONS.bell} /></span>
                <strong>Nenhuma notificação</strong>
                <p>Quando houver uma atualização importante, ela aparecerá aqui.</p>
              </div>
            )}
            {!isPending && !isError && notifications.length > 0 && (
              <ol className="notification-center__list">
                {notifications.map((notification) => (
                  <li key={notification.id} className={`notification-center__item ${notification.read ? 'is-read' : 'is-unread'}`}>
                    <div className="notification-center__item-head">
                      <strong>{notification.title}</strong>
                      {!notification.read && <span className="notification-center__unread" aria-label="Não lida" />}
                    </div>
                    <p>{notification.message}</p>
                    <div className="notification-center__item-foot">
                      <time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>
                      {!notification.read && (
                        <button
                          type="button"
                          disabled={markAsRead.isPending}
                          onClick={() => markAsRead.mutate(notification.id)}
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
