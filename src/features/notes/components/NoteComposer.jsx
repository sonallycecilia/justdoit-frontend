// Compositor de anotação reutilizável (topo do To Do e da aba Anotações).
// Guarda um rascunho local enquanto digita e, ao criar, grava no backend
// (POST /notes) e limpa o bloco para a próxima.
import { useEffect, useRef, useState } from 'react';
import Ic, { ICONS } from '@/components/Ic';
import {
  gravarRascunho,
  gravarRascunhoTitulo,
  lerRascunho,
  lerRascunhoTitulo,
  limparRascunho,
  useCriarNota,
} from '@/features/notes/hooks/useNotas';

export default function NoteComposer() {
  const [titulo, setTitulo] = useState(() => lerRascunhoTitulo());
  const [texto, setTexto] = useState(() => lerRascunho());
  const [hint, setHint] = useState(null); // { texto } visível por alguns segundos
  const hintTimer = useRef(null);
  const criar = useCriarNota();

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  function flashHint(txt, ms = 2000) {
    setHint(txt);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), ms);
  }

  function aoDigitarTitulo(e) {
    setTitulo(e.target.value);
    gravarRascunhoTitulo(e.target.value);
    flashHint('salvo automaticamente');
  }

  function aoDigitar(e) {
    setTexto(e.target.value);
    gravarRascunho(e.target.value);
    flashHint('salvo automaticamente');
  }

  function criarNota() {
    const conteudo = texto.trim();
    if (!conteudo || criar.isPending) return;
    criar.mutate({ titulo, conteudo }, {
      onSuccess: () => {
        setTitulo('');
        setTexto('');
        limparRascunho();
        flashHint('nota criada ✓', 2500);
      },
      onError: () => flashHint('erro ao criar', 3000),
    });
  }

  function aoTeclar(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); criarNota(); }
  }

  return (
    <div className="notepad">
      <div className="notepad__head">
        <span className="notepad__label"><Ic d={ICONS.notes} />Nova anotação</span>
        <span className={`notepad__hint ${hint ? 'is-visible' : ''}`}>{hint || 'salvo automaticamente'}</span>
      </div>
      <input
        className="notepad__title"
        type="text"
        maxLength={255}
        placeholder="Título (opcional)"
        value={titulo}
        onChange={aoDigitarTitulo}
        onKeyDown={aoTeclar}
      />
      <textarea
        className="notepad__area"
        placeholder="Escreva uma anotação…"
        value={texto}
        onChange={aoDigitar}
        onKeyDown={aoTeclar}
      />
      <div className="notepad__foot">
        <span className="notepad__foot-tip">Ctrl + Enter para criar</span>
        <button
          className="btn btn--primary btn--sm"
          type="button"
          disabled={!texto.trim() || criar.isPending}
          onClick={criarNota}
        >
          Criar nota
        </button>
      </div>
    </div>
  );
}
