SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE TYPE "public"."account_role" AS ENUM (
    'owner',
    'admin',
    'member'
);
ALTER TYPE "public"."account_role" OWNER TO "postgres";
CREATE TYPE "public"."billing_status" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid'
);
ALTER TYPE "public"."billing_status" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."account_invites_sync_derived_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.email := btrim(new.email);
  new.normalized_email := lower(new.email);
  new.updated_at := now();
  return new;
end;
$$;
ALTER FUNCTION "public"."account_invites_sync_derived_fields"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_referral_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code   TEXT;
  i      INTEGER;
  exists BOOLEAN;
BEGIN
  FOR i IN 1..10 LOOP
    -- Build a 5-character random string from the safe alphabet
    code := 'TSR-' || (
      SELECT string_agg(
        substr(chars, floor(random() * length(chars) + 1)::int, 1),
        ''
      )
      FROM generate_series(1, 5)
    );

    SELECT EXISTS (
      SELECT 1 FROM referral_codes WHERE referral_codes.code = code
    ) INTO exists;

    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;

  -- Extremely unlikely to reach here, but raise a clear error if it does
  RAISE EXCEPTION 'Could not generate a unique referral code after 10 attempts';
END;
$$;
ALTER FUNCTION "public"."generate_referral_code"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."has_account_role"("target_account_id" "uuid", "allowed_roles" "public"."account_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.account_members am
    where am.account_id = target_account_id
      and am.user_id = auth.uid()
      and am.role = any(allowed_roles)
  );
$$;
ALTER FUNCTION "public"."has_account_role"("target_account_id" "uuid", "allowed_roles" "public"."account_role"[]) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_account_member"("target_account_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.account_members am
    where am.account_id = target_account_id
      and am.user_id = auth.uid()
  );
