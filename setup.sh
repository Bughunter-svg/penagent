#!/bin/bash
set -e

echo "Setting up PenAgent..."

# Backend setup
cd /home/harshu/penagent/backend
echo "Installing backend dependencies..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ../.env ]; then
    cp ../.env.example ../.env
    echo "Created .env file"
fi

# Install security tools
echo "Checking and installing required security tools..."
mkdir -p ~/go/bin
export PATH=$PATH:~/go/bin

if ! command -v pdtm &> /dev/null; then
    echo "Installing pdtm (ProjectDiscovery Tool Manager)..."
    go install -v github.com/projectdiscovery/pdtm/cmd/pdtm@latest || {
        # Fallback to direct download if Go is not installed
        echo "Go not found or failed, installing pdtm binary directly..."
        curl -L https://github.com/projectdiscovery/pdtm/releases/download/v1.1.13/pdtm_1.1.13_linux_amd64.zip -o pdtm.zip
        unzip pdtm.zip pdtm
        mv pdtm ~/go/bin/
        chmod +x ~/go/bin/pdtm
        rm pdtm.zip
    }
fi

echo "Installing tools via pdtm..."
# Install the core tools we need
~/go/bin/pdtm -install subfinder,httpx,nuclei,katana,naabu,dnsx

echo "Adding ~/go/bin to PATH in .env if not present..."
if ! grep -q "PATH=" ../.env; then
    echo "PATH=\$PATH:$HOME/go/bin" >> ../.env
fi

# Frontend setup
cd /home/harshu/penagent/frontend
echo "Installing frontend dependencies..."
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
if command -v nvm &> /dev/null; then
    nvm install 20
    nvm use 20
fi
npm install

echo "Setup complete! You can now run ./start.sh"
