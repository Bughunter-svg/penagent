#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Ensure tools are in PATH
export PATH=$PATH:$HOME/go/bin:$HOME/.pdtm/go/bin

echo "Starting PenAgent Backend on port 8000..."
cd /home/harshu/penagent/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting PenAgent Frontend on port 5173..."
cd /home/harshu/penagent/frontend

# Load nvm if available
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
if command -v nvm &> /dev/null; then
    nvm use 20 || nvm install 20
fi

# Start frontend
npm run dev -- --port 5173 --host 0.0.0.0 &
FRONTEND_PID=$!

# Trap SIGINT to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo "PenAgent is running!"
echo "Backend API: http://localhost:8000/api"
echo "Backend Docs: http://localhost:8000/docs"
echo "Frontend UI: http://localhost:5173"
echo "Press Ctrl+C to stop."

# Wait for processes
wait
