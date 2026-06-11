/* ============================================================
   JustDoIt — components/date-picker.js
   Calendário dropdown reutilizável (classes .date-pick__*).
   Depende de core/utils.js (Utils.hoje, Utils.MESES_LONGOS).

   Uso:
     const picker = DatePicker.criar({
       container:   el,            // wrapper posicionado (.date-pick)
       botao:       btn,           // gatilho; recebe .is-open quando aberto
       selecionada: new Date(),    // data inicial (opcional)
       onSelect:    (d) => {...},  // chamado ao escolher um dia
     });
     picker.selecionada()          // Date atual
     picker.fechar()
   ============================================================ */
const DatePicker = (function () {
  'use strict';

  function criar({ container, botao, selecionada, onSelect }) {
    const hoje = Utils.hoje();
    let dataSel = selecionada ? new Date(selecionada) : new Date(hoje);
    let aberto = false;
    let view = { year: dataSel.getFullYear(), month: dataSel.getMonth() };

    function fechar() {
      aberto = false;
      botao.classList.remove('is-open');
      container.querySelectorAll('.date-pick__overlay, .date-pick__menu').forEach(el => el.remove());
    }

    function render() {
      container.querySelectorAll('.date-pick__overlay, .date-pick__menu').forEach(el => el.remove());

      const overlay = document.createElement('div');
      overlay.className = 'date-pick__overlay';
      overlay.addEventListener('click', fechar);
      container.appendChild(overlay);

      const { year, month } = view;
      const firstDow  = new Date(year, month, 1).getDay();
      const totalDias = new Date(year, month + 1, 0).getDate();

      const menu = document.createElement('div');
      menu.className = 'date-pick__menu';

      const head = document.createElement('div');
      head.className = 'date-pick__head';

      const btnPrev = document.createElement('button');
      btnPrev.type = 'button';
      btnPrev.className = 'date-pick__nav';
      btnPrev.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
      btnPrev.addEventListener('click', e => {
        e.stopPropagation();
        view = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
        render();
      });

      const btnNext = document.createElement('button');
      btnNext.type = 'button';
      btnNext.className = 'date-pick__nav';
      btnNext.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
      btnNext.addEventListener('click', e => {
        e.stopPropagation();
        view = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
        render();
      });

      const monthLabel = document.createElement('span');
      monthLabel.className = 'date-pick__month';
      monthLabel.textContent = Utils.MESES_LONGOS[month] + ' ' + year;

      head.appendChild(btnPrev);
      head.appendChild(monthLabel);
      head.appendChild(btnNext);
      menu.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'date-pick__grid';

      ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(l => {
        const el = document.createElement('div');
        el.className = 'date-pick__dow';
        el.textContent = l;
        grid.appendChild(el);
      });

      for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement('div'));

      for (let d = 1; d <= totalDias; d++) {
        const date    = new Date(year, month, d);
        const isToday = date.toDateString() === hoje.toDateString();
        const isOn    = date.toDateString() === dataSel.toDateString();

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-pick__day' + (isToday ? ' is-today' : '') + (isOn ? ' is-on' : '');
        btn.textContent = d;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          dataSel = new Date(year, month, d);
          fechar();
          if (onSelect) onSelect(new Date(dataSel));
        });
        grid.appendChild(btn);
      }

      menu.appendChild(grid);
      container.appendChild(menu);
    }

    botao.addEventListener('click', e => {
      e.stopPropagation();
      if (aberto) { fechar(); return; }
      aberto = true;
      view = { year: dataSel.getFullYear(), month: dataSel.getMonth() };
      botao.classList.add('is-open');
      render();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && aberto) fechar();
    });

    return { fechar, selecionada: () => new Date(dataSel) };
  }

  return { criar };
})();

window.DatePicker = DatePicker;
