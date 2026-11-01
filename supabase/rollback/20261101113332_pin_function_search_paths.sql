-- Restores the five pre-existing warnings. No function grants/body changes.
ALTER FUNCTION public.set_updated_at() RESET search_path;
ALTER FUNCTION public.profile_settings_touch_updated_at() RESET search_path;
ALTER FUNCTION public.is_account_member(uuid) RESET search_path;
ALTER FUNCTION public.has_account_role(uuid, public.account_role[]) RESET search_path;
ALTER FUNCTION public.generate_referral_code() RESET search_path;
