# 📚 JewGo Documentation

**Last Updated**: August 2025  
**Status**: Active Documentation Hub

---

## 🗂️ Documentation Structure

### 📋 Core Documentation
- **[README.md](../README.md)** - Project overview and quick start
- **[AGENTS.md](../AGENTS.md)** - AI agent configuration and rules
- **[RULES.md](../RULES.md)** - Development rules and standards
- **[DEPRECATIONS.md](DEPRECATIONS.md)** - Deprecated code tracking

### 🚀 Deployment & Setup
- **[deployment/](deployment/)** - Docker, build, and deployment guides
- **[setup/](setup/)** - Initial setup and configuration guides
- **[migration/](migration/)** - Database and system migrations

### 📊 Monitoring & Reports
- **[monitoring/](monitoring/)** - Monitoring and observability guides
- **[reports/](reports/)** - Current system status and audit reports
- **[status-reports/](status-reports/)** - Real-time system status

### 🧹 Maintenance & Cleanup
- **[cleanup-reports/](cleanup-reports/)** - Code cleanup documentation
- **[implementation-reports/](implementation-reports/)** - Feature implementation summaries

### 🔧 Development
- **[development/](development/)** - Development guides and workflows
- **[api/](api/)** - API documentation and guides
- **[database/](database/)** - Database schema and management
- **[security/](security/)** - Security guidelines and implementations

### 🎨 Design & Features
- **[design/](design/)** - Design system and guidelines
- **[features/](features/)** - Feature specifications and guides
- **[frontend/](frontend/)** - Frontend-specific documentation

### 📈 Business & Analytics
- **[business/](business/)** - Business logic and requirements
- **[analytics/](analytics/)** - Analytics and data insights
- **[marketplace/](marketplace/)** - Marketplace functionality

### 🧪 Testing & Quality
- **[testing/](testing/)** - Testing strategies and guides
- **[performance/](performance/)** - Performance optimization guides

### 👥 Team & Implementation
- **[team/](team/)** - Team processes and training
- **[implementations/](implementations/)** - Implementation standards

---

## 📖 Quick Navigation

### 🚀 Getting Started
1. **[README.md](../README.md)** - Project overview
2. **[setup/QUICK_START.md](setup/QUICK_START.md)** - Quick start guide
3. **[setup/SUPABASE_SETUP.md](setup/SUPABASE_SETUP.md)** - Database setup
4. **[deployment/DOCKER_SETUP.md](deployment/DOCKER_SETUP.md)** - Docker setup

### 🔧 Development Workflow
1. **[development/DEVELOPMENT_WORKFLOW.md](development/DEVELOPMENT_WORKFLOW.md)** - Development process
2. **[RULES.md](../RULES.md)** - Development rules
3. **[api/API_ENDPOINTS_SUMMARY.md](api/API_ENDPOINTS_SUMMARY.md)** - API reference
4. **[testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md)** - Testing guide

### 🚀 Deployment
1. **[deployment/DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)** - Deployment process
2. **[deployment/DOCKER_PRODUCTION_SETUP.md](deployment/DOCKER_PRODUCTION_SETUP.md)** - Production setup
3. **[monitoring/MONITORING_UPDATE_ACTION_PLAN.md](monitoring/MONITORING_UPDATE_ACTION_PLAN.md)** - Monitoring setup

### 🧹 Maintenance
1. **[cleanup-reports/CONSOLIDATED_CLEANUP_SUMMARY.md](cleanup-reports/CONSOLIDATED_CLEANUP_SUMMARY.md)** - Current cleanup status
2. **[DEPRECATIONS.md](DEPRECATIONS.md)** - Deprecated code tracking
3. **[reports/SYSTEM_STATUS_REPORT.md](reports/SYSTEM_STATUS_REPORT.md)** - System status

---

## 📝 Documentation Standards

### File Naming
- Use descriptive, kebab-case names
- Include date in filename for time-sensitive docs
- Use consistent prefixes for categorization

### Content Structure
- Start with executive summary
- Include date and status
- Use clear headings and navigation
- Link to related documents

### Maintenance
- Update dates when content changes
- Archive outdated content to `archive/`
- Keep current documentation in appropriate subdirectories
- Regular review and cleanup of documentation

### Environment Variables Policy
- Never publish real values in documentation or examples.
- Use placeholders only (e.g., `https://<PROJECT_ID>.supabase.co`, `<YOUR_ADMIN_TOKEN>`).
- Store real values only in environment files: root `.env` (backend) and `frontend/.env.local` (frontend), or in your hosting provider’s secret manager.
- Reference example templates like `frontend/.env.example` for the list of supported keys.

---

## 🔄 Recent Updates

- **January 2025**: Major documentation reorganization
- **August 2025**: Latest implementation reports added
- **Ongoing**: Regular cleanup and consolidation

---

*For questions about documentation organization, refer to the cleanup reports or contact the development team.* 
