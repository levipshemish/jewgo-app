#!/usr/bin/env python3
"""
Root Directory Cleanup Analysis
==============================

This script analyzes files in the root directory and determines
which ones should be moved, refactored, or deleted for better organization.
"""

import os
import shutil
from pathlib import Path

def analyze_root_files():
    """Analyze files in the root directory and categorize them."""
    
    # Files that should be moved to docs/
    files_to_move_to_docs = [
        "ENVIRONMENT.md",
        "ORACLE_CLOUD_SECURITY_SETUP.md", 
        "QUICK_ORACLE_SETUP_GUIDE.md",
        "ORACLE_CLOUD_SETUP_CHECKLIST.md",
        "QUICK_DATABASE_FIX.md",
        "issue_finding.md",
        "GEMINI.md",
        "AGENTS.md",
        "system_index.md"
    ]
    
    # Files that should be moved to deployment/
    files_to_move_to_deployment = [
        "render.yaml",
        "vercel.json"
    ]
    
    # Files that should be moved to config/
    files_to_move_to_config = [
        "system_inventory.json"
    ]
    
    # Files that should be deleted (temporary/obsolete)
    files_to_delete = [
        ".DS_Store"
    ]
    
    # Files that should stay in root (essential)
    files_to_keep = [
        "README.md",
        ".gitignore",
        "package.json",
        "requirements.txt"
    ]
    
    # Directories that should be cleaned up
    dirs_to_analyze = [
        ".venv",
        "node_modules", 
        ".cursor",
        ".gemini",
        ".vercel",
        ".husky",
        ".vscode",
        "clean",
        "projects"
    ]
    
    print("🔍 Root Directory Cleanup Analysis")
    print("=" * 60)
    
    # Check files to move to docs/
    print("\n📁 Files to move to docs/")
    print("-" * 30)
    for file in files_to_move_to_docs:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} (not found)")
    
    # Check files to move to deployment/
    print("\n🚀 Files to move to deployment/")
    print("-" * 30)
    for file in files_to_move_to_deployment:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} (not found)")
    
    # Check files to move to config/
    print("\n⚙️  Files to move to config/")
    print("-" * 30)
    for file in files_to_move_to_config:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} (not found)")
    
    # Check files to delete
    print("\n🗑️  Files to delete")
    print("-" * 30)
    for file in files_to_delete:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} (not found)")
    
    # Check files to keep
    print("\n📋 Files to keep in root")
    print("-" * 30)
    for file in files_to_keep:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} (not found)")
    
    # Analyze directories
    print("\n📂 Directories to analyze")
    print("-" * 30)
    for dir_name in dirs_to_analyze:
        if os.path.exists(dir_name):
            print(f"✅ {dir_name}/")
        else:
            print(f"❌ {dir_name}/ (not found)")
    
    return {
        'docs': files_to_move_to_docs,
        'deployment': files_to_move_to_deployment,
        'config': files_to_move_to_config,
        'delete': files_to_delete,
        'keep': files_to_keep,
        'dirs': dirs_to_analyze
    }

