Address Autocomplete – ZIP Missing / Selection Failing
======================================================

Context
- Affected UI: `frontend/app/add-eatery/page.tsx` via `EnhancedAddEateryForm` → `AddressAutofill`.
- Backend unaffected. Issue isolated to Google Places front-end integration.

Symptoms
- Selecting an address sometimes fails (no selection, or “Invalid address selection”).
- ZIP code not populated after selecting an address.

Root Cause
- Modern Google Maps JS “Places” API returns different field names than the legacy API.
  - Predictions may use `placeId` instead of `place_id`, and `structuredFormatting` instead of `structured_formatting`.
  - Place details may expose `addressComponents` with `longText/shortText` instead of legacy `long_name/short_name`.
- Our UI components expected the legacy field names, causing:
  - Missing `place_id` → selection handler rejected the choice.
  - ZIP extraction failed because `postal_code` component lacked `long_name`.

Fix (implemented)
- Normalize predictions and place details in the wrapper `frontend/lib/google/places.ts`:
  - Map `placeId` → `place_id` and `structuredFormatting` → `structured_formatting` for predictions.
  - Map `addressComponents[*].longText/shortText` → `long_name/short_name` for place details.
- Result: `AddressAutofill` consistently receives legacy-shaped objects; ZIP parsing now works reliably.

Additional hardening
- `AddressAutofill` accepts `place_id`, `placeId`, or `id` for selection (belt-and-suspenders if the wrapper regresses).
- ZIP+4 supported by capturing `postal_code_suffix` and appending to ZIP.
- Removed partial API key logging in the Maps loader to avoid exposing any part of secrets (G‑SEC‑1).

Verification Steps
1) Type an address in the Add Eatery form and select a suggestion.
2) Confirm city, state, and ZIP populate.
3) Check console in dev: logs show normalized predictions and details.

Environment Notes
- Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (loader requires it). If missing, autocomplete initialization fails at startup.

Rollback
- Revert the changes in `frontend/lib/google/places.ts` if necessary; UI will fall back to previous behavior (may reintroduce failures with modern API).
