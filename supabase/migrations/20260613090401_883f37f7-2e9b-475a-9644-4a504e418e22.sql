
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated needs to call has_role inside RLS policies (which run as the caller),
-- but we restrict direct exposure by keeping it out of anon role.