$$;
ALTER FUNCTION "public"."is_account_member"("target_account_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."profile_settings_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;
ALTER FUNCTION "public"."profile_settings_touch_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."account_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "normalized_email" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invite_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invited_by_user_id" "uuid" NOT NULL,
    "accepted_by_user_id" "uuid",
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_invites_normalized_email_check" CHECK (("normalized_email" = "lower"("btrim"("email")))),
    CONSTRAINT "account_invites_role_check" CHECK (("role" = ANY (ARRAY['member'::"text"]))),
    CONSTRAINT "account_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text", 'expired'::"text"])))
);
ALTER TABLE "public"."account_invites" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."account_members" (
    "account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."account_role" DEFAULT 'member'::"public"."account_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."account_members" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "created_by_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "image_url" "text",
    "notification_mode" "text" DEFAULT 'all_members'::"text" NOT NULL,
    "storage_bytes_used" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "accounts_notification_mode_check" CHECK (("notification_mode" = ANY (ARRAY['all_members'::"text", 'owner_only'::"text"]))),
    CONSTRAINT "accounts_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text", 'studio'::"text"])))
);
ALTER TABLE "public"."accounts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_id" "uuid" NOT NULL,
    "comment_id" "uuid",
    "description" "text" NOT NULL,
    "suggested_by" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "timestamp_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "created_by_user_id" "uuid",
    "assigned_to_user_id" "uuid",
    "resolved_in_version_id" "uuid",
    CONSTRAINT "actions_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'done'::"text"])))
);
ALTER TABLE "public"."actions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."billing_checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "stripe_checkout_session_id" "text" NOT NULL,
    "stripe_customer_id" "text",
    "status" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."billing_checkout_sessions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "stripe_product_id" "text",
    "status" "public"."billing_status" DEFAULT 'trialing'::"public"."billing_status" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."billing_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb" NOT NULL
);
ALTER TABLE "public"."billing_webhook_events" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."comment_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_version_id" "uuid" NOT NULL,
    "timestamp_seconds" integer NOT NULL,
    "created_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "created_by_user_id" "uuid"
);
ALTER TABLE "public"."comment_threads" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "author" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "author_user_id" "uuid"
);
ALTER TABLE "public"."comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profile_settings" (
    "user_id" "uuid" NOT NULL,
    "primary_color" "text" DEFAULT '#ff1493'::"text" NOT NULL,
    "accent_color" "text" DEFAULT '#a855f7'::"text" NOT NULL,
    "background_color" "text" DEFAULT '#0d0914'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."profile_settings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."public_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_id" "uuid" NOT NULL,
    "author_name" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."public_comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "code" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."referral_codes" OWNER TO "postgres";
COMMENT ON TABLE "public"."referral_codes" IS 'One active referral code per user. Codes are revocable but not deleted — is_active = false marks a retired code.';
CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referral_code_id" "uuid" NOT NULL,
    "referred_by_user_id" "uuid" NOT NULL,
    "referred_by_account_id" "uuid",
    "referred_user_id" "uuid" NOT NULL,
    "referred_account_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "ineligible_reason" "text",
    "credit_amount_pence" integer,
    "converted_at" timestamp with time zone,
    "reward_eligible_at" timestamp with time zone,
    "rewarded_at" timestamp with time zone,
    "referee_coupon_applied" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'converted'::"text", 'rewarded'::"text", 'ineligible'::"text"])))
);
ALTER TABLE "public"."referrals" OWNER TO "postgres";
COMMENT ON TABLE "public"."referrals" IS 'Tracks every referral from attribution (cookie → signup) through to reward (Stripe credit applied). One row per referred user, ever.';
COMMENT ON COLUMN "public"."referrals"."ineligible_reason" IS 'Populated when status = ineligible. Values: self_referral, duplicate_user, manual_block, payment_failed, refunded, cap_reached.';
COMMENT ON COLUMN "public"."referrals"."reward_eligible_at" IS 'Set to converted_at at launch for immediate reward eligibility. Increase to converted_at + interval to add a holding period without schema changes.';
COMMENT ON COLUMN "public"."referrals"."referee_coupon_applied" IS 'True when the 50%-off-3-months coupon was applied to the referred user at checkout.';
CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_identity" "text",
    "primary_color" "text",
    "accent_color" "text",
    "background_color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "user_id" "uuid"
);
ALTER TABLE "public"."settings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."song_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "created_by_user_id" "uuid",
    CONSTRAINT "song_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text"])))
);
ALTER TABLE "public"."song_tasks" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."song_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "label" "text",
    "notes" "text",
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "created_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "created_by_user_id" "uuid",
    "file_size_bytes" bigint
);
ALTER TABLE "public"."song_versions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."songs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "created_by_user_id" "uuid",
    "status" "text" DEFAULT 'in_progress'::"text",
    "is_public" boolean DEFAULT false NOT NULL,
    "public_comments_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "songs_status_check" CHECK (("status" = ANY (ARRAY['writing'::"text", 'in_progress'::"text", 'mixing'::"text", 'mastering'::"text", 'finished'::"text"])))
);
ALTER TABLE "public"."songs" OWNER TO "postgres";
ALTER TABLE ONLY "public"."account_invites"
    ADD CONSTRAINT "account_invites_invite_token_key" UNIQUE ("invite_token");
ALTER TABLE ONLY "public"."account_invites"
    ADD CONSTRAINT "account_invites_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."account_members"
    ADD CONSTRAINT "account_members_pkey" PRIMARY KEY ("account_id", "user_id");
ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_slug_key" UNIQUE ("slug");
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."billing_checkout_sessions"
    ADD CONSTRAINT "billing_checkout_sessions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."billing_checkout_sessions"
    ADD CONSTRAINT "billing_checkout_sessions_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");
ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_account_id_key" UNIQUE ("account_id");
ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");
ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");
ALTER TABLE ONLY "public"."billing_webhook_events"
    ADD CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."billing_webhook_events"
    ADD CONSTRAINT "billing_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");
