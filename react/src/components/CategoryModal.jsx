import { useEffect, useRef, useState } from 'react';
import Ic, { ICONS } from './Ic';
import { useCriarCategoria } from '../hooks/useCategories';

const CORES = [
  'var(--color-cat-teal)',
  'var(--color-cat-rust)',
  'var(--color-cat-green)',
  'var(--color-cat-sage)',
  'var(--color-cat-purple)',
  'var(--color-cat-pink)',
  'var(--color-cat-blue)',
  'var(--color-cat-terracotta)',
  'var(--color-cat-plum)',
];

// Modal "Nova categoria" — cria a categoria de verdade no backend
// (POST /categories) e invalida a query de categorias ao concluir.
export default function CategoryModal({ aberto, onFechar }) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [erro, setErro] = useState('');
  const inputRef = useRef(null);
  const criar = useCriarCategoria();

  useEffect(() => {
    if (aberto) {
      setNome('');
      setCor(CORES[0]);
      setErro('');
      criar.reset();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  function salvar() {
    const n = nome.trim();
    if (!n) { setErro('Dê um nome à categoria.'); inputRef.current?.focus(); return; }
    setErro('');
    criar.mutate({ nome: n, cor }, {
      onSuccess: onFechar,
      onError: (e) => setErro(e.message || 'Não foi possível criar a categoria.'),
    });
  }

  return (
    <div className="cat-modal">
      <div className="cat-modal__backdrop" onClick={onFechar} />
      <div className="cat-modal__card" role="dialog" aria-modal="true" aria-label="Nova categoria">
        <div className="cat-modal__head">
          <h3 className="cat-modal__title">Nova categoria</h3>
          <button className="cat-modal__close" type="button" onClick={onFechar} aria-label="Fechar">
            <Ic d={ICONS.close} />
          </button>
        </div>
        <span className="cat-modal__label">Cor</span>
        <div className="cat-modal__colors">
          {CORES.map((c) => (
            <span
              key={c}
              className={`cat-modal__swatch ${c === cor ? 'is-sel' : ''}`}
              style={{ background: c }}
              role="button"
              tabIndex={0}
              aria-label="Selecionar cor"
              onClick={() => setCor(c)}
            />
          ))}
        </div>
        <input
          ref={inputRef}
          className="cat-modal__input"
          type="text"
          placeholder="Nome da categoria…"
          autoComplete="off"
          maxLength={40}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') salvar(); }}
        />
        {erro && <div className="cat-modal__error">{erro}</div>}
        <div className="cat-modal__actions">
          <button className="btn btn--secondary btn--sm" type="button" onClick={onFechar}>Cancelar</button>
          <button className="btn btn--primary btn--sm" type="button" onClick={salvar} disabled={criar.isPending}>
            {criar.isPending ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
