import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Ic, { ICONS, Mark } from '../components/Ic';
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';
import { gravarSessao } from '../auth/session';
import { alternarTema } from '../lib/theme';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);

  const login = useMutation({
    mutationFn: () => api.post(endpoints.auth.login, { email: email.trim(), password: senha }),
    onSuccess: (res) => {
      gravarSessao({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      navigate('/todo', { replace: true });
    },
  });

  function enviar(e) {
    e.preventDefault();
    if (!email.trim() || !senha) return;
    login.mutate();
  }

  return (
    <>
      <button className="btn-icon auth__theme" onClick={alternarTema} aria-label="Alternar tema">
        <Ic d={ICONS.moon} />
      </button>

      <div className="auth">
        <aside className="auth__aside">
          <span className="auth__mark" aria-hidden="true"><Mark size={60} /></span>
          <div className="auth__quote">
            <h2>Seu dia <em>+leve.</em></h2>
            <p>Planeje, foque e acompanhe o que realmente importa.</p>
          </div>
          <div className="auth__bottom">
            <div className="auth__foot">Gerenciador de Tarefas</div>
            <div className="auth__brand"><span className="auth__word">JustDoIt</span></div>
          </div>
        </aside>

        <main className="auth__main">
          <div className="auth__card">
            <div className="auth__head">
              <div className="auth__eyebrow">Bem-vindo de volta</div>
              <h1 className="auth__title">Entrar</h1>
              <p className="auth__sub">Novo por aqui? <Link to="/signup">Criar uma conta</Link></p>
            </div>

            <form className="auth__form" onSubmit={enviar} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="email">E-mail</label>
                <div className="field__control">
                  <Ic d={ICONS.mail} />
                  <input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="senha">Senha</label>
                <div className="field__control">
                  <Ic d={ICONS.lock} />
                  <input
                    id="senha"
                    type={verSenha ? 'text' : 'password'}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="field__eye"
                    onClick={() => setVerSenha((v) => !v)}
                    aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <Ic d={ICONS.eye} />
                  </button>
                </div>
              </div>

              <div className="auth__rowend">
                <label className="checkline"><input type="checkbox" defaultChecked /> Manter conectado</label>
                <a className="auth__forgot">Esqueceu a senha?</a>
              </div>

              {login.isError && (
                <span className="field__error">{login.error.message || 'E-mail ou senha incorretos.'}</span>
              )}
              <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={login.isPending}>
                {login.isPending ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
