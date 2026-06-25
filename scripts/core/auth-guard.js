(function () {
  var sessao = window.Storage && Storage.ler('sessao');
  if (!sessao || !sessao.accessToken) {
    window.location.replace('../auth/login.html');
  }
})();
