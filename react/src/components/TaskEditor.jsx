// Editor de tarefa — corpo compartilhado entre a página /tasks/:id e o drawer
// lateral do calendário. Antes cada um tinha a sua versão; agora existe uma
// fonte da verdade só, então o que muda aqui aparece nos dois.
//
// SALVAMENTO: em modo edição (taskId definido) TUDO persiste sozinho, sem botão
// — título/descrição com debounce, o resto na hora. Em modo criação não há id
// para gravar, então os campos ficam locais e o caller salva via `salvar()`
// exposto por `onPronto`.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Ic, { ICONS } from './Ic';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import CategorySelect from './CategorySelect';
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';
import { useCategorias } from '../hooks/useCategories';
import { useAtualizarTarefa, useCriarTarefa, useTarefa, useToggleDone } from '../hooks/useTasks';
import {
  MODULOS_PADRAO, cicloParaApi,
  useCiclo, useCriarSubtarefa, useLogarTempo, useModulos, useNota,
  useRegistrarCicloFoco, useRemoverSubtarefa, useSalvarCiclo, useSalvarModulos,
  useSalvarNota, useSalvarTempoEstimado, useSessoesFoco, useSubtarefas, useTimer,
  useToggleSubtarefa, useZerarTempo,
} from '../hooks/useTaskDetail';
import * as Priority from '../lib/priority';
import { TIPOS, customValido, fimPrevisto, rotuloCiclo, rotuloCustom } from '../lib/cycle';
import { dataIso, dataRelativa, deIso, fmtHoraMin, formatarMinSeg, formatarTempo, hoje, pct } from '../lib/utils';
import { toast } from '../lib/toast';

const FOCO_MIN = 25;
const PAUSA_MIN = 5;
const LABEL_MOD = { foco: 'Foco', ciclo: 'Ciclo', prioridade: 'Prioridade', tempo: 'Tempo', notas: 'Notas', subtarefas: 'Subtarefas' };
const MOD_ICONE = {
  foco: ICONS.target, ciclo: ICONS.cycle, prioridade: ICONS.flag,
  tempo: ICONS.clock, notas: ICONS.notes, subtarefas: ICONS.list,
};



