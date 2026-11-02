-- Restore the previous app route first if needed; retain the trigger unless
-- it causes the regression. Then this removes enforcement and reopens the
-- known count/insert race. No feedback rows are deleted.
drop trigger if exists beta_feedback_rate_limit on public.beta_feedback;
drop function if exists public.enforce_beta_feedback_rate_limit();
