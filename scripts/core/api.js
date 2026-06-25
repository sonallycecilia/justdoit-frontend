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

  // --- Sessao (helpers locais) -------------------------------------------------
  function _lerSessao() { return window.Storage ? Storage.ler('sessao') : null; }
  function _gravarSessao(dados) {
    var atual = _lerSessao() || {};
    if (window.Storage) Storage.gravar('sessao', Object.assign({}, atual, dados));
  }
  function _limparSessao() { if (window.Storage) Storage.remover('sessao'); }
  function _irParaLogin() {
    _limparSessao();
    window.location.replace('../auth/login.html');
  }

  // --- Renovacao de token (refresh) --------------------------------------------
  var _refreshURL = SVC.auth + '/auth/refresh';
  var _refreshing = null; // promessa compartilhada p/ evitar refresh duplicado

  function _refreshTokens() {
    if (_refreshing) return _refreshing;
    var sessao = _lerSessao();
    if (!sessao || !sessao.refreshToken) return Promise.reject({ error: 'no refresh token' });

    _refreshing = fetch(_refreshURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: sessao.refreshToken })
    }).then(function (res) {
      if (!res.ok) return Promise.reject({ error: 'refresh failed' });
      return res.json();
    }).then(function (data) {
      _gravarSessao({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    });

    _refreshing.then(function () { _refreshing = null; }, function () { _refreshing = null; });
    return _refreshing;
  }

  // --- Helper de requisicao ----------------------------------------------------
  function _enviar(method, url, body, accessToken) {
    var headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
    var options = { method: method, headers: headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    return fetch(url, options);
  }

  function _tratarResposta(res) {
    if (!res.ok) {
      return res.json().then(
        function (err) { return Promise.reject(err); },
        function ()    { return Promise.reject({ error: 'Erro ' + res.status }); }
      );
    }
    if (res.status === 204) return null;
    // Alguns endpoints respondem 200/201 com corpo vazio (ex.: criar com só
    // Location, ou ações sem retorno). res.json() quebraria com "Unexpected end
    // of JSON input"; por isso lemos como texto e só parseamos se houver corpo.
    return res.text().then(function (txt) {
      return txt ? JSON.parse(txt) : null;
    });
  }

  function request(method, url, body) {
    var sessao = _lerSessao();
    var accessToken = sessao && sessao.accessToken;

    return _enviar(method, url, body, accessToken).then(function (res) {
      // Token expirado/ausente: o backend responde 401 ou 403. Renova 1x e refaz.
      var podeRenovar = (res.status === 401 || res.status === 403)
                        && sessao && sessao.refreshToken
                        && url !== _refreshURL;
      if (!podeRenovar) return _tratarResposta(res);

      return _refreshTokens().then(
        function (novoAccess) {
          // Refresh OK: refaz a requisição original. Se ela ainda falhar (ex.: 403
          // de rota proibida/inexistente), apenas propaga o erro — NÃO desloga.
          return _enviar(method, url, body, novoAccess).then(_tratarResposta);
        },
        function (e) {
          // Só aqui o refresh em si falhou (refresh token inválido/expirado): a
          // sessão acabou de verdade, então volta pro login.
          _irParaLogin();
          return Promise.reject(e);
        }
      );
    });
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────────

  var ENDPOINTS = {

    // ── login.html / signup.html ──────────────────────────────────────────────
    auth: {
      login:    SVC.auth + '/auth/login',
      register: SVC.auth + '/auth/register',
      refresh:  SVC.auth + '/auth/refresh',
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
      reopen:   function (id) { return SVC.tasks + '/tasks/' + id + '/reopen'; },

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
    // O schedule-service expõe os blocos de tempo em /time-blocks. A listagem é
    // por dia (?date=YYYY-MM-DD); o calendário busca os 7 dias da semana visível.
    timeBlocks: {
      list:   function (date)      { return SVC.sched + '/time-blocks?date=' + date; },
      range:  function (from, to)  { return SVC.sched + '/time-blocks?from=' + from + '&to=' + to; },
      create: SVC.sched + '/time-blocks',
      update: function (id) { return SVC.sched + '/time-blocks/' + id; },
      remove: function (id) { return SVC.sched + '/time-blocks/' + id; },
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
