#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERR]${NC}  $1" >&2; }

echo -e "${CYAN}"
cat <<'EOF'
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
__     __        _ _____          _                   
\ \   / /__ _ __(_)  ___|_ _  ___| |_ ___  _ __ _   _ 
 \ \ / / _ \ |__| | |_ / _` |/ __| __/ _ \| `__| | | |
  \ V /  __/ |  | |  _| (_| | (__| || (_) | |  | |_| |
   \_/ \___|_|  |_|_|  \__,_|\___|\__\___/|_|   \__, |
                                                |___/ 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
EOF
echo -e "${NC}"

if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Docker daemon is not running. Start Docker Desktop or the Docker service and try again."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  error "'docker compose' plugin is missing. Please install Docker Compose v2."
  exit 1
fi

FORCE_ENV=false
if [[ "${1:-}" == "--reset-env" ]]; then
  FORCE_ENV=true
fi

setup_env() {
  local src="$1"
  local dest="$2"

  if [[ ! -f "$src" ]]; then
    warn "Template $src not found, skipping$dest"
    return
  fi

  if [[ ! -f "$dest" || "$FORCE_ENV" == true ]]; then
    cp "$src" "$dest"
    success "Created $dest from$src"
  else
    info "$dest already exists (keeping existing config; pass --reset-env to overwrite)"
  fi
}

info "Checking environment configuration..."
setup_env ".env.example" ".env"
setup_env "./vite_frontend/.env.example" "./vite_frontend/.env"
setup_env "./backend/.env.example" "./backend/.env"

set -a
source .env
set +a

info "Building and starting VeriFactory stack..."
docker compose up -d --build --remove-orphans

info "Waiting for database to become healthy..."
for i in {1..30}; do
  if docker compose ps postgres --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
    success "PostgreSQL is healthy!"
    break
  fi
  if [[ $i -eq 30 ]]; then
    warn "Database took longer than expected to report healthy. Check 'docker compose logs postgres'."
  fi
  sleep 1
done

SERVER_PORT="${SERVER_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

echo ""
echo -e "${GREEN}${BOLD}VeriFactory is up and running!${NC}"
echo "------------------------------------------------------"
echo -e "  ${BOLD}Frontend UI:${NC}   http://localhost:${FRONTEND_PORT}"
echo -e "  ${BOLD}Backend API:${NC}   http://localhost:${SERVER_PORT}/api/v1"
echo -e "  ${BOLD}View Logs:${NC}     docker compose logs -f"
echo -e "  ${BOLD}Stop Stack:${NC}    docker compose down"
echo "------------------------------------------------------"
