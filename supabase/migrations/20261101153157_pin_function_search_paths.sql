-- Bodies, ownership and execution privileges are unchanged.
-- All referenced relations/types are schema-qualified in the inspected definitions.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.profile_settings_touch_updated_at() SET search_path = '';
ALTER FUNCTION public.is_account_member(uuid) SET search_path = '';
ALTER FUNCTION public.has_account_role(uuid, public.account_role[]) SET search_path = '';
ALTER FUNCTION public.generate_referral_code() SET search_path = '';
