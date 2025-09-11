import multiprocessing
import os

# Gunicorn configuration file for JewGo Backend
# Updated for new file structure for production deployment
# Get port from environment variable or use default
port = int(os.environ.get("PORT", 5000))
# Server socket
bind = f"0.0.0.0:{port}"
backlog = 2048
# Worker processes - optimized for Oracle Cloud PostgreSQL
# Start with 2-4 workers as recommended for database connection pooling
workers = min(multiprocessing.cpu_count() * 2 + 1, 4)  # Cap at 4 workers
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30  # Reduced timeout for faster startup
keepalive = 2  # Reduced keepalive for faster startup
# Restart workers after this many requests, to help prevent memory leaks
preload_app = True
# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
# Process naming
proc_name = "jewgo-api"
# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None
# SSL (if needed)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"
# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
# Performance optimizations for Render
worker_tmp_dir = "/dev/shm"
worker_exit_on_app_exit = True
# Graceful shutdown settings
graceful_timeout = 30
preload_app = True
