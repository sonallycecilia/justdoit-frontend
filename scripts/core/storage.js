/* ============================================================
   JustDoIt — core/storage.js
   Abstração simples do LocalStorage. Todo estado temporário
   (tarefas, configurações, sessão) deve passar por aqui.
   ============================================================ */
const Storage = (function () {
  const PREFIX = 'jdi.';

  const KEYS = {
    TAREFAS:      'todo-tarefas',
    TAREFAS_HOJE: 'tarefas-hoje',
    NOTAS:        'todo-notas',
    TEMA:         'tema',
    FOCO_DIARIO:  'foco-diario',   // { 'YYYY-MM-DD': { ciclos, minutos } }
    TEMPO_DIARIO: 'tempo-diario',  // { 'YYYY-MM-DD': segundos } — cronômetro de execução
    // chaves por tarefa — passam taskId (string) ou null para nova tarefa
    detalheNotas:  (id) => id ? 'detalhe-notas-'  + id : 'detalhe-notas',
    detalheSubs:   (id) => id ? 'detalhe-subs-'   + id : 'detalhe-subs',
    detalheDesc:   (id) => id ? 'detalhe-desc-'   + id : 'detalhe-desc',
    detalheMods:   (id) => 'detalhe-mods-'  + id,
    detalheCiclo:  (id) => 'detalhe-ciclo-' + id,
    detalheTimer:  (id) => 'detalhe-pomos-' + id + '-timer',
    detalheCiclos: (id) => 'detalhe-pomos-' + id + '-ciclos',
  };

  function ler(chave, padrao = null) {
    try {
      const bruto = localStorage.getItem(PREFIX + chave);
      return bruto === null ? padrao : JSON.parse(bruto);
    } catch (e) {
      console.warn('[Storage] falha ao ler', chave, e);
      return padrao;
    }
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(PREFIX + chave, JSON.stringify(valor));
    } catch (e) {
      console.warn('[Storage] falha ao gravar', chave, e);
    }
  }

  function remover(chave) {
    localStorage.removeItem(PREFIX + chave);
  }

  // Preferência de tema persistida
  function lerTema() { return ler('tema', null); }
  function gravarTema(tema) { gravar('tema', tema); }

  return { KEYS, ler, gravar, remover, lerTema, gravarTema };
})();

// Disponível globalmente para os outros scripts
window.Storage = Storage;
