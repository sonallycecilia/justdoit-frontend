#!/usr/bin/env python3
"""
Automação de desenvolvimento local — sobe backend + frontend de uma vez.

Uso:
  python dev.py start    — sobe infra + 4 serviços (backend) e serve o front em :3000
  python dev.py front    — serve só o front (React/Vite) em http://localhost:3000
  python dev.py back     — sobe só o backend (infra + serviços)
  python dev.py restart  — sobe a infra e relança os 4 serviços (feche as janelas antigas antes)
  python dev.py stop     — para a infra (MySQL+Redis). Feche as janelas dos serviços manualmente.

Observação: o backend só aceita CORS de http://localhost:3000, por isso o frontend
é sempre servido nessa porta. Não use a extensão Live Server do VS Code (porta
5500) — as requisições seriam bloqueadas pelo CORS e o app nem chega a carregar
(o Live Server não compila JSX, dá 404 em main.jsx).

Nota (2026-07): o refactor da arquitetura do backend removeu o antigo
docs/automações/local.py. Agora a infra sobe via docker-compose e cada serviço
via ./gradlew :services:<svc>:bootRun — este script orquestra os dois.

Nota (2026-07-21): o app vanilla da raiz foi aposentado — o front agora é só o
app React (Vite). Os comandos `start-react`/`react` viraram `start`/`front`.

Nota (2026-07-22): o app React saiu de react/ e virou a raiz do repo, então este
script roda o `npm run dev` no próprio diretório dele. Ver CLAUDE.md.
"""
import os
import sys
import subprocess
import webbrowser

# Raiz do frontend (onde este script está) — é também a raiz do app React/Vite,
# desde que o app foi promovido de react/ para a raiz do repo.
FRONT_DIR = os.path.dirname(os.path.abspath(__file__))

# Backend: projeto irmão. Ajuste aqui se estiver em outro lugar.
BACKEND_DIR = os.path.abspath(os.path.join(FRONT_DIR, "..", "JustDoIt"))
ENV_FILE = os.path.join(BACKEND_DIR, "infra", ".env")
COMPOSE_FILE = os.path.join(BACKEND_DIR, "infra", "docker-compose.yml")

# Serviços Spring (módulos do settings.gradle.kts). Cada um sobe em janela própria.
SERVICES = ["auth-service", "task-service", "schedule-service", "notification-service"]

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


def compose(*args):
    """Roda `docker compose -f infra/docker-compose.yml <args>` na raiz do backend."""
    if not os.path.isfile(COMPOSE_FILE):
        print(f"[ERRO] Não encontrei o docker-compose em:\n  {COMPOSE_FILE}")
        print("Ajuste BACKEND_DIR no topo do dev.py.")
        sys.exit(1)
    cmd = ["docker", "compose", "-f", COMPOSE_FILE, *args]
    print(f"[INFRA] {' '.join(args)}")
    subprocess.run(cmd, cwd=BACKEND_DIR, check=True)


def start_services():
    """Sobe cada serviço Spring em uma janela própria (bootRun), para não travar o
    terminal e deixar os logs visíveis. As variáveis do .env já estão em os.environ,
    então as janelas-filhas as herdam."""
    gradlew = "gradlew.bat" if sys.platform == "win32" else "./gradlew"
    for svc in SERVICES:
        task = f":services:{svc}:bootRun"
        print(f"[BACK] {svc} -> {task}")
        if sys.platform == "win32":
            subprocess.Popen(
                f'start "jdi-{svc}" cmd /k "{gradlew} {task}"',
                cwd=BACKEND_DIR, shell=True
            )
        else:
            subprocess.Popen([gradlew, task], cwd=BACKEND_DIR)


def serve_front():
    """Sobe o app React (Vite) via `npm run dev`, em janela própria. A porta 3000
    é obrigatória — o CORS do backend só aceita essa origem."""
    if not os.path.isfile(os.path.join(FRONT_DIR, "package.json")):
        print(f"[ERRO] Não encontrei o package.json do app React em:\n  {FRONT_DIR}")
        sys.exit(1)
    print(f"\n[FRONT] Servindo o app React (Vite) em http://localhost:{PORT}")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    if sys.platform == "win32":
        subprocess.Popen(
            f'start "justdoit-react" cmd /k "{npm} run dev"',
            cwd=FRONT_DIR, shell=True
        )
    else:
        subprocess.Popen([npm, "run", "dev"], cwd=FRONT_DIR)
    webbrowser.open(f"http://localhost:{PORT}")


def backend_up():
    """Infra (containers) + os 4 serviços Spring."""
    load_env()
    compose("up", "-d")
    start_services()
    print("\n[BACK] Infra no ar e serviços subindo (cada um na sua janela). "
          "Eles levam alguns segundos até responder.")


def main():
    commands = ["start", "front", "back", "restart", "stop"]
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        print(f"Uso: python dev.py [{' | '.join(commands)}]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "start":
        backend_up()
        serve_front()
        print("\nTudo no ar. Acesse http://localhost:3000")
    elif cmd == "front":
        serve_front()
    elif cmd == "back":
        backend_up()
    elif cmd == "restart":
        print("[BACK] Relançando serviços. Feche as janelas antigas (jdi-*) se ainda "
              "estiverem abertas, para não conflitar nas portas 8080-8083.")
        load_env()
        compose("up", "-d")
        start_services()
    elif cmd == "stop":
        load_env()
        compose("stop")
        print("Infra parada. Feche as janelas dos serviços (jdi-*) e do frontend "
              "manualmente (ou Ctrl+C em cada uma).")


if __name__ == "__main__":
    main()
