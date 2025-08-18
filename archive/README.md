# JewGo Cleanup Archive

This directory contains files that were moved during the JewGo cleanup process for safety reasons.

## Purpose
- Files moved here are potentially unused but not definitively safe to delete
- This provides a safety net during the cleanup process
- Files can be restored if needed after verification

## Restore Instructions

### To restore a file:
```bash
# Example: restore a moved component
mv _archive/components/OldComponent.tsx frontend/components/
```

### To restore entire directories:
```bash
# Example: restore a moved utility directory
mv _archive/utils/legacy-utils/ backend/utils/
```

## Contents Log
- Files moved during cleanup will be listed here with reasons
- Include original path and date moved
- Note any dependencies or references

### 2024-08-08 - Public Assets Cleanup
- **public-backups/**: Moved backup files from frontend/public/
  - logo-dark.svg.backup
  - logo.svg.backup  
  - favicon.svg.backup
  - icon.svg.backup
  - Reason: These are backup files that are no longer needed in the main public directory

## Verification Process
Before deleting files from this archive:
1. Search the codebase for any remaining references
2. Check git history for recent usage
3. Test the application thoroughly
4. Document the verification in this README

## Last Updated
- Created: 2024-08-08
- Cleanup Phase: Initial setup
