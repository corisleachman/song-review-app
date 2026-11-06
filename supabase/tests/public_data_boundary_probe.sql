-- Synthetic data only. No storage objects, email/API calls or real private
-- content reads. Always roll back. Compose using the checked-in script.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE public_boundary_results(test_case text,passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE public_boundary_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() AS workspace_id,gen_random_uuid() AS public_song,
 gen_random_uuid() AS private_song,gen_random_uuid() AS playlist_song,
 gen_random_uuid() AS public_playlist,gen_random_uuid() AS v_old,
 gen_random_uuid() AS v_current,gen_random_uuid() AS v_pending,
 gen_random_uuid() AS v_private,gen_random_uuid() AS v_playlist,
 ids[1] AS owner_id,ids[2] AS member_id,ids[3] AS outsider_id
 FROM (SELECT array_agg(id ORDER BY id) AS ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 3) eligible) identities;
GRANT SELECT ON public_boundary_fixture TO anon,authenticated,service_role;
GRANT SELECT,INSERT ON public_boundary_results TO anon,authenticated,service_role;
DO $$ BEGIN
 IF (SELECT outsider_id IS NULL FROM public_boundary_fixture) THEN RAISE EXCEPTION 'Need three existing profile-backed identities'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (
 'public.accounts'::regclass,'public.account_members'::regclass,'public.songs'::regclass,
 'public.song_versions'::regclass,'public.playlists'::regclass,'public.playlist_songs'::regclass,'public.public_comments'::regclass
 )) THEN RAISE EXCEPTION 'Review new fixture-table triggers'; END IF;
END $$;
CREATE TEMP TABLE public_boundary_other_grants ON COMMIT DROP AS
 SELECT role_name,table_name,privilege,has_table_privilege(role_name,'public.'||table_name,privilege) AS allowed
 FROM unnest(array['anon','authenticated','service_role']) role_name,
 unnest(array['songs','song_versions','public_comments']) table_name,
 unnest(array['SELECT','INSERT','UPDATE','DELETE']) privilege
 WHERE NOT(role_name='anon' AND privilege='SELECT' AND table_name IN ('songs','song_versions'));
INSERT INTO public.accounts(id,name,created_by_user_id)
 SELECT workspace_id,'Agent public-data rollback probe',owner_id FROM public_boundary_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT workspace_id,owner_id,'owner'::public.account_role FROM public_boundary_fixture
 UNION ALL SELECT workspace_id,member_id,'member'::public.account_role FROM public_boundary_fixture;
INSERT INTO public.songs(id,title,is_public,public_comments_enabled,account_id,created_by_user_id)
 SELECT public_song,'Shared fixture',true,true,workspace_id,owner_id FROM public_boundary_fixture
 UNION ALL SELECT private_song,'Private fixture',false,false,workspace_id,owner_id FROM public_boundary_fixture
 UNION ALL SELECT playlist_song,'Playlist-only fixture',false,false,workspace_id,owner_id FROM public_boundary_fixture;
INSERT INTO public.song_versions(id,song_id,version_number,label,notes,file_path,file_name,created_by,account_id,created_by_user_id,upload_finalized_at)
 SELECT v_old,public_song,1,'Old version','INTERNAL-OLD-NOTE','songs/'||public_song::text||'/uploads/old.mp3','INTERNAL-OLD-FILENAME','Agent',workspace_id,owner_id,clock_timestamp() FROM public_boundary_fixture
 UNION ALL SELECT v_current,public_song,2,'Current version','INTERNAL-CURRENT-NOTE','songs/'||public_song::text||'/uploads/current.mp3','INTERNAL-CURRENT-FILENAME','Agent',workspace_id,owner_id,clock_timestamp() FROM public_boundary_fixture
 UNION ALL SELECT v_pending,public_song,3,'Pending version','INTERNAL-PENDING-NOTE','songs/'||public_song::text||'/uploads/pending.mp3','INTERNAL-PENDING-FILENAME','Agent',workspace_id,owner_id,NULL FROM public_boundary_fixture
 UNION ALL SELECT v_private,private_song,1,'Private version','INTERNAL-PRIVATE-NOTE','songs/'||private_song::text||'/uploads/private.mp3','INTERNAL-PRIVATE-FILENAME','Agent',workspace_id,owner_id,clock_timestamp() FROM public_boundary_fixture
 UNION ALL SELECT v_playlist,playlist_song,1,'Playlist version','INTERNAL-PLAYLIST-NOTE','songs/'||playlist_song::text||'/uploads/playlist.mp3','INTERNAL-PLAYLIST-FILENAME','Agent',workspace_id,owner_id,clock_timestamp() FROM public_boundary_fixture;
INSERT INTO public.playlists(id,title,account_id,is_public)
 SELECT public_playlist,'Shared fixture playlist',workspace_id,true FROM public_boundary_fixture;
INSERT INTO public.playlist_songs(playlist_id,song_id,position)
 SELECT public_playlist,playlist_song,0 FROM public_boundary_fixture;
