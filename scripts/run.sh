#!/usr/bin/env bash
# ============================================================
# IsStraitHormuzOpen? — one-command local runner
#
# What it does:
#   1) Verifies Node is installed
#   2) Bootstraps .env.local from .env.local.example if missing
#   3) Reports which API keys are configured (without leaking them)
#   4) Installs dependencies if node_modules is missing
#   5) Starts Next.js dev server (web)
#   6) Starts AIS collector (only if AISSTREAM_KEY is set)
#   7) Streams both logs with [web] / [ais] prefixes
#   8) Opens http://localhost:PORT in your browser
#   9) Ctrl-C cleanly shuts everything down
#
# Usage:
#   npm run start:local
#   # or directly:
#   bash scripts/run.sh
#   # custom port:
#   PORT=4000 bash scripts/run.sh
#   # skip browser auto-open:
#   NO_OPEN=1 bash scripts/run.sh
# ============================================================
set -euo pipefail

# --- locate project root (this script lives in scripts/) -----
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# --- colors ---------------------------------------------------
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
  RED="$(tput setaf 1)"; GRN="$(tput setaf 2)"; YEL="$(tput setaf 3)"
  BLU="$(tput setaf 4)"; CYA="$(tput setaf 6)"; DIM="$(tput dim)"
  BLD="$(tput bold)"; RST="$(tput sgr0)"
else
  RED=""; GRN=""; YEL=""; BLU=""; CYA=""; DIM=""; BLD=""; RST=""
fi

say()   { printf "%s▶%s  %s\n"  "$CYA" "$RST" "$*"; }
ok()    { printf "%s✓%s  %s\n"  "$GRN" "$RST" "$*"; }
warn()  { printf "%s⚠%s  %s\n"  "$YEL" "$RST" "$*"; }
die()   { printf "%s✗%s  %s\n"  "$RED" "$RST" "$*" >&2; exit 1; }

banner() {
  printf "\n%s%s %s%s\n" "$BLD" "▌" "IsStraitHormuzOpen? — local dev" "$RST"
  printf "%s%s%s\n\n"  "$DIM" "──────────────────────────────────" "$RST"
}
banner

# --- 1. Node check -------------------------------------------
command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node 20 LTS: https://nodejs.org"
ok "Node $(node -v)"

# --- 2. .env.local bootstrap ---------------------------------
if [[ ! -f .env.local ]]; then
  if [[ -f .env.local.example ]]; then
    warn ".env.local was missing — copied from .env.local.example"
    cp .env.local.example .env.local
  else
    warn ".env.local missing and no .env.local.example to copy from. Continuing without keys."
    : > .env.local
  fi
fi

# Helper: returns 0 if KEY has a non-empty value in .env.local
has_key() {
  grep -Eq "^[[:space:]]*$1[[:space:]]*=[[:space:]]*[^[:space:]#].*$" .env.local 2>/dev/null
}

say "Environment configuration:"
if has_key EIA_API_KEY;   then ok "  EIA_API_KEY      set     ${DIM}(Brent/WTI via EIA, Yahoo fallback)${RST}"
else                           warn "  EIA_API_KEY      missing ${DIM}(falls back to Yahoo Finance)${RST}"; fi
if has_key AISSTREAM_KEY; then ok "  AISSTREAM_KEY    set     ${DIM}(map shows live AIS vessels)${RST}"
else                           warn "  AISSTREAM_KEY    missing ${DIM}(map shows simulated lanes)${RST}"; fi
echo

# --- 3. Install dependencies if needed -----------------------
if [[ ! -d node_modules ]]; then
  say "Installing dependencies (first run — this can take a minute)…"
  npm install
  ok "Dependencies installed"
elif [[ package.json -nt node_modules ]]; then
  say "package.json changed — running npm install…"
  npm install
  ok "Dependencies up to date"
fi

# --- 4. Port pre-flight --------------------------------------
PORT="${PORT:-3000}"
if command -v lsof >/dev/null 2>&1 && lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  die "Port $PORT is already in use. Set PORT=<n> to use another, e.g. PORT=4000 npm run start:local"
fi

# --- 5. Subprocess plumbing ----------------------------------
pids=()
cleanup() {
  printf "\n%s⚠%s  Shutting down…\n" "$YEL" "$RST"
  for p in "${pids[@]:-}"; do
    if [[ -n "$p" ]] && kill -0 "$p" 2>/dev/null; then
      kill "$p" 2>/dev/null || true
    fi
  done
  # Give children a beat to exit, then force
  sleep 0.5
  for p in "${pids[@]:-}"; do
    if [[ -n "$p" ]] && kill -0 "$p" 2>/dev/null; then
      kill -9 "$p" 2>/dev/null || true
    fi
  done
  ok "Stopped"
  exit 0
}
trap cleanup INT TERM

# Prefixer: tags each line with a colored label. Uses awk for
# line-buffered fflush so the output doesn't get held up.
prefix() {
  local label="$1"
  local color="$2"
  awk -v lbl="$label" -v c="$color" -v r="$RST" -v d="$DIM" '
    { printf "%s%s%s %s|%s %s\n", c, lbl, r, d, r, $0; fflush() }
  '
}

# --- 6. Start the web server ---------------------------------
say "Starting Next.js dev server on ${BLD}http://localhost:${PORT}${RST}"
( node node_modules/next/dist/bin/next dev -p "$PORT" 2>&1 | prefix "[web]" "$BLU" ) &
pids+=("$!")

# --- 7. Start the AIS collector if configured ----------------
if has_key AISSTREAM_KEY; then
  say "Starting AIS collector (Strait of Hormuz bounding box)"
  ( node scripts/ais-collector.mjs 2>&1 | prefix "[ais]" "$GRN" ) &
  pids+=("$!")
else
  warn "Skipping AIS collector — set AISSTREAM_KEY in .env.local to enable real vessel positions"
fi

# --- 8. Open the browser after a beat ------------------------
if [[ "${NO_OPEN:-0}" != "1" ]]; then
  (
    # wait until the port is actually listening, then open
    for i in $(seq 1 30); do
      if command -v lsof >/dev/null 2>&1 && lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        if command -v open >/dev/null 2>&1; then
          open "http://localhost:${PORT}" >/dev/null 2>&1 || true
        elif command -v xdg-open >/dev/null 2>&1; then
          xdg-open "http://localhost:${PORT}" >/dev/null 2>&1 || true
        fi
        break
      fi
      sleep 0.5
    done
  ) &
fi

echo
ok "${BLD}Up and running.${RST}  Press ${BLD}Ctrl-C${RST} to stop everything."
echo

# --- 9. Wait. If any child dies, exit and clean up the rest. -
# `wait -n` returns when the first child exits.
wait -n
exit_code=$?
warn "A child process exited (code $exit_code). Cleaning up the rest…"
cleanup
