export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  const adminEmailEnv = process.env['NEXT_PUBLIC_ADMIN_EMAIL'];
  if (adminEmailEnv && email === adminEmailEnv) {
    return true;
  }
  return email.endsWith('@jewgo.com');
}


