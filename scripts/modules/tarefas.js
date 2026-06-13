/* ============================================================
   JustDoIt — modules/tarefas.js
   Fonte única dos dados de tarefas: semente offline + acesso
   ao Storage ('todo-tarefas'). Depende de core/storage.js.
   ============================================================ */
const Tarefas = (function () {
  'use strict';

  const KEY = Storage.KEYS.TAREFAS;

  // Semente — em produção viria da API/Storage
  const SEMENTE = [
    { id: 'a1', titulo: 'Revisar Cálculo II — capítulo 4',     cat: 'Estudos',  prioridade: 'urgent',    quando: 'today', data: 'Hoje',        done: false },
    { id: 'a2', titulo: 'Entregar relatório do projeto',         cat: 'Genérico', prioridade: 'urgent',    quando: 'today', data: 'Hoje',        done: false },
    { id: 'a3', titulo: 'Pagar conta de luz',                    cat: 'Casa',     prioridade: 'important', quando: 'today', data: 'Hoje',        done: false },
    { id: 'a4', titulo: 'Responder e-mail do cliente',           cat: 'Genérico', prioridade: 'important', quando: 'week',  data: 'Amanhã',      done: false },
    { id: 'a5', titulo: 'Ler artigo de Sistemas Distribuídos',   cat: 'Estudos',  prioridade: 'normal',    quando: 'week',  data: 'Qua, 10 jun', done: false },
    { id: 'a6', titulo: 'Trocar o filtro de água',               cat: 'Casa',     prioridade: 'normal',    quando: 'past',  data: 'Atrasada',    overdue: true, done: false },
    { id: 'a7', titulo: 'Planejar a próxima semana',             cat: 'Genérico', prioridade: 'low',       quando: 'week',  data: 'Dom, 14 jun', done: false },
    { id: 'a8', titulo: 'Organizar fotos do celular',            cat: 'Casa',     prioridade: 'low',       quando: 'all',   data: 'Sem data',    done: false },
    { id: 'a9',  titulo: 'Caminhada de 30 minutos',               cat: 'Casa',     prioridade: 'normal',    quando: 'today', data: 'Hoje',        done: true  },
    { id: 'a10', titulo: 'Academia',                              cat: 'Casa',     prioridade: 'normal',    quando: 'week',  data: 'Amanhã',      done: false },
    { id: 'a11', titulo: 'Reunião de equipe',                     cat: 'Genérico', prioridade: 'important', quando: 'today', data: 'Hoje',        done: false },
    { id: 'a12', titulo: 'Mercado',                               cat: 'Casa',     prioridade: 'normal',    quando: 'week',  data: 'Qua, 10 jun', done: false },
    { id: 'a13', titulo: 'Pomodoro: Algoritmos',                  cat: 'Estudos',  prioridade: 'normal',    quando: 'week',  data: 'Qui, 11 jun', done: false },
    { id: 'a14', titulo: 'Apresentação ao time',                  cat: 'Genérico', prioridade: 'important', quando: 'today', data: 'Hoje',        done: false },
    { id: 'a15', titulo: 'Faxina da semana',                      cat: 'Casa',     prioridade: 'normal',    quando: 'week',  data: 'Sáb, 13 jun', done: false },
  ];

  // Lista completa (Storage ou semente). Garante que tarefas seed
  // nunca sumam do storage — reintegra as que estiverem faltando.
  function listar() {
    const salvas = Storage.ler(KEY, null);
    if (!salvas) return SEMENTE;
    const ids = new Set(salvas.map(t => t.id));
    const faltando = SEMENTE.filter(s => !ids.has(s.id));
    return faltando.length ? salvas.concat(faltando) : salvas;
  }

  function buscar(id) {
    return listar().find(t => t.id === id) || SEMENTE.find(s => s.id === id) || null;
  }

  function salvar(lista) {
    Storage.gravar(KEY, lista);
  }

  // Insere no topo e persiste; retorna a tarefa criada
  function criar(dados) {
    const lista = listar();
    const nova = Object.assign({ id: 't' + Date.now(), done: false }, dados);
    lista.unshift(nova);
    salvar(lista);
    return nova;
  }

  function toggleDone(id) {
    const lista = listar();
    const t = lista.find(x => x.id === id);
    if (t) { t.done = !t.done; salvar(lista); }
  }

  return { listar, buscar, salvar, criar, toggleDone };
})();

window.Tarefas = Tarefas;
