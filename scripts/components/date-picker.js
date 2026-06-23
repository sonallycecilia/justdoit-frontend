/* ============================================================
   JustDoIt — components/date-picker.js
   Calendário dropdown reutilizável (classes .date-pick__*).
   Depende de core/utils.js (Utils.hoje, Utils.MESES_LONGOS).

   Uso:
     const picker = DatePicker.criar({
       container:      el,            // wrapper posicionado (.date-pick)
       botao:          btn,           // gatilho; recebe .is-open quando aberto
       selecionada:    new Date(),    // data inicial (opcional)
       modoNascimento: true,          // ativa navegação ano→mês→dia
       onSelect:       (d) => {...},  // chamado ao escolher um dia
     });
     picker.selecionada()          // Date atual
     picker.fechar()
   ============================================================ */
const DatePicker = (function () {
  'use strict';

  function criar({ container, botao, selecionada, onSelect, modoNascimento }) {
    const hoje = Utils.hoje();
    let dataSel = selecionada ? new Date(selecionada) : new Date(hoje);
    let aberto = false;
    let view = { year: dataSel.getFullYear(), month: dataSel.getMonth() };
    let viewMode = 'dias'; // 'anos' | 'meses' | 'dias'

    const svgLeft  = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    const svgRight = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

    function fechar() {
      aberto = false;
      botao.classList.remove('is-open');
      container.querySelectorAll('.date-pick__overlay, .date-pick__menu').forEach(el => el.remove());
    }

    function criarNavBtn(svg, onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-pick__nav';
      btn.innerHTML = svg;
      btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
      return btn;
    }

    function render() {
      container.querySelectorAll('.date-pick__overlay, .date-pick__menu').forEach(el => el.remove());

      const overlay = document.createElement('div');
      overlay.className = 'date-pick__overlay';
      overlay.addEventListener('click', fechar);
      container.appendChild(overlay);

      const menu = document.createElement('div');
      menu.className = 'date-pick__menu';

      if (viewMode === 'anos') renderAnos(menu);
      else if (viewMode === 'meses') renderMeses(menu);
      else renderDias(menu);

      container.appendChild(menu);
    }

    function renderAnos(menu) {
      const anoAtual = hoje.getFullYear();
      const anoMin = anoAtual - 100;

      const head = document.createElement('div');
      head.className = 'date-pick__head';
      const label = document.createElement('span');
      label.className = 'date-pick__month';
      label.textContent = 'Selecionar ano';
      head.appendChild(label);
      menu.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'date-pick__years-grid';

      let selectedBtn = null;
      for (let y = anoAtual; y >= anoMin; y--) {
        const isOn = y === view.year;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-pick__year-btn' + (isOn ? ' is-on' : '');
        btn.textContent = y;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          view.year = y;
          viewMode = 'meses';
          render();
        });
        grid.appendChild(btn);
        if (isOn) selectedBtn = btn;
      }

      menu.appendChild(grid);

      if (selectedBtn) {
        requestAnimationFrame(() => selectedBtn.scrollIntoView({ block: 'center' }));
      }
    }

    function renderMeses(menu) {
      const head = document.createElement('div');
      head.className = 'date-pick__head';
      head.appendChild(criarNavBtn(svgLeft, () => { viewMode = 'anos'; render(); }));

      const label = document.createElement('span');
      label.className = 'date-pick__month date-pick__month--link';
      label.textContent = view.year;
      label.addEventListener('click', e => { e.stopPropagation(); viewMode = 'anos'; render(); });
      head.appendChild(label);
      menu.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'date-pick__months-grid';

      Utils.MESES_LONGOS.forEach((nome, idx) => {
        const isOn = idx === view.month;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-pick__month-btn' + (isOn ? ' is-on' : '');
        btn.textContent = nome.substring(0, 3);
        btn.addEventListener('click', e => {
          e.stopPropagation();
          view.month = idx;
          viewMode = 'dias';
          render();
        });
        grid.appendChild(btn);
      });

      menu.appendChild(grid);
    }

    function renderDias(menu) {
      const { year, month } = view;
      const firstDow  = new Date(year, month, 1).getDay();
      const totalDias = new Date(year, month + 1, 0).getDate();

      const head = document.createElement('div');
      head.className = 'date-pick__head';

      if (modoNascimento) {
        head.appendChild(criarNavBtn(svgLeft, () => { viewMode = 'meses'; render(); }));
      } else {
        head.appendChild(criarNavBtn(svgLeft, () => {
          view = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
          render();
        }));
      }

      const monthLabel = document.createElement('span');
      monthLabel.className = 'date-pick__month' + (modoNascimento ? ' date-pick__month--link' : '');
      monthLabel.textContent = Utils.MESES_LONGOS[month] + ' ' + year;
      if (modoNascimento) {
        monthLabel.addEventListener('click', e => { e.stopPropagation(); viewMode = 'meses'; render(); });
      }
      head.appendChild(monthLabel);

      if (!modoNascimento) {
        head.appendChild(criarNavBtn(svgRight, () => {
          view = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
          render();
        }));
      }

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
    }

    botao.addEventListener('click', e => {
      e.stopPropagation();
      if (aberto) { fechar(); return; }
      aberto = true;
      view = { year: dataSel.getFullYear(), month: dataSel.getMonth() };
      viewMode = modoNascimento ? 'anos' : 'dias';
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
