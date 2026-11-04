# Dashboard performance review

Checkpoint: 4 November 2026. B17-B19, L6. B18 scoped refresh fix released; B17/B19 remain open.

## Measurement conditions

Existing password-enabled staging alias, runtime source3ff0656c. Desktop Chrome on the user’s ordinary connection; no network/CPU throttling. Account has two user-prepared songs, one finalized version each, artwork, no comments/actions/tasks. This small sample is not a large collaboration workspace or a physical-phone measurement. Existing opt-in `?perf=1` logs and `Server-Timing` headers were used. Times start at the client dashboard request, not navigation start. Artwork was complete at inspection; its precise first-ready time was not measured.

| Run | Cache condition | Request finish ms | Content-visible log ms | Server total ms | Server identity ms |
| --- | --- | --- | --- | --- | --- |
| Populated1 | Normal initial entry |2187.1|2198.4|1913.7|1280.2|
| Populated2 | Normal reload |1966.9|1977.3|1730.5|1281.9|
| Populated3 | Explicit cache bypass |1683.8|1693.6|1409.8|934.5|

Empty baseline: three reloads1663.5/1827.2/1944.9ms to empty state, server identity1107.7-1410.6ms. Earlier test fixtures were removed; the two newly prepared songs belong to the user’s staging workspace and are retained.

## Observations and limits

Dashboard assembly was0.2-0.5ms in populated runs. Identity/bootstrap dominates observed server time. Timings include an active-membership lookup followed by default-memberships and workspace lookup, suggesting an invalid/stale selected-workspace cookie, possibly from removed fixtures. No cookie value was inspected. Compare a valid-selection baseline before generalizing that fallback cost. Repeated profile upserts also occur, but timing alone does not justify changing profile synchronization.

Initial mount waits for the complete canonical `/api/dashboard` response before calling `loadAll`; that path supplies a prefetched payload and bypasses the return cache. Focus/visibility refresh coalesces events for one second. After cache expiry or opt-in bypass, `loadAll` sets loading true; the render branch hides existing songs whenever loading is true. A real user tab return with `cache=skip` reproduced this on 4 November: fresh request started while the DOM retained `All songs2` but rendered the loading paragraph and no artwork images. This confirms the refresh-hides-content path; it does not establish every historical incident trigger. Do not increase TTL or display cached content before canonical account/workspace verification.

First song navigation used the known finalized-version route directly. Existing page logs: initialization13:09:50.734 UTC, core success13:09:53.459 UTC, approximately2725ms. Concurrent bootstrap874ms; selected version1800ms, version list1801ms, song2728ms. Threads1445ms, actions1379ms and tasks1696ms start after core success. These are initialization timings, not a measured click-to-paint interval. No audio was started.

## Next checks

Reproduce focus return with explicit cache bypass, then actual expiry. Compare valid populated content during refresh, first-load empty states and request failures; preserve sign-out/workspace isolation. Obtain repeated cold/warm navigation and artwork timings before proposing targets or claiming B17/B19 improvements. Original1/5/15/30-minute and physical-device acceptance remains open. Sol Medium suits diagnosis; Terra Medium suits a scoped implementation after reproduction.

## B18 scoped candidate, 4 November 2026

One render condition in app/dashboard/page.tsx now shows the loading paragraph only while loading and there are no songs. Already loaded cards remain mounted while the same existing canonical fetch refreshes data. No TTL, fetching, identity, workspace selection, state ownership or signed-media expiry change. Initial mount still starts with no songs and waits for the canonical response. Current code already replaces songs when a successful response arrives. This candidate does not claim improvements to initial server latency, cache/auth race handling or universal B18 lifecycle acceptance. All581 existing Node tests and TypeScript pass; dashboard lint has0errors/10 existing warnings; whitespace check passes. Staging return comparison follows before release. App rollback restores parent61537fc1; no migration/external configuration required.

## B18 acceptance and Production release, 4 November 2026

User confirmed cards stayed visible during fixed staging tab return; actual refresh200 and retained two images observed. Initial empty loading preserved. PR91/f189c38b primary dpl_CniVe1QvDfn3kir5LsXMAvNZhHCZ Ready/www source verified; login200, dashboard401 signed-out and Production email config true/false pass.581 tests/TypeScript/four CI checks pass. Rollback61537fc1. Broader original lifecycle/error/isolation matrix remains open; no initial-load speed claim.

## B19 joined lookup candidate

Second unchanged song-page initialization14:10:00.155 to core success14:10:03.840 UTC,3685ms. Bootstrap1502ms, song1647ms, list2124ms, selected version3721ms. Existing version helper reads version then parent song in separate serial calls. Candidate embeds only parent account_id through installed song_versions_song_id_fkey, removes joined-only property before returning version and keeps existing workspace/object checks. Shared GET/PATCH helper changes read shape only; update logic is unchanged. Both DBs have that FK. Equivalent staging read-only SQL join execution0.210ms, not a PostgREST latency measurement.

