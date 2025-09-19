# REQ: Auth UI Polish

Problem
- Sign-in and sign-up pages use ad-hoc Tailwind styling instead of shared UI primitives, leading to inconsistent look/feel and duplicated styles. Small UX gaps (no password visibility toggles, inconsistent buttons) reduce clarity.

Scope
- Frontend only. Update `/auth/signin` and `/auth/signup` pages, plus legacy `RegisterForm` used at `/auth/register`, to reuse existing UI components and improve UX with minimal code changes.

Constraints
- No auth logic changes; reuse current flows and error handling.
- No API/schema changes; do not introduce new deps.
- Minimal diff; prefer reuse of `components/ui/{button,input,card,alert}`.

Acceptance Criteria
- Pages use `Card` for layout, `Input` for fields, and `Button` for actions.
- Password fields have show/hide toggle (signin, signup, confirm password).
- Error/success banners use consistent `Alert` styling.
- Visual spacing/typography consistent; mobile-friendly.
- All existing actions still work (email/password login, magic link modal, guest continue, Google button, reCAPTCHA script injection).

