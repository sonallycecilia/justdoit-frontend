import { useEffect, useRef, useState } from 'react';

// Modal de confirmação — reusa os estilos .cat-modal da sidebar.
// Passando `exigeTexto`, o botão só habilita quando o usuário digita
// exatamente aquela palavra (usado na exclusão de conta).
export default function ConfirmModal({
  aberto,
  titulo,
  children,
  rotuloConfirmar = 'Excluir',
  rotuloProcessando = 'Excluindo…',
  exigeTexto,
  erro,
  processando = false,
  onConfirmar,
  onFechar,
}) {
  const [digitado, setDigitado] = useState('');
  const confirmRef = useRef(null);

  useEffect(() => {
    if (aberto) {
      setDigitado('');
      setTimeout(() => confirmRef.current?.focus(), 0);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === 'Escape' && !processando) onFechar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, processando, onFechar]);

  if (!aberto) return null;

  const liberado = !exigeTexto || digitado.trim().toUpperCase() === exigeTexto.toUpperCase();

  return (
    <div className="cat-modal">
      <div className="cat-modal__backdrop" onClick={() => !processando && onFechar()} />
      <div className="cat-modal__card" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="cat-modal__head">
          <h3 className="cat-modal__title">{titulo}</h3>
        </div>
        {children}
        {exigeTexto && (
          <input
            className="cat-modal__input"
            placeholder={exigeTexto}
            autoComplete="off"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
          />
        )}
        {erro && <div className="cat-modal__error">{erro}</div>}
        <div className="cat-modal__actions">
          <button className="btn btn--secondary btn--sm" type="button" onClick={onFechar} disabled={processando}>
            Cancelar
          </button>
          <button
            ref={confirmRef}
            className="btn btn--danger btn--sm"
            type="button"
            onClick={onConfirmar}
            disabled={!liberado || processando}
          >
            {processando ? rotuloProcessando : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
