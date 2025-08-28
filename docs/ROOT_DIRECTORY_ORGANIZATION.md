# 📁 Root Directory Organization

See also: `docs/AGENTS.md` (Contributor Repository Guidelines) and root `AGENTS.md` (Agent guardrails/workflow).

## 🎯 **Overview**
The JewGo project root directory has been organized for better maintainability and clarity. This document explains the structure and where to find different types of files.

## 📂 **Root Directory Structure**

### **Core Application Directories**
```
├── frontend/           # Next.js frontend application
├── backend/           # Python Flask backend application
├── scripts/           # Utility and maintenance scripts
# monitoring/ directory removed (was empty)
├── data/              # Data files and datasets
└── docs/              # Project documentation (organized)
```

### **Configuration Files**
```
├── .env               # Environment variables
├── .env.local         # Local environment overrides
├── .gitignore         # Git ignore patterns
├── .pre-commit-config.yaml  # Pre-commit hooks
├── pyproject.toml     # Python project configuration
├── requirements.txt   # Python dependencies
├── render.yaml        # Render deployment configuration
├── vercel.json        # Vercel deployment configuration
├── runtime.txt        # Python runtime specification
└── Procfile          # Heroku deployment configuration
```

### **Documentation**
```
├── README.md          # Main project README
└── docs/              # Organized documentation
    ├── reports/       # Summary reports and fixes
    ├── status/        # Project status files
    ├── implementations/ # Implementation guides
    ├── deployment/    # Deployment documentation
    ├── maintenance/   # Maintenance guides
    ├── features/      # Feature documentation
    └── ...            # Other organized docs
```

### **Archive Directories**
```
├── _archive/          # General archive files
├── docs_archive/      # Outdated documentation
└── florida_synagogues_project/  # Separate project archive
```

## 📋 **File Organization Rules**

### **Reports & Summaries** → `docs/reports/`
- Files ending in `_SUMMARY.md`
- Files ending in `_REPORT.md`
- Files ending in `_FIXES.md`
- Implementation summaries
- Audit reports

### **Status Files** → `docs/status/`
- Files containing "STATUS" in the name
- Setup completion files
- Admin management status

### **Implementation Guides** → `docs/implementations/`
- Files containing "IMPLEMENTATION" in the name
- Files ending in `_GUIDE.md`
- How-to guides and tutorials

### **Test Files** → `backend/tests/`
- Python test files (`test_*.py`)
- Backend-specific test files

### **Python Files** → `backend/`
- Python application files
- Backend-specific scripts

## 🔍 **Finding Files**

### **Looking for a specific report?**
```bash
# Search in reports directory
find docs/reports/ -name "*SUMMARY.md" -o -name "*REPORT.md"
```

### **Looking for implementation guides?**
```bash
# Search in implementations directory
find docs/implementations/ -name "*GUIDE.md" -o -name "*IMPLEMENTATION*"
```

### **Looking for status updates?**
```bash
# Search in status directory
find docs/status/ -name "*STATUS*" -o -name "*COMPLETE*"
```

## 📊 **Benefits of This Organization**

### **Cleaner Root Directory**
- ✅ Only essential files in root
- ✅ Easy to find configuration files
- ✅ Clear separation of concerns

### **Better Documentation Management**
- ✅ Logical grouping of related files
- ✅ Easy to locate specific types of documentation
- ✅ Reduced clutter in root directory

### **Improved Maintainability**
- ✅ Clear file organization rules
- ✅ Consistent naming conventions
- ✅ Easy to add new files in correct locations

## 🛠️ **Maintenance**

### **Adding New Files**
1. **Reports/Summaries** → `docs/reports/`
2. **Status Updates** → `docs/status/`
3. **Implementation Guides** → `docs/implementations/`
4. **Test Files** → `backend/tests/`
5. **Configuration** → Root directory (if project-wide)

### **Moving Existing Files**
Use the established patterns:
- `*_SUMMARY.md` → `docs/reports/`
- `*_STATUS*` → `docs/status/`
- `*_GUIDE.md` → `docs/implementations/`
- `test_*.py` → `backend/tests/`

## 📈 **Statistics**

### **Before Organization**
- **Root files**: 25+ documentation files
- **Clutter**: High
- **Findability**: Poor

### **After Organization**
- **Root files**: 2 documentation files (README.md, TASKS.md)
- **Clutter**: Minimal
- **Findability**: Excellent

---

**Last Updated**: August 10, 2024
**Organization Completed**: ✅
**Next Review**: Monthly
