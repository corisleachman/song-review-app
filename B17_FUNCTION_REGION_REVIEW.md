# B17 primary Function region proposal

4 November 2026. User approved staged rollout. Primary default and live Production now dub1 after Preview pass and a same-code Production crossover. Provider-origin latency spikes remain; B17 is not Done.

## Evidence

Production source b0542d48, primary project song-review-app-v2 (prj_GoSvIjynlundQRAjTe4NIrwY0Gz0), team corisleachmans-projects. Existing 25-song workspace,15 actions and2 distinct assignees. Three ordinary desktop Chrome reloads with `?perf=1`, unthrottled connection:

| Run | Request finish ms | Content visible ms | Identity ms | Related data ms | Assigned members ms | Server total ms |
| --- | --- | --- | --- | --- | --- | --- |
|1|3602.6|3721.9|1446.5|434.6|1171.8|3458.9|
|2|4332.6|4451.4|2076.8|979.2|613.8|4147.9|
|3|4204.2|4316.0|2328.1|732.0|715.1|4031.9|

Assembly2.5-5.5ms; response-to-visible119ms or less. These are request/core-visibility traces, not navigation-to-artwork completion or field/mobile metrics. Timing variation is material. Read-only project metadata confirms Production Supabase eu-west-1 (Ireland), while the primary Vercel deployment and Function defaults use iad1 (Washington). This is a latency hypothesis with a clear geographical mismatch, not a measured Dublin improvement.

