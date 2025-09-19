# Eatery Distance Sort Investigation — Requirements

## Problem Statement
Eatery listings should be ordered by proximity when location coordinates are provided, leveraging PostGIS server-side ordering. Reports indicate the page falls back to non-distance ordering, confusing users looking for nearby options.

## Goals & Scope
- Confirm current API behavior for `/api/v5/restaurants` when `sort=distance_asc` with latitude/longitude parameters.
- Identify backend code paths responsible for distance sorting and determine why PostGIS ordering is bypassed.
- Document observed behavior, root cause, and impacted components (repository, services, client request layer).

## Out of Scope
- Implementing the fix for the sorting bug.
- Adjusting frontend UX, caching, or analytics outside the distance ordering issue.
- Database migrations or schema changes unrelated to distance calculations.

## Acceptance Criteria
- Capture reproducible evidence showing the API does not respect `distance_asc` ordering despite coordinates being supplied.
- Trace the backend execution path and highlight relevant toggles or fallbacks preventing PostGIS sorting.
- Produce actionable recommendations for restoring server-side distance sorting, referencing exact code locations.
- Update project tracking artifacts (`TASKS.md`, relevant plan docs) with findings.
