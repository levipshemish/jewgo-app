FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive

# Base tooling for development in background agents. Do NOT copy app code here.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    build-essential \
    sudo \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user and set home as working directory
RUN useradd -m -s /bin/bash ubuntu \
  && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu

USER ubuntu
WORKDIR /home/ubuntu

# Helpful env for Python and PATH hygiene
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VIRTUAL_ENV=/home/ubuntu/.venv \
    PATH=/home/ubuntu/.local/bin:/home/ubuntu/.venv/bin:$PATH

# Optionally preinstall common JS package managers (commented to keep image lean)
# RUN npm install -g pnpm yarn

# Keep container available for interactive agent tasks; no app is started here
CMD ["bash", "-lc", "sleep infinity"]


