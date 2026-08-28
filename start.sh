#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PATH="/usr/bin:/bin:/usr/local/bin:${PATH}:$HOME/go/bin:$HOME/.pdtm/go/bin"

if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source <(grep -v '^PATH=' "$SCRIPT_DIR/.env" | grep -v '^#')
    set +a
elif [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    set -a
    source <(grep -v '^PATH=' "$SCRIPT_DIR/.env" | grep -v '^#')
    set +a
fi

echo "Starting PenAgent Backend on port 8000..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting PenAgent Frontend on port 5173..."
cd "$SCRIPT_DIR/frontend"

if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm not found. Install Node.js (pacman -S nodejs npm) and re-run ./start.sh"
    wait $BACKEND_PID
    exit 1
fi

if [ ! -d node_modules ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

npm run dev -- --port 5173 --host 0.0.0.0 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

echo "PenAgent is running!"
echo "Backend API: http://localhost:8000/api"
echo "Backend Docs: http://localhost:8000/docs"
echo "Frontend UI: http://localhost:5173"
echo "Press Ctrl+C to stop."

wait