const TaskEditor = forwardRef(function TaskEditor({ taskId, compacto = false, onCriada, onSalvo }, ref) {
  const { data: categorias } = useCategorias();
  const { data: tarefa, isLoading: carregandoTarefa } = useTarefa(taskId, categorias);

  const { data: subsServidor } = useSubtarefas(taskId);
  const { data: notaServidor } = useNota(taskId);
  const { data: modsServidor } = useModulos(taskId);
  const { data: cicloServidor } = useCiclo(taskId);
  const { data: timerServidor } = useTimer(taskId);
  const segundosServidor = timerServidor?.segundos;
  const { data: sessoesFoco } = useSessoesFoco(taskId);

  const criarTarefa = useCriarTarefa();
  const atualizarTarefa = useAtualizarTarefa();
  const toggleDone = useToggleDone();
  const criarSub = useCriarSubtarefa(taskId);
  const toggleSub = useToggleSubtarefa(taskId);
  const removerSub = useRemoverSubtarefa(taskId);
  const salvarNota = useSalvarNota(taskId);
  const salvarMods = useSalvarModulos(taskId);
  const salvarCiclo = useSalvarCiclo(taskId);
  const logarTempo = useLogarTempo(taskId);
  const zerarTempo = useZerarTempo(taskId);
  const salvarTempoEstimado = useSalvarTempoEstimado(taskId);
  const registrarFoco = useRegistrarCicloFoco(taskId);

  const tituloRef = useRef(null);
  const descRef = useRef(null);
  const [done, setDone] = useState(false);
  const [dataSel, setDataSel] = useState(hoje());
  const [dataAberta, setDataAberta] = useState(false);
  const [hora, setHora] = useState(null); // { h, m } | null
  const [horaAberta, setHoraAberta] = useState(false);
  const [prioridade, setPrioridade] = useState('normal');
  const [catId, setCatId] = useState(null);
  const [salvo, setSalvo] = useState(''); // '', 'ok', 'erro'

  const [modsLocal, setModsLocal] = useState({ ...MODULOS_PADRAO });
  const [subTogglelocal, setSubToggleLocal] = useState(false); // sem flag no backend
  const [cicloLocal, setCicloLocal] = useState('none');
  const [cicloCustom, setCicloCustom] = useState({ count: 12, unit: 'horas', occurrences: 7, startIso: null });
  const [dur, setDur] = useState({ h: 0, m: 0 });
  const [tetoAtingido, setTetoAtingido] = useState(false);
  const [nota, setNota] = useState('');
  const [subsLocal, setSubsLocal] = useState([]);
  const [subInput, setSubInput] = useState('');

  const preenchido = useRef(false);

  useEffect(() => {
    if (!taskId || !tarefa || preenchido.current) return;
    preenchido.current = true;
    if (tituloRef.current) tituloRef.current.textContent = tarefa.titulo;
    if (descRef.current) descRef.current.textContent = tarefa.descricao || '';
    setDone(tarefa.done);
    if (tarefa.dataIso) setDataSel(deIso(tarefa.dataIso));
    if (tarefa.hora) {
      const [h, m] = tarefa.hora.split(':').map(Number);
      setHora({ h, m });
    }
    setPrioridade(tarefa.prioridade || 'normal');
  }, [taskId, tarefa]);

  // Trocar de tarefa no drawer precisa repopular os campos não controlados.
  useEffect(() => { preenchido.current = false; }, [taskId]);

  useEffect(() => {
    if (tarefa && categorias) setCatId(tarefa.categoriaId || 'generico');
    else if (categorias && !catId) setCatId(categorias[0]?.id ?? null);
  }, [tarefa, categorias]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (modsServidor) setModsLocal(modsServidor); }, [modsServidor]);
  useEffect(() => {
    if (!cicloServidor) return;
    setCicloLocal(cicloServidor.tipo);
    if (cicloServidor.custom) setCicloCustom(cicloServidor.custom);
  }, [cicloServidor]);
  useEffect(() => {
    const min = timerServidor?.estimadoMin;
    if (min != null) setDur({ h: Math.floor(min / 60), m: min % 60 });
  }, [timerServidor?.estimadoMin]);
  useEffect(() => { if (notaServidor !== undefined) setNota(notaServidor); }, [notaServidor]);
  useEffect(() => { if ((subsServidor || []).length > 0) setSubToggleLocal(true); }, [subsServidor]);

  const subs = taskId ? (subsServidor || []) : subsLocal;
  const cats = categorias || [];
  const cat = cats.find((c) => c.id === catId) || cats[0];

  function flashSalvo() {
    setSalvo('ok');
    setTimeout(() => setSalvo(''), 1600);
  }

  function aoErro(e) {
    // 400 = teto biológico: o task-service recusa quando a duração estimada
    // estoura o limite de horas do dia. É a fonte da verdade — nunca validamos
    // o teto no cliente.
    if (e?.status === 400) {
      toast(e.error || e.message || 'Limite de tempo do dia excedido.', 'error');
      setTetoAtingido(true);
    } else {
      toast(e?.error || e?.message || 'Não foi possível salvar.', 'error');
    }
    setSalvo('erro');
    setTimeout(() => setSalvo(''), 2500);
  }

  // ── Persistência automática (modo edição) ─────────────────────────────────
  // O estado do React só atualiza no próximo render, então quem chama passa a
  // mudança em `mudancas` em vez de confiar no state recém-setado.
  function persistir(mudancas = {}) {
    if (!taskId) return;
    const titulo = (tituloRef.current?.textContent || '').trim();
    if (!titulo) return; // backend exige título; espera o usuário digitar
    setTetoAtingido(false);
    const dados = {
      titulo,
      descricao: (descRef.current?.textContent || '').trim(),
      categoriaId: cat?.id,
      prioridade,
      dataIso: dataIso(dataSel),
      hora: hora ? fmtHoraMin(hora.h, hora.m) : null,
      ...mudancas,
    };
    atualizarTarefa.mutate({ id: taskId, dados }, {
      // `onSalvo` deixa o caller reagir ao que foi persistido — o drawer do
      // calendário usa para mover o bloco de tempo junto com a tarefa.
      onSuccess: () => { flashSalvo(); onSalvo?.(dados); },
      onError: aoErro,
    });
  }

  // Título e descrição são contentEditable não controlados: salvam com debounce.
  const textoTimer = useRef(null);
  function aoDigitarTexto() {
    if (!taskId) return;
    clearTimeout(textoTimer.current);
    textoTimer.current = setTimeout(() => persistir(), 700);
  }
  useEffect(() => () => clearTimeout(textoTimer.current), []);

  function alternarDone() {
    const novo = !done;
    setDone(novo);
    if (taskId) toggleDone.mutate({ id: taskId, concluir: novo }, { onSuccess: flashSalvo, onError: aoErro });
  }

  function mudarData(d) {
    setDataSel(d);
    persistir({ dataIso: dataIso(d) });
  }

  function mudarHora(h, m) {
    if (h === null || h === undefined) return;
    setHora({ h, m });
    persistir({ hora: fmtHoraMin(h, m) });
  }

  function limparHora() {
    setHora(null);
    persistir({ hora: null });
  }

  function mudarCategoria(c) {
    if (!c) return;
    setCatId(c.id);
    persistir({ categoriaId: c.id });
  }

  function mudarPrioridade(n) {
    setPrioridade(n);
    persistir({ prioridade: n });
  }

  // Duração estimada vive no /timer (o TaskRequest descarta o campo).
  const durTimer = useRef(null);
  function mudarDur(novo) {
    setDur(novo);
    if (!taskId) return;
    clearTimeout(durTimer.current);
    durTimer.current = setTimeout(() => {
      setTetoAtingido(false);
      salvarTempoEstimado.mutate(novo.h * 60 + novo.m, { onSuccess: flashSalvo, onError: aoErro });
    }, 600);
  }
  useEffect(() => () => clearTimeout(durTimer.current), []);

  const notaTimer = useRef(null);
  function aoDigitarNota(valor) {
    setNota(valor);
    if (!taskId) return;
    clearTimeout(notaTimer.current);
    if (!valor.trim()) return; // backend exige content não-vazio
    notaTimer.current = setTimeout(() => salvarNota.mutate(valor, { onSuccess: flashSalvo }), 800);
  }
  useEffect(() => () => clearTimeout(notaTimer.current), []);

  function toggleModulo(mod) {
    if (mod === 'subtarefas') { setSubToggleLocal((v) => !v); return; }
    const novos = { ...modsLocal, [mod]: !modsLocal[mod] };
    setModsLocal(novos);
    if (taskId) salvarMods.mutate(novos, { onSuccess: flashSalvo, onError: aoErro });
  }

  function valorCiclo(tipo = cicloLocal, custom = cicloCustom) {
    if (tipo === 'none') return 'none';
    if (tipo !== 'custom') return tipo;
    return { tipo: 'custom', custom, startTime: hora ? fmtHoraMin(hora.h, hora.m) : null };
  }

  function escolherCiclo(tipo) {
    setCicloLocal(tipo);
    if (!taskId) return;
    if (tipo === 'custom') {
      if (customValido(cicloCustom)) salvarCiclo.mutate(valorCiclo('custom'), { onSuccess: flashSalvo, onError: aoErro });
      return;
    }
    salvarCiclo.mutate(valorCiclo(tipo), { onSuccess: flashSalvo, onError: aoErro });
  }

  const customTimer = useRef(null);
  function mudarCustom(mudancas) {
    const novo = { ...cicloCustom, ...mudancas };
    setCicloCustom(novo);
    if (!taskId || cicloLocal !== 'custom' || !customValido(novo)) return;
    clearTimeout(customTimer.current);
    customTimer.current = setTimeout(() => salvarCiclo.mutate(valorCiclo('custom', novo), { onSuccess: flashSalvo }), 600);
  }
  useEffect(() => () => clearTimeout(customTimer.current), []);

  // ── Cronômetro de execução ────────────────────────────────────────────────
  const [cronSegundos, setCronSegundos] = useState(0);
  const [cronRodando, setCronRodando] = useState(false);
  const deltaNaoLogado = useRef(0);

  useEffect(() => {
    if (segundosServidor !== undefined && !cronRodando) {
      setCronSegundos(segundosServidor + deltaNaoLogado.current);
    }
  }, [segundosServidor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cronRodando) return;
    const h = setInterval(() => {
      deltaNaoLogado.current += 1;
      setCronSegundos((s) => s + 1);
    }, 1000);
    return () => clearInterval(h);
  }, [cronRodando]);

  function toggleCron() {
    if (cronRodando) {
      setCronRodando(false);
      const delta = deltaNaoLogado.current;
      if (taskId && delta > 0) { deltaNaoLogado.current = 0; logarTempo.mutate(delta); }
    } else setCronRodando(true);
  }

  function resetCron() {
    setCronRodando(false);
    deltaNaoLogado.current = 0;
    setCronSegundos(0);
    if (taskId) zerarTempo.mutate();
  }

  // Ao desmontar com tempo não logado, envia o delta (fire-and-forget).
  useEffect(() => () => {
    const delta = deltaNaoLogado.current;
    if (taskId && delta > 0) api.patch(endpoints.tasks.timerLog(taskId), { seconds: delta }).catch(() => {});
  }, [taskId]);

  // ── Pomodoro ──────────────────────────────────────────────────────────────
  const [pomo, setPomo] = useState({ fase: 'foco', ciclo: 1, restante: FOCO_MIN * 60, rodando: false });
  const inicioFocoRef = useRef(null);
  const ciclosServidor = useMemo(
    () => (sessoesFoco || []).filter((s) => s.completed && s.sessionType === 'FOCUS').length,
    [sessoesFoco],
  );
  const [ciclosLocais, setCiclosLocais] = useState(0);
  const ciclosPomodoro = ciclosServidor + (taskId ? 0 : ciclosLocais);

  useEffect(() => {
    if (!pomo.rodando) return;
    const h = setInterval(() => {
      setPomo((p) => {
        if (p.restante > 0) return { ...p, restante: p.restante - 1 };
        if (p.fase === 'foco') {
          const startedAt = inicioFocoRef.current || new Date(Date.now() - FOCO_MIN * 60_000);
          if (taskId) {
            registrarFoco.mutate({
              focusMinutes: FOCO_MIN,
              startedAt: startedAt.toISOString().slice(0, 19),
              endedAt: new Date().toISOString().slice(0, 19),
            });
          } else setCiclosLocais((c) => c + 1);
          return { ...p, fase: 'pausa', restante: PAUSA_MIN * 60 };
        }
        inicioFocoRef.current = new Date();
        return { fase: 'foco', ciclo: Math.min(p.ciclo + 1, 4), restante: FOCO_MIN * 60, rodando: p.rodando };
      });
    }, 1000);
    return () => clearInterval(h);
  }, [pomo.rodando, taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePomo() {
    setPomo((p) => {
      if (!p.rodando && p.fase === 'foco' && p.restante === FOCO_MIN * 60) inicioFocoRef.current = new Date();
      return { ...p, rodando: !p.rodando };
    });
  }
  function pularFase() {
    setPomo((p) => (p.fase === 'foco'
      ? { ...p, fase: 'pausa', restante: PAUSA_MIN * 60 }
      : { ...p, fase: 'foco', ciclo: Math.min(p.ciclo + 1, 4), restante: FOCO_MIN * 60 }));
  }
  function resetPomo() {
    setPomo({ fase: 'foco', ciclo: 1, restante: FOCO_MIN * 60, rodando: false });
  }

  const pomoDur = (pomo.fase === 'foco' ? FOCO_MIN : PAUSA_MIN) * 60;
  const pomoPct = ((pomoDur - pomo.restante) / pomoDur) * 100;

  // ── Subtarefas ────────────────────────────────────────────────────────────
  const feitas = subs.filter((s) => s.done).length;
  const pctSubs = pct(feitas, subs.length);

  function adicionarSub() {
    const titulo = subInput.trim();
    if (!titulo) return;
    setSubInput('');
    setSubToggleLocal(true);
    if (taskId) criarSub.mutate({ titulo, position: subs.length });
    else setSubsLocal((l) => [...l, { id: `tmp-${Date.now()}`, titulo, done: false }]);
  }

  function alternarSub(s) {
    if (taskId) toggleSub.mutate(s.id);
    else setSubsLocal((l) => l.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
  }

  function excluirSub(s) {
    if (taskId) removerSub.mutate(s.id);
    else setSubsLocal((l) => l.filter((x) => x.id !== s.id));
  }

  // ── Criação (só no modo /tasks/nova) ──────────────────────────────────────
  // Exposta ao caller via ref: não há id para autosalvar antes do POST.
  async function criar() {
    const titulo = (tituloRef.current?.textContent || '').trim();
    if (!titulo) { tituloRef.current?.focus(); return null; }
    const dados = {
      titulo,
      descricao: (descRef.current?.textContent || '').trim(),
      categoriaId: cat?.id,
      prioridade,
      dataIso: dataIso(dataSel),
      hora: hora ? fmtHoraMin(hora.h, hora.m) : null,
    };
    const durMin = dur.h * 60 + dur.m;
    setTetoAtingido(false);
    try {
      const resp = await criarTarefa.mutateAsync(dados);
      const novoId = resp?.id;
      if (novoId) {
        // Com o id definitivo, persiste o que foi configurado antes do POST —
        // nada fica só neste navegador.
        const pendencias = [];
        for (const [i, s] of subsLocal.entries()) {
          pendencias.push(
            api.post(endpoints.tasks.subtasks.create(novoId), { title: s.titulo, position: i })
              .then((criada) => (s.done && criada?.id
                ? api.patch(endpoints.tasks.subtasks.toggle(novoId, criada.id))
                : null)),
          );
        }
        if (nota.trim()) pendencias.push(api.put(endpoints.tasks.note(novoId), { content: nota }));
        if (cicloLocal !== 'none' && (cicloLocal !== 'custom' || customValido(cicloCustom))) {
          pendencias.push(api.put(endpoints.tasks.cycleConfig(novoId), cicloParaApi(valorCiclo())));
        }
        if (durMin > 0) pendencias.push(api.put(endpoints.tasks.timer(novoId), { estimatedMinutes: durMin }));
        if (Object.values(modsLocal).some(Boolean)) {
          pendencias.push(api.put(endpoints.tasks.moduleConfig(novoId), {
            focusEnabled: modsLocal.foco,
            cycleEnabled: modsLocal.ciclo,
            priorityEnabled: modsLocal.prioridade,
            timerEnabled: modsLocal.tempo,
            notesEnabled: modsLocal.notas,
          }));
        }
        await Promise.all(pendencias);
      }
      onCriada?.(novoId);
      return novoId;
    } catch (e) {
      aoErro(e);
      return null;
    }
  }

  useImperativeHandle(ref, () => ({
    criar,
    criando: criarTarefa.isPending,
    tetoAtingido,
    salvo,
  }));

  const modAtivo = (m) => (m === 'subtarefas' ? subTogglelocal : Boolean(modsLocal[m]));
  const modsAtivosRotulos = Object.keys(LABEL_MOD).filter(modAtivo).map((m) => LABEL_MOD[m]);

  if (taskId && carregandoTarefa) {
    return <div className="empty"><p>Carregando tarefa…</p></div>;
  }

  return (
    // O `is-done` fica aqui (e não no .detail da página) porque o drawer do
    // calendário não tem esse wrapper — sem isso o check não pintava em lugar
    // nenhum, mesmo com o PATCH indo pro backend.
    <div className={`task-editor ${done ? 'is-done' : ''}`}>
      <div className="detail__head">
        <button className="detail__check" aria-label="Concluir tarefa" onClick={alternarDone}>
          <Ic d={ICONS.check} strokeWidth={3} />
        </button>
        <h1
          ref={tituloRef}
          className="edit-title"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder="Nome da tarefa…"
          onInput={aoDigitarTexto}
          onBlur={() => taskId && persistir()}
        />
      </div>
      <div
        ref={descRef}
        className="edit-desc"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Adicione uma descrição…"
        onInput={aoDigitarTexto}
        onBlur={() => taskId && persistir()}
      />

      <div className="detail__chips">
        <div className="date-pick">
          <button className={`badge badge--info date-pick__btn ${dataAberta ? 'is-open' : ''}`} type="button" onClick={() => setDataAberta((v) => !v)}>
            <Ic d={ICONS.calendar} />
            <span>{dataRelativa(dataSel)}</span>
            <Ic d={ICONS.chevron} size={10} strokeWidth={2.5} className="date-pick__chevron" />
          </button>
          <DatePicker
            aberto={dataAberta}
            onFechar={() => setDataAberta(false)}
            onSelect={mudarData}
            selecionada={dataSel}
          />
        </div>

        <div className="time-pick">
          <button
            className={`badge badge--info time-pick__btn ${horaAberta ? 'is-open' : ''}`}
            type="button"
            data-empty={hora ? undefined : ''}
            onClick={() => setHoraAberta((v) => !v)}
          >
            <Ic d={ICONS.clock} />
            <span>{hora ? fmtHoraMin(hora.h, hora.m) : 'Hora'}</span>
            <Ic d={ICONS.chevron} size={10} strokeWidth={2.5} className="time-pick__chevron" />
          </button>
          <TimePicker
            aberto={horaAberta}
            onFechar={() => setHoraAberta(false)}
            hora={hora?.h ?? null}
            min={hora?.m ?? 0}
            onChange={mudarHora}
            onClear={limparHora}
          />
        </div>

        {/* Duração estimada — persiste no /timer; base do teto biológico */}
        <div className="dur-pick">
          <Ic d={ICONS.clock} size={14} />
          <input
            type="number" min={0} max={16} value={dur.h} aria-label="Horas estimadas"
            onChange={(e) => mudarDur({ ...dur, h: Math.max(0, Math.min(16, parseInt(e.target.value, 10) || 0)) })}
          />h
          <input
            type="number" min={0} max={55} step={5} value={dur.m} aria-label="Minutos estimados"
            onChange={(e) => mudarDur({ ...dur, m: Math.max(0, Math.min(55, parseInt(e.target.value, 10) || 0)) })}
          />min
        </div>

        <CategorySelect categorias={cats} valor={cat?.nome} onChange={mudarCategoria} />

        <span className={`badge badge--${prioridade}`}>{Priority.ROTULO[prioridade]}</span>

        {tetoAtingido && <span className="dur-alert">Teto biológico atingido</span>}
        {salvo === 'ok' && <span className="badge badge--info">Salvo ✓</span>}

        {subs.length > 0 && (
          <div className="chips-progress">
            <Ic d={ICONS.list} size={12} style={{ flex: 'none' }} />
            <div className="chips-progress__bar">
              <div className={`chips-progress__fill ${pctSubs === 100 ? 'chips-progress__fill--success' : ''}`} style={{ width: `${pctSubs}%` }} />
            </div>
            <span className="chips-progress__count">{pctSubs}%</span>
          </div>
        )}
      </div>

      {taskId && !compacto && (
        <div className="detail__spec">
          <SpecItem icone={ICONS.checkCircle} label="Status">
            <span style={done ? { color: 'var(--color-success)' } : undefined}>{done ? 'Concluída' : 'Aberta'}</span>
          </SpecItem>
          <SpecItem icone={ICONS.cycle} label="Recorrência">
            {cicloLocal === 'none' ? '—' : cicloLocal === 'custom' ? rotuloCustom(cicloCustom) : rotuloCiclo(cicloLocal)}
          </SpecItem>
          <SpecItem icone={ICONS.clock} label="Tempo gasto" mono>{formatarTempo(cronSegundos)}</SpecItem>
          <SpecItem icone={ICONS.target} label="Ciclos Pomodoro" mono>{String(ciclosPomodoro)}</SpecItem>
          <SpecItem icone={ICONS.list} label="Subtarefas" mono>{feitas} / {subs.length}</SpecItem>
          <SpecItem icone={ICONS.pencil} label="Módulos ativos">{modsAtivosRotulos.length ? modsAtivosRotulos.join(', ') : '—'}</SpecItem>
        </div>
      )}

      <div className="modules">
        <div className="modules__title">Módulos</div>
        {/* No drawer as colunas fluem conforme a largura; na página ficam as 6 do CSS. */}
        <div className="modules__grid" style={compacto ? { gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' } : undefined}>
          {Object.keys(LABEL_MOD).map((mod) => (
            <button key={mod} className={`module-toggle ${modAtivo(mod) ? 'is-on' : ''}`} onClick={() => toggleModulo(mod)}>
              <span className="module-toggle__ic"><Ic d={MOD_ICONE[mod]} /></span>
              <span className="module-toggle__name">{LABEL_MOD[mod]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="module-panels">
        {modAtivo('foco') && (
          <div className="card module-panel">
            <div className="module-panel__head">
              <Ic d={ICONS.target} />
              <span className="module-panel__title">Foco — Pomodoro</span>
            </div>
            <div className="pomo">
              <div
                className="pomo__ring"
                style={{
                  '--pct': pomoPct.toFixed(1),
                  ...(pomo.fase === 'pausa' ? { '--color-accent': 'var(--color-success)' } : {}),
                }}
              >
                <div className="pomo__inner">
                  <div className="pomo__time">{formatarMinSeg(pomo.restante)}</div>
                  <div className="pomo__phase">{pomo.fase === 'foco' ? 'Foco' : 'Pausa'} · ciclo {pomo.ciclo}/4</div>
                </div>
              </div>
              <div className="pomo__side">
                <p className="text-soft" style={{ margin: 0 }}>
                  Trabalhe em blocos de 25 minutos com pausas curtas. Os ciclos concluídos contam para o seu tempo de foco do dia.
                </p>
                <div className="pomo__actions">
                  <button className="btn btn--primary btn--md" onClick={togglePomo}>
                    {pomo.rodando ? 'Pausar' : pomo.restante === FOCO_MIN * 60 && pomo.fase === 'foco' && pomo.ciclo === 1 ? 'Iniciar' : 'Continuar'}
                  </button>
                  <button className="btn btn--ghost btn--md" onClick={pularFase}>Pular fase</button>
                  <button className="btn btn--ghost btn--md" onClick={resetPomo}>Reiniciar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {modAtivo('prioridade') && (
          <div className="card module-panel">
            <div className="module-panel__head">
              <Ic d={ICONS.flag} />
              <span className="module-panel__title">Prioridade</span>
            </div>
            <div className="prio-picker">
              {Priority.NIVEIS.map((n) => (
                <button
                  key={n}
                  className={`prio-opt ${n === prioridade ? 'is-on' : ''}`}
                  style={{ color: Priority.COR[n] }}
                  onClick={() => mudarPrioridade(n)}
                >
                  <span className="prio-opt__dot" style={{ background: Priority.COR[n] }} />
                  <span style={{ color: 'var(--color-text-soft)' }}>{Priority.ROTULO[n]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {modAtivo('ciclo') && (
          <div className="card module-panel">
            <div className="module-panel__head">
              <Ic d={ICONS.cycle} />
              <span className="module-panel__title">Recorrência</span>
            </div>
            <div className="cycle-opts">
              {TIPOS.map((t) => (
                <button key={t} className={`cycle-opt ${t === cicloLocal ? 'is-on' : ''}`} onClick={() => escolherCiclo(t)}>
                  {rotuloCiclo(t)}
                </button>
              ))}
            </div>
            {cicloLocal === 'custom' && <CicloCustom custom={cicloCustom} onChange={mudarCustom} />}
          </div>
        )}

        {modAtivo('tempo') && (
          <div className="card module-panel">
            <div className="module-panel__head">
              <Ic d={ICONS.clock} />
              <span className="module-panel__title">Cronômetro de execução</span>
            </div>
            <div className="timer">
              <div className="timer__display">{formatarTempo(cronSegundos)}</div>
              <div className="timer__actions">
                <button className="btn btn--primary btn--md" onClick={toggleCron}>
                  {cronRodando ? 'Pausar' : cronSegundos > 0 ? 'Continuar' : 'Iniciar'}
                </button>
                <button className="btn btn--secondary btn--md" onClick={resetCron}>Zerar</button>
              </div>
            </div>
          </div>
        )}

        {modAtivo('notas') && (
          <div className="card module-panel">
            <div className="module-panel__head">
              <Ic d={ICONS.notes} />
              <span className="module-panel__title">Notas</span>
            </div>
            <textarea
              className="notes-area"
              placeholder="Anote lembretes, links ou ideias para esta tarefa…"
              value={nota}
              onChange={(e) => aoDigitarNota(e.target.value)}
            />
          </div>
        )}

        {modAtivo('subtarefas') && (
          <div className="card module-panel">
            <div className="module-panel__head">
              <Ic d={ICONS.list} />
              <span className="module-panel__title">Subtarefas</span>
            </div>
            <div className="subtasks__progress">
              <div className="progress">
                <div className="progress__track">
                  <div
                    className={`progress__fill ${pctSubs === 100 && subs.length > 0 ? 'progress__fill--success' : ''}`}
                    style={{ width: `${pctSubs}%` }}
                  />
                </div>
              </div>
              <span className="subtasks__count">{feitas}/{subs.length}</span>
            </div>
            <div>
              {subs.map((s) => (
                <div className={`subtask ${s.done ? 'is-done' : ''}`} key={s.id}>
                  <button className="subtask__check" aria-label="Concluir subtarefa" onClick={() => alternarSub(s)}>
                    <Ic d={ICONS.check} strokeWidth={3} />
                  </button>
                  <span className="subtask__label">{s.titulo}</span>
                  <button className="subtask__del" aria-label="Remover subtarefa" onClick={() => excluirSub(s)}>
                    <Ic d={ICONS.close} />
                  </button>
                </div>
              ))}
            </div>
            <div className="subtask__add">
              <Ic d={ICONS.plus} size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input
                placeholder="Adicionar subtarefa… pressione Enter"
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') adicionarSub(); }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default TaskEditor;

// Controles do ciclo personalizado: data de início, "a cada N horas|dias" e
// número de repetições, com resumo do fim previsto. `onChange` recebe patches
// parciais do objeto custom ({count, unit, occurrences, startIso}).
function CicloCustom({ custom, onChange }) {
  const [dataAberta, setDataAberta] = useState(false);
  const [unitAberta, setUnitAberta] = useState(false);

  const inicio = custom.startIso ? deIso(custom.startIso) : hoje();
  const u = custom.unit === 'horas' ? 'h' : (Number(custom.count) === 1 ? ' dia' : ' dias');
  const fim = fimPrevisto(custom, inicio);

  return (
    <div className="cycle-custom">
      <div className="cycle-custom__row">
        <span className="cycle-custom__label">Início</span>
        <div className="date-pick">
          <button className={`badge badge--info date-pick__btn ${dataAberta ? 'is-open' : ''}`} type="button" onClick={() => setDataAberta((v) => !v)}>
            <Ic d={ICONS.calendar} />
            <span>{dataRelativa(inicio)}</span>
            <Ic d={ICONS.chevron} size={10} strokeWidth={2.5} className="date-pick__chevron" />
          </button>
          <DatePicker
            aberto={dataAberta}
            onFechar={() => setDataAberta(false)}
            onSelect={(d) => onChange({ startIso: dataIso(d) })}
            selecionada={inicio}
          />
        </div>
      </div>
      <div className="cycle-custom__row">
        <span className="cycle-custom__label">A cada</span>
        <div className="dur-pick cycle-custom__interval">
          <input
            type="number" min={1} max={999} value={custom.count} aria-label="Valor do intervalo"
            onChange={(e) => onChange({ count: Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)) })}
          />
          <div className="cycle-unit-pick">
            <button type="button" className={`cycle-unit ${unitAberta ? 'is-open' : ''}`} aria-haspopup="listbox" aria-expanded={unitAberta} onClick={() => setUnitAberta((v) => !v)}>
              <span>{custom.unit}</span>
              <Ic d={ICONS.chevron} size={10} strokeWidth={2.5} className="cycle-unit__chevron" />
            </button>
            {unitAberta && (
              <>
                <div className="cycle-unit__overlay" onClick={() => setUnitAberta(false)} />
                <div className="cycle-unit__menu" role="listbox">
                  {['horas', 'dias'].map((op) => (
                    <button key={op} type="button" role="option" className={`cycle-unit__opt ${custom.unit === op ? 'is-on' : ''}`}
                      onClick={() => { onChange({ unit: op }); setUnitAberta(false); }}>
                      {op}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <span className="cycle-custom__label">Repetir</span>
        <div className="dur-pick cycle-custom__reps">
          <input
            type="number" min={2} max={365} value={custom.occurrences} aria-label="Número de repetições"
            onChange={(e) => onChange({ occurrences: Math.max(2, Math.min(365, parseInt(e.target.value, 10) || 2)) })}
          />
          <span className="cycle-custom__times">×</span>
        </div>
      </div>
      <p className="cycle-custom__summary">
        {custom.occurrences} ocorrências · a cada {custom.count}{u} · termina {dataRelativa(fim)}
      </p>
    </div>
  );
}

function SpecItem({ icone, label, mono, children }) {
  return (
    <div className="spec-item">
      <span className="spec-item__ic"><Ic d={icone} /></span>
      <div className="spec-item__body">
        <span className="spec-item__label">{label}</span>
        <span className={`spec-item__value ${mono ? 'spec-item__value--mono' : ''}`}>{children}</span>
      </div>
    </div>
  );
}
