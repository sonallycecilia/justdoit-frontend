/* ============================================================
   JustDoIt — modules/timer.js  (RF13)
   Cronômetro de execução de uma tarefa. Conta tempo real
   gasto (play/pause/reset) e reporta via callback onTick.
   ============================================================ */
const TaskTimer = (function () {
  function criar({ onTick, inicial = 0 } = {}) {
    let segundos = inicial;
    let rodando = false;
    let handle = null;

    function tick() {
      segundos += 1;
      if (onTick) onTick(segundos);
    }
    function play() {
      if (rodando) return;
      rodando = true;
      handle = setInterval(tick, 1000);
    }
    function pause() {
      rodando = false;
      clearInterval(handle);
    }
    function toggle() { rodando ? pause() : play(); return rodando; }
    function reset() { pause(); segundos = 0; if (onTick) onTick(0); }
    function estaRodando() { return rodando; }
    function valor() { return segundos; }

    return { play, pause, toggle, reset, estaRodando, valor };
  }

  // Formata segundos → "01:23:45" ou "23:45"
  function formatar(seg) {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  return { criar, formatar };
})();

window.TaskTimer = TaskTimer;
