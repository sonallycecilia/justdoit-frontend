/* ============================================================
   JustDoIt — features/auth/onboarding.js
   Setup guiado em 1 passo: primeira categoria/tarefa.
   Persiste no Storage.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

  let passo = 0;
  let cor   = 'estudos';

  const panels  = document.querySelectorAll('.onb__panel');
  const steps   = document.querySelectorAll('.onb__step');
  const btnNext = document.getElementById('btnNext');
  const btnBack = document.getElementById('btnBack');
  const nav     = document.getElementById('onbNav');

  function mostrar(p) {
    panels.forEach(el => el.classList.toggle('is-active', +el.dataset.panel === p));
    steps.forEach(el => {
      const i = +el.dataset.step;
      el.classList.toggle('is-active', i === p);
      el.classList.toggle('is-done', i < p);
    });
    btnBack.style.visibility = p === 0 ? 'hidden' : 'visible';
    nav.style.display        = p === 1 ? 'none' : 'flex';
    btnNext.textContent      = 'Concluir';
  }

  document.getElementById('colorPicker').querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      cor = sw.dataset.color;
    });
  });

  function avancar() {
    if (passo === 0) {
      // TODO: substituir por Api.put(Api.endpoints.users.onboarding, { categoria, primeiraTarefa })
      Storage.gravar('config', {
        categoria:      { nome: document.getElementById('catName').value.trim() || 'Geral', cor: cor },
        primeiraTarefa: document.getElementById('taskName').value.trim(),
        concluidoEm:    Date.now(),
      });
    }
    passo = Math.min(1, passo + 1);
    mostrar(passo);
  }

  function voltar() { passo = Math.max(0, passo - 1); mostrar(passo); }

  btnNext.addEventListener('click', avancar);
  btnBack.addEventListener('click', voltar);
  mostrar(0);
})();