Four handler cases cover owner/member payload and one-round-trip lookup, foreign/missing-parent denial before Storage. Two query-count assertions fail before implementation; all585 tests, TypeScript/focused lint/whitespace pass afterward. Actual PostgREST relation shape, payload parity, pending/missing audio and hosted timing remain staging checks. Do not claim a speed improvement until compared. No index/schema/configuration/permission or profile synchronization change. Rollback parentf189c38b application.

## B19 staging comparison, 4 November 2026

Exact email staging deployment dpl_5CH7iQjENyBzaWGutEdYsgVCoUAh/source dae4cc97 and alias verified; four CI checks pass. Actual version JSON200 keeps existing nullable account_id and stable audio delivery URL/audioMissing=false; joined workspace_song field absent. Both normal song metadata and comments/tasks panels load. Test fixture now explicitly checks preservation of existing account_id=null rather than assuming that pre-existing field is absent. Four focused cases pass after that test-only correction.

| Run | Before core init ms | After core init ms | Before version request ms | After version request ms |
| --- | --- | --- | --- | --- |
|1|2725|2927|1800|2935|
|2|3685|2072|3721|1121|
|3|1995|1938|2031|1814|

Same two-song workspace/song, desktop Chrome, unthrottled connection. One after run reloaded the song page; the others entered from dashboard. These are initialization/core-success logs, not click-to-paint or randomized network-controlled benchmarks. Ranges overlap substantially. Confirmed improvement is two database calls reduced to one; small-sample medians are suggestive, not an app-wide speed guarantee. B17/B19 targets and broader cold/warm/device measurement remain open.

Play clicked on staging; controls entered Loading with Pause disabled. Browser then rejected follow-up observation for unsupported protocol and explicitly forbade alternate surfaces/workarounds. No workaround attempted. User asked to pause any playing audio, reopen normal HTTPS song page and report playback outcome. Audio pass is not yet verified; do not release B19 before that handoff completes.

## B19 acceptance and Production release, 4 November 2026

User confirmed audio passed/paused. A fresh normal HTTPS tab shows correct song, Play button and0:08/4:19 paused state. No blocked-surface workaround used. PR92 mergedb0542d48; primary Production dpl_9QJjHQh86P4Rrfi5nXE9gfW3S2vJ Ready/www exact source verified. Final four CI checks pass. Six safe live signed-out/login/config probes pass; no fresh Production positive metadata mutation or live playback test. Rollbackf189c38b app, no migration/configuration. Scoped lookup change is Production complete, not all B19 performance/device acceptance.

## B17 artwork and representative-workspace follow-up

Read-only staging Storage metadata for the two user-prepared images:44,817 and42,928 bytes, both JPEG. These source files are small; their size does not explain the recorded two-song delay. Browser evaluation does not expose performance-resource APIs, so image download/discovery timing remains unmeasured. Source route retains private short-lived capability validation, download and private cache headers. No resizing, caching or capability changes made. Normal Production workspace requested for representative B17 read-only timing; staging two-song results cannot establish the original5-6-second report.

## B17 representative Production baseline, 4 November 2026

User opened normal Production workspace for read-only timing.25 songs/15 actions/2 unique assignees. Three content-visible samples3721.9/4451.4/4316.0ms; server totals3458.9/4147.9/4031.9ms, identity1446.5-2328.1ms and assigned member lookup613.8-1171.8ms. Assembly2.5-5.5ms. Existing listWorkspaceMembers performs membership then profile queries; no direct FK connects those tables, and no new RPC/schema change is prepared.

Primary Vercel defaults/live deployment iad1; Production Supabase eu-west-1. See [concrete region proposal, scope and rollback](B17_FUNCTION_REGION_REVIEW.md). Region experiment requires project configuration approval; no region changed. Data geography is confirmed for Production; staging branch region not independently available through project metadata.

## Dublin rollout result and remaining provider latency, 4 November 2026

See [complete three-phase samples and rollback/crossover evidence](B17_FUNCTION_REGION_REVIEW.md#preview-pass-and-production-crossover-4-november-2026). Staging user pass plus three309.4-363.1ms samples support the trial. Primary Production exact b0542d48 is now served by dub1 deployment dpl_8gBeW82QBbWxGmeruVr8dJNA6UwL, after a temporary return to iad1 reproduced the same provider delays. Production dub1 content2190.0-5555.6ms, iad1 control3200.6-6731.0ms. Small, time-varying samples do not establish a field-wide causal percentage improvement. Ordinary-path and staging improvement are recorded; B17 long-tail outcome remains open.

Gateway origin profile/member values around2.1s inDUB and2.0s inIAD align with server timers. A read-only membership SELECT plan executes0.102ms, so do not infer a missing index or change RLS from these traces. Provider performance advisors report unindexed-FK/unused-index/init-plan/multiple-policy/auth-connection notices but do not identify the timed stall. Remediation references: [FK indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS init plan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [multiple policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [production connections](https://supabase.com/docs/guides/deployment/going-into-prod). No database/index/policy change made.

Production22 stored artwork objects total3,013,887 bytes, largest237,476 bytes. Browser DOM later shows25 image elements loaded (including other page images), maximum natural width1600px. Precise first-artwork readiness remains unmeasured. Normal Production song page visually shows the selected version/artwork/comments/actions/tasks; audio was not started.