ALTER TABLE ONLY "public"."comment_threads"
    ADD CONSTRAINT "comment_threads_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profile_settings"
    ADD CONSTRAINT "profile_settings_pkey" PRIMARY KEY ("user_id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."public_comments"
    ADD CONSTRAINT "public_comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_key" UNIQUE ("referred_user_id");
ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_identity_key" UNIQUE ("user_identity");
ALTER TABLE ONLY "public"."song_tasks"
    ADD CONSTRAINT "song_tasks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."song_versions"
    ADD CONSTRAINT "song_versions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."song_versions"
    ADD CONSTRAINT "song_versions_song_id_version_number_key" UNIQUE ("song_id", "version_number");
ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_pkey" PRIMARY KEY ("id");
CREATE INDEX "account_invites_account_id_idx" ON "public"."account_invites" USING "btree" ("account_id");
CREATE INDEX "account_invites_normalized_email_idx" ON "public"."account_invites" USING "btree" ("normalized_email");
CREATE UNIQUE INDEX "account_invites_pending_unique_idx" ON "public"."account_invites" USING "btree" ("account_id", "normalized_email") WHERE ("status" = 'pending'::"text");
CREATE UNIQUE INDEX "accounts_stripe_customer_id_unique_idx" ON "public"."accounts" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);
CREATE UNIQUE INDEX "accounts_stripe_subscription_id_unique_idx" ON "public"."accounts" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);
CREATE INDEX "comments_author_user_id_idx" ON "public"."comments" USING "btree" ("author_user_id");
CREATE INDEX "idx_account_members_account" ON "public"."account_members" USING "btree" ("account_id");
CREATE INDEX "idx_account_members_user" ON "public"."account_members" USING "btree" ("user_id");
CREATE INDEX "idx_actions_account_id" ON "public"."actions" USING "btree" ("account_id");
CREATE INDEX "idx_actions_comment_id" ON "public"."actions" USING "btree" ("comment_id");
CREATE INDEX "idx_actions_song_id" ON "public"."actions" USING "btree" ("song_id");
CREATE INDEX "idx_billing_checkout_sessions_account" ON "public"."billing_checkout_sessions" USING "btree" ("account_id");
CREATE INDEX "idx_billing_subscriptions_customer" ON "public"."billing_subscriptions" USING "btree" ("stripe_customer_id");
CREATE INDEX "idx_billing_subscriptions_status" ON "public"."billing_subscriptions" USING "btree" ("status");
CREATE INDEX "idx_billing_subscriptions_subscription" ON "public"."billing_subscriptions" USING "btree" ("stripe_subscription_id");
CREATE INDEX "idx_billing_webhook_events_type" ON "public"."billing_webhook_events" USING "btree" ("event_type");
CREATE INDEX "idx_comment_threads_account_id" ON "public"."comment_threads" USING "btree" ("account_id");
CREATE INDEX "idx_comment_threads_timestamp" ON "public"."comment_threads" USING "btree" ("song_version_id", "timestamp_seconds");
CREATE INDEX "idx_comment_threads_version_id" ON "public"."comment_threads" USING "btree" ("song_version_id");
CREATE INDEX "idx_comments_account_id" ON "public"."comments" USING "btree" ("account_id");
CREATE INDEX "idx_comments_thread_id" ON "public"."comments" USING "btree" ("thread_id");
CREATE INDEX "idx_referral_codes_code" ON "public"."referral_codes" USING "btree" ("code") WHERE ("is_active" = true);
CREATE INDEX "idx_referral_codes_user_id" ON "public"."referral_codes" USING "btree" ("user_id") WHERE ("is_active" = true);
CREATE INDEX "idx_referrals_referred_account_status" ON "public"."referrals" USING "btree" ("referred_account_id", "status");
CREATE INDEX "idx_referrals_referred_by_user_id" ON "public"."referrals" USING "btree" ("referred_by_user_id");
CREATE INDEX "idx_referrals_referred_by_user_rewarded" ON "public"."referrals" USING "btree" ("referred_by_user_id", "status");
CREATE INDEX "idx_settings_account_id" ON "public"."settings" USING "btree" ("account_id");
CREATE INDEX "idx_song_tasks_account_id" ON "public"."song_tasks" USING "btree" ("account_id");
CREATE INDEX "idx_song_tasks_song_id" ON "public"."song_tasks" USING "btree" ("song_id", "sort_order");
CREATE INDEX "idx_song_versions_account_id" ON "public"."song_versions" USING "btree" ("account_id");
CREATE INDEX "idx_song_versions_song_id" ON "public"."song_versions" USING "btree" ("song_id");
CREATE INDEX "idx_songs_account_id" ON "public"."songs" USING "btree" ("account_id");
CREATE INDEX "public_comments_song_id_idx" ON "public"."public_comments" USING "btree" ("song_id", "created_at" DESC);
CREATE OR REPLACE TRIGGER "account_invites_sync_derived_fields_trigger" BEFORE INSERT OR UPDATE ON "public"."account_invites" FOR EACH ROW EXECUTE FUNCTION "public"."account_invites_sync_derived_fields"();
CREATE OR REPLACE TRIGGER "profile_settings_touch_updated_at_trigger" BEFORE UPDATE ON "public"."profile_settings" FOR EACH ROW EXECUTE FUNCTION "public"."profile_settings_touch_updated_at"();
ALTER TABLE ONLY "public"."account_invites"
    ADD CONSTRAINT "account_invites_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."account_invites"
    ADD CONSTRAINT "account_invites_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."account_invites"
    ADD CONSTRAINT "account_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."account_members"
    ADD CONSTRAINT "account_members_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."account_members"
    ADD CONSTRAINT "account_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_resolved_in_version_id_fkey" FOREIGN KEY ("resolved_in_version_id") REFERENCES "public"."song_versions"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."billing_checkout_sessions"
    ADD CONSTRAINT "billing_checkout_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."billing_checkout_sessions"
    ADD CONSTRAINT "billing_checkout_sessions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."comment_threads"
    ADD CONSTRAINT "comment_threads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."comment_threads"
    ADD CONSTRAINT "comment_threads_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."comment_threads"
    ADD CONSTRAINT "comment_threads_song_version_id_fkey" FOREIGN KEY ("song_version_id") REFERENCES "public"."song_versions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."comment_threads"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profile_settings"
    ADD CONSTRAINT "profile_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."public_comments"
    ADD CONSTRAINT "public_comments_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id");
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_account_id_fkey" FOREIGN KEY ("referred_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_by_account_id_fkey" FOREIGN KEY ("referred_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."song_tasks"
    ADD CONSTRAINT "song_tasks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."song_tasks"
    ADD CONSTRAINT "song_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."song_tasks"
    ADD CONSTRAINT "song_tasks_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."song_versions"
    ADD CONSTRAINT "song_versions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."song_versions"
    ADD CONSTRAINT "song_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."song_versions"
    ADD CONSTRAINT "song_versions_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
