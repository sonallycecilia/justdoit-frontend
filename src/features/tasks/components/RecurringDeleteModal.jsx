export default function RecurringDeleteModal({ tarefa, processando, erro, onEscolher, onFechar }) {
  if (!tarefa) return null;

  return (
    <div className="cat-modal">
      <div className="cat-modal__backdrop" onClick={() => !processando && onFechar()} />
      <div className="cat-modal__card" role="dialog" aria-modal="true" aria-label="Excluir tarefa recorrente">
        <div className="cat-modal__head">
          <h3 className="cat-modal__title">Excluir tarefa recorrente</h3>
        </div>
        <p>Esta tarefa faz parte de uma série. O que você deseja excluir?</p>
        {erro && <div className="cat-modal__error">{erro}</div>}
        <div className="cat-modal__actions">
          <button className="btn btn--secondary btn--sm" type="button" onClick={onFechar} disabled={processando}>
            Cancelar
          </button>
          <button className="btn btn--danger btn--sm" type="button"
            onClick={() => onEscolher('INSTANCE')} disabled={processando}>
            Somente esta ocorrência
          </button>
          <button className="btn btn--danger btn--sm" type="button"
            onClick={() => onEscolher('SERIES')} disabled={processando}>
            Todas as ocorrências
          </button>
        </div>
      </div>
    </div>
  );
}
