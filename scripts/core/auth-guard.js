(function () {
  var sessao = window.Storage && Storage.ler('sessao');
  if (!sessao || !sessao.token) {
    window.location.replace('../auth/login.html');
  }
})();
