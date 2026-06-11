/* ============================================================
   JustDoIt — calendar-data.js
   Semente de eventos da semana para o calendário (React island).
   d = índice do dia (0=Seg). ini/fim em horas decimais.
   ============================================================ */
window.CAL_DATA = {
  dias: [
    { dow: 'SEG', num: 8 },
    { dow: 'TER', num: 9 },
    { dow: 'QUA', num: 10 },
    { dow: 'QUI', num: 11, hoje: true },
    { dow: 'SEX', num: 12 },
    { dow: 'SÁB', num: 13 },
    { dow: 'DOM', num: 14 },
  ],
  // prioridade: urgent | important | normal | low
  eventos: [
    { id: 'e1',  d: 0, ini: 8,    fim: 9.5,  cat: 'estudos',  prio: 'urgent',    titulo: 'Cálculo II — foco',      mod: 'foco',  taskId: 'a1' },
    { id: 'e2',  d: 0, ini: 18,   fim: 19,   cat: 'casa',     prio: 'normal',    titulo: 'Academia',               mod: 'ciclo', taskId: 'a10' },
    { id: 'e3',  d: 1, ini: 10,   fim: 11,   cat: 'generico', prio: 'important', titulo: 'Reunião de equipe',      mod: null,    taskId: 'a11' },
    { id: 'e4',  d: 1, ini: 14,   fim: 15,   cat: 'estudos',  prio: 'normal',    titulo: 'Leitura — Sistemas',     mod: 'notas', taskId: 'a5' },
    { id: 'e5',  d: 2, ini: 9,    fim: 10.5, cat: 'generico', prio: 'urgent',    titulo: 'Entrega do relatório',   mod: 'tempo', taskId: 'a2' },
    { id: 'e6',  d: 2, ini: 19,   fim: 20,   cat: 'casa',     prio: 'normal',    titulo: 'Mercado',                mod: 'ciclo', taskId: 'a12' },
    { id: 'e7',  d: 3, ini: 8.5,  fim: 10,   cat: 'estudos',  prio: 'urgent',    titulo: 'Revisar Cálculo II',     mod: 'foco',  taskId: 'a1' },
    { id: 'e8',  d: 3, ini: 11,   fim: 11.5, cat: 'generico', prio: 'important', titulo: 'Responder cliente',      mod: null,    taskId: 'a4' },
    { id: 'e9',  d: 3, ini: 15,   fim: 16.5, cat: 'estudos',  prio: 'normal',    titulo: 'Pomodoro: Algoritmos',   mod: 'foco',  taskId: 'a13' },
    { id: 'e10', d: 4, ini: 9,    fim: 9.5,  cat: 'casa',     prio: 'important', titulo: 'Pagar conta de luz',     mod: 'ciclo', taskId: 'a3' },
    { id: 'e11', d: 4, ini: 14,   fim: 15,   cat: 'generico', prio: 'important', titulo: 'Apresentação ao time',   mod: null,    taskId: 'a14' },
    { id: 'e12', d: 5, ini: 10,   fim: 12,   cat: 'casa',     prio: 'normal',    titulo: 'Faxina da semana',       mod: 'ciclo', taskId: 'a15' },
    { id: 'e13', d: 6, ini: 19,   fim: 20,   cat: 'estudos',  prio: 'low',       titulo: 'Planejar a semana',      mod: 'notas', taskId: 'a7' },
  ],
};

// Sobrescreve ini/fim dos eventos quando a tarefa linkada tem hora definida
(function () {
  if (typeof Tarefas === 'undefined') return;
  var tarefas = Tarefas.listar();
  window.CAL_DATA.eventos.forEach(function (ev) {
    if (!ev.taskId) return;
    var t = tarefas.find(function (x) { return x.id === ev.taskId; });
    if (!t || !t.hora) return;
    var partes = t.hora.split(':').map(Number);
    var novoIni = partes[0] + partes[1] / 60;
    var dur = ev.fim - ev.ini;
    ev.ini = novoIni;
    ev.fim = Math.round((novoIni + dur) * 2) / 2;
  });
}());
