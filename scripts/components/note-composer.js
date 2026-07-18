/* ============================================================
   JustDoIt — components/note-composer.js
   Compositor de anotação reutilizável. Aparece no topo do To Do e
   da aba Anotações. Guarda um rascunho local (Notas.lerRascunho) e,
   ao clicar em "Criar nota", grava no backend (POST /notes via
   Notas.criar) e LIMPA o bloco para a próxima.

   Marcação esperada:
     <div class="notepad" data-note-composer>
       ...
       <span data-composer-hint></span>
       <textarea data-composer-area></textarea>
       <button data-composer-create></button>
     </div>

   Depende de modules/notas.js.
   ============================================================ */
(function () {
  'use strict';

  function wire(root) {
    const area   = root.querySelector('[data-composer-area]');
    const botao  = root.querySelector('[data-composer-create]');
    const hint   = root.querySelector('[data-composer-hint]');
    if (!area || !botao || !window.Notas) return;

    let hintTimer;
    function flashHint(texto, ms) {
      if (!hint) return;
      hint.textContent = texto;
      hint.classList.add('is-visible');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { hint.classList.remove('is-visible'); }, ms || 2000);
    }

    function atualizarBotao() {
      botao.disabled = area.value.trim().length === 0;
    }

    // Estado inicial: rascunho guardado + botão coerente.
    area.value = Notas.lerRascunho();
    atualizarBotao();

    area.addEventListener('input', function () {
      Notas.gravarRascunho(area.value);
      atualizarBotao();
      flashHint('salvo automaticamente');
    });

    function criar() {
      const conteudo = area.value.trim();
      if (!conteudo) return;
      botao.disabled = true;
      Notas.criar({ conteudo: conteudo })
        .then(function () {
          // Salvou no banco → limpa o bloco e o rascunho para a próxima nota.
          area.value = '';
          Notas.limparRascunho();
          atualizarBotao();
          flashHint('nota criada ✓', 2500);
        })
        .catch(function (err) {
          console.error('Falha ao criar nota:', err);
          atualizarBotao();
          flashHint('erro ao criar', 3000);
        });
    }

    botao.addEventListener('click', criar);

    // Ctrl/Cmd + Enter cria a nota sem tirar as mãos do teclado.
    area.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); criar(); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-note-composer]').forEach(wire);
  });
})();
