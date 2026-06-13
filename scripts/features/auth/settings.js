/* ============================================================
   JustDoIt — pages/settings.js
   Preferências (tema), gestão de categorias (criar/excluir).
   ============================================================ */
(function () {
  'use strict';
  const raiz = document.documentElement;

  /* ---------- Tema (segmented, persistente) ---------- */
  const seg = document.getElementById('themeSeg');
  function temaAtual() {
    const salvo = Storage.lerTema();
    return salvo || 'system';
  }
  function marcarSeg() {
    const atual = temaAtual();
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.theme === atual));
  }
  function aplicar(tema) {
    if (tema === 'dark') raiz.setAttribute('data-theme', 'dark');
    else if (tema === 'light') raiz.removeAttribute('data-theme');
    else { // system
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      dark ? raiz.setAttribute('data-theme', 'dark') : raiz.removeAttribute('data-theme');
    }
  }
  seg.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const t = b.dataset.theme;
      if (t === 'system') Storage.remover('tema');
      else Storage.gravarTema(t);
      aplicar(t);
      marcarSeg();
    });
  });
  marcarSeg();

  /* ---------- Categorias ---------- */
  let categorias = Storage.ler('categorias', Categorias.TODAS.map(c => ({ id: c.id, nome: c.nome, cor: c.cor, n: 0 })));
  let corSel = 'var(--color-cat-estudos)';

  const lista = document.getElementById('catList');
  const input = document.getElementById('catInput');

  function pintar() {
    lista.innerHTML = categorias.map(c => `
      <div class="cat-row" data-id="${c.id}">
        <span class="cat-row__dot" style="background:${c.cor}"></span>
        <span class="cat-row__name">${c.nome}</span>
        <span class="cat-row__count">${c.n} ${c.n === 1 ? 'tarefa' : 'tarefas'}</span>
        <button class="cat-row__del" aria-label="Excluir categoria">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`).join('');
    lista.querySelectorAll('.cat-row__del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.cat-row').dataset.id;
        categorias = categorias.filter(c => c.id !== id);
        Storage.gravar('categorias', categorias);
        pintar();
      });
    });
  }

  function adicionar() {
    const nome = input.value.trim();
    if (!nome) return;
    categorias.push({ id: 'c' + Date.now(), nome: nome, cor: corSel, n: 0 });
    input.value = '';
    Storage.gravar('categorias', categorias);
    pintar();
  }

  document.getElementById('catColors').querySelectorAll('.cat-add__swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.cat-add__swatch').forEach(s => s.classList.remove('is-sel'));
      sw.classList.add('is-sel');
      corSel = sw.dataset.color;
    });
  });
  document.getElementById('catAddBtn').addEventListener('click', adicionar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') adicionar(); });

  pintar();
})();
