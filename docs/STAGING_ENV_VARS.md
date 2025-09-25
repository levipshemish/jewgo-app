# Staging Environment Variables

Use this checklist when updating the staging deployment. The staging `.env` (or secrets store) should include the following overrides in addition to the production defaults:

## Geo Debug Header
```bash
ENABLE_GEO_DEBUG_HEADER=true
```

Setting this flag enables the `debug_geo=true` response header path so QA can validate distance calculations without accessing backend logs. Leave the value `false` (or unset) in production.

## Deployment Notes
- The backend container now reads `ENABLE_GEO_DEBUG_HEADER` from the environment (see `docker-compose.yml` and `config/docker/docker-compose.optimized.yml`).
- Restart the backend service after toggling the flag: `docker compose restart backend`.
- Remember to unset or disable the flag once validation is complete in production-like environments.
