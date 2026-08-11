# Risco de segurança: credenciais em Web Storage

- Identificador: `RISK-SESSION-001`
- Estado: aberto, com mitigação planejada
- Ativos afetados: access token, refresh token e sessão autenticada
- Implementação atual: `localStorage` quando "manter conectado" está ativo e `sessionStorage` nos demais casos

## Risco

Qualquer JavaScript executado na origem da aplicação consegue ler Web Storage. Uma vulnerabilidade XSS ou dependência comprometida pode exfiltrar access e refresh tokens, permitindo sequestro de sessão. `sessionStorage` reduz persistência, mas não impede leitura por scripts da mesma aba.

## Controles atuais

- access tokens possuem expiração curta;
- refresh tokens são rotacionados e armazenados no servidor somente como hash;
- reutilização fora da janela de tolerância revoga as sessões do usuário;
- logout revoga refresh tokens;
- o frontend compartilha renovações concorrentes e não encerra a sessão em falhas transitórias;
- a TPS automatizada exige 12/12 cenários corretos entre backend e frontend.

## Tratamento planejado

Migrar o refresh token para cookie `HttpOnly`, `Secure` e `SameSite`, com proteção CSRF e revisão de CORS. A execução e os critérios estão no ticket [`SEC-001`](../backlog/SEC-001-http-only-session.md).

## Risco residual

Até a migração, a exposição a XSS permanece alta para confidencialidade da sessão. A TPS comprova o comportamento do ciclo de vida, mas não elimina esse vetor de armazenamento.
