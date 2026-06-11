/* ============================================================
   JustDoIt — features/auth/onboarding.js
   Setup guiado em 3 passos: perfil → módulos recomendados →
   primeira categoria/tarefa. Persiste tudo no Storage.
   Depende de: core/storage.js, features/auth/auth.js
   ============================================================ */
(function () {
  'use strict';

  Auth.iniciarTema();

  const MODULOS = {
    foco:       { nome: 'Foco / Pomodoro', desc: 'Blocos de concentração com pausas',        ic: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
    tempo:      { nome: 'Cronômetro',      desc: 'Mede o tempo real de execução',            ic: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
    prioridade: { nome: 'Prioridade',      desc: 'Classifica por urgência/importância',      ic: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>' },
    ciclo:      { nome: 'Ciclo',           desc: 'Recorrência automática de tarefas',        ic: '<path d="M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7"/>' },
    notas:      { nome: 'Notas',           desc: 'Bloco livre para cada tarefa',             ic: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
  };

  const RECOMENDADOS = {
    estudantil:   ['foco', 'tempo', 'prioridade'],
    profissional: ['prioridade', 'tempo', 'ciclo'],
    pessoal:      ['ciclo', 'prioridade', 'notas'],
  };

  let passo  = 0;
  let perfil = 'estudantil';
  let cor    = 'estudos';

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
    nav.style.display        = p === 3 ? 'none' : 'flex';
    btnNext.textContent      = p === 2 ? 'Concluir' : 'Continuar';
  }

  document.getElementById('profileOpts').querySelectorAll('.profile-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.profile-opt').forEach(o => o.classList.remove('is-sel'));
      opt.classList.add('is-sel');
      perfil = opt.dataset.profile;
    });
  });

  function renderModulos() {
    const recs  = RECOMENDADOS[perfil];
    const lista = document.getElementById('modList');
    lista.innerHTML = Object.keys(MODULOS).map(key => {
      const m   = MODULOS[key];
      const rec = recs.includes(key);
      return `
        <div class="mod-row ${rec ? 'is-on' : ''}" data-mod="${key}">
          <span class="mod-row__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m.ic}</svg></span>
          <div class="mod-row__main">
            <div class="mod-row__name">${m.nome}</div>
            <div class="mod-row__desc">${m.desc}</div>
          </div>
          ${rec ? '<span class="mod-row__rec">Recomendado</span>' : ''}
          <label class="switch"><input type="checkbox" ${rec ? 'checked' : ''}><span class="switch__track"><span class="switch__thumb"></span></span></label>
        </div>`;
    }).join('');
    lista.querySelectorAll('.mod-row input').forEach(inp => {
      inp.addEventListener('change', () => inp.closest('.mod-row').classList.toggle('is-on', inp.checked));
    });
  }

  document.getElementById('colorPicker').querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      cor = sw.dataset.color;
    });
  });

  function avancar() {
    if (passo === 0) renderModulos();
    if (passo === 2) {
      const mods = [...document.querySelectorAll('.mod-row.is-on')].map(r => r.dataset.mod);
      // TODO: substituir por Api.put(Api.endpoints.users.onboarding, { perfil, modulos, categoria, primeiraTarefa })
      Storage.gravar('config', {
        perfil:        perfil,
        modulos:       mods,
        categoria:     { nome: document.getElementById('catName').value.trim() || 'Geral', cor: cor },
        primeiraTarefa: document.getElementById('taskName').value.trim(),
        concluidoEm:   Date.now(),
      });
    }
    passo = Math.min(3, passo + 1);
    mostrar(passo);
  }

  function voltar() { passo = Math.max(0, passo - 1); mostrar(passo); }

  btnNext.addEventListener('click', avancar);
  btnBack.addEventListener('click', voltar);
  mostrar(0);
})();