INSERT INTO public.public_comments(song_id,author_name,body,is_hidden)
 SELECT public_song,'Agent','Visible fixture comment',false FROM public_boundary_fixture
 UNION ALL SELECT public_song,'Agent','INTERNAL-HIDDEN-COMMENT',true FROM public_boundary_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO public_boundary_results SELECT 'other table privileges unchanged',bool_and(allowed=has_table_privilege(role_name,'public.'||table_name,privilege)) FROM public_boundary_other_grants;
SET LOCAL ROLE anon;
DO $$ DECLARE f record; v_allow boolean := /* ANON_READ_ALLOWED */; BEGIN
 SELECT * INTO f FROM public_boundary_fixture;
 IF v_allow THEN
  INSERT INTO public_boundary_results SELECT 'baseline anonymous sees all three public-song versions',count(*)=3 FROM public.song_versions WHERE song_id=f.public_song;
  INSERT INTO public_boundary_results SELECT 'baseline exposes pending upload/internal notes and filenames',count(*)=1 FROM public.song_versions
   WHERE id=f.v_pending AND upload_finalized_at IS NULL AND notes='INTERNAL-PENDING-NOTE' AND file_name='INTERNAL-PENDING-FILENAME' AND created_by_user_id=f.owner_id;
  INSERT INTO public_boundary_results SELECT 'baseline exposes public-song internal ownership',count(*)=1 FROM public.songs WHERE id=f.public_song AND account_id=f.workspace_id AND created_by_user_id=f.owner_id;
  INSERT INTO public_boundary_results SELECT 'baseline still hides private songs',count(*)=0 FROM public.songs WHERE id IN (f.private_song,f.playlist_song);
  BEGIN
   PERFORM body FROM public.public_comments WHERE song_id=f.public_song;
   RAISE EXCEPTION 'Baseline anonymous raw comments readable';
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO public_boundary_results VALUES('existing raw-comments denial preserved',true); END;
 ELSE
  BEGIN
   PERFORM id FROM public.songs WHERE id=f.public_song;
   RAISE EXCEPTION 'Anonymous raw songs readable';
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO public_boundary_results VALUES('anonymous raw songs denied',true); END;
  BEGIN
   PERFORM notes,file_name,file_path FROM public.song_versions WHERE song_id=f.public_song;
   RAISE EXCEPTION 'Anonymous raw version metadata readable';
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO public_boundary_results VALUES('anonymous history/pending/metadata denied',true); END;
  BEGIN
   PERFORM body FROM public.public_comments WHERE song_id=f.public_song;
   RAISE EXCEPTION 'Anonymous raw comments readable';
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO public_boundary_results VALUES('anonymous raw comments denied',true); END;
 END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO public_boundary_results SELECT 'server public-song projection still readable',count(*)=1 FROM public.songs WHERE id=(SELECT public_song FROM public_boundary_fixture) AND is_public;
INSERT INTO public_boundary_results SELECT 'server chooses latest finalized version, not pending/history',
 (SELECT id FROM public.song_versions WHERE song_id=(SELECT public_song FROM public_boundary_fixture) AND upload_finalized_at IS NOT NULL ORDER BY version_number DESC LIMIT 1)=(SELECT v_current FROM public_boundary_fixture);
INSERT INTO public_boundary_results SELECT 'server public comments preserve hidden filtering',count(*)=1 FROM public.public_comments WHERE song_id=(SELECT public_song FROM public_boundary_fixture) AND NOT is_hidden;
INSERT INTO public_boundary_results SELECT 'server playlist-only song remains available through scoped membership',count(*)=1
 FROM public.playlist_songs ps JOIN public.playlists p ON p.id=ps.playlist_id JOIN public.songs s ON s.id=ps.song_id AND s.account_id=p.account_id
 WHERE p.id=(SELECT public_playlist FROM public_boundary_fixture) AND p.is_public AND NOT s.is_public;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ DECLARE who record; BEGIN
 FOR who IN SELECT owner_id AS id,'owner' AS label FROM public_boundary_fixture UNION ALL SELECT member_id,'member' FROM public_boundary_fixture LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  INSERT INTO public_boundary_results SELECT who.label||' reads own songs',count(*)=3 FROM public.songs WHERE account_id=(SELECT workspace_id FROM public_boundary_fixture);
  INSERT INTO public_boundary_results SELECT who.label||' reads own complete version history',count(*)=5 FROM public.song_versions WHERE account_id=(SELECT workspace_id FROM public_boundary_fixture);
 END LOOP;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',outsider_id,'role','authenticated')::text,true) FROM public_boundary_fixture;
 INSERT INTO public_boundary_results SELECT 'outsider cannot read fixture songs',count(*)=0 FROM public.songs WHERE account_id=(SELECT workspace_id FROM public_boundary_fixture);
 INSERT INTO public_boundary_results SELECT 'outsider cannot read fixture versions',count(*)=0 FROM public.song_versions WHERE account_id=(SELECT workspace_id FROM public_boundary_fixture);
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public_boundary_results WHERE NOT passed) THEN RAISE EXCEPTION 'Public-data boundary check failed'; END IF;
END $$;
SELECT * FROM public_boundary_results ORDER BY test_case;
ROLLBACK;
