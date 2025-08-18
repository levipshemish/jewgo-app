# Context7 Integration for Enhanced Code Understanding

## Overview

**System Rule**: Always use Context7 library documentation when editing code to gain enhanced understanding of libraries, frameworks, and APIs being used.

## Purpose

Context7 provides up-to-date, comprehensive documentation for libraries and frameworks, enabling:
- Better understanding of API capabilities and best practices
- Informed decision-making when implementing features
- Reduced errors and improved code quality
- Access to latest documentation and examples

## Implementation Guidelines

### When to Use Context7

1. **Before implementing new features** that use external libraries
2. **When debugging issues** related to library usage
3. **During code reviews** to verify best practices
4. **When refactoring** code that uses external dependencies
5. **Before making architectural decisions** involving third-party tools

### Workflow

1. **Identify the library/framework** being used in the code
2. **Resolve library ID** using Context7's resolve function
3. **Fetch relevant documentation** for the specific use case
4. **Apply insights** to improve code implementation
5. **Document any findings** for future reference

### Examples

#### Before Editing React Components
```bash
# Resolve React library ID
mcp_context7_resolve-library-id "react"

# Fetch React hooks documentation
mcp_context7_get-library-docs "/facebook/react" "hooks" 5000
```

#### Before Implementing API Features
```bash
# Resolve Next.js library ID
mcp_context7_resolve-library-id "next.js"

# Fetch API routes documentation
mcp_context7_get-library-docs "/vercel/next.js" "api routes" 8000
```

#### Before Database Operations
```bash
# Resolve Prisma library ID
mcp_context7_resolve-library-id "prisma"

# Fetch database operations documentation
mcp_context7_get-library-docs "/prisma/prisma" "database operations" 6000
```

## Integration with Development Workflow

### Pre-Edit Checklist
- [ ] Identify libraries/frameworks in the code to be edited
- [ ] Fetch relevant Context7 documentation
- [ ] Review best practices and API changes
- [ ] Plan implementation based on latest documentation

### During Code Review
- [ ] Verify library usage follows current best practices
- [ ] Check for deprecated patterns or methods
- [ ] Ensure proper error handling based on library recommendations
- [ ] Validate performance optimizations

### Post-Implementation
- [ ] Document any Context7 insights used
- [ ] Update team knowledge base with findings
- [ ] Consider updating existing code based on new insights

## Benefits

1. **Reduced Errors**: Access to current API documentation prevents usage of deprecated methods
2. **Better Performance**: Latest optimization techniques and best practices
3. **Improved Security**: Current security recommendations and patterns
4. **Enhanced Maintainability**: Following established patterns and conventions
5. **Faster Development**: Quick access to examples and solutions

## Tools Available

- `mcp_context7_resolve-library-id`: Resolves package names to Context7 library IDs
- `mcp_context7_get-library-docs`: Fetches comprehensive documentation for specific topics

## Notes

- Always prioritize Context7 documentation over general web searches for library-specific information
- Use specific topics to get focused, relevant documentation
- Adjust token limits based on the complexity of the implementation
- Share valuable Context7 insights with the development team

---

**This rule is now part of the system memory and should be followed for all code editing tasks.**
