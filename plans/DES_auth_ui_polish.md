# DES: Auth UI Polish

Architecture / Approach
- Reuse existing UI primitives for consistency:
  - `components/ui/card` for layout containers and headers
  - `components/ui/input` for text/password fields
  - `components/ui/button` for CTA and secondary actions
  - `components/ui/alert` for error/success banners
- Add unobtrusive password visibility toggles using local component state and absolute-positioned small ghost buttons. No logic change to validation or submission flows.
- Keep all existing auth flows and page side-effects (CSRF probes, reCAPTCHA script, redirects, magic link modal, guest continue) intact.

Affected Surfaces
- Routes: `frontend/app/auth/signin/page.tsx`, `frontend/app/auth/signup/page.tsx`
- Legacy: `frontend/components/auth/RegisterForm.tsx` (used by `/auth/register`)

Risks
- CSS regressions: mitigated by using existing UI primitives used elsewhere in the app.
- Over-styling: mitigated by minimal diff, limited to wrappers and replacing raw inputs/buttons.

