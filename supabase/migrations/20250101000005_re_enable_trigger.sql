-- Migration: Re-enable Anonymous Auth Trigger
-- Re-enables the trigger now that we've confirmed anonymous auth is working

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
