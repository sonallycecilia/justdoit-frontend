(function () {
  'use strict';
  lucide.createIcons();

  document.getElementById('themeToggle').addEventListener('click', function () {
    var r = document.documentElement;
    var dark = r.getAttribute('data-theme') === 'dark';
    r.setAttribute('data-theme', dark ? 'light' : 'dark');
    localStorage.setItem('jdi.tema', dark ? 'light' : 'dark');
  });

  var overlay = document.getElementById('recursosOverlay');

  function openRecursos(e) {
    e.preventDefault();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeRecursos() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.getElementById('recursosBtn').addEventListener('click', openRecursos);
  document.getElementById('recursosClose').addEventListener('click', closeRecursos);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeRecursos();
  });

  var sobreOverlay = document.getElementById('sobreOverlay');

  function openSobre(e) {
    e.preventDefault();
    sobreOverlay.classList.add('is-open');
    sobreOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSobre() {
    sobreOverlay.classList.remove('is-open');
    sobreOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.getElementById('sobreBtn').addEventListener('click', openSobre);
  document.getElementById('sobreClose').addEventListener('click', closeSobre);

  sobreOverlay.addEventListener('click', function (e) {
    if (e.target === sobreOverlay) closeSobre();
  });

  document.getElementById('loginBtn').addEventListener('click', function () {
    location.href = 'pages/auth/login.html';
  });

  document.getElementById('signupBtn').addEventListener('click', function () {
    location.href = 'pages/auth/signup.html';
  });

  var mockChecks = document.querySelectorAll('.mkt-mock__check');
  var progressFill = document.querySelector('.progress__fill');
  var progressValue = document.querySelector('.progress__value');

  function updateMockProgress() {
    var total = mockChecks.length;
    var done = 0;
    for (var i = 0; i < mockChecks.length; i++) { if (mockChecks[i].checked) done++; }
    var pct = Math.round((done / total) * 100);
    progressFill.style.width = pct + '%';
    progressValue.textContent = pct + '%';
  }

  mockChecks.forEach(function (check) {
    check.addEventListener('change', function () {
      var label = this.closest('.mkt-mock__row').querySelector('.mkt-mock__t');
      label.classList.toggle('mkt-mock__t--done', this.checked);
      updateMockProgress();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (overlay.classList.contains('is-open')) closeRecursos();
      if (sobreOverlay.classList.contains('is-open')) closeSobre();
    }
  });
})();
