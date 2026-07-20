(function () {
  var sessao = window.Store && Store.ler('sessao');
  if (!sessao || !sessao.accessToken) {
    window.location.replace('../auth/login.html');
  }
})();
