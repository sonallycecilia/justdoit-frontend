/* ============================================================
   JustDoIt — components/time-picker.js
   Seletor de hora dropdown reutilizável (.time-pick__*).

   Uso:
     const picker = TimePicker.criar({
       container,            // wrapper .time-pick
       botao,                // botão gatilho (.time-pick__btn)
       chip,                 // <span> do rótulo dentro do botão
       hora:     null,       // hora inicial (0-23) ou null
       min:      0,          // minuto inicial
       onSelect: (h, m) => {},
       onClear:  ()      => {},
     });
     picker.fechar()
     picker.valor()    // → { hora: number|null, min: number }
   ============================================================ */
const TimePicker = (function () {
  'use strict';

  function criar({ container, botao, chip, hora: horaInicial = null, min: minInicial = 0, onSelect, onClear }) {
    let selectedHour = horaInicial;
    let selectedMin  = minInicial;

    function fmt(n) { return String(n).padStart(2, '0'); }

    function atualizarBotao() {
      if (selectedHour !== null) {
        chip.textContent = fmt(selectedHour) + ':' + fmt(selectedMin);
        botao.removeAttribute('data-empty');
      } else {
        chip.textContent = 'Hora';
        botao.setAttribute('data-empty', '');
      }
    }

    function fechar() {
      botao.classList.remove('is-open');
      container.querySelectorAll('.time-pick__overlay, .time-pick__menu').forEach(el => el.remove());
    }

    function abrir() {
      const overlay = document.createElement('div');
      overlay.className = 'time-pick__overlay';
      overlay.addEventListener('click', fechar);

      const menu = document.createElement('div');
      menu.className = 'time-pick__menu';

      const hoursLabel = document.createElement('div');
      hoursLabel.className = 'time-pick__section-label';
      hoursLabel.textContent = 'Hora';

      const hoursGrid = document.createElement('div');
      hoursGrid.className = 'time-pick__hours';

      for (let h = 0; h < 24; h++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-pick__hour' + (h === selectedHour ? ' is-on' : '');
        btn.textContent = fmt(h);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedHour = h;
          hoursGrid.querySelectorAll('.time-pick__hour').forEach(b => b.classList.remove('is-on'));
          btn.classList.add('is-on');
          atualizarBotao();
          if (onSelect) onSelect(selectedHour, selectedMin);
        });
        hoursGrid.appendChild(btn);
      }

      const minsLabel = document.createElement('div');
      minsLabel.className = 'time-pick__section-label';
      minsLabel.style.marginTop = '4px';
      minsLabel.textContent = 'Minuto';

      const minsRow = document.createElement('div');
      minsRow.className = 'time-pick__mins';

      [0, 15, 30, 45].forEach(m => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-pick__min' + (m === selectedMin ? ' is-on' : '');
        btn.textContent = ':' + fmt(m);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedMin = m;
          minsRow.querySelectorAll('.time-pick__min').forEach(b => b.classList.remove('is-on'));
          btn.classList.add('is-on');
          atualizarBotao();
          if (onSelect) onSelect(selectedHour, selectedMin);
        });
        minsRow.appendChild(btn);
      });

      const divider = document.createElement('hr');
      divider.className = 'time-pick__divider';

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'time-pick__clear';
      clearBtn.textContent = 'Remover hora';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedHour = null;
        selectedMin  = 0;
        atualizarBotao();
        fechar();
        if (onClear) onClear();
      });

      menu.appendChild(hoursLabel);
      menu.appendChild(hoursGrid);
      menu.appendChild(minsLabel);
      menu.appendChild(minsRow);
      menu.appendChild(divider);
      menu.appendChild(clearBtn);

      container.appendChild(overlay);
      container.appendChild(menu);
    }

    botao.addEventListener('click', () => {
      if (botao.classList.contains('is-open')) { fechar(); return; }
      botao.classList.add('is-open');
      abrir();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && botao.classList.contains('is-open')) fechar();
    });

    atualizarBotao();

    return {
      fechar,
      valor: () => ({ hora: selectedHour, min: selectedMin }),
    };
  }

  return { criar };
})();

window.TimePicker = TimePicker;
