# Multi-stage Dockerfile for optimal backend build performance
# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

# Set environment variables for non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install only build dependencies needed for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime image
FROM python:3.11-slim AS runtime

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PATH="/home/appuser/.local/bin:${PATH}"
ENV PYTHONPATH="/app"

# Install only essential runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Runtime tools
    curl \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user first
RUN useradd -m -u 1000 appuser

# Copy Python packages from builder stage to user's home
COPY --from=builder /root/.local /home/appuser/.local

# Set working directory
WORKDIR /app

# Copy source code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Default command
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