CREATE POLICY "Enable read access for all users" ON "public"."songs" FOR SELECT USING (true);
CREATE POLICY "Public comments readable when enabled" ON "public"."public_comments" FOR SELECT TO "anon" USING ((("is_hidden" = false) AND (EXISTS ( SELECT 1
   FROM "public"."songs"
  WHERE (("songs"."id" = "public_comments"."song_id") AND ("songs"."is_public" = true) AND ("songs"."public_comments_enabled" = true))))));
CREATE POLICY "Public songs readable by anyone" ON "public"."songs" FOR SELECT TO "anon" USING (("is_public" = true));
CREATE POLICY "Versions of public songs readable by anyone" ON "public"."song_versions" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."songs"
  WHERE (("songs"."id" = "song_versions"."song_id") AND ("songs"."is_public" = true)))));
ALTER TABLE "public"."account_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_members_delete_owner" ON "public"."account_members" FOR DELETE TO "authenticated" USING (("account_id" IN ( SELECT "account_members_1"."account_id"
   FROM "public"."account_members" "account_members_1"
  WHERE (("account_members_1"."user_id" = "auth"."uid"()) AND ("account_members_1"."role" = 'owner'::"public"."account_role")))));
CREATE POLICY "account_members_delete_owner_admin" ON "public"."account_members" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "account_members_insert_owner" ON "public"."account_members" FOR INSERT TO "authenticated" WITH CHECK (("account_id" IN ( SELECT "account_members_1"."account_id"
   FROM "public"."account_members" "account_members_1"
  WHERE (("account_members_1"."user_id" = "auth"."uid"()) AND ("account_members_1"."role" = 'owner'::"public"."account_role")))));
