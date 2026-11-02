-- Restore the previous application deployment FIRST. This removes only limiter
-- metadata; dropping it while the new app is live makes mutations return 503.
drop function if exists public.consume_mutation_attempt(text, text, text);
drop table if exists public.mutation_rate_limits;
