#!/usr/bin/env python3
"""
API Route Consolidation Script for JewGo App
===========================================

This script helps identify and update additional API routes that could benefit
from the new error response utilities and backend URL consolidation.

Usage:
    python scripts/consolidate-api-routes.py --scan    # Scan for opportunities
    python scripts/consolidate-api-routes.py --update  # Update identified routes
    python scripts/consolidate-api-routes.py --dry-run # Show what would be changed
"""

import os
import re
import argparse
from pathlib import Path
from typing import List, Dict, Tuple

class APIRouteConsolidator:
    def __init__(self, frontend_dir: str = "frontend"):
        self.frontend_dir = Path(frontend_dir)
        self.api_dir = self.frontend_dir / "app" / "api"
        
    def scan_for_opportunities(self) -> Dict[str, List[Dict]]:
        """Scan API routes for consolidation opportunities."""
        opportunities = {
            "error_responses": [],
            "backend_urls": [],
            "hardcoded_urls": []
        }
        
        if not self.api_dir.exists():
            print(f"API directory not found: {self.api_dir}")
            return opportunities
            
        # Scan all TypeScript files in API routes
        for ts_file in self.api_dir.rglob("*.ts"):
            if ts_file.is_file():
                self._analyze_file(ts_file, opportunities)
                
        return opportunities
    
    def _analyze_file(self, file_path: Path, opportunities: Dict[str, List[Dict]]):
        """Analyze a single file for consolidation opportunities."""
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = file_path.relative_to(self.frontend_dir)
            
            # Check for error response patterns
            self._check_error_patterns(content, relative_path, opportunities)
            
            # Check for backend URL patterns
            self._check_backend_url_patterns(content, relative_path, opportunities)
            
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")
    
    def _check_error_patterns(self, content: str, file_path: Path, opportunities: Dict):
        """Check for error response patterns that could be consolidated."""
        # Pattern for NextResponse.json with error
        error_pattern = r'NextResponse\.json\(\s*\{\s*error\s*:\s*[\'"][^\'"]+[\'"]\s*\}\s*,\s*\{\s*status\s*:\s*(\d+)\s*\}\s*\)'
        
        matches = re.finditer(error_pattern, content, re.MULTILINE | re.DOTALL)
        
        for match in matches:
            status_code = match.group(1)
            line_number = content[:match.start()].count('\n') + 1
            
            opportunities["error_responses"].append({
                "file": str(file_path),
                "line": line_number,
                "pattern": match.group(0).strip(),
                "status_code": status_code,
                "suggestion": self._get_error_suggestion(status_code)
            })
    
    def _check_backend_url_patterns(self, content: str, file_path: Path, opportunities: Dict):
        """Check for backend URL patterns that could be consolidated."""
        # Pattern for hardcoded backend URLs
        backend_url_pattern = r'process\.env\[[\'"]NEXT_PUBLIC_BACKEND_URL[\'"]\]\s*\|\|\s*[\'"][^\'"]+[\'"]'
        
        matches = re.finditer(backend_url_pattern, content, re.MULTILINE)
        
        for match in matches:
            line_number = content[:match.start()].count('\n') + 1
            
            opportunities["backend_urls"].append({
                "file": str(file_path),
                "line": line_number,
                "pattern": match.group(0).strip(),
                "suggestion": "Use getBackendUrl() from @/lib/api-config"
            })
        
        # Pattern for hardcoded frontend URLs
        frontend_url_pattern = r'process\.env\[[\'"]NEXTAUTH_URL[\'"]\]\s*\|\|\s*[\'"][^\'"]+[\'"]'
        
        matches = re.finditer(frontend_url_pattern, content, re.MULTILINE)
        
        for match in matches:
            line_number = content[:match.start()].count('\n') + 1
            
            opportunities["hardcoded_urls"].append({
                "file": str(file_path),
                "line": line_number,
                "pattern": match.group(0).strip(),
                "suggestion": "Use getFrontendUrl() from @/lib/api-config"
            })
    
    def _get_error_suggestion(self, status_code: str) -> str:
        """Get suggestion for error response based on status code."""
        suggestions = {
            "401": "errorResponses.unauthorized()",
            "403": "errorResponses.forbidden()",
            "404": "errorResponses.notFound()",
            "400": "errorResponses.badRequest()",
            "500": "errorResponses.internalError()",
            "429": "errorResponses.rateLimitExceeded()"
        }
        return suggestions.get(status_code, f"errorResponses.createErrorResponse({status_code}, 'message')")
    
    def generate_update_script(self, opportunities: Dict[str, List[Dict]]) -> str:
        """Generate a script to update the identified opportunities."""
        script_lines = [
            "#!/bin/bash",
            "# Auto-generated update script for API route consolidation",
            "# Generated by consolidate-api-routes.py",
            "",
            "echo 'Updating API routes for consolidation...'",
            ""
        ]
        
        # Add error response updates
        if opportunities["error_responses"]:
            script_lines.extend([
                "echo 'Updating error response patterns...'",
                ""
            ])
            
            for opp in opportunities["error_responses"]:
                # Escape quotes for sed
                pattern = opp["pattern"].replace('"', '\\"').replace("'", "'\"'\"'")
                suggestion = opp["suggestion"].replace('"', '\\"')
                
                script_lines.append(
                    f"sed -i '' 's/{pattern}/{suggestion}/g' {opp['file']}"
                )
            
            script_lines.append("")
        
        # Add backend URL updates
        if opportunities["backend_urls"]:
            script_lines.extend([
                "echo 'Updating backend URL patterns...'",
                ""
            ])
            
            for opp in opportunities["backend_urls"]:
                pattern = opp["pattern"].replace('"', '\\"').replace("'", "'\"'\"'")
                script_lines.append(
                    f"sed -i '' 's/{pattern}/getBackendUrl()/g' {opp['file']}"
                )
            
            script_lines.append("")
        
        # Add frontend URL updates
        if opportunities["hardcoded_urls"]:
            script_lines.extend([
                "echo 'Updating frontend URL patterns...'",
                ""
            ])
            
            for opp in opportunities["hardcoded_urls"]:
                pattern = opp["pattern"].replace('"', '\\"').replace("'", "'\"'\"'")
                script_lines.append(
                    f"sed -i '' 's/{pattern}/getFrontendUrl()/g' {opp['file']}"
                )
            
            script_lines.append("")
        
        script_lines.extend([
            "echo 'Adding imports for new utilities...'",
            "",
            "# This section requires manual review and updates",
            "# Add the following imports to files that need them:",
            "# import { errorResponses } from '@/lib/utils/error-responses';",
            "# import { getBackendUrl, getFrontendUrl } from '@/lib/api-config';",
            "",
            "echo 'Update complete! Please review and test changes.'"
        ])
        
        return "\n".join(script_lines)
    
    def print_report(self, opportunities: Dict[str, List[Dict]]):
        """Print a detailed report of consolidation opportunities."""
        print("=" * 80)
        print("API ROUTE CONSOLIDATION OPPORTUNITIES REPORT")
        print("=" * 80)
        print()
        
        total_opportunities = sum(len(opps) for opps in opportunities.values())
        print(f"Total consolidation opportunities found: {total_opportunities}")
        print()
        
        # Error response opportunities
        if opportunities["error_responses"]:
            print(f"ERROR RESPONSE PATTERNS ({len(opportunities['error_responses'])} opportunities):")
            print("-" * 50)
            for opp in opportunities["error_responses"]:
                print(f"File: {opp['file']}:{opp['line']}")
                print(f"Current: {opp['pattern']}")
                print(f"Suggested: {opp['suggestion']}")
                print()
        
        # Backend URL opportunities
        if opportunities["backend_urls"]:
            print(f"BACKEND URL PATTERNS ({len(opportunities['backend_urls'])} opportunities):")
            print("-" * 50)
            for opp in opportunities["backend_urls"]:
                print(f"File: {opp['file']}:{opp['line']}")
                print(f"Current: {opp['pattern']}")
                print(f"Suggested: {opp['suggestion']}")
                print()
        
        # Frontend URL opportunities
        if opportunities["hardcoded_urls"]:
            print(f"FRONTEND URL PATTERNS ({len(opportunities['hardcoded_urls'])} opportunities):")
            print("-" * 50)
            for opp in opportunities["hardcoded_urls"]:
                print(f"File: {opp['file']}:{opp['line']}")
                print(f"Current: {opp['pattern']}")
                print(f"Suggested: {opp['suggestion']}")
                print()
        
        print("=" * 80)
        print("NEXT STEPS:")
        print("1. Review the opportunities above")
        print("2. Run with --dry-run to see what would change")
        print("3. Run with --update to apply changes")
        print("4. Test thoroughly after updates")
        print("=" * 80)

def main():
    parser = argparse.ArgumentParser(description="Consolidate API routes for JewGo app")
    parser.add_argument("--scan", action="store_true", help="Scan for consolidation opportunities")
    parser.add_argument("--update", action="store_true", help="Generate update script")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be changed")
    parser.add_argument("--frontend-dir", default="frontend", help="Frontend directory path")
    
    args = parser.parse_args()
    
    if not any([args.scan, args.update, args.dry_run]):
        parser.print_help()
        return
    
    consolidator = APIRouteConsolidator(args.frontend_dir)
    opportunities = consolidator.scan_for_opportunities()
    
    if args.scan or args.dry_run:
        consolidator.print_report(opportunities)
    
    if args.update:
        script_content = consolidator.generate_update_script(opportunities)
        script_path = "update-api-routes.sh"
        
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        os.chmod(script_path, 0o755)
        print(f"Update script generated: {script_path}")
        print("Review the script and run it to apply changes.")

if __name__ == "__main__":
    main()
