FROM mcr.microsoft.com/devcontainers/python:1-3.11-bullseye

RUN apt-get update && apt-get install -y \
    curl \
    git \
    make \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm (same as Go dockerfile)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs

# Set up sudo access first
RUN usermod -aG sudo vscode && \
    echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to vscode user
USER vscode
WORKDIR /home/vscode

# Configure npm to use user directory for global packages
RUN mkdir -p ~/.npm-global && \
    npm config set prefix '~/.npm-global'

# Add npm global bin to PATH
RUN echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc && \
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.profile

# Try to install Claude CLI - skip if not available
RUN npm install -g @anthropic-ai/claude-code 2>/dev/null || \
    npm install -g claude 2>/dev/null || \
    echo "Claude CLI not available via npm - you may need to install it manually"

# Install Python packages
COPY --chown=vscode:vscode requirements.txt /tmp/
RUN pip install --user --upgrade pip && \
    pip install --user -r /tmp/requirements.txt

WORKDIR /workspace