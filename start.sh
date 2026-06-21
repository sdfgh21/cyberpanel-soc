#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "  🛡️  CyberPanel v2.1 — SOC Intelligence"
echo "  Root: $ROOT"
echo "  ─────────────────────────────────────"

if ! command -v node &>/dev/null; then
  echo "  [ERROR] Node.js not found. Install: https://nodejs.org/"
  exit 1
fi
echo "  [OK] Node $(node -v)"

echo "  [1/4] Installing backend..."
cd "$ROOT/backend" && npm install
echo "  [2/4] Installing frontend..."
cd "$ROOT/frontend" && npm install --legacy-peer-deps

echo "  [3/4] Starting backend (port 3001)..."
cd "$ROOT/backend" && node server.js &
BPID=$!
sleep 3

echo "  [4/4] Starting frontend (port 3000)..."
cd "$ROOT/frontend" && npm run dev &
FPID=$!

echo ""
echo "  ─────────────────────────────────────"
echo "  ✅ CyberPanel running!"
echo "  🌐 Frontend : http://localhost:3000"
echo "  🔧 Backend  : http://localhost:3001"
echo "  🔑 Login    : admin / admin123"
echo "  ⌨️  Ctrl+K  : Command palette"
echo "  🔍 /scanner : Web Security Scanner"
echo "  Press Ctrl+C to stop"
echo "  ─────────────────────────────────────"

trap "kill $BPID $FPID 2>/dev/null; echo 'Stopped.'; exit 0" INT TERM
wait
