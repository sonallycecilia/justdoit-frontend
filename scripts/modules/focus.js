/* ============================================================
   JustDoIt — modules/focus.js  (RF06)
   Mecanismo de foco / Pomodoro. Alterna foco ↔ pausa em ciclos,
   conta regressivamente e avança o número do ciclo.
   ============================================================ */
const Focus = (function () {
  function criar({ focoMin = 25, pausaMin = 5, ciclos = 4, onTick, onFase } = {}) {
    let fase = 'foco';          // 'foco' | 'pausa'
    let ciclo = 1;
    let restante = focoMin * 60;
    let rodando = false;
    let handle = null;

    function duracaoFase() { return (fase === 'foco' ? focoMin : pausaMin) * 60; }

    function tick() {
      if (restante > 0) {
        restante -= 1;
        if (onTick) onTick(restante, duracaoFase());
        return;
      }
      // troca de fase
      if (fase === 'foco') {
        fase = 'pausa';
        restante = pausaMin * 60;
      } else {
        fase = 'foco';
        ciclo = Math.min(ciclo + 1, ciclos);
        restante = focoMin * 60;
      }
      if (onFase) onFase(fase, ciclo);
      if (onTick) onTick(restante, duracaoFase());
    }

    function play() { if (!rodando) { rodando = true; handle = setInterval(tick, 1000); } }
    function pause() { rodando = false; clearInterval(handle); }
    function toggle() { rodando ? pause() : play(); return rodando; }
    function pular() {
      restante = 0; tick();
    }
    function reset() {
      pause(); fase = 'foco'; ciclo = 1; restante = focoMin * 60;
      if (onFase) onFase(fase, ciclo);
      if (onTick) onTick(restante, duracaoFase());
    }

    function estado() { return { fase, ciclo, restante, rodando, ciclos, duracaoFase: duracaoFase() }; }

    return { play, pause, toggle, pular, reset, estado };
  }

  function formatar(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { criar, formatar };
})();

window.Focus = Focus;
