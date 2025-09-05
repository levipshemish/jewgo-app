# Core Components Library

This directory contains the core, reusable components that form the foundation of our design system.

## Structure

```
core/
├── cards/           # Card components (unified design)
├── navigation/      # Navigation components
├── grids/          # Grid layout components
└── README.md       # This file
```

## Naming Conventions

- **Core Components**: Use descriptive names without prefixes (e.g., `Card`, `Navigation`, `Grid`)
- **Domain-Specific Wrappers**: Use domain prefixes (e.g., `ShulCard`, `EateryGrid`)
- **Legacy Components**: Marked for deprecation with `@deprecated` JSDoc comments

## Component Hierarchy

1. **Core Components** (`/core/`) - Base reusable components
2. **Domain Wrappers** (`/shuls/`, `/eatery/`) - Domain-specific implementations
3. **Archived Components** (`/archive/`) - Deprecated components

## Usage Guidelines

- Always use core components when possible
- Create domain wrappers only when core components need domain-specific logic
- Import from core components, not from archived components
- Follow the established naming conventions