Official [Vercel regions](https://vercel.com/docs/regions) identifies dub1 as eu-west-1/Dublin and recommends functions near the database. [Function region guidance](https://vercel.com/docs/functions/configuring-functions/region) allows one region on Hobby. Existing project uses Fluid Compute and one region. No paid plan or additional region is proposed.

## Exact proposed change

Update only the primary Vercel project, never the secondary song-review-app project. The narrow project-setting payload is:

```json
{
  "resourceConfig": { "functionDefaultRegions": ["dub1"] }
}
```

No repository-wide vercel.json, database/schema/grant change, auth-cache change, env value/scope change, runtime change, plan change or new dependency. Retain all other resource fields, including fluid=true. Read back the complete non-secret resource configuration and compare against the saved baseline, excluding only those two region fields. Fail closed on any unintended difference. All future primary-project Function builds are affected, including auth/media/billing handlers; this is not only the dashboard. Existing domains and external provider configuration stay as configured.

## Approval boundary

[AGENTS.md](AGENTS.md#safety-boundaries) says changing deployment configuration remains subject to its approval boundary. Standing release authority covers routine deployment with existing settings; this proposal changes a setting. Coris approved the staged rollout on4 November2026. Preview gates remain mandatory before Production redeployment.

## Staged rollout and verification

1. Agent, Vercel: record current primary default region/resource configuration and live Production deployment. Baseline: both region fields iad1, Fluid true; live dpl_9QJjHQh86P4Rrfi5nXE9gfW3S2vJ/b0542d48. Keep Production merges/deployments paused during the Preview experiment.
2. Agent, Vercel: apply only the payload above after approval, then verify resource fields and that the existing Production alias/source remains unchanged. If anything unexpected changes, restore the baseline and stop.
3. Agent, protected Preview: rebuild the existing email-staging deployment using inherited staging env and exact existing application source, with region dub1. Explicit deployment projectSettings.serverlessFunctionRegion=dub1 may be needed to avoid inheriting an old deployment region. Do not copy secrets or change auth/CAPTCHA hostname permissions. Verify primary project, source, Preview target, region and staging project ref. Supabase staging is a branch (ivifkrtupqizyqqsxdty); standalone get_project returns NotFound and branch metadata does not publish its region, so do not claim independently verified staging geography.
4. Agent, Preview: compare at least three dashboard traces under comparable conditions. Verify existing login/session/workspace, two songs/artwork, song entry, private audio delivery/play-pause, signed-out route denials and public routes. No payment, email, production-data write or new user fixture. Retain payload/permission semantics. Stop for any regression, unexpected project/region/env or absent timing benefit. If browser protection prevents a check, request the specific user test.
5. Agent, primary Production, only if staged-rollout approval was granted and Preview passes: redeploy the exact known-good Production source with existing Production env and dub1. Do not deploy a staging-env build or merge unrelated code. Verify exact source/project/target, dub1 and www alias; run safe auth/public smoke checks. Then take three read-only 25-song dashboard traces and one normal song journey. This is the representative benefit check; do not claim gains from Preview alone.
6. Agent: record both environments, samples, limits and outcome in LAUNCH_CHECKLIST.md/UPDATE_LOG.md. If Production does not improve or any journey fails, roll back immediately. Larger-world/device and B18 long-interval acceptance remains open.

Stop evidence: environment, URL, step, safe status/error/log excerpt and source/deployment ID. Never include credentials or full capability URLs.

## Rollback

Restore only the same project’s two region fields to iad1/[iad1], preserving other resource settings. Restore the previous immutable Production deployment dpl_9QJjHQh86P4Rrfi5nXE9gfW3S2vJ/b0542d48 (iad1) through the existing Vercel rollback/promotion flow; verify www/source/region and safe smoke checks. Restore/rebuild compatible email staging in iad1 if its experiment is abandoned. No database rollback, content deletion, secret rotation or paid upgrade.

Model recommendation: Sol Medium for region diagnosis and cross-environment rollout review; Terra Low for routine repeated checks. No model switch claimed.

## Applied project setting and Preview build, 4 November 2026

The original proposal included both the legacy and current region aliases. Vercel rejected that request with400 before changing settings. Corrected request uses only resourceConfig.functionDefaultRegions=[dub1]; readback reports both aliases dub1 and every other resourceConfig field unchanged, including Fluid true. Fresh baseline saved before the accepted update. Existing www alias remains dpl_9QJjHQh86P4Rrfi5nXE9gfW3S2vJ/b0542d48/iad1.

Protected email-staging rebuild dpl_6S8gUybaC7fP7CuptP4RHii4UHsV starts in dub1 at exact b0542d48 using inherited staging env. No secrets copied and no CAPTCHA hostname changed. Preview is Ready at that source/region. Four independent server probes pass: login200, signed-out dashboard/version401 and unavailable public playlist404. Runtime x-vercel-id confirms dub1; existing staging email config true/true preserved. Chrome extension UI blocks browser automation, so user asked to verify the two songs/artwork and play/pause. Positive staging gates and Production benefit check pending. The rollback setting payload likewise needs only resourceConfig.functionDefaultRegions=[iad1]; verify both aliases after readback. Do not submit both aliases in one PATCH.

## Preview pass and Production crossover, 4 November 2026

Coris reports Dublin staging passed (two songs/artwork and play/pause). Three staged content-visible samples343.1/309.4/363.1ms, requests323.8/292.6/348.9ms, server totals215.5/175.7/214.1ms, versus earlier same two-song iad1 content1693.6-2198.4ms. This is a substantial small-workspace improvement, not a Production guarantee.

Created Production dpl_8gBeW82QBbWxGmeruVr8dJNA6UwL in dub1 at exact known-good b0542d48 with inherited Production env. Exact www/source/project/target/region verified. Login200, signed-out dashboard/version401, email enabled/password management off, existing public six-track playlist200, and public media307 followed by one-byte206 pass. Normal signed-in25-song dashboard and a song page with correct artwork/comments/actions/tasks visually verified; no Production audio playback or content mutation performed.

| Phase | Content-visible samples ms | Server total samples ms |
| --- | --- | --- |
| Original iad1 baseline |3721.9 /4451.4 /4316.0|3458.9 /4147.9 /4031.9|
| First dub1 rollout |2679.7 /2190.0 /5555.6 /4760.7|2404.6 /2056.4 /5431.1 /4568.0|
| Restored iad1 control |6731.0 /3200.6 /4610.8|5476.5 /2909.5 /4214.6|

The slow dub1 samples triggered the planned safeguard: restore primary defaults and traffic to the original iad1 deployment, then measure again. Same approximately2-second profile/member stalls reproduced there. Provider gateway logs align: DUB profile/member origin values2102/2104 and IAD2014/2023 during those stalls, all200. Equivalent read-only membership SQL execution0.102ms under admin test conditions; this does not explain live REST/write/queue latency or rule out contention. A bounded pool/connection-error phrase scan found0 matches in5 PostgREST/114 pooler/4 Postgres log events. The exact cause within the provider path is unresolved.

The crossover supports keeping Dublin for lower ordinary-path latency and database proximity, while explicitly retaining provider-tail investigation. Restored primary defaults dub1 and promoted the tested existing dub1 deployment8gBeW82QBbWxGmeruVr8dJNA6UwL. Final www/source/dub1/resource readback and auth smoke pass; all unrelated resource fields remain unchanged. No claim of consistent subsecond Production loading or completed B17. Previous iad1 deployment9QJjHQh86P4Rrfi5nXE9gfW3S2vJ remains the rollback.

Next: user perception check on Production, then investigate provider-origin stalls with a narrow read-only trace. Proposed future desktop target, not an accepted promise: common25-song loads around2s or less, with long-tail samples tracked separately. Physical-device/full L6 acceptance remains open.

## Production user feedback, 4 November 2026

Coris reports Production feels much faster and more responsive. The perceived improvement is accepted; the measured slow tail remains recorded rather than waived. No device/browser or distinct playback result was supplied. Documentation-only PR93/7d1e2ae0 is live on primary dub1 (dpl_kCewMGEp61D5bN2Xm6ny8utGShBK), with unchanged application files. Next L6 step is a physical-device playback/lock-screen pass; ongoing provider-origin diagnosis stays B17.

## Provider timing follow-up, 8 November 2026

Read-only Production Supabase edge-log aggregate for 20:00 to 21:26 UTC. Restricted to service-role requests for profiles, account_members, accounts, songs, song_versions and actions. The query returned two five-minute buckets with samples.

| UTC bucket | Requests | Origin time at least 1.5 s | Highest origin time |
| --- | ---: | ---: | ---: |
| 20:55 | 132 | 4 | 1.70 s |
| 21:20 | 76 | 59 | 13.78 s |

Slow responses occurred across multiple tables, including profile POSTs, membership GETs, and reads of accounts, songs and versions. No 5xx was observed in the bounded aggregate. The shared window gives a focused interval for provider investigation. These logs aggregate all matching service-role traffic and cannot attribute every request to a dashboard visit. They also cannot separate database execution from provider gateway or pool waits.

Keep B17 open. Capture the next dashboard server-timing trace with its UTC time and compare it against the corresponding provider window. If the slow requests align, review provider health and logs for that window before changing application reads.
