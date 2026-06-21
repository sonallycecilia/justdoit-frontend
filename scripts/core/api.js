(function () {
  'use strict';

  // ─── Configuração ────────────────────────────────────────────────────────────
  // Em produção (GitHub Pages), todos os serviços são roteados via Nginx no mesmo domínio.
  // Substitua SEU_SUBDOMINIO pelo subdomínio DuckDNS que você registrou.
  var _PROD_API = 'https://justdoitapi.duckdns.org';
  var _isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  var SVC = _isDev
    ? { auth: 'http://localhost:8080', tasks: 'http://localhost:8081', sched: 'http://localhost:8082', notif: 'http://localhost:8083' }
    : { auth: _PROD_API, tasks: _PROD_API, sched: _PROD_API, notif: _PROD_API };

  // ─── Helper de requisição ─────────────────────────────────────────────────────

  function request(method, url, body) {
    var sessao = Storage.ler('sessao');
    var headers = { 'Content-Type': 'application/json' };

    if (sessao && sessao.token) {
      headers['Authorization'] = 'Bearer ' + sessao.token;
    }

    var options = { method: method, headers: headers };
    if (body !== undefined) options.body = JSON.stringify(body);

    return fetch(url, options).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { return Promise.reject(err); });
      if (res.status === 204) return null;
      return res.json();
    });
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────────

  var ENDPOINTS = {

    // ── login.html / signup.html ──────────────────────────────────────────────
    auth: {
      login:    SVC.auth + '/auth/login',
      register: SVC.auth + '/auth/register',
      logout:   SVC.auth + '/auth/logout',
      me:       SVC.auth + '/auth/me',
    },

    // ── onboarding.html / settings.html ──────────────────────────────────────
    users: {
      me:          SVC.auth + '/users/me',
      update:      SVC.auth + '/users/me',
      preferences: SVC.auth + '/users/me/preferences',
      onboarding:  SVC.auth + '/users/me/onboarding',
    },

    // ── todo.html / task-detail.html / dashboard.html / calendar.html ─────────
    tasks: {
      list:     SVC.tasks + '/tasks',
      create:   SVC.tasks + '/tasks',
      detail:   function (id) { return SVC.tasks + '/tasks/' + id; },
      update:   function (id) { return SVC.tasks + '/tasks/' + id; },
      remove:   function (id) { return SVC.tasks + '/tasks/' + id; },
      complete: function (id) { return SVC.tasks + '/tasks/' + id + '/complete'; },

      // task-detail.html — módulo Subtarefas
      subtasks: {
        list:   function (taskId)          { return SVC.tasks + '/tasks/' + taskId + '/subtasks'; },
        create: function (taskId)          { return SVC.tasks + '/tasks/' + taskId + '/subtasks'; },
        update: function (taskId, subId)   { return SVC.tasks + '/tasks/' + taskId + '/subtasks/' + subId; },
        remove: function (taskId, subId)   { return SVC.tasks + '/tasks/' + taskId + '/subtasks/' + subId; },
      },

      // task-detail.html — módulo Notas
      notes: {
        get:    function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/notes'; },
        update: function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/notes'; },
      },

      // task-detail.html — módulo Foco (Pomodoro)
      pomodoro: {
        get:    function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/pomodoro'; },
        update: function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/pomodoro'; },
      },

      // task-detail.html — módulo Ciclo (Recorrência)
      cycle: {
        get:    function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/cycle'; },
        update: function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/cycle'; },
      },

      // task-detail.html — estado dos módulos ativos por tarefa
      modules: {
        get:    function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/modules'; },
        update: function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/modules'; },
      },

      // task-detail.html — módulo Cronômetro de Execução
      timer: {
        get:    function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/timer'; },
        update: function (taskId) { return SVC.tasks + '/tasks/' + taskId + '/timer'; },
      },
    },

    // ── calendar.html / event-summary.html ────────────────────────────────────
    events: {
      list:   SVC.sched + '/events',
      create: SVC.sched + '/events',
      detail: function (id) { return SVC.sched + '/events/' + id; },
      update: function (id) { return SVC.sched + '/events/' + id; },
      remove: function (id) { return SVC.sched + '/events/' + id; },
    },

    // ── todo.html / onboarding.html / settings.html / task-detail.html ────────
    categories: {
      list:   SVC.tasks + '/categories',
      create: SVC.tasks + '/categories',
      update: function (id) { return SVC.tasks + '/categories/' + id; },
      remove: function (id) { return SVC.tasks + '/categories/' + id; },
    },

    // ── analytics.html / dashboard.html ──────────────────────────────────────
    analytics: {
      weekly:     SVC.sched + '/analytics/weekly',
      categories: SVC.tasks + '/analytics/categories',
    },
  };

  // ─── Métodos públicos ─────────────────────────────────────────────────────────

  var Api = {
    svc: SVC,
    endpoints: ENDPOINTS,

    get:    function (url)        { return request('GET',    url); },
    post:   function (url, body)  { return request('POST',   url, body); },
    put:    function (url, body)  { return request('PUT',    url, body); },
    patch:  function (url, body)  { return request('PATCH',  url, body); },
    remove: function (url)        { return request('DELETE', url); },
  };

  window.Api = Api;
})();
