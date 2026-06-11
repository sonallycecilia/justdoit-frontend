(function () {
  'use strict';

  // ─── Configuração ────────────────────────────────────────────────────────────

  var BASE_URL = 'https://api.justdoit.app/v1';

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
      login:    BASE_URL + '/auth/login',
      register: BASE_URL + '/auth/register',
      logout:   BASE_URL + '/auth/logout',
      me:       BASE_URL + '/auth/me',
    },

    // ── onboarding.html / settings.html ──────────────────────────────────────
    users: {
      me:          BASE_URL + '/users/me',
      update:      BASE_URL + '/users/me',
      preferences: BASE_URL + '/users/me/preferences',
      onboarding:  BASE_URL + '/users/me/onboarding',
    },

    // ── todo.html / task-detail.html / dashboard.html / calendar.html ─────────
    tasks: {
      list:     BASE_URL + '/tasks',
      create:   BASE_URL + '/tasks',
      detail:   function (id) { return BASE_URL + '/tasks/' + id; },
      update:   function (id) { return BASE_URL + '/tasks/' + id; },
      remove:   function (id) { return BASE_URL + '/tasks/' + id; },
      complete: function (id) { return BASE_URL + '/tasks/' + id + '/complete'; },

      // task-detail.html — módulo Subtarefas
      subtasks: {
        list:   function (taskId)          { return BASE_URL + '/tasks/' + taskId + '/subtasks'; },
        create: function (taskId)          { return BASE_URL + '/tasks/' + taskId + '/subtasks'; },
        update: function (taskId, subId)   { return BASE_URL + '/tasks/' + taskId + '/subtasks/' + subId; },
        remove: function (taskId, subId)   { return BASE_URL + '/tasks/' + taskId + '/subtasks/' + subId; },
      },

      // task-detail.html — módulo Notas
      notes: {
        get:    function (taskId) { return BASE_URL + '/tasks/' + taskId + '/notes'; },
        update: function (taskId) { return BASE_URL + '/tasks/' + taskId + '/notes'; },
      },

      // task-detail.html — módulo Foco (Pomodoro)
      pomodoro: {
        get:    function (taskId) { return BASE_URL + '/tasks/' + taskId + '/pomodoro'; },
        update: function (taskId) { return BASE_URL + '/tasks/' + taskId + '/pomodoro'; },
      },

      // task-detail.html — módulo Ciclo (Recorrência)
      cycle: {
        get:    function (taskId) { return BASE_URL + '/tasks/' + taskId + '/cycle'; },
        update: function (taskId) { return BASE_URL + '/tasks/' + taskId + '/cycle'; },
      },

      // task-detail.html — estado dos módulos ativos por tarefa
      modules: {
        get:    function (taskId) { return BASE_URL + '/tasks/' + taskId + '/modules'; },
        update: function (taskId) { return BASE_URL + '/tasks/' + taskId + '/modules'; },
      },

      // task-detail.html — módulo Cronômetro de Execução
      timer: {
        get:    function (taskId) { return BASE_URL + '/tasks/' + taskId + '/timer'; },
        update: function (taskId) { return BASE_URL + '/tasks/' + taskId + '/timer'; },
      },
    },

    // ── calendar.html / event-summary.html ────────────────────────────────────
    events: {
      list:   BASE_URL + '/events',
      create: BASE_URL + '/events',
      detail: function (id) { return BASE_URL + '/events/' + id; },
      update: function (id) { return BASE_URL + '/events/' + id; },
      remove: function (id) { return BASE_URL + '/events/' + id; },
    },

    // ── todo.html / onboarding.html / settings.html / task-detail.html ────────
    categories: {
      list:   BASE_URL + '/categories',
      create: BASE_URL + '/categories',
      update: function (id) { return BASE_URL + '/categories/' + id; },
      remove: function (id) { return BASE_URL + '/categories/' + id; },
    },

    // ── analytics.html / dashboard.html ──────────────────────────────────────
    analytics: {
      weekly:     BASE_URL + '/analytics/weekly',
      categories: BASE_URL + '/analytics/categories',
    },
  };

  // ─── Métodos públicos ─────────────────────────────────────────────────────────

  var Api = {
    BASE_URL: BASE_URL,
    endpoints: ENDPOINTS,

    get:    function (url)        { return request('GET',    url); },
    post:   function (url, body)  { return request('POST',   url, body); },
    put:    function (url, body)  { return request('PUT',    url, body); },
    patch:  function (url, body)  { return request('PATCH',  url, body); },
    remove: function (url)        { return request('DELETE', url); },
  };

  window.Api = Api;
})();
