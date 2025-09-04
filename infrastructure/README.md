# JewGo Infrastructure

This directory contains all infrastructure documentation, scripts, and configurations.

## Quick Start
1. Review `../quick-reference.md`
2. Run `../deploy-infrastructure.sh`
3. Monitor with `../monitor-infrastructure.sh`

## Security Note
- Keep backups of all configuration files
- Never commit sensitive credentials to version control
- Store Redis passwords and API keys securely
- Use environment variables for sensitive configuration

## Files Overview
- `../infrastructure-setup.md` - Complete setup documentation
- `../deploy-infrastructure.sh` - Deployment automation script
- `../monitor-infrastructure.sh` - Health monitoring script
- `../quick-reference.md` - Quick command reference
- `./README.md` - This file

## Next Steps
After reviewing the documentation:
1. Ensure all services are properly configured
2. Test the load balancer and health endpoints
3. Verify Redis connectivity and session sharing
4. Run load tests to validate performance
5. Set up monitoring and alerting
