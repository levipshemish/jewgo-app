# PR Template Usage Guide

## Overview

Mendel Mode v4.2 includes two PR templates to ensure proper governance while maintaining flexibility:

1. **Full Template** (`.github/pull_request_template.md`) - For features, refactoring, and significant changes
2. **Hotfix Template** (`.github/pull_request_template_hotfix.md`) - For urgent fixes and minimal changes

## When to Use Each Template

### Full Template
Use for:
- New features and functionality
- Major refactoring
- API changes
- Performance optimizations
- Security enhancements
- Breaking changes
- Dependency updates

### Hotfix Template
Use for:
- Production outages
- Security vulnerabilities
- Critical bug fixes
- Minor UI fixes
- Documentation updates
- Small configuration changes

## Template Selection

### Automatic Selection
GitHub will automatically use the full template for most PRs. To use the hotfix template:

1. Create your PR normally
2. Replace the template content with the hotfix template
3. Or copy the hotfix template content when creating the PR

### Manual Selection
You can also manually select the template when creating a PR by:
1. Creating a new PR
2. Clicking "Choose a template"
3. Selecting the appropriate template

## Template Requirements

### Full Template Requirements
- **Context7 Documentation**: Must list specific docs consulted with versions
- **Evidence Links**: Performance, security, and testing claims must include links/screenshots
- **Deadline Tracking**: All TEMPORARY/DEPRECATED code must have ISO dates
- **Rollback Testing**: Rollback plans must be tested, not just described
- **Reviewer Validation**: Reviewers must complete their checklist

### Hotfix Template Requirements
- **Urgency Justification**: Must explain why the fix is urgent/critical
- **Minimal Impact**: Changes must be targeted and minimal
- **No Breaking Changes**: Hotfixes cannot introduce breaking changes
- **Quick Rollback**: Must have a simple, tested rollback plan

## Best Practices

### For Authors
1. **Complete All Checkboxes**: Don't skip any required items
2. **Provide Evidence**: Include links, screenshots, or logs for claims
3. **Be Specific**: Use exact versions, dates, and measurements
4. **Test Rollbacks**: Actually test your rollback plan
5. **Use Appropriate Template**: Don't use hotfix template for features

### For Reviewers
1. **Validate All Claims**: Check that evidence supports claims
2. **Complete Checklist**: Don't approve without completing reviewer checklist
3. **Verify Deadlines**: Ensure TEMPORARY/DEPRECATED dates are valid
4. **Test Rollbacks**: Verify rollback plans are actually testable
5. **Enforce Standards**: Don't approve PRs that bypass governance

## Common Mistakes

### Authors
- ❌ Checking boxes without evidence
- ❌ Using hotfix template for features
- ❌ Not providing specific documentation versions
- ❌ Skipping rollback testing
- ❌ Using vague descriptions

### Reviewers
- ❌ Approving without completing checklist
- ❌ Not validating evidence
- ❌ Rubber-stamping without verification
- ❌ Ignoring deadline requirements
- ❌ Approving hotfixes for non-urgent issues

## Template Enforcement

### CI Enforcement
- All PRs must pass CI checks
- Performance regression tracking is enforced
- Coverage requirements are validated
- Security audits are required

### Manual Enforcement
- Reviewers must validate all checkboxes
- Evidence must be provided for claims
- Deadlines must be valid ISO dates
- Rollback plans must be tested

## Getting Help

If you're unsure which template to use or how to complete requirements:

1. **Check the Rules**: Review `RULES.md` for governance requirements
2. **Ask for Guidance**: Reach out to the team for clarification
3. **Use Examples**: Look at previous PRs for examples
4. **Start Early**: Begin template completion early in development

## Template Evolution

These templates are part of Mendel Mode v4.2 and will evolve based on:
- Team feedback and usage patterns
- New governance requirements
- Process improvements
- Tooling enhancements

Suggestions for improvements should be submitted as issues or discussed in team meetings.
