/* ============================================================
   JustDoIt — features/auth/onboarding.js
   Setup guiado em 1 passo: primeira categoria/tarefa.
   Persiste no Storage.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

  let cor = 'estudos';

  const btnNext = document.getElementById('btnNext');

  document.getElementById('colorPicker').querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      cor = sw.dataset.color;
    });
  });

  function concluir() {
    // TODO: substituir por Api.put(Api.endpoints.users.onboarding, { categoria, primeiraTarefa })
    Storage.gravar('config', {
      categoria:      { nome: document.getElementById('catName').value.trim() || 'Geral', cor: cor },
      primeiraTarefa: document.getElementById('taskName').value.trim(),
      concluidoEm:    Date.now(),
    });
    window.location.href = '../dashboard/dashboard.html';
  }

  btnNext.addEventListener('click', concluir);
})();
