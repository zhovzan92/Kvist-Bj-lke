#!/usr/bin/env bash
# Builds and starts the app with Docker, then prints the addresses to open it on.
#   ./start.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env. Set JWT_SECRET and ADMIN_PASSWORD in it, then run ./start.sh again."
  exit 1
fi

# Reads a setting from .env, or prints the default.
setting() {
  local value
  value=$(grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- || true)
  echo "${value:-$2}"
}

# This machine's IP on the network (the one used for outgoing traffic).
detect_ip() {
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit }}'
  elif hostname -I >/dev/null 2>&1; then
    hostname -I | awk '{print $1}'
  else
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  fi
}

PUBLIC_HOST=$(setting PUBLIC_HOST "")
if [ -z "$PUBLIC_HOST" ]; then
  PUBLIC_HOST=$(detect_ip)
fi
if [ -z "$PUBLIC_HOST" ]; then
  echo "Couldn't find this machine's IP. Set PUBLIC_HOST in .env and try again." >&2
  exit 1
fi
export PUBLIC_HOST

API_PORT=$(setting API_PORT 18067)
CLIENT_PORT=$(setting CLIENT_PORT 8067)

echo "Building and starting on $PUBLIC_HOST..."
docker compose up -d --build

# Wait until the API answers, so a crash on startup isn't missed.
if command -v curl >/dev/null 2>&1; then
  printf "Waiting for the API"
  for _ in $(seq 1 30); do
    if curl -s -o /dev/null -m 2 "http://localhost:$API_PORT/"; then
      echo " ok"
      break
    fi
    printf "."
    sleep 1
  done
  if ! curl -s -o /dev/null -m 2 "http://localhost:$API_PORT/"; then
    echo
    echo "The API didn't start. See why with: docker compose logs api" >&2
    exit 1
  fi
fi

echo
echo "Kvist & Bjælke is running:"
echo "  Client:  http://$PUBLIC_HOST:$CLIENT_PORT"
echo "  API:     http://$PUBLIC_HOST:$API_PORT"
echo
echo "Stop it with: docker compose down"
