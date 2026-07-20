/* ============================================================
   JustDoIt — features/notes/notes.js
   Aba "Anotações": lista todas as notas do usuário (fixada primeiro),
   com fixar, editar e excluir. O compositor do topo é cuidado por
   components/note-composer.js; aqui só reagimos a 'notas:atualizadas'.

   Fonte da verdade = backend (/notes). Notas.* faz as chamadas e
   mantém o cache local; esta camada só desenha e liga os botões.
   ============================================================ */
(function () {
  'use strict';

  const lista   = document.getElementById('notesList');
  const countEl = document.getElementById('notesCount');

  // Enquanto uma nota está em edição, seguramos o re-render automático para não
  // descartar o formulário aberto (a própria gravação reabre a lista depois).
  let editandoId = null;

  function ico(p) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }

  // Escape central de core/utils.js (mesma função usada nas outras telas).
  const escapar = Utils.esc;

  function formatarData(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hh  = String(d.getHours()).padStart(2, '0');
    const mm  = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()} ${hh}:${mm}`;
  }

  // Título exibido: o próprio título, ou a 1ª linha não vazia do conteúdo.
  function tituloDe(n) {
    if (n.titulo && n.titulo.trim()) return n.titulo.trim();
    const linha = (n.conteudo || '').split('\n').map(function (l) { return l.trim(); }).find(Boolean);
    return linha || 'Sem título';
  }

  const ICO = {
    pin:   '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    edit:  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    del:   '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  };

  function cardHtml(n) {
    const fixada = n.fixada ? ' note-card--pinned' : '';
    const data = formatarData(n.atualizadaEm || n.criadaEm);
    return `
      <article class="note-card${fixada}" data-id="${escapar(n.id)}">
        <div class="note-card__top">
          <h3 class="note-card__title">${escapar(tituloDe(n))}</h3>
          ${n.fixada ? `<span class="note-card__pin-badge">${ico(ICO.pin)}Fixada</span>` : ''}
        </div>
        ${n.conteudo ? `<p class="note-card__body">${escapar(n.conteudo)}</p>` : ''}
        <div class="note-card__foot">
          <span class="note-card__date">${data}</span>
          <div class="note-card__actions">
            <button class="note-act ${n.fixada ? 'is-on' : ''}" data-pin title="${n.fixada ? 'Desafixar' : 'Fixar no topo'}" aria-label="Fixar">${ico(ICO.pin)}</button>
            <button class="note-act" data-edit title="Editar" aria-label="Editar">${ico(ICO.edit)}</button>
            <button class="note-act note-act--danger" data-del title="Excluir" aria-label="Excluir">${ico(ICO.del)}</button>
          </div>
        </div>
      </article>`;
  }

  function editHtml(n) {
    return `
      <article class="note-card note-card--editing" data-id="${escapar(n.id)}">
        <input class="note-edit__title" type="text" maxlength="255" placeholder="Título (opcional)" value="${escapar(n.titulo)}">
        <textarea class="note-edit__body" maxlength="10000" placeholder="Conteúdo…">${escapar(n.conteudo)}</textarea>
        <div class="note-edit__actions">
          <button class="btn btn--secondary btn--sm" data-cancel type="button">Cancelar</button>
          <button class="btn btn--primary btn--sm" data-save type="button">Salvar</button>
        </div>
      </article>`;
  }

  function confirmHtml(n) {
    return `
      <article class="note-card note-card--confirming" data-id="${escapar(n.id)}">
        <p class="note-confirm__msg">Excluir esta anotação? Não dá para desfazer.</p>
        <div class="note-edit__actions">
          <button class="btn btn--secondary btn--sm" data-cancel type="button">Cancelar</button>
          <button class="btn btn--danger btn--sm" data-del-confirm type="button">Excluir</button>
        </div>
      </article>`;
  }

  function pintar() {
    const notas = Notas.listar();
    countEl.textContent = notas.length;

    if (!notas.length) {
      lista.innerHTML = `<div class="empty">${ico('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>')}<p>Nenhuma anotação ainda — comece pelo bloco acima.</p></div>`;
      return;
    }
    lista.innerHTML = notas.map(cardHtml).join('');
  }

  // Troca o conteúdo de um card por um bloco (edição/confirmação) sem repintar
  // a lista inteira.
  function substituirCard(id, html) {
    const el = lista.querySelector(`.note-card[data-id="${id}"]`);
    if (el) el.outerHTML = html;
  }

  function abrirEdicao(id) {
    const n = Notas.listar().find(function (x) { return x.id === id; });
    if (!n) return;
    editandoId = id;
    substituirCard(id, editHtml(n));
    const el = lista.querySelector(`.note-card[data-id="${id}"] .note-edit__body`);
    if (el) el.focus();
  }

  function fecharEdicao() {
    const id = editandoId;
    editandoId = null;
    const n = Notas.listar().find(function (x) { return x.id === id; });
    if (n) substituirCard(id, cardHtml(n)); else pintar();
  }

  // ── Delegação de eventos na lista ───────────────────────────
  lista.addEventListener('click', function (e) {
    const card = e.target.closest('.note-card');
    if (!card) return;
    const id = card.getAttribute('data-id');

    if (e.target.closest('[data-pin]')) {
      card.classList.add('is-busy');
      Notas.fixar(id).catch(function (err) { console.error('Falha ao fixar nota:', err); card.classList.remove('is-busy'); });
      return;
    }
    if (e.target.closest('[data-edit]')) { abrirEdicao(id); return; }
    if (e.target.closest('[data-del]'))  { substituirCard(id, confirmHtml(Notas.listar().find(function (x) { return x.id === id; }) || { id: id })); return; }

    if (e.target.closest('[data-del-confirm]')) {
      card.classList.add('is-busy');
      Notas.remover(id).catch(function (err) { console.error('Falha ao excluir nota:', err); card.classList.remove('is-busy'); });
      return;
    }
    if (e.target.closest('[data-cancel]')) {
      if (editandoId === id) fecharEdicao();
      else substituirCard(id, cardHtml(Notas.listar().find(function (x) { return x.id === id; }) || { id: id }));
      return;
    }
    if (e.target.closest('[data-save]')) {
      const titulo   = card.querySelector('.note-edit__title').value;
      const conteudo = card.querySelector('.note-edit__body').value;
      const btn = e.target.closest('[data-save]');
      btn.disabled = true;
      editandoId = null; // libera o re-render que a gravação vai disparar
      Notas.atualizar(id, { titulo: titulo, conteudo: conteudo }).catch(function (err) {
        console.error('Falha ao salvar nota:', err);
        btn.disabled = false;
      });
      return;
    }
  });

  // Outra parte da UI mudou as notas (compositor criou, fixar/excluir/editar) →
  // repinta a lista a partir do cache já atualizado. Segura enquanto edita.
  window.addEventListener('notas:atualizadas', function () {
    if (editandoId) return;
    pintar();
  });

  // Primeiro carregamento: busca do backend e pinta.
  Notas.carregarDaApi().then(pintar);
  pintar(); // render imediato com o cache (se houver), antes da resposta da API
})();