CREATE POLICY "account_members_insert_owner_admin" ON "public"."account_members" FOR INSERT WITH CHECK ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "account_members_select_member" ON "public"."account_members" FOR SELECT TO "authenticated" USING (("account_id" IN ( SELECT "account_members_1"."account_id"
   FROM "public"."account_members" "account_members_1"
  WHERE ("account_members_1"."user_id" = "auth"."uid"()))));
CREATE POLICY "account_members_update_owner" ON "public"."account_members" FOR UPDATE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role"])) WITH CHECK ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role"]));
ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_delete_owner" ON "public"."accounts" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE (("account_members"."user_id" = "auth"."uid"()) AND ("account_members"."role" = 'owner'::"public"."account_role")))));
CREATE POLICY "accounts_insert_creator" ON "public"."accounts" FOR INSERT WITH CHECK (("created_by_user_id" = "auth"."uid"()));
CREATE POLICY "accounts_insert_own" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK (("created_by_user_id" = "auth"."uid"()));
CREATE POLICY "accounts_select_member" ON "public"."accounts" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "accounts_update_owner" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE (("account_members"."user_id" = "auth"."uid"()) AND ("account_members"."role" = 'owner'::"public"."account_role"))))) WITH CHECK (("id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE (("account_members"."user_id" = "auth"."uid"()) AND ("account_members"."role" = 'owner'::"public"."account_role")))));
CREATE POLICY "accounts_update_owner_admin" ON "public"."accounts" FOR UPDATE USING ("public"."has_account_role"("id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"])) WITH CHECK ("public"."has_account_role"("id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
ALTER TABLE "public"."actions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actions_delete_owner" ON "public"."actions" FOR DELETE TO "authenticated" USING (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE (("account_members"."user_id" = "auth"."uid"()) AND ("account_members"."role" = 'owner'::"public"."account_role")))));
CREATE POLICY "actions_delete_owner_admin" ON "public"."actions" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "actions_insert_member" ON "public"."actions" FOR INSERT TO "authenticated" WITH CHECK (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "actions_select_member" ON "public"."actions" FOR SELECT TO "authenticated" USING (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "actions_update_member" ON "public"."actions" FOR UPDATE TO "authenticated" USING (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"())))) WITH CHECK (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
ALTER TABLE "public"."billing_checkout_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_checkout_sessions_insert_owner_admin" ON "public"."billing_checkout_sessions" FOR INSERT WITH CHECK ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "billing_checkout_sessions_select_member" ON "public"."billing_checkout_sessions" FOR SELECT USING ("public"."is_account_member"("account_id"));
ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_subscriptions_insert_owner_admin" ON "public"."billing_subscriptions" FOR INSERT WITH CHECK ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "billing_subscriptions_select_member" ON "public"."billing_subscriptions" FOR SELECT USING ("public"."is_account_member"("account_id"));
CREATE POLICY "billing_subscriptions_update_owner_admin" ON "public"."billing_subscriptions" FOR UPDATE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"])) WITH CHECK ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
ALTER TABLE "public"."billing_webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."comment_threads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_threads_delete_owner_admin" ON "public"."comment_threads" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "comment_threads_insert_member" ON "public"."comment_threads" FOR INSERT TO "authenticated" WITH CHECK (("song_version_id" IN ( SELECT "sv"."id"
   FROM ("public"."song_versions" "sv"
     JOIN "public"."songs" "s" ON (("s"."id" = "sv"."song_id")))
  WHERE ("s"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "comment_threads_select_member" ON "public"."comment_threads" FOR SELECT TO "authenticated" USING (("song_version_id" IN ( SELECT "sv"."id"
   FROM ("public"."song_versions" "sv"
     JOIN "public"."songs" "s" ON (("s"."id" = "sv"."song_id")))
  WHERE ("s"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "comment_threads_update_member" ON "public"."comment_threads" FOR UPDATE USING ("public"."is_account_member"("account_id")) WITH CHECK ("public"."is_account_member"("account_id"));
ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_delete_owner_admin" ON "public"."comments" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "comments_insert_member" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("thread_id" IN ( SELECT "ct"."id"
   FROM (("public"."comment_threads" "ct"
     JOIN "public"."song_versions" "sv" ON (("sv"."id" = "ct"."song_version_id")))
     JOIN "public"."songs" "s" ON (("s"."id" = "sv"."song_id")))
  WHERE ("s"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "comments_select_member" ON "public"."comments" FOR SELECT TO "authenticated" USING (("thread_id" IN ( SELECT "ct"."id"
   FROM (("public"."comment_threads" "ct"
     JOIN "public"."song_versions" "sv" ON (("sv"."id" = "ct"."song_version_id")))
     JOIN "public"."songs" "s" ON (("s"."id" = "sv"."song_id")))
  WHERE ("s"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "comments_update_member" ON "public"."comments" FOR UPDATE USING ("public"."is_account_member"("account_id")) WITH CHECK ("public"."is_account_member"("account_id"));
ALTER TABLE "public"."profile_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_settings_insert_own" ON "public"."profile_settings" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "profile_settings_select_own" ON "public"."profile_settings" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "profile_settings_update_own" ON "public"."profile_settings" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));
CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));
CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));
CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));
CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));
CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));
ALTER TABLE "public"."public_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_authenticated_all" ON "public"."settings" TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "settings_insert_member" ON "public"."settings" FOR INSERT WITH CHECK (("public"."is_account_member"("account_id") AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))));
CREATE POLICY "settings_select_member" ON "public"."settings" FOR SELECT USING ("public"."is_account_member"("account_id"));
CREATE POLICY "settings_update_member" ON "public"."settings" FOR UPDATE USING ("public"."is_account_member"("account_id")) WITH CHECK ("public"."is_account_member"("account_id"));
ALTER TABLE "public"."song_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "song_tasks_delete_member" ON "public"."song_tasks" FOR DELETE TO "authenticated" USING (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "song_tasks_delete_owner_admin" ON "public"."song_tasks" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "song_tasks_insert_member" ON "public"."song_tasks" FOR INSERT TO "authenticated" WITH CHECK (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "song_tasks_select_member" ON "public"."song_tasks" FOR SELECT TO "authenticated" USING (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "song_tasks_update_member" ON "public"."song_tasks" FOR UPDATE TO "authenticated" USING (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"())))))) WITH CHECK (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
ALTER TABLE "public"."song_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "song_versions_delete_owner" ON "public"."song_versions" FOR DELETE TO "authenticated" USING (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE (("account_members"."user_id" = "auth"."uid"()) AND ("account_members"."role" = 'owner'::"public"."account_role")))))));
CREATE POLICY "song_versions_delete_owner_admin" ON "public"."song_versions" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "song_versions_insert_member" ON "public"."song_versions" FOR INSERT TO "authenticated" WITH CHECK (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "song_versions_select_member" ON "public"."song_versions" FOR SELECT TO "authenticated" USING (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
CREATE POLICY "song_versions_update_member" ON "public"."song_versions" FOR UPDATE TO "authenticated" USING (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"())))))) WITH CHECK (("song_id" IN ( SELECT "songs"."id"
   FROM "public"."songs"
  WHERE ("songs"."account_id" IN ( SELECT "account_members"."account_id"
           FROM "public"."account_members"
          WHERE ("account_members"."user_id" = "auth"."uid"()))))));
ALTER TABLE "public"."songs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs_delete_owner" ON "public"."songs" FOR DELETE TO "authenticated" USING (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE (("account_members"."user_id" = "auth"."uid"()) AND ("account_members"."role" = 'owner'::"public"."account_role")))));
CREATE POLICY "songs_delete_owner_admin" ON "public"."songs" FOR DELETE USING ("public"."has_account_role"("account_id", ARRAY['owner'::"public"."account_role", 'admin'::"public"."account_role"]));
CREATE POLICY "songs_insert_member" ON "public"."songs" FOR INSERT TO "authenticated" WITH CHECK (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "songs_select_member" ON "public"."songs" FOR SELECT TO "authenticated" USING (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "songs_update_member" ON "public"."songs" FOR UPDATE TO "authenticated" USING (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"())))) WITH CHECK (("account_id" IN ( SELECT "account_members"."account_id"
   FROM "public"."account_members"
  WHERE ("account_members"."user_id" = "auth"."uid"()))));
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."account_invites_sync_derived_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."account_invites_sync_derived_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."account_invites_sync_derived_fields"() TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "service_role";
GRANT ALL ON FUNCTION "public"."has_account_role"("target_account_id" "uuid", "allowed_roles" "public"."account_role"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_account_role"("target_account_id" "uuid", "allowed_roles" "public"."account_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_account_role"("target_account_id" "uuid", "allowed_roles" "public"."account_role"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."is_account_member"("target_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_account_member"("target_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_member"("target_account_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."profile_settings_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."profile_settings_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profile_settings_touch_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON TABLE "public"."account_invites" TO "anon";
GRANT ALL ON TABLE "public"."account_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."account_invites" TO "service_role";
GRANT ALL ON TABLE "public"."account_members" TO "anon";
GRANT ALL ON TABLE "public"."account_members" TO "authenticated";
GRANT ALL ON TABLE "public"."account_members" TO "service_role";
GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";
GRANT ALL ON TABLE "public"."actions" TO "anon";
GRANT ALL ON TABLE "public"."actions" TO "authenticated";
GRANT ALL ON TABLE "public"."actions" TO "service_role";
GRANT ALL ON TABLE "public"."billing_checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."billing_checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_checkout_sessions" TO "service_role";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";
GRANT ALL ON TABLE "public"."billing_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."billing_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_webhook_events" TO "service_role";
GRANT ALL ON TABLE "public"."comment_threads" TO "anon";
GRANT ALL ON TABLE "public"."comment_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_threads" TO "service_role";
GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";
GRANT ALL ON TABLE "public"."profile_settings" TO "anon";
GRANT ALL ON TABLE "public"."profile_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_settings" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."public_comments" TO "anon";
GRANT ALL ON TABLE "public"."public_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."public_comments" TO "service_role";
GRANT ALL ON TABLE "public"."referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_codes" TO "service_role";
GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";
GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";
GRANT ALL ON TABLE "public"."song_tasks" TO "anon";
GRANT ALL ON TABLE "public"."song_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."song_tasks" TO "service_role";
GRANT ALL ON TABLE "public"."song_versions" TO "anon";
GRANT ALL ON TABLE "public"."song_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."song_versions" TO "service_role";
GRANT ALL ON TABLE "public"."songs" TO "anon";
GRANT ALL ON TABLE "public"."songs" TO "authenticated";
GRANT ALL ON TABLE "public"."songs" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
