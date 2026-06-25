#!/usr/bin/env python3
"""
Automação de desenvolvimento local — sobe backend + frontend de uma vez.

Uso:
  python dev.py start   — sobe banco + 4 serviços (backend) e serve o frontend em :3000
  python dev.py front   — serve só o frontend em http://localhost:3000
  python dev.py back     — sobe só o backend (banco + serviços)
  python dev.py stop     — para o backend (banco + serviços)

Observação: o backend só aceita CORS de http://localhost:3000, por isso o frontend
é sempre servido nessa porta. Não abra os HTML direto (file://) — as requisições
seriam bloqueadas e o api.js apontaria para produção.
"""
import os
import sys
import subprocess
import webbrowser

# Raiz do frontend (onde este script está)
FRONT_DIR = os.path.dirname(os.path.abspath(__file__))

# Backend: projeto irmão. Ajuste aqui se estiver em outro lugar.
BACKEND_DIR = os.path.abspath(os.path.join(FRONT_DIR, "..", "JustDoIt"))
BACKEND_LOCAL = os.path.join(BACKEND_DIR, "docs", "automações", "local.py")
ENV_FILE = os.path.join(BACKEND_DIR, "infra", ".env")

PORT = 3000  # CORS do backend só aceita http://localhost:3000


def load_env():
    """Carrega infra/.env no os.environ para que o docker-compose E as janelas do
    gradle (serviços Spring) herdem JWT_SECRET, senhas e CORS."""
    if not os.path.isfile(ENV_FILE):
        print(f"[ERRO] Falta o arquivo de variáveis: {ENV_FILE}")
        print("Crie a partir de infra/.env.example (SPRING_DATASOURCE_PASSWORD, "
              "REDIS_PASSWORD, CORS_ALLOWED_ORIGINS, JWT_SECRET).")
        sys.exit(1)
    with open(ENV_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip()
    print(f"[ENV] Carregado {ENV_FILE}")


def serve_front():
    print(f"\n[FRONT] Servindo {FRONT_DIR} em http://localhost:{PORT}")
    if sys.platform == "win32":
        # abre em janela própria pra não travar o terminal
        subprocess.Popen(
            f'start "justdoit-frontend" cmd /k python -m http.server {PORT}',
            cwd=FRONT_DIR, shell=True
        )
    else:
        subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=FRONT_DIR)
    webbrowser.open(f"http://localhost:{PORT}")


def backend(cmd):
    if not os.path.isfile(BACKEND_LOCAL):
        print(f"[ERRO] Não encontrei o script do backend em:\n  {BACKEND_LOCAL}")
        print("Ajuste BACKEND_DIR no topo do dev.py.")
        sys.exit(1)
    if cmd != "stop":
        load_env()
    print(f"\n[BACK] {cmd} -> {BACKEND_LOCAL}")
    subprocess.run([sys.executable, BACKEND_LOCAL, cmd], check=True)


def main():
    commands = ["start", "front", "back", "stop"]
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        print(f"Uso: python dev.py [{' | '.join(commands)}]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "start":
        backend("start")
        serve_front()
        print("\nTudo no ar. Acesse http://localhost:3000")
    elif cmd == "front":
        serve_front()
    elif cmd == "back":
        backend("start")
    elif cmd == "stop":
        backend("stop")
        print("Backend parado. Feche a janela do frontend manualmente (ou Ctrl+C nela).")


if __name__ == "__main__":
    main()
