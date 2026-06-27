#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_MAJOR_MIN=22
source "$ROOT_DIR/scripts/use-node-22.sh"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

node_major() {
  node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0
}

install_with_brew() {
  log "Installing system packages with Homebrew"
  brew update
  brew install node@22 sqlite || true
  source "$ROOT_DIR/scripts/use-node-22.sh"
}

install_with_apt() {
  log "Installing system packages with apt"
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl sqlite3 build-essential

  if ! has_cmd node || [ "$(node_major)" -lt "$NODE_MAJOR_MIN" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
}

install_with_dnf() {
  log "Installing system packages with dnf"
  sudo dnf install -y nodejs npm sqlite gcc gcc-c++ make
}

install_with_yum() {
  log "Installing system packages with yum"
  sudo yum install -y nodejs npm sqlite gcc gcc-c++ make
}

install_with_pacman() {
  log "Installing system packages with pacman"
  sudo pacman -Sy --needed nodejs npm sqlite base-devel
}

install_system_dependencies() {
  if has_cmd node && has_cmd npm && has_cmd sqlite3 && [ "$(node_major)" -ge "$NODE_MAJOR_MIN" ]; then
    log "System dependencies already installed"
    return
  fi

  case "$(uname -s)" in
    Darwin)
      if ! has_cmd brew; then
        cat <<'MSG'
Homebrew is required to install missing macOS system dependencies automatically.
Install it from https://brew.sh, then rerun ./install.sh.
MSG
        exit 1
      fi
      install_with_brew
      ;;
    Linux)
      if has_cmd apt-get; then
        install_with_apt
      elif has_cmd dnf; then
        install_with_dnf
      elif has_cmd yum; then
        install_with_yum
      elif has_cmd pacman; then
        install_with_pacman
      else
        cat <<'MSG'
Unsupported Linux package manager.
Install Node.js 22+, npm, sqlite3, and build tools, then rerun ./install.sh.
MSG
        exit 1
      fi
      ;;
    *)
      echo "Unsupported OS: $(uname -s)"
      exit 1
      ;;
  esac
}

verify_dependencies() {
  for cmd in node npm sqlite3; do
    if ! has_cmd "$cmd"; then
      echo "Missing required command after install: $cmd"
      exit 1
    fi
  done

  if [ "$(node_major)" -lt "$NODE_MAJOR_MIN" ]; then
    echo "Node.js $NODE_MAJOR_MIN+ is required. Found: $(node -v)"
    exit 1
  fi
}

cd "$ROOT_DIR"

install_system_dependencies
verify_dependencies

if [ ! -f .env ]; then
  log "Creating .env from .env.example"
  cp .env.example .env
  cat <<'MSG'

Edit .env and set GEMINI_API_KEY before starting the app.
MSG
else
  log ".env already exists"
fi

log "Installing Node dependencies"
npm install

log "Starting local PostgreSQL when configured"
npm run db:local

log "Initializing PostgreSQL and Prisma"
npm run db:init

log "Install complete"
printf 'Run: ./restart.sh 3000\n'
