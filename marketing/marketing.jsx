/* JustDoIt — marketing landing page */
const M = window.JustDoItDesignSystem_dbfb72;
const MIc = (n, props = {}) => <i data-lucide={n} {...props}></i>;

const MMark = ({ size = 24 }) => {
  const fid = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <defs><filter id={fid} x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="1.1" dy="1.8" stdDeviation="0.9" floodColor="#012326" floodOpacity="0.3" />
      </filter></defs>
      <path filter={`url(#${fid})`} d="M33 7 L46.5 21 L39.6 21 L39.6 36.4 C39.6 44.2 34.6 48.9 27 48.3 C19.8 47.7 15.3 42.6 15.9 37.5 C16.3 33.9 18.9 31.9 21.9 32.5 C24.4 33 25.6 35.4 24.2 37.4 C23.2 38.8 21.4 38.7 20.6 37.6 M33 7 L19.5 21 L26.4 21 L26.4 36.4 C26.4 40 28.8 42.3 32.2 42.3" />
    </svg>
  );
};

function Nav() {
  return (
    <header className="mkt-nav">
      <div className="mkt__wrap mkt-nav__in">
        <a className="mkt-brand" href="#">
          <span className="mkt-brand__mark"><MMark size={22} /></span>
          <span className="mkt-brand__word">JustDoIt</span>
        </a>
        <nav className="mkt-nav__links">

          <a className="mkt-nav__link">Recursos</a>
          <a className="mkt-nav__link">Preços</a>
          <a className="mkt-nav__link">Sobre</a>
        </nav>
        <div className="mkt-nav__cta">
          <button
            className="mkt-theme"
            aria-label="Alternar tema"
            onClick={() => {
              const r = document.documentElement;
              const dark = r.getAttribute('data-theme') === 'dark';
              r.setAttribute('data-theme', dark ? 'light' : 'dark');
              setTimeout(() => window.lucide && lucide.createIcons(), 0);
            }}
          >
            <i data-lucide="moon-star"></i>
          </button>
          <M.Button variant="primary" size="sm" onClick={() => location.href='pages/login.html'}>Entrar</M.Button>
        </div>
      </div>
    </header>
  );
}

function HeroMock() {
  const rows = [
    { t: 'Revisar a proposta de orçamento', done: false, badge: ['info', 'Hoje'] },
    { t: 'Pagar conta de luz', done: true, badge: null },
    { t: 'Caminhada de 30 minutos', done: false, badge: ['warn', '17:00'] },
    { t: 'Agendar a transportadora', done: false, badge: ['danger', 'Alta'] },
  ];
  return (
    <div className="mkt-mock">
      <div className="mkt-mock__bar">
        <span className="mkt-mock__day">Hoje</span>
        <span className="mkt-mock__date">QUI · 7 JUN</span>
      </div>
      <div className="mkt-mock__rows">
        {rows.map((r, i) => (
          <div className="mkt-mock__row" key={i}>
            <M.Checkbox shape="circle" checked={r.done} onChange={() => {}} />
            <span className="mkt-mock__t" style={r.done ? { color: 'var(--text-muted)', textDecoration: 'line-through' } : null}>{r.t}</span>
            {r.badge && <M.Badge tone={r.badge[0]}>{r.badge[1]}</M.Badge>}
          </div>
        ))}
      </div>
      <div className="mkt-mock__foot">
        <M.ProgressBar value={25} label="Concluído hoje" />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="mkt__wrap mkt-hero">
      <div>
        <span className="mkt-hero__eyebrow"><M.Badge tone="info" dot>Gerenciador de tarefas</M.Badge></span>
        <h1>Concentre-se no <em>que importa.</em></h1>
        <p className="mkt-hero__sub">
          O JustDoIt deixa o seu dia leve: uma lista clara, lembretes na hora certa
          e a calma de saber exatamente o próximo passo.
        </p>
        <div className="mkt-hero__actions">
          <M.Button variant="primary" size="lg" trailingIcon={MIc('arrow-up')} onClick={() => location.href='pages/signup.html'}>Começar de graça</M.Button>
          <M.Button variant="secondary" size="lg" leadingIcon={MIc('play')}>Ver demo</M.Button>
        </div>
        <div className="mkt-hero__note">{MIc('check')} Sem cartão de crédito · Em português</div>
      </div>
      <HeroMock />
    </section>
  );
}

function Features() {
  const items = [
    { ic: 'sun', h: 'Comece pelo hoje', p: 'Só o que precisa da sua atenção agora. O resto espera, sem ruído.' },
    { ic: 'bell', h: 'Lembretes na hora', p: 'Prazos que chegam no momento certo — nunca cedo demais, nunca tarde.' },
    { ic: 'folder-tree', h: 'Projetos organizados', p: 'Agrupe por contexto e veja o progresso de cada projeto num relance.' },
  ];
  return (
    <section className="mkt__wrap mkt-features">
      <div className="mkt-sec-head">
        <h2>Menos ruído. Mais feito.</h2>
        <p>Ferramentas calmas para um dia produtivo — sem a ansiedade das listas intermináveis.</p>
      </div>
      <div className="mkt-grid3">
        {items.map((it) => (
          <article className="mkt-feat" key={it.h}>
            <div className="mkt-feat__ic">{MIc(it.ic)}</div>
            <h3>{it.h}</h3>
            <p>{it.p}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Band() {
  return (
    <section className="mkt-band">
      <div className="mkt-band__in">
        <div className="mkt-band__mark"><MMark size={40} /></div>
        <h2>Seu dia, tranquilo. Sua lista, feita.</h2>
        <p>Junte-se a quem trocou o caos das tarefas pela calma de uma lista bem cuidada.</p>
        <M.Button variant="primary" size="lg" trailingIcon={MIc('arrow-up')} onClick={() => location.href='pages/signup.html'}>Começar agora</M.Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mkt-foot">
      <div className="mkt__wrap mkt-foot__in">
        <div className="mkt-foot__brand">
          <span className="mkt-brand__mark"><MMark size={20} /></span>
          <div>
            <div className="mkt-brand__word" style={{ fontSize: 18 }}>JustDoIt</div>
            <div className="mkt-foot__tag">Gerenciador de Tarefas</div>
          </div>
        </div>
        <nav className="mkt-foot__links">
          <a>Recursos</a><a>Preços</a><a>Privacidade</a><a>Contato</a>
        </nav>
      </div>
    </footer>
  );
}

function Landing() {
  React.useEffect(() => { if (window.lucide) lucide.createIcons(); });
  return (
    <div className="mkt">
      <Nav /><Hero /><Features /><Band /><Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Landing />);