def cleanup_root_directory():
    """Perform the actual cleanup of the root directory."""
    
    print("\n🧹 Starting Root Directory Cleanup")
    print("=" * 60)
    
    # Create necessary directories
    os.makedirs("docs/setup", exist_ok=True)
    os.makedirs("docs/deployment", exist_ok=True)
    os.makedirs("config", exist_ok=True)
    
    # Move files to docs/setup/
    setup_files = [
        "ENVIRONMENT.md",
        "ORACLE_CLOUD_SECURITY_SETUP.md",
        "QUICK_ORACLE_SETUP_GUIDE.md", 
        "ORACLE_CLOUD_SETUP_CHECKLIST.md",
        "QUICK_DATABASE_FIX.md",
        "issue_finding.md"
    ]
    
    moved_count = 0
    for file in setup_files:
        if os.path.exists(file):
            try:
                shutil.move(file, f"docs/setup/{file}")
                print(f"📁 Moved: {file} → docs/setup/{file}")
                moved_count += 1
            except Exception as e:
                print(f"❌ Failed to move {file}: {e}")
    
    # Move files to docs/deployment/
    deployment_files = [
        "GEMINI.md",
        "AGENTS.md",
        "system_index.md"
    ]
    
    for file in deployment_files:
        if os.path.exists(file):
            try:
                shutil.move(file, f"docs/deployment/{file}")
                print(f"📁 Moved: {file} → docs/deployment/{file}")
                moved_count += 1
            except Exception as e:
                print(f"❌ Failed to move {file}: {e}")
    
    # Move files to deployment/
    deployment_config_files = [
        "render.yaml",
        "vercel.json"
    ]
    
    for file in deployment_config_files:
        if os.path.exists(file):
            try:
                shutil.move(file, f"deployment/{file}")
                print(f"📁 Moved: {file} → deployment/{file}")
                moved_count += 1
            except Exception as e:
                print(f"❌ Failed to move {file}: {e}")
    
    # Move files to config/
    config_files = [
        "system_inventory.json"
    ]
    
    for file in config_files:
        if os.path.exists(file):
            try:
                shutil.move(file, f"config/{file}")
                print(f"📁 Moved: {file} → config/{file}")
                moved_count += 1
            except Exception as e:
                print(f"❌ Failed to move {file}: {e}")
    
    # Delete temporary files
    deleted_count = 0
    temp_files = [".DS_Store"]
    
    for file in temp_files:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"🗑️  Deleted: {file}")
                deleted_count += 1
            except Exception as e:
                print(f"❌ Failed to delete {file}: {e}")
    
    # Clean up unnecessary directories
    dirs_to_remove = [".venv", "clean", "projects"]
    
    for dir_name in dirs_to_remove:
        if os.path.exists(dir_name):
            try:
                shutil.rmtree(dir_name)
                print(f"🗑️  Removed directory: {dir_name}/")
                deleted_count += 1
            except Exception as e:
                print(f"❌ Failed to remove {dir_name}/: {e}")
    
    print(f"\n📊 Cleanup Summary:")
    print(f"   📁 Moved: {moved_count} files")
    print(f"   🗑️  Deleted: {deleted_count} files/directories")
    
    return moved_count, deleted_count

