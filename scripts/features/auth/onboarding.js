/* ============================================================
   JustDoIt — features/auth/onboarding.js
   Setup guiado em 1 passo: primeira categoria/tarefa.
   Persiste no Store.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

  let cor = 'var(--color-cat-teal)';

  const btnNext = document.getElementById('btnNext');
  const catName = document.getElementById('catName');
  const taskName = document.getElementById('taskName');

  function validar() {
    const preenchido = catName.value.trim() !== '' && taskName.value.trim() !== '';
    btnNext.disabled = !preenchido;
  }

  catName.addEventListener('input', validar);
  taskName.addEventListener('input', validar);
  validar();

  document.getElementById('colorPicker').querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      cor = sw.dataset.color;
    });
  });

  const erroEl = document.getElementById('onbError');

  function mostrarErro(msg) {
    erroEl.textContent = msg || '';
    erroEl.hidden = !msg;
  }

  function concluir() {
    if (btnNext.disabled) return;
    if (!(window.Api && Api.endpoints && Api.endpoints.categories && Api.endpoints.tasks)) {
      mostrarErro('Serviço indisponível. Tente novamente.');
      return;
    }

    const nomeCategoria = catName.value.trim();
    const tituloTarefa  = taskName.value.trim();

    btnNext.disabled = true;
    btnNext.textContent = 'Salvando…';
    mostrarErro('');

    // 1) cria a categoria de verdade no backend (task-service: POST /categories)
    Api.post(Api.endpoints.categories.create, { name: nomeCategoria, color: cor })
      .then(function (cat) {
        // A resposta pode não trazer o id (ex.: 201 só com Location); nesse caso
        // busca na lista pela categoria recém-criada para obter o UUID real.
        if (cat && cat.id) return cat.id;
        return Api.get(Api.endpoints.categories.list).then(function (cats) {
          const achada = (Array.isArray(cats) ? cats : []).find(function (c) { return c.name === nomeCategoria; });
          return achada ? achada.id : null;
        });
      })
      // 2) cria a primeira tarefa associada à categoria criada
      .then(function (categoryId) {
        return Api.post(Api.endpoints.tasks.create, {
          title:       tituloTarefa,
          description: null,
          categoryId:  categoryId,
          priority:    null,
          dueDate:     null,
          dueTime:     null,
        });
      })
      .then(function () {
        window.location.href = '../dashboard/dashboard.html';
      })
      .catch(function (err) {
        btnNext.disabled = false;
        btnNext.textContent = 'Concluir';
        mostrarErro((err && (err.message || err.error)) || 'Não foi possível concluir. Tente novamente.');
      });
  }

  btnNext.addEventListener('click', concluir);
})();
