# IMP: Auth UI Polish

Minimal-Diff Strategy
1) Sign-in page
   - Import and wrap content with `Card` sections
   - Replace raw `<input>` with `Input`, `<button>` with `Button`
   - Add password show/hide toggle
   - Keep magic link modal; swap its inputs/buttons to UI primitives
2) Sign-up page
   - Same treatment; preserve `PasswordStrengthIndicator`
   - Add toggles for password and confirm password
3) Legacy RegisterForm
   - Swap to `Card`/`Input`/`Button` for consistent look
4) Forgot/Reset password
   - Migrate `/auth/forgot-password` and `/auth/reset-password` to shared UI
   - Add toggles for password fields on reset page

Files To Touch
- `frontend/app/auth/signin/page.tsx`
- `frontend/app/auth/signup/page.tsx`
- `frontend/components/auth/RegisterForm.tsx`
- `frontend/app/auth/forgot-password/page.tsx`
- `frontend/app/auth/reset-password/page.tsx`

Test Plan (manual)
- Sign-in: email/password flow still works; error banners render; magic link modal opens/sends; guest continue button respects CSRF state; Google button still redirects
- Sign-up: password strength shows; mismatched confirm shows error; success message and redirect intact; guest continue works
- `/auth/register`: form renders and submits using existing context
- Forgot password: error banner shows; success state shows instructions; submit disabled state works
- Reset password: toggles work; validation and success redirect intact
- Responsive check at 360px and 1024px widths

Rollback
- Revert the modified files to previous versions; no migrations or API changes involved.
