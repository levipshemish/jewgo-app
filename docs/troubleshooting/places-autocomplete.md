Google Places Autocomplete — Modern API Notes

Context
- Modernize autocomplete to use `google.maps.places.AutocompleteSuggestion` (modern-only; legacy disabled).
- Normalize modern `addressComponents` (longText/shortText) to legacy shape (long_name/short_name) for downstream parsing.

Changes
- Normalization added in `frontend/lib/google/places.ts` so callers always see legacy-like `address_components`.
- `AddressAutofill` enhanced to support ZIP+4 by combining `postal_code` + `postal_code_suffix`, and robust parsing from formatted address with regex fallback.
- Avoids throwing an error when AutocompleteSuggestion is present but methods are unavailable; resolves empty results (no legacy).
 
 Flags
 - `NEXT_PUBLIC_DEBUG_PLACES=true`: verbose console diagnostics.
 - `NEXT_PUBLIC_DEBUG_PLACES_BADGE=true`: shows on-screen readiness badge.

Impact
- Fixes missing ZIP code on the Add Eatery page when modern Place Details are returned.
- No env changes required. Frontend behavior is backward compatible (G-DB-3 not applicable).

References
- Google Maps Places migration guidance recommends AutocompleteSuggestion for new customers (2025-03-01 notice for new AutocompleteService usage).
