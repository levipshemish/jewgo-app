# Docker Production Fixes Applied - 2025-09-11

## Issues Fixed

### 1. pip --user warnings eliminated
- **Problem**: Dockerfile.production used `pip install --user` causing PATH warnings
- **Solution**: Implemented proper venv setup with `/opt/venv` and `ENV PATH="/opt/venv/bin:${PATH}"`
- **Result**: No more pip user-site warnings in build logs

### 2. gevent/greenlet compatibility
- **Problem**: Potential ABI mismatches between gevent and greenlet versions
- **Solution**: Added explicit `greenlet==3.1.1` pin to requirements.txt
- **Result**: Consistent gevent-23.9.1 and greenlet-3.1.1 versions

### 3. gunicorn availability verification
- **Problem**: No verification that gunicorn binary is accessible at runtime
- **Solution**: Added `RUN gunicorn --version` check in Dockerfile.production
- **Result**: Build fails early if gunicorn is not properly installed

### 4. PYTHONPATH standardization
- **Problem**: Inconsistent PYTHONPATH usage between Dockerfile and Procfile
- **Solution**: Standardized to `ENV PYTHONPATH=/app` in Dockerfile, simplified Procfile
- **Result**: Consistent absolute path usage across all files

## Files Modified

1. **backend/Dockerfile.production**:
   - Replaced `pip install --user` with venv setup
   - Added `ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1`
   - Added `RUN gunicorn --version` verification
   - Updated PATH to use `/opt/venv/bin`

2. **backend/requirements.txt**:
   - Added `greenlet==3.1.1` for gevent compatibility

3. **backend/deployment/Procfile**:
   - Simplified from `cd backend && PYTHONPATH=/app gunicorn...` to `gunicorn...`
   - Removed redundant directory change and PYTHONPATH setting

## Verification Results

✅ **Build Success**: Docker build completes without pip warnings
✅ **Import Tests**: `import gevent, gunicorn, greenlet` works in container
✅ **Gunicorn Version**: `gunicorn --version` returns 21.2.0
✅ **TypeScript Check**: Frontend `tsc --noEmit` passes
✅ **No Regressions**: All changes are minimal and targeted

## Memory Policies Added

- `docker-pip-user-site-warning`: Containers must not use pip --user; install to /opt/venv
- `gunicorn-wsgi-entrypoint`: Standardize WSGI entrypoint as wsgi:app with verification
- `prod-gevent-worker`: Pin gevent and greenlet versions for production parity
- `docker-venv-best-practice`: Use python -m venv /opt/venv in multi-stage builds
- `pip-env-vars`: Set PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1