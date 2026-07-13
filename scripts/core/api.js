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

  // Se o token expirar, tenta renovar (1 vez)
  var _renovando = false;
  var _fila = [];

  function _tratarResposta(res) {
    if (!res.ok) {
      return res.json().then(
        // 👇 NOVO: Adiciona o status da resposta HTTP para o catch poder avaliar (ex: 400)
        function (err) { return Promise.reject(Object.assign({}, err, { status: res.status })); },
        function ()    { return Promise.reject({ error: 'Erro ' + res.status, status: res.status }); }
      );
    }
    if (res.status === 204) return null;
    return res.json().catch(function () { return null; });
  }

  function request(method, url, body, customHeaders) {
    var sessao = _lerSessao();
    var headers = Object.assign({ 'Content-Type': 'application/json' }, customHeaders);
    if (sessao && sessao.accessToken) headers['Authorization'] = 'Bearer ' + sessao.accessToken;

    var config = { method: method, headers: headers };
    if (body) config.body = JSON.stringify(body);

    return fetch(url, config).then(function (res) {
      if (res.status === 401 && sessao && sessao.refreshToken && !_renovando) {
        _renovando = true;
        return fetch(SVC.auth + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessao.refreshToken })
        })
          .then(function (r) { return r.json(); })
          .then(function (tokens) {
            _gravarSessao({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
            _renovando = false;
            _fila.forEach(function (cb) { cb(tokens.accessToken); });
            _fila = [];
            headers['Authorization'] = 'Bearer ' + tokens.accessToken;
            return fetch(url, config).then(_tratarResposta);
          })
          .catch(function () {
            _limparSessao();
            _renovando = false;
            window.location.replace('../auth/login.html');
            return Promise.reject('Sessão expirada');
          });
      }

      if (res.status === 401 && _renovando) {
        return new Promise(function (resolve) {
          _fila.push(function (novoToken) {
            headers['Authorization'] = 'Bearer ' + novoToken;
            resolve(fetch(url, config).then(_tratarResposta));
          });
        });
      }

      return _tratarResposta(res);
    });
  }

  // ─── Endpoints Catalog ────────────────────────────────────────────────────────

  var ENDPOINTS = {
    // ── auth.html / login.html / register.html ───────────────────────────────
    auth: {
      login:    SVC.auth + '/auth/login',
      register: SVC.auth + '/auth/register',
      check:    function (email) { return SVC.auth + '/auth/check?email=' + encodeURIComponent(email); },
      profile:  {
        get:    SVC.auth + '/users/profile',
        update: SVC.auth + '/users/profile',
      }
    },

    // ── todo.html / task-detail.html / dashboard.html ────────────────────────
    tasks: {
      list:   SVC.tasks + '/tasks',
      create: SVC.tasks + '/tasks',
      update: function (id) { return SVC.tasks + '/tasks/' + id; },
      remove: function (id) { return SVC.tasks + '/tasks/' + id; },
      complete: function (id) { return SVC.tasks + '/tasks/' + id + '/complete'; },
      reopen:   function (id) { return SVC.tasks + '/tasks/' + id + '/reopen'; },
    },

    // ── calendar.html / weekly-plan.html / day-plan.html ─────────────────────
    schedule: {
      week:   function (date)      { return SVC.sched + '/weekly-plans?date=' + date; },
      blocks: function (date)      { return SVC.sched + '/time-blocks?date=' + date; },
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
    
    // Auth local helpers
    getToken: function () { var s = _lerSessao(); return s ? s.accessToken : null; },
    logout:   function () { _limparSessao(); window.location.replace('../auth/login.html'); }
  };

  window.Api = Api;
})();