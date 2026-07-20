/* ============================================================
   JustDoIt — features/tasks/event-summary.js
   Resumo compacto de um evento do calendário.
   Lê URL params (evId, taskId, ini, fim, dow, dateNum, titulo,
   cat, prio) e — quando taskId existe — vincula ao objeto de
   tarefa em Store('todo-tarefas') para salvar mudanças.
   ============================================================ */
(function () {
  'use strict';

  function fmtHora(x) {
    const h = Math.floor(x);
    const m = x % 1 ? '30' : '00';
    return String(h).padStart(2, '0') + ':' + m;
  }

  // Lê params da URL
  const p      = new URLSearchParams(location.search);
  const evId   = p.get('evId')   || '';
  const taskId = p.get('taskId') || '';
  const ini    = parseFloat(p.get('ini'))     || 8;
  const fim    = parseFloat(p.get('fim'))     || 9;
  const dow    = p.get('dow')    || '';
  const dateNum = p.get('dateNum') || '';
  const tituloEv = p.get('titulo') || '(sem título)';
  const catKey   = p.get('cat')   || 'generico';
  const prioEv   = p.get('prio')  || 'normal';

  // Carrega tarefas do storage
  const tarefas = Tarefas.listar();
  const tarefa  = taskId ? tarefas.find(t => t.id === taskId) : null;

  // Estado mutável — começa com valores do evento; se tarefa existir usa dela
  let estado = {
    done:      tarefa ? tarefa.done      : false,
    prioridade: tarefa ? tarefa.prioridade : prioEv,
    cat:       tarefa ? tarefa.cat        : Categorias.porId(catKey).nome,
  };

  // Elementos
  const evsum     = document.getElementById('evsum');
  const evTitle   = document.getElementById('evTitle');
  const timeVal   = document.getElementById('timeVal');
  const dateVal   = document.getElementById('dateVal');
  const checkBtn  = document.getElementById('checkBtn');
  const prioRow   = document.getElementById('prioRow');
  const catPicker = document.getElementById('catPicker');
  const saveBtn   = document.getElementById('saveBtn');
  const savedHint = document.getElementById('savedHint');
  const detailLink = document.getElementById('detailLink');

  // Título — preferir o da tarefa vinculada
  evTitle.textContent = tarefa ? tarefa.titulo : tituloEv;

  // Horário
  timeVal.textContent = fmtHora(ini) + ' – ' + fmtHora(fim);

  // Data
  if (dow || dateNum) {
    dateVal.textContent = (dow ? dow + (dateNum ? ', ' : '') : '') + (dateNum ? dateNum + ' jun' : '');
  } else {
    dateVal.textContent = 'jun 2026';
  }

  // Link para detalhe completo
  if (taskId) {
    detailLink.href = 'task-detail.html?id=' + taskId;
    detailLink.style.display = '';
  }

  // Sync visual com estado
  function syncDone() {
    evsum.classList.toggle('is-done', estado.done);
    checkBtn.setAttribute('aria-label', estado.done ? 'Reabrir tarefa' : 'Concluir tarefa');
  }

  // Renderiza picker de prioridade
  function renderPrio() {
    prioRow.innerHTML = Priority.NIVEIS.map(n => `
      <button class="evsum__prio-opt ${estado.prioridade === n ? 'is-on' : ''}" data-prio="${n}" type="button">
        <span class="evsum__prio-dot" style="background:${Priority.COR[n]}"></span>
        ${Priority.ROTULO[n]}
      </button>`).join('');

    prioRow.querySelectorAll('.evsum__prio-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        estado.prioridade = btn.getAttribute('data-prio');
        renderPrio();
      });
    });
  }

  // Renderiza picker de categoria
  function renderCat() {
    catPicker.innerHTML = Categorias.TODAS.map(c => `
      <button class="evsum__cat-opt ${estado.cat === c.nome ? 'is-on' : ''}" data-cat="${Utils.esc(c.nome)}" type="button">
        <span class="evsum__cat-dot" style="background:${Utils.esc(c.cor)}"></span>
        ${Utils.esc(c.nome)}
      </button>`).join('');

    catPicker.querySelectorAll('.evsum__cat-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        estado.cat = btn.getAttribute('data-cat');
        renderCat();
      });
    });
  }

  // Toggle concluído
  checkBtn.addEventListener('click', () => {
    estado.done = !estado.done;
    syncDone();
  });

  // Salvar
  let savedTimer;
  saveBtn.addEventListener('click', () => {
    if (tarefa) {
      tarefa.done       = estado.done;
      tarefa.prioridade = estado.prioridade;
      tarefa.cat        = estado.cat;
      Tarefas.salvar(tarefas);
    }
    savedHint.classList.add('is-visible');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => savedHint.classList.remove('is-visible'), 2200);
  });

  // Inicializa
  syncDone();
  renderPrio();
  // Carrega as categorias do usuário antes de montar o picker, para mostrar
  // todas (com cores reais) e resolver corretamente a categoria do evento.
  Categorias.carregar().then(() => {
    if (!tarefa) estado.cat = Categorias.porId(catKey).nome;
    renderCat();
  });
})();
