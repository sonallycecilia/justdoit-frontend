// Formulário de login — extraído da página /login para ser reusado no lado
// direito da home dividida. Toda a lógica de autenticação vive aqui.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Ic, { ICONS } from '@/components/Ic';
import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { gravarSessao } from '@/api/session';

export default function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);

  const login = useMutation({
    mutationFn: () => api.post(endpoints.auth.login, { email: email.trim(), password: senha }),
    onSuccess: (res) => {
      gravarSessao({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      navigate('/visao-geral', { replace: true });
    },
  });

  function enviar(e) {
    e.preventDefault();
    if (!email.trim() || !senha) return;
    login.mutate();
  }

  return (
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
  );
}
