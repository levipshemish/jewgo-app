#!/usr/bin/env python3
"""
Dependency Vulnerability Scanner and Updater
Automatically identifies and updates vulnerable dependencies for JewGo application.
"""

import subprocess
import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DependencyScanner:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.frontend_dir = self.project_root / "frontend"
        self.backend_dir = self.project_root / "backend"
        
    def run_npm_audit(self) -> Dict:
        """Run npm audit and return results"""
        try:
            logger.info("Running npm audit...")
            result = subprocess.run(
                ["npm", "audit", "--json"],
                cwd=self.frontend_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return {"status": "success", "vulnerabilities": 0, "output": "No vulnerabilities found"}
            else:
                try:
                    audit_data = json.loads(result.stdout)
                    vulnerabilities = audit_data.get("metadata", {}).get("vulnerabilities", {})
                    return {
                        "status": "vulnerabilities_found",
                        "vulnerabilities": vulnerabilities,
                        "output": audit_data
                    }
                except json.JSONDecodeError:
                    return {
                        "status": "error",
                        "vulnerabilities": 0,
                        "output": result.stderr
                    }
        except subprocess.TimeoutExpired:
            return {"status": "timeout", "vulnerabilities": 0, "output": "npm audit timed out"}
        except Exception as e:
            return {"status": "error", "vulnerabilities": 0, "output": str(e)}
    
    def run_pip_audit(self) -> Dict:
        """Run pip-audit and return results"""
        try:
            logger.info("Running pip-audit...")
            result = subprocess.run(
                ["pip-audit"],
                cwd=self.backend_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return {"status": "success", "vulnerabilities": 0, "output": "No vulnerabilities found"}
            else:
                return {
                    "status": "vulnerabilities_found",
                    "vulnerabilities": result.stdout,
                    "output": result.stdout
                }
        except FileNotFoundError:
            return {"status": "error", "vulnerabilities": 0, "output": "pip-audit not installed"}
        except subprocess.TimeoutExpired:
            return {"status": "timeout", "vulnerabilities": 0, "output": "pip-audit timed out"}
        except Exception as e:
            return {"status": "error", "vulnerabilities": 0, "output": str(e)}
    
    def run_safety_check(self) -> Dict:
        """Run safety check and return results"""
        try:
            logger.info("Running safety check...")
            result = subprocess.run(
                ["safety", "check", "--json"],
                cwd=self.backend_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return {"status": "success", "vulnerabilities": 0, "output": "No vulnerabilities found"}
            else:
                try:
                    safety_data = json.loads(result.stdout)
                    return {
                        "status": "vulnerabilities_found",
                        "vulnerabilities": safety_data,
                        "output": safety_data
                    }
                except json.JSONDecodeError:
                    return {
                        "status": "error",
                        "vulnerabilities": 0,
                        "output": result.stderr
                    }
        except FileNotFoundError:
            return {"status": "error", "vulnerabilities": 0, "output": "safety not installed"}
        except subprocess.TimeoutExpired:
            return {"status": "timeout", "vulnerabilities": 0, "output": "safety check timed out"}
        except Exception as e:
            return {"status": "error", "vulnerabilities": 0, "output": str(e)}
    
    def get_outdated_packages(self) -> Dict:
        """Get list of outdated packages"""
        try:
            logger.info("Checking for outdated packages...")
            
            # Check npm outdated
            npm_result = subprocess.run(
                ["npm", "outdated", "--json"],
                cwd=self.frontend_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            npm_outdated = {}
            if npm_result.returncode == 0:
                try:
                    npm_outdated = json.loads(npm_result.stdout)
                except json.JSONDecodeError:
                    pass
            
            # Check pip outdated
            pip_result = subprocess.run(
                ["pip", "list", "--outdated", "--format=json"],
                cwd=self.backend_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            pip_outdated = []
            if pip_result.returncode == 0:
                try:
                    pip_outdated = json.loads(pip_result.stdout)
                except json.JSONDecodeError:
                    pass
            
            return {
                "npm": npm_outdated,
                "pip": pip_outdated
            }
        except Exception as e:
            return {"error": str(e)}
    
    def update_frontend_dependencies(self) -> Dict:
        """Update frontend dependencies"""
        try:
            logger.info("Updating frontend dependencies...")
            
            # Update npm packages
            result = subprocess.run(
                ["npm", "update"],
                cwd=self.frontend_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                return {"status": "success", "output": result.stdout}
            else:
                return {"status": "error", "output": result.stderr}
        except Exception as e:
            return {"status": "error", "output": str(e)}
    
    def update_backend_dependencies(self) -> Dict:
        """Update backend dependencies"""
        try:
            logger.info("Updating backend dependencies...")
            
            # Update pip packages
            result = subprocess.run(
                ["pip", "install", "--upgrade", "-r", "requirements.txt"],
                cwd=self.backend_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                return {"status": "success", "output": result.stdout}
            else:
                return {"status": "error", "output": result.stderr}
        except Exception as e:
            return {"status": "error", "output": str(e)}
    
    def generate_report(self, results: Dict) -> str:
        """Generate a comprehensive security report"""
        report = []
        report.append("# Dependency Security Report")
        report.append(f"Generated: {subprocess.run(['date'], capture_output=True, text=True).stdout.strip()}")
        report.append("")
        
        # Frontend vulnerabilities
        report.append("## Frontend (npm)")
        npm_audit = results.get("npm_audit", {})
        if npm_audit.get("status") == "success":
            report.append("✅ No vulnerabilities found")
        elif npm_audit.get("status") == "vulnerabilities_found":
            report.append("❌ Vulnerabilities found:")
            report.append(f"```json\n{json.dumps(npm_audit.get('output', {}), indent=2)}\n```")
        else:
            report.append(f"⚠️ Error: {npm_audit.get('output', 'Unknown error')}")
        
        report.append("")
        
        # Backend vulnerabilities
        report.append("## Backend (Python)")
        pip_audit = results.get("pip_audit", {})
        safety_check = results.get("safety_check", {})
        
        if pip_audit.get("status") == "success":
            report.append("✅ pip-audit: No vulnerabilities found")
        else:
            report.append(f"⚠️ pip-audit: {pip_audit.get('output', 'Error')}")
        
        if safety_check.get("status") == "success":
            report.append("✅ safety: No vulnerabilities found")
        else:
            report.append(f"⚠️ safety: {safety_check.get('output', 'Error')}")
        
        report.append("")
        
        # Outdated packages
        report.append("## Outdated Packages")
        outdated = results.get("outdated", {})
        
        if outdated.get("npm"):
            report.append("### Frontend (npm)")
            for package, info in outdated["npm"].items():
                report.append(f"- {package}: {info.get('current', 'unknown')} → {info.get('latest', 'unknown')}")
        
        if outdated.get("pip"):
            report.append("### Backend (pip)")
            for package in outdated["pip"]:
                report.append(f"- {package['name']}: {package.get('version', 'unknown')} → {package.get('latest_version', 'unknown')}")
        
        return "\n".join(report)

def main():
    """Main function to run dependency scanning and updates"""
    project_root = os.getcwd()
    scanner = DependencyScanner(project_root)
    
    logger.info("Starting dependency vulnerability scan...")
    
    # Run security audits
    results = {
        "npm_audit": scanner.run_npm_audit(),
        "pip_audit": scanner.run_pip_audit(),
        "safety_check": scanner.run_safety_check(),
        "outdated": scanner.get_outdated_packages()
    }
    
    # Generate report
    report = scanner.generate_report(results)
    
    # Save report
    report_path = Path(project_root) / "docs" / "dependency_security_report.md"
    with open(report_path, "w") as f:
        f.write(report)
    
    logger.info(f"Report saved to: {report_path}")
    
    # Print summary
    print("\n" + "="*50)
    print("DEPENDENCY SECURITY SCAN SUMMARY")
    print("="*50)
    
    npm_vulns = results["npm_audit"].get("vulnerabilities", 0)
    pip_vulns = 0 if results["pip_audit"]["status"] == "success" else 1
    safety_vulns = 0 if results["safety_check"]["status"] == "success" else 1
    
    print(f"Frontend vulnerabilities: {npm_vulns}")
    print(f"Backend vulnerabilities (pip-audit): {pip_vulns}")
    print(f"Backend vulnerabilities (safety): {safety_vulns}")
    
    total_vulns = npm_vulns + pip_vulns + safety_vulns
    if total_vulns == 0:
        print("✅ No vulnerabilities found!")
    else:
        print(f"❌ {total_vulns} vulnerability categories found")
        print("See detailed report for more information")
    
    print("="*50)
    
    return 0 if total_vulns == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
