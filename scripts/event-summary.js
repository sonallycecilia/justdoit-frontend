/* ============================================================
   JustDoIt — event-summary.js
   Resumo compacto de um evento do calendário.
   Lê URL params (evId, taskId, ini, fim, dow, dateNum, titulo,
   cat, prio) e — quando taskId existe — vincula ao objeto de
   tarefa em Storage('todo-tarefas') para salvar mudanças.
   ============================================================ */
(function () {
  'use strict';

  // Mesma semente de todo.js / task-detail.js
  const SEMENTE = [
    { id: 'a1', titulo: 'Revisar Cálculo II — capítulo 4',      cat: 'Estudos',  prioridade: 'urgent',    quando: 'today', data: 'Hoje',         done: false },
    { id: 'a2', titulo: 'Entregar relatório do projeto',          cat: 'Genérico', prioridade: 'urgent',    quando: 'today', data: 'Hoje',         done: false },
    { id: 'a3', titulo: 'Pagar conta de luz',                     cat: 'Casa',     prioridade: 'important', quando: 'today', data: 'Hoje',         done: false },
    { id: 'a4', titulo: 'Responder e-mail do cliente',            cat: 'Genérico', prioridade: 'important', quando: 'week',  data: 'Amanhã',       done: false },
    { id: 'a5', titulo: 'Ler artigo de Sistemas Distribuídos',    cat: 'Estudos',  prioridade: 'normal',    quando: 'week',  data: 'Qua, 10 jun',  done: false },
    { id: 'a6', titulo: 'Trocar o filtro de água',                cat: 'Casa',     prioridade: 'normal',    quando: 'past',  data: 'Atrasada',     overdue: true, done: false },
    { id: 'a7', titulo: 'Planejar a próxima semana',              cat: 'Genérico', prioridade: 'low',       quando: 'week',  data: 'Dom, 14 jun',  done: false },
    { id: 'a8', titulo: 'Organizar fotos do celular',             cat: 'Casa',     prioridade: 'low',       quando: 'all',   data: 'Sem data',     done: false },
    { id: 'a9', titulo: 'Caminhada de 30 minutos',                cat: 'Casa',     prioridade: 'normal',    quando: 'today', data: 'Hoje',         done: true  },
  ];

  // cat key → label (URL params usam a chave lowercase do calendário)
  const CAT_FROM_KEY = { estudos: 'Estudos', casa: 'Casa', generico: 'Genérico' };
  // label → cat key (para persistir de volta no objeto task)
  const CAT_TO_KEY   = { 'Estudos': 'estudos', 'Casa': 'casa', 'Genérico': 'generico' };

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
  const tarefas = Storage.ler('todo-tarefas', SEMENTE);
  const tarefa  = taskId ? tarefas.find(t => t.id === taskId) : null;

  // Estado mutável — começa com valores do evento; se tarefa existir usa dela
  let estado = {
    done:      tarefa ? tarefa.done      : false,
    prioridade: tarefa ? tarefa.prioridade : prioEv,
    cat:       tarefa ? tarefa.cat        : (CAT_FROM_KEY[catKey] || 'Genérico'),
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
  const CATS = [
    { key: 'estudos', label: 'Estudos' },
    { key: 'casa',    label: 'Casa'    },
    { key: 'generico', label: 'Genérico' },
  ];

  function renderCat() {
    catPicker.innerHTML = CATS.map(c => `
      <button class="evsum__cat-opt ${estado.cat === c.label ? 'is-on' : ''}" data-cat="${c.label}" type="button">
        <span class="evsum__cat-dot" style="background:var(--color-cat-${c.key})"></span>
        ${c.label}
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
      Storage.gravar('todo-tarefas', tarefas);
    }
    savedHint.classList.add('is-visible');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => savedHint.classList.remove('is-visible'), 2200);
  });

  // Inicializa
  syncDone();
  renderPrio();
  renderCat();
})();
