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

PORT=$(grep -E '^PORT=' .env | tail -n 1 | cut -d= -f2- || true)
PORT=${PORT:-8067}

# This machine's IPv4 addresses, leaving out Docker's internal networks.
addresses() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 -o addr show scope global | awk '$2 !~ /^(docker|br-|veth)/ {split($4, a, "/"); print a[1]}'
  else
    ifconfig | awk '$1 == "inet" && $2 != "127.0.0.1" {print $2}'
  fi
}

docker compose up -d --build

# Wait until the API answers through the proxy, so a crash on startup isn't missed.
api_up() {
  local code
  code=$(curl -s -o /dev/null -m 2 -w '%{http_code}' "http://localhost:$PORT/api/" || true)
  [ "$code" != "000" ] && [ "$code" != "502" ] && [ "$code" != "503" ]
}
if command -v curl >/dev/null 2>&1; then
  printf "Waiting for the API"
  for _ in $(seq 1 30); do
    api_up && break
    printf "."
    sleep 1
  done
  if ! api_up; then
    echo
    echo "The API didn't start. See why with: docker compose logs api" >&2
    exit 1
  fi
  echo " ok"
fi

echo
echo "Kvist & Bjælke is running. Open it on one of these addresses:"
for ip in $(addresses); do
  echo "  http://$ip:$PORT"
done
echo "  http://localhost:$PORT  (on this machine)"
echo
echo "Stop it with: docker compose down"
