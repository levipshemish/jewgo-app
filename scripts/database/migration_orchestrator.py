#!/usr/bin/env python3
"""
Database Migration Orchestrator
===============================

This script provides a unified system for managing all database migrations across the project:
- Backend Python migrations
- Supabase SQL migrations  
- Prisma migrations
- Deployment migrations
- Database maintenance scripts

Usage:
    python migration_orchestrator.py [command] [options]

Commands:
    list                    List all available migrations
    run [migration_name]    Run a specific migration
    run-all                 Run all pending migrations
    status                  Show migration status
    rollback [migration_name] Rollback a specific migration
    verify [migration_name] Verify a migration was applied correctly
    backup                  Create database backup before migration
    restore [backup_file]   Restore from backup
    dry-run [migration_name] Test migration without applying changes
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import importlib.util
import inspect

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from utils.logging_config import get_logger

logger = get_logger(__name__)


class MigrationOrchestrator:
    """Unified migration orchestration system."""

    def __init__(self, config_path: Optional[str] = None):
        """Initialize the migration orchestrator."""
        self.project_root = Path(__file__).parent.parent.parent
        self.config = self._load_config(config_path)
        self.migrations = self._discover_migrations()
        
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load migration configuration."""
        default_config = {
            "backup_enabled": True,
            "dry_run_default": False,
            "auto_verify": True,
            "parallel_execution": False,
            "migration_timeout": 300,  # 5 minutes
            "rollback_enabled": True,
            "environments": {
                "development": {
                    "database_url": os.getenv("DATABASE_URL"),
                    "backup_path": "backups/dev",
                    "safe_mode": True
                },
                "staging": {
                    "database_url": os.getenv("DATABASE_URL"),
                    "backup_path": "backups/staging", 
                    "safe_mode": True
                },
                "production": {
                    "database_url": os.getenv("DATABASE_URL"),
                    "backup_path": "backups/production",
                    "safe_mode": False
                }
            }
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
                
        return default_config

    def _discover_migrations(self) -> Dict[str, Dict[str, Any]]:
        """Discover all available migrations in the project."""
        migrations = {
            "backend": {},
            "supabase": {},
            "prisma": {},
            "deployment": {},
            "maintenance": {}
        }
        
        # Discover backend Python migrations
        backend_migrations_path = self.project_root / "backend" / "database" / "migrations"
        if backend_migrations_path.exists():
            for file_path in backend_migrations_path.glob("*.py"):
                if file_path.name.startswith("__"):
                    continue
                    
                migration_info = self._analyze_python_migration(file_path)
                if migration_info:
                    migrations["backend"][file_path.stem] = migration_info
        
        # Discover Supabase migrations
        supabase_migrations_path = self.project_root / "supabase" / "migrations"
        if supabase_migrations_path.exists():
            for file_path in supabase_migrations_path.glob("*.sql"):
                migration_info = self._analyze_sql_migration(file_path, "supabase")
                if migration_info:
                    migrations["supabase"][file_path.stem] = migration_info
        
        # Discover Prisma migrations
        prisma_migrations_path = self.project_root / "frontend" / "prisma" / "migrations"
        if prisma_migrations_path.exists():
            for migration_dir in prisma_migrations_path.iterdir():
                if migration_dir.is_dir() and not migration_dir.name.startswith("."):
                    migration_file = migration_dir / "migration.sql"
                    if migration_file.exists():
                        migration_info = self._analyze_sql_migration(migration_file, "prisma")
                        if migration_info:
                            migrations["prisma"][migration_dir.name] = migration_info
        
        # Discover deployment scripts
        deployment_scripts_path = self.project_root / "scripts" / "deployment"
        if deployment_scripts_path.exists():
            for file_path in deployment_scripts_path.glob("*.py"):
                if file_path.name.startswith("__"):
                    continue
                    
                migration_info = self._analyze_deployment_script(file_path)
                if migration_info:
                    migrations["deployment"][file_path.stem] = migration_info
        
        # Discover maintenance scripts
        maintenance_scripts_path = self.project_root / "scripts" / "database"
        if maintenance_scripts_path.exists():
            for file_path in maintenance_scripts_path.glob("*.py"):
                if file_path.name.startswith("__"):
                    continue
                    
                migration_info = self._analyze_maintenance_script(file_path)
                if migration_info:
                    migrations["maintenance"][file_path.stem] = migration_info
        
        return migrations

    def _analyze_python_migration(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Analyze a Python migration file."""
        try:
            spec = importlib.util.spec_from_file_location("migration", file_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            migration_info = {
                "type": "python",
                "path": str(file_path),
                "name": file_path.stem,
                "description": getattr(module, "__doc__", "").strip() if module.__doc__ else "",
                "has_run_migration": hasattr(module, "run_migration"),
                "has_rollback": hasattr(module, "rollback_migration"),
                "has_verify": hasattr(module, "verify_migration"),
                "module": module
            }
            
            # Extract additional metadata
            if hasattr(module, "run_migration"):
                func = getattr(module, "run_migration")
                migration_info["function_doc"] = func.__doc__ or ""
                
            return migration_info
            
        except Exception as e:
            logger.warning(f"Could not analyze {file_path}: {e}")
            return None

    def _analyze_sql_migration(self, file_path: Path, migration_type: str) -> Optional[Dict[str, Any]]:
        """Analyze a SQL migration file."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            migration_info = {
                "type": "sql",
                "migration_type": migration_type,
                "path": str(file_path),
                "name": file_path.stem,
                "description": f"{migration_type.title()} SQL migration",
                "content": content,
                "size": len(content),
                "lines": len(content.split('\n'))
            }
            
            return migration_info
            
        except Exception as e:
            logger.warning(f"Could not analyze {file_path}: {e}")
            return None

    def _analyze_deployment_script(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Analyze a deployment script."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            migration_info = {
                "type": "deployment",
                "path": str(file_path),
                "name": file_path.stem,
                "description": f"Deployment script: {file_path.name}",
                "content": content,
                "size": len(content)
            }
            
            return migration_info
            
        except Exception as e:
            logger.warning(f"Could not analyze {file_path}: {e}")
            return None

    def _analyze_maintenance_script(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Analyze a maintenance script."""
        try:
            spec = importlib.util.spec_from_file_location("maintenance", file_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            migration_info = {
                "type": "maintenance",
                "path": str(file_path),
                "name": file_path.stem,
                "description": getattr(module, "__doc__", "").strip() if module.__doc__ else "",
                "module": module
            }
            
            return migration_info
            
        except Exception as e:
            logger.warning(f"Could not analyze {file_path}: {e}")
            return None

    def list_migrations(self, category: Optional[str] = None) -> None:
        """List all available migrations."""
        print("🔍 Available Migrations")
        print("=" * 50)
        
        for cat, migrations in self.migrations.items():
            if category and cat != category:
                continue
                
            if not migrations:
                continue
                
            print(f"\n📁 {cat.upper()} MIGRATIONS ({len(migrations)}):")
            print("-" * 40)
            
            for name, info in migrations.items():
                status = "✅" if self._check_migration_status(name, cat) else "⏳"
                print(f"{status} {name}")
                if info.get("description"):
                    print(f"   📝 {info['description']}")
                print(f"   📂 {info['path']}")
                if info.get("has_run_migration"):
                    print(f"   🔧 Has run_migration function")
                if info.get("has_rollback"):
                    print(f"   ↩️  Has rollback function")
                if info.get("has_verify"):
                    print(f"   ✅ Has verify function")
                print()

    def _check_migration_status(self, migration_name: str, category: str) -> bool:
        """Check if a migration has been applied."""
        # This is a simplified check - in a real implementation,
        # you would check against a migration tracking table
        return False

    def run_migration(self, migration_name: str, category: str, dry_run: bool = False) -> bool:
        """Run a specific migration."""
        if category not in self.migrations:
            logger.error(f"Unknown migration category: {category}")
            return False
            
        if migration_name not in self.migrations[category]:
            logger.error(f"Migration '{migration_name}' not found in category '{category}'")
            return False
            
        migration_info = self.migrations[category][migration_name]
        
        print(f"🚀 Running migration: {migration_name}")
        print(f"📁 Category: {category}")
        print(f"📂 Path: {migration_info['path']}")
        print(f"🔧 Type: {migration_info['type']}")
        
        if dry_run:
            print("🧪 DRY RUN MODE - No changes will be applied")
            return True
            
        try:
            # Create backup if enabled
            if self.config["backup_enabled"]:
                self._create_backup(migration_name)
            
            # Run the migration based on type
            success = False
            if migration_info["type"] == "python":
                success = self._run_python_migration(migration_info)
            elif migration_info["type"] == "sql":
                success = self._run_sql_migration(migration_info)
            elif migration_info["type"] == "deployment":
                success = self._run_deployment_script(migration_info)
            elif migration_info["type"] == "maintenance":
                success = self._run_maintenance_script(migration_info)
            
            if success and self.config["auto_verify"]:
                self.verify_migration(migration_name, category)
                
            return success
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False

    def _run_python_migration(self, migration_info: Dict[str, Any]) -> bool:
        """Run a Python migration."""
        try:
            module = migration_info["module"]
            
            if hasattr(module, "run_migration"):
                print("🔧 Executing run_migration()...")
                result = module.run_migration()
                
                if result is None:
                    print("⚠️  Migration returned None - assuming success")
                    return True
                elif isinstance(result, bool):
                    return result
                else:
                    print(f"⚠️  Migration returned unexpected result: {result}")
                    return True
            else:
                print("❌ No run_migration function found")
                return False
                
        except Exception as e:
            logger.error(f"Python migration failed: {e}")
            return False

    def _run_sql_migration(self, migration_info: Dict[str, Any]) -> bool:
        """Run a SQL migration."""
        try:
            migration_type = migration_info["migration_type"]
            
            if migration_type == "supabase":
                # Run with Supabase CLI
                cmd = ["supabase", "db", "push"]
                print(f"🔧 Running Supabase migration: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                
            elif migration_type == "prisma":
                # Run with Prisma
                cmd = ["npx", "prisma", "db", "push"]
                print(f"🔧 Running Prisma migration: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                
            else:
                # Run with psql
                database_url = self.config["environments"]["development"]["database_url"]
                cmd = ["psql", database_url, "-f", migration_info["path"]]
                print(f"🔧 Running SQL migration: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ SQL migration completed successfully")
                return True
            else:
                print(f"❌ SQL migration failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"SQL migration failed: {e}")
            return False

    def _run_deployment_script(self, migration_info: Dict[str, Any]) -> bool:
        """Run a deployment script."""
        try:
            script_path = migration_info["path"]
            cmd = ["python", script_path]
            print(f"🔧 Running deployment script: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Deployment script completed successfully")
                return True
            else:
                print(f"❌ Deployment script failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Deployment script failed: {e}")
            return False

    def _run_maintenance_script(self, migration_info: Dict[str, Any]) -> bool:
        """Run a maintenance script."""
        try:
            module = migration_info["module"]
            
            # Look for common maintenance function names
            for func_name in ["run_maintenance", "execute", "main"]:
                if hasattr(module, func_name):
                    print(f"🔧 Executing {func_name}()...")
                    result = getattr(module, func_name)()
                    
                    if result is None:
                        print("⚠️  Maintenance script returned None - assuming success")
                        return True
                    elif isinstance(result, bool):
                        return result
                    else:
                        print(f"⚠️  Maintenance script returned unexpected result: {result}")
                        return True
            
            print("❌ No recognized maintenance function found")
            return False
            
        except Exception as e:
            logger.error(f"Maintenance script failed: {e}")
            return False

    def run_all_migrations(self, category: Optional[str] = None, dry_run: bool = False) -> bool:
        """Run all pending migrations."""
        print("🚀 Running All Migrations")
        print("=" * 30)
        
        all_success = True
        
        for cat, migrations in self.migrations.items():
            if category and cat != category:
                continue
                
            if not migrations:
                continue
                
            print(f"\n📁 Processing {cat.upper()} migrations...")
            
            for name in migrations.keys():
                if not self._check_migration_status(name, cat):
                    success = self.run_migration(name, cat, dry_run)
                    if not success:
                        all_success = False
                        if not dry_run:
                            print(f"❌ Stopping due to migration failure: {name}")
                            break
                else:
                    print(f"⏭️  Skipping {name} (already applied)")
        
        return all_success

    def verify_migration(self, migration_name: str, category: str) -> bool:
        """Verify a migration was applied correctly."""
        if category not in self.migrations or migration_name not in self.migrations[category]:
            logger.error(f"Migration not found: {category}/{migration_name}")
            return False
            
        migration_info = self.migrations[category][migration_name]
        
        print(f"✅ Verifying migration: {migration_name}")
        
        try:
            if migration_info["type"] == "python" and hasattr(migration_info["module"], "verify_migration"):
                result = migration_info["module"].verify_migration()
                if result:
                    print("✅ Migration verification passed")
                else:
                    print("❌ Migration verification failed")
                return bool(result)
            else:
                print("⚠️  No verification function available")
                return True
                
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return False

    def rollback_migration(self, migration_name: str, category: str) -> bool:
        """Rollback a specific migration."""
        if not self.config["rollback_enabled"]:
            logger.error("Rollback is disabled in configuration")
            return False
            
        if category not in self.migrations or migration_name not in self.migrations[category]:
            logger.error(f"Migration not found: {category}/{migration_name}")
            return False
            
        migration_info = self.migrations[category][migration_name]
        
        print(f"↩️  Rolling back migration: {migration_name}")
        
        try:
            if migration_info["type"] == "python" and hasattr(migration_info["module"], "rollback_migration"):
                result = migration_info["module"].rollback_migration()
                if result:
                    print("✅ Migration rollback completed")
                else:
                    print("❌ Migration rollback failed")
                return bool(result)
            else:
                print("❌ No rollback function available")
                return False
                
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False

    def _create_backup(self, migration_name: str) -> bool:
        """Create a database backup before migration."""
        try:
            backup_dir = Path("backups") / datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            database_url = self.config["environments"]["development"]["database_url"]
            backup_file = backup_dir / f"pre_{migration_name}.sql"
            
            cmd = ["pg_dump", database_url, "-f", str(backup_file)]
            print(f"💾 Creating backup: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ Backup created: {backup_file}")
                return True
            else:
                print(f"❌ Backup failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False

    def status(self) -> None:
        """Show migration status."""
        print("📊 Migration Status")
        print("=" * 30)
        
        total_migrations = 0
        applied_migrations = 0
        
        for category, migrations in self.migrations.items():
            if not migrations:
                continue
                
            category_total = len(migrations)
            category_applied = sum(1 for name in migrations.keys() 
                                 if self._check_migration_status(name, category))
            
            total_migrations += category_total
            applied_migrations += category_applied
            
            print(f"\n📁 {category.upper()}: {category_applied}/{category_total} applied")
            
            for name in migrations.keys():
                status = "✅" if self._check_migration_status(name, category) else "⏳"
                print(f"  {status} {name}")
        
        print(f"\n📈 Overall: {applied_migrations}/{total_migrations} migrations applied")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Database Migration Orchestrator")
    parser.add_argument("command", choices=["list", "run", "run-all", "status", "rollback", "verify", "backup", "restore", "dry-run"],
                       help="Command to execute")
    parser.add_argument("--migration", help="Migration name (for run, rollback, verify, dry-run)")
    parser.add_argument("--category", choices=["backend", "supabase", "prisma", "deployment", "maintenance"],
                       help="Migration category")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--dry-run", action="store_true", help="Test migration without applying changes")
    
    args = parser.parse_args()
    
    orchestrator = MigrationOrchestrator(args.config)
    
    if args.command == "list":
        orchestrator.list_migrations(args.category)
    elif args.command == "run":
        if not args.migration or not args.category:
            print("❌ Migration name and category are required for 'run' command")
            sys.exit(1)
        success = orchestrator.run_migration(args.migration, args.category, args.dry_run)
        sys.exit(0 if success else 1)
    elif args.command == "run-all":
        success = orchestrator.run_all_migrations(args.category, args.dry_run)
        sys.exit(0 if success else 1)
    elif args.command == "status":
        orchestrator.status()
    elif args.command == "rollback":
        if not args.migration or not args.category:
            print("❌ Migration name and category are required for 'rollback' command")
            sys.exit(1)
        success = orchestrator.rollback_migration(args.migration, args.category)
        sys.exit(0 if success else 1)
    elif args.command == "verify":
        if not args.migration or not args.category:
            print("❌ Migration name and category are required for 'verify' command")
            sys.exit(1)
        success = orchestrator.verify_migration(args.migration, args.category)
        sys.exit(0 if success else 1)
    elif args.command == "dry-run":
        if not args.migration or not args.category:
            print("❌ Migration name and category are required for 'dry-run' command")
            sys.exit(1)
        success = orchestrator.run_migration(args.migration, args.category, dry_run=True)
        sys.exit(0 if success else 1)
    else:
        print(f"❌ Command '{args.command}' not implemented yet")
        sys.exit(1)


if __name__ == "__main__":
    main()
