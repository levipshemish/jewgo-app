# Deprecations Registry

This file tracks deprecated code, components, and APIs that are scheduled for removal.

## Format
Each entry should include:
- **Component/API**: What is being deprecated
- **Reason**: Why it's being deprecated
- **Owner**: Who is responsible for removal (REQUIRED)
- **Target Date**: When it should be removed
- **Replacement**: What should be used instead (if applicable)

## Current Deprecations

<!-- Add deprecated items here following the format below -->

### Example Entry
- **Component**: `OldComponent.tsx`
- **Reason**: Replaced by new design system component
- **Owner**: @username (REQUIRED)
- **Target Date**: 2024-01-15
- **Replacement**: `NewComponent.tsx`

## Deprecation Rules
- All deprecated code must be removed within 30 days
- Extensions require justification and approval
- CI tracks `// DEPRECATED:` markers
- Owner must update this file when deprecating code

## Completed Removals
<!-- Move completed deprecations here with completion date -->