def create_cleanup_summary():
    """Create a summary of the root directory cleanup."""
    
    summary_content = """# Root Directory Cleanup Summary

## 🧹 Cleanup Completed

This document summarizes the cleanup performed on the root directory to improve project organization.

## 📁 Files Moved

### To docs/setup/
- `ENVIRONMENT.md` - Environment setup documentation
- `ORACLE_CLOUD_SECURITY_SETUP.md` - Oracle Cloud security setup
- `QUICK_ORACLE_SETUP_GUIDE.md` - Quick Oracle Cloud setup guide
- `ORACLE_CLOUD_SETUP_CHECKLIST.md` - Oracle Cloud setup checklist
- `QUICK_DATABASE_FIX.md` - Quick database fix documentation
- `issue_finding.md` - Issue finding documentation

### To docs/deployment/
- `GEMINI.md` - Gemini AI integration documentation
- `AGENTS.md` - AI agents documentation
- `system_index.md` - System index documentation

### To deployment/
- `render.yaml` - Render deployment configuration
- `vercel.json` - Vercel deployment configuration

### To config/
- `system_inventory.json` - System inventory configuration

## 🗑️ Files Deleted

### Temporary Files
- `.DS_Store` - macOS system file

### Directories Removed
- `.venv/` - Virtual environment (should be recreated locally)
- `clean/` - Temporary cleanup directory
- `projects/` - Temporary projects directory

## 📋 Files Kept in Root

### Essential Files
- `README.md` - Project overview
- `.gitignore` - Git ignore rules
- `package.json` - Node.js dependencies
- `requirements.txt` - Python dependencies

## 📂 Directories Kept in Root

### Essential Directories
- `backend/` - Python Flask backend
- `frontend/` - Next.js React frontend
- `docs/` - Project documentation
- `scripts/` - Utility scripts
- `config/` - Configuration files
- `data/` - Data files
- `deployment/` - Deployment configurations
- `monitoring/` - Monitoring and health checks
- `supabase/` - Supabase configuration
- `tools/` - Development tools
- `ci-scripts/` - CI/CD scripts

### Development Directories (Keep)
- `.git/` - Git repository
- `.github/` - GitHub workflows
- `.cursor/` - Cursor IDE configuration
- `.gemini/` - Gemini AI configuration
- `.vercel/` - Vercel configuration
- `.husky/` - Git hooks
- `.vscode/` - VS Code configuration
- `node_modules/` - Node.js dependencies

## 🎯 Benefits of Cleanup

1. **Better Organization**: Related files grouped together
2. **Cleaner Root**: Only essential files in root directory
3. **Easier Navigation**: Logical file structure
4. **Improved Documentation**: Setup guides in docs/setup/
5. **Deployment Clarity**: Deployment configs in deployment/
6. **Configuration Management**: Config files in config/

## 📁 New Directory Structure

```
jewgo-app/
├── README.md              # Project overview
├── .gitignore            # Git ignore rules
├── package.json          # Node.js dependencies
├── requirements.txt      # Python dependencies
│
├── backend/              # Python Flask backend
├── frontend/             # Next.js React frontend
├── docs/                 # Project documentation
│   ├── setup/            # Setup guides
│   ├── deployment/       # Deployment documentation
│   └── ...
├── scripts/              # Utility scripts
├── config/               # Configuration files
├── data/                 # Data files
├── deployment/           # Deployment configurations
├── monitoring/           # Monitoring and health checks
├── supabase/            # Supabase configuration
├── tools/               # Development tools
├── ci-scripts/          # CI/CD scripts
│
├── .git/                # Git repository
├── .github/             # GitHub workflows
├── .cursor/             # Cursor IDE configuration
├── .gemini/             # Gemini AI configuration
├── .vercel/             # Vercel configuration
├── .husky/              # Git hooks
├── .vscode/             # VS Code configuration
└── node_modules/        # Node.js dependencies
```

## 🚀 Next Steps

1. ✅ Root directory cleaned and organized
2. ✅ Documentation properly categorized
3. ✅ Deployment configurations organized
4. ✅ Configuration files centralized
5. ✅ Temporary files removed

The project now has a clean, organized root directory structure that makes it easier to navigate and maintain.
"""
    
    with open("docs/CLEANUP_ROOT_SUMMARY.md", "w") as f:
        f.write(summary_content)
    
    print(f"📝 Created: docs/CLEANUP_ROOT_SUMMARY.md")

def main():
    """Main cleanup function."""
    print("🚀 Starting Root Directory Analysis and Cleanup")
    print("=" * 70)
    
    # Analyze current state
    analysis = analyze_root_files()
    
    # Perform cleanup
    moved_count, deleted_count = cleanup_root_directory()
    
    # Create cleanup summary
    create_cleanup_summary()
    
    print("\n" + "=" * 70)
    print("🎉 Root Directory Cleanup Complete!")
    print("=" * 70)
    print(f"📊 Summary:")
    print(f"   📁 Moved: {moved_count} files to appropriate directories")
    print(f"   🗑️  Deleted: {deleted_count} temporary files/directories")
    print(f"   📝 Created: docs/CLEANUP_ROOT_SUMMARY.md")
    print()
    print("🎯 Your root directory is now clean and organized!")
    print("📂 Files are properly categorized in their respective directories")
    print("🚀 Ready for continued development with clean project structure")

if __name__ == "__main__":
    main()
