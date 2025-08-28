# Current Tasks - JewGo Project

## In Progress
- [ ] Test final statusline output and verify functionality

## Pending
- [ ] Monitor statusline performance in active development sessions
- [ ] **Fix Feature Flags System** - Replace temporary bypass with proper feature flag management
  - **Priority**: High
  - **Issue**: Currently using temporary feature flag bypass in `backend/utils/feature_flags_v4.py`
  - **Tasks**:
    - [ ] Investigate why `API_V4_REVIEWS=true` environment variable not being loaded properly
    - [ ] Fix feature flag loading mechanism in `FeatureFlagsV4` class
    - [ ] Test feature flag enablement via environment variables
    - [ ] Remove temporary bypass code from `require_api_v4_flag` decorator
    - [ ] Verify all API v4 endpoints work with proper feature flag system
    - [ ] Update documentation to reflect proper feature flag usage
  - **Files Affected**: `backend/utils/feature_flags_v4.py`, `.env`, documentation
  - **Notes**: Current temporary fix allows reviews endpoints to work but bypasses proper feature flag system

## Completed
- [x] Created simple statusline with tokens, context%, model, and git status
- [x] Added task list file detection to statusline script  
- [x] Updated CLAUDE.md with comprehensive agent operating rules
- [x] Fixed context usage calculation with multiple fallback methods
- [x] Investigated and resolved token display issues
- [x] Enhanced statusline to show: Model | Tokens | Context% | Tasks | Git
- [x] Updated file-based task list management system

---
*Last Updated: 2025-08-28*
*Status: Statusline Enhancement Complete*