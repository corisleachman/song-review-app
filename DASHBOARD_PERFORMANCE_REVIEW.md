# Dashboard performance review

Checkpoint: 4 November 2026. B17-B19, L6. No performance fix released.

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

Initial mount waits for the complete canonical `/api/dashboard` response before calling `loadAll`; that path supplies a prefetched payload and bypasses the return cache. Focus/visibility refresh coalesces events for one second. After cache expiry or opt-in bypass, `loadAll` sets loading true; the render branch hides existing songs whenever loading is true. This is a concrete reproduction lead, not yet a verified explanation of the user’s incident. Do not increase TTL or display cached content before canonical account/workspace verification.

First song navigation used the known finalized-version route directly. Existing page logs: initialization13:09:50.734 UTC, core success13:09:53.459 UTC, approximately2725ms. Concurrent bootstrap874ms; selected version1800ms, version list1801ms, song2728ms. Threads1445ms, actions1379ms and tasks1696ms start after core success. These are initialization timings, not a measured click-to-paint interval. No audio was started.

## Next checks

Reproduce focus return with explicit cache bypass, then actual expiry. Compare valid populated content during refresh, first-load empty states and request failures; preserve sign-out/workspace isolation. Obtain repeated cold/warm navigation and artwork timings before proposing targets or claiming B17/B19 improvements. Original1/5/15/30-minute and physical-device acceptance remains open. Sol Medium suits diagnosis; Terra Medium suits a scoped implementation after reproduction.
