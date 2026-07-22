// Painel lateral do calendário: renderiza o MESMO editor da página de detalhe
// (<TaskEditor compacto />), então chips, módulos e painéis são idênticos aos
// de /tasks/:id e tudo persiste sozinho no backend.
//
// A única responsabilidade extra daqui é manter o BLOCO de tempo do calendário
// em sincronia quando a hora/data da tarefa muda pelo editor.
import { Link } from 'react-router-dom';
import TaskEditor from '../TaskEditor';
import { useAtualizarBloco } from '../../hooks/useTimeBlocks';
import { aoFalharPorTeto } from './WeeklyCalendar';

function ehBlocoPersistido(id) {
  return typeof id === 'string' && id.indexOf('ext-') !== 0 && id.indexOf('task-') !== 0;
}

// "HH:mm" → horas decimais (o modelo do calendário usa fração de hora).
function horaDecimal(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

export default function EventSummary({ ev, dias }) {
  const atualizarBloco = useAtualizarBloco();

  const diaEv = ev.iso ? null : (dias && dias[ev.d]);
  const iso = ev.iso || (diaEv && diaEv.iso);

  // Depois que o editor persistiu a tarefa, move o bloco para bater com ela.
  // O teto biológico continua sendo decidido pelo backend (400).
  function sincronizarBloco(dados) {
    if (!ehBlocoPersistido(ev.id)) return;
    const novoIso = dados.dataIso || iso;
    const novoIni = horaDecimal(dados.hora);
    if (!novoIso || novoIni === null) return;
    const duracao = (ev.fim ?? 0) - (ev.ini ?? 0);
    atualizarBloco
      .mutateAsync({ ...ev, iso: novoIso, ini: novoIni, fim: novoIni + (duracao > 0 ? duracao : 1) })
      .catch((err) => aoFalharPorTeto(err, () => {}));
  }

  return (
    <div className="evsum" style={{ padding: '16px 20px' }}>
      <div className="evsum__topbar">
        <span />
        <div className="evsum__topbar-actions">
          {ev.taskId && (
            <Link className="btn btn--secondary btn--sm" to={`/tasks/${ev.taskId}`}>Ver tarefa completa</Link>
          )}
        </div>
      </div>

      {ev.taskId ? (
        <TaskEditor taskId={ev.taskId} compacto onSalvo={sincronizarBloco} />
      ) : (
        <div className="evsum__card card">
          <section className="evsum__section">
            <div className="evsum__section-head">Bloco sem tarefa vinculada</div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Este bloco de tempo não está ligado a nenhuma tarefa — os campos da
              tarefa ficam disponíveis quando há uma vinculada.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
