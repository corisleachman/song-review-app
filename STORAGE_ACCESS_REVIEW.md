# Storage privacy review

1 November 2026. [Current checklist](LAUNCH_CHECKLIST.md). B23, L5/S2-S3.

Current status: both staging and Production media buckets are private; audio ceiling 50 MB. PR #68 is merged and deployed; see the Production release checkpoint below. Earlier public-bucket and preparation-only statements below are historical. Read the latest checkpoint at the end for current evidence and gates.

## Historical discovery evidence

Read-only staging and Production metadata show both `song-files` and `song-images` are public. Both environments have zero policies on `storage.objects` and zero public-schema views/materialized views. The latter closes the current public-view inventory, not all database/access review.

A query selected one existing staging finalized version whose parent song has `is_public=false`, and matched it to an existing audio object. An anonymous HEAD request to that object's public Storage endpoint returned HTTP 200. No Authorization/API key was supplied, no audio body downloaded, and the URL/path is deliberately omitted from this public repository. This establishes private-file access for someone who already knows its URL, not bucket enumeration or proof of third-party access. No private Production object was requested; the matching public-bucket configuration is confirmed there.

Supabase documents that public-bucket file retrieval bypasses access control: https://supabase.com/docs/guides/storage/buckets/fundamentals

## Root cause and limits

Application APIs check workspace membership or public sharing before returning a URL, but the returned URL is permanent and the Storage bucket permits anonymous retrieval. Database row policies don't govern public Storage downloads. Unique or difficult-to-guess filenames don't provide revocable authorisation.

The visibility mutation changes database flags only; it doesn't rotate/delete an audio object or change bucket visibility. Continued access to a previously issued URL after disabling sharing is therefore the expected consequence of this design. A live share-toggle experiment hasn't been performed; don't describe that specific journey as tested. Artwork has the same bucket setting; a private artwork object wasn't individually probed.

No bucket setting, policy, file, membership, plan or environment variable was changed by this review. The existing system remains live. The Security Advisor's clean result doesn't test this product privacy requirement.

## Repair surface

| Path | Current dependency | Required change |
| --- | --- | --- |
| `app/api/versions/[versionId]/route.ts` | Workspace check followed by public audio URL | Issue authorised temporary media access; pending versions remain blocked |
| `app/api/public/song/[songId]/route.ts` | Public-song check followed by public URL | Recheck sharing before issuing media access |
| `app/api/public/playlist/[id]/route.ts` | Public playlist tracks contain permanent URLs | Preserve intended playlist sharing and issue authorised media access |
| `app/api/songs/[songId]/visibility/route.ts` | Database flags only | Enforce agreed revocation behaviour for media requests |
| Dashboard/song/playlist/settings projections | Stored public artwork URLs | Resolve legacy artwork safely without storing expiring URLs in canonical records |
| Image upload routes and workspace settings | Persist `song-images` public URLs | Preserve existing objects and resolve storage identity for private delivery |
| Playback, playlist player and waveform consumers | Assume stable non-expiring URLs | Refresh/retry without restarting audio, overlap, or broken seeking/background playback |
| Both Storage buckets | Public retrieval | Private after compatible serving paths are deployed and verified |

The mixed `song-images` bucket includes workspace and playlist artwork, so it cannot be flipped without handling those paths too. Signed upload URLs and server-side deletion/finalization must continue working. No new client-wide Storage grants should be needed simply to fix delivery.

## Revocation decision

On 1 November the user accepted short expiry and prioritised smooth playback. The audio candidate uses 600-second tokens, subject to actual cache/expiry verification. This is not a verified ten-minute cutoff.

Historical choice before that decision: a short, documented expiry window for already-issued signed URLs, or immediate rejection of subsequent requests after sharing is disabled. Immediate revocation needs an authorising delivery path; short-lived signed URLs need refresh/retry and an explicitly accepted expiry window. Neither option can retract bytes already downloaded or buffered. Preserve smooth mobile/background playback and measure added request cost before release.

## Proposed rollout and acceptance

1. Implement compatible authorised serving and legacy-path resolution locally; test owner/member allow, outsider/anonymous private denial, allowed public song/playlist and disabled-share refusal. Don't change hosted buckets yet.
2. On staging, test both buckets with existing authorised fixtures and disposable new files only after their scope is established. A reversible private-bucket switch comes after serving support, not before it. Check old direct URLs are refused at origin and document CDN/cache behaviour separately.
3. Measure first playback, seeks, waveform loading, artwork load, URL renewal, repeat tracks and phone background/lock-screen playback. Test upload/finalize/deletion and both legacy/new assets. Verify share revocation under the chosen contract, including public playlists and stale browser caches.
4. Record staging evidence and exact rollback. Then obtain any required Production security-boundary approval before changing hosted bucket access. Deploy compatible application paths before private-bucket cutover. No file move/delete or mass database rewrite is currently proposed.
5. Production verification uses safe authorised/signed-out probes; no customer content or URLs in logs, screenshots or repository records. Stop on lost playback, unexpected access, token leakage or incorrect share revocation.

Rollback must cover application and bucket configuration together. Making buckets public again would restore anonymous known-URL access and needs explicit security review; never do that silently as a playback workaround. Already-issued signed URLs may survive until their expiry; don't promise immediate invalidation without a verified mechanism.

## Reproduction

Run [read-only metadata inventory](supabase/tests/storage_access_inventory.sql) separately on each confirmed environment. Expected current finding: both buckets public, zero Storage object policies, zero public views. For the private-file test, select a finalized private staging song's existing object privately, send HEAD without authentication, and record status only. Never commit its path or an actual signed URL. No write or customer content download is needed.

## Audio preparation checkpoint, 1 November 2026

Candidate pushed in draft [PR #68](https://github.com/corisleachman/song-review-app/pull/68), head `eb262bee`; no bucket or Production app change. `lib/mediaDelivery.ts` builds stable player URLs and validates storage references. The new audio GET/HEAD route checks canonical workspace identity or the explicitly requested public song/playlist context before returning an uncached 307 to a 600-second Storage URL. Public contexts permit only the latest finalized version; members retain private version-history access. Paths must belong to the authorised song. Public playlists retain their existing ability to share private songs from the same workspace.

Version, public song and public playlist APIs now return stable app URLs. No timer changes the active media source and no audio bytes proxy through application Functions. Browser handling of expired final redirects, seeking and resume must still be tested; local tests do not prove seamless renewal.

Thirty additional actual-handler tests pass: 72 boundary cases, 181 full-suite tests. TypeScript, focused lint and production build pass with non-secret build placeholders. Denials are checked before signing; tests cover public scope, pending/history, cross-song/malformed paths, signing errors, repeat requests and all three API projections.

Read-only path inventory: all 21 staging and 48 Production version paths use songs/<their-song-id>/... . Cache metadata: staging has 21 audio objects with no-cache and six images with max-age=3600; Production has 68 audio objects with no-cache and 39 images with max-age=3600. Object counts differ from version counts; don't assume every object is referenced.

[Supabase CDN guidance](https://supabase.com/docs/guides/storage/cdn/smart-cdn) says cached signed responses may outlive tokens. Audio no-cache/expiry behaviour and old public-URL invalidation therefore require live verification. Artwork needs compatible serving/cache treatment; its one-hour metadata is not silently accepted as a short revocation window. No file was reuploaded or metadata edited.

### Staging configuration resolved through deployment verification

The environment metadata connector returned 403 and CLI pulls supplied empty Supabase values. Those results did not establish that the deployed configuration was missing. Without changing permissions or settings, inspection of the actual Preview bundle found the staging reference only. The public song response matched the expected staging version and the media redirect targeted staging Storage, confirming server behaviour too. This removes the testing blocker. The reason for the connector's narrower env-list denial is still unknown; reading deployment metadata works.

Verified candidate: `6823574dda04b4b078a24a2d0f44b6f09ab36804`, deployment `dpl_4GgsV7x4LsiPmZyY9rcMD19KsiWb`, [protected staging Preview](https://song-review-app-v2-2roge9bap-corisleachmans-projects.vercel.app). All four PR checks pass. This is Preview only; Production application and buckets are unchanged.

### Exact next test gate

This is the original full gate. Selected completed checks are recorded below; remaining rows are not implicitly passed. Confirm staging source/project for every new deployment. No bucket switch is authorised by this preparation checkpoint: complete compatible serving paths and the rollout plan first.

| Owner / environment | Exact action | Expected result |
| --- | --- | --- |
| Agent / protected staging | Inspect source commit and client Supabase reference | Exact candidate and staging only; stop on mismatch |
| Agent / protected staging | Request media signed out without public context | 401 without Location/private details |
| Agent / protected staging | Request a private version as owner and member | 307; private/no-store; don't save signed Location |
| Agent / protected staging | Request it from an unrelated workspace | 404; no token |
| Agent / protected staging | Request pending upload, malformed ID and another song's path | Safe denial before signing |
| Agent / protected staging | Open public song and public playlist | Latest finalized versions play; older public history denied |
| Agent / protected staging | Revoke designated disposable share/remove playlist entry | Subsequent app delivery request refused; no fresh token |
| Agent / protected staging | Exercise GET, HEAD and one Range request | Valid media response and seeking headers |
| Agent / protected staging | Inspect signed-response cache headers; retry beyond ten minutes | Record actual expiry/cache status without token, no assumed cutoff |
| Agent / protected staging | Pause beyond ten minutes, resume and seek | Position retained; no expiry failure or overlapping audio |
| Agent / protected staging | Leave playlist idle beyond ten minutes, select another track | Fresh authorised delivery, correct track |
| Agent / protected staging | Retry media failure and change song/version | Correct current source; no retry loop |
| Agent / protected staging | Compare useful-page and first-audio timings to baseline | Quantified delivery cost under comparable conditions |
| User / phone, protected staging | Play, lock screen, pause/resume and seek after ten minutes | Smooth playback, correct time and lock-screen controls |
| User / phone, protected staging | Restart, repeat and switch playlist tracks | No duplicate audio, unexpected reset or wrong song |
| Agent / later staging cutover | Finish artwork/cache support, then test planned private switch | Old direct URLs refused; all intended media still works |

Stop on unexpected access, expired-source failure, wrong-song playback, missing Range support or significant measured delay. Return environment, page URL, browser/device, step, status/error and safe screenshot/log excerpt. Never return a signed URL/token. Browser-cached or buffered bytes cannot be retracted.

## Scoped hosted verification, 1 November 2026

- Previous candidate `eb262bee`: public song GET 200 with expected staging version/stable URL; scoped audio GET 307 to staging Storage; signed-out private request 401; wrong public song context 404. Signed Storage HEAD 200 with private/no-cache and bytes support; one-byte GET Range 206. Only that synthetic one-byte transport probe was retained as metadata; no media body file was saved.
- Browser baseline/candidate comparison found public waveform requests omitted cookies on the same-origin media route. Native fallback played but left an error; baseline waveform played normally. Changed `app/listen/[songId]/page.tsx` and `lib/usePlaylistPlayer.ts` fetch credentials to same-origin. Cookies are not forwarded to cross-origin Storage.
- Corrected source `6823574d` passes all four PR checks and 181 local tests/TypeScript. Focused player lint has zero errors and eleven existing warnings. Public song/media/private-signed-out HTTP checks pass again on its exact Preview.
- Corrected public song waveform playback advances with duration and no error. DOM inspection confirms its loaded media is a blob source with no media error, rather than an expiring remote media source. This supports smooth already-loaded playback but is not a physical-device or native-fallback expiry pass.
- Existing public two-track playlist plays and automatically advances to the second track. Explicit first-track selection restores the correct first track; Previous correctly restarts the current track when past three seconds. No playlist edit was made.
- Existing Google identity signs in on staging. The member workspace loads empty; switching to the existing owner workspace loads its four songs. A private media request from the wrong active workspace displays Not found. Owner private-song playback advances to completion; keyboard Home seeks to zero, and Play from Start restarts it on the corrected build. This isn't a separate-user full hosted role matrix.
- An issued staging URL was primed with HEAD and Range while valid, then refused after expiry (HEAD and Range GET 400); a fresh URL for the same object returns 200. The expired probe was well beyond its deadline, not a measurement at exactly 600 seconds, so no tight ten-minute CDN cutoff is claimed. The old pre-fix native-fallback resume didn't visibly advance; renewal in native fallback remains unverified and must pass before rollout.
- Staging counts remain eight users/profiles, seven workspaces and eleven memberships. No new account, upload, email, comment, share toggle, plan or object/bucket mutation. Checked Preview error/fatal scans have no matching logs. Physical phone/background, native expiry recovery, measured performance, real share revocation and artwork/cutover remain open. B23 is not fixed in Production.

## Current staging checkpoint, 1 November 2026

Candidate e19c858210fad574d9a55489c0feb92bb80c3129 in draft PR #68 is Ready at https://song-review-app-v2-68v0n1nrf-corisleachmans-projects.vercel.app . Four PR checks pass; 244 Node tests and TypeScript pass; browser CI run 41354515947 records 28 passed and 10 skipped. Synthetic Chromium tests do not replace physical Safari/phone checks.

Staging song-images and song-files were changed through the authenticated Storage dashboard to private. Audio bucket ceiling is 52428800 bytes following the user's 50 MB decision; global 50 MB, spend cap, MIME list and image settings remain unchanged. No files uploaded, deleted or moved. Production was inspected read-only: buckets still public, audio bucket 200 MB, global 50 MB. Production has not received these app changes.

Audio uses authorised app URLs, private/no-store redirects and 600-second Storage signatures. Artwork uses HMAC capabilities bound to resource, path and Supabase project audience, valid roughly 9-10 minutes. Valid image delivery avoids per-image membership queries; expired authentic capabilities require current authorisation and current canonical reference before renewal. Raster bytes only, bounded size, private browser caching for remaining lifetime, no shared CDN caching. Existing server secrets are reused without new variables, client credentials or broader Storage permissions. Canonical database references are unchanged. Workspace image upload now explicitly accepts JPEG/PNG/WebP/GIF and derives extension from MIME.

Native recovery retries an errored same-origin media source once, preserves playback position/settings and waits for seek completion. Healthy playback is untouched. Autoplay denial and intentional pause are not retry signals. Full physical lock-screen behaviour remains unverified.

Scoped live evidence: old primed direct image/audio URLs return 400 for HEAD and body/Range probes after staging cutover. App artwork returns 200; audio app redirect targets staging and signed upstream Range returns 206. Public song waveform and two-track playlist playback/advance passed. Public playlist images all loaded after private cutover. Owner private playback/seek/restart and wrong-active-workspace denial passed on compatible candidates. Latest e19 signed-out dashboard/private audio are 401, invalid image 404, public song/image 200; image Cache-Control is private with bounded remaining TTL. Expired authentic public artwork renewed with 307 then 200 on an earlier compatible candidate. These are scoped checks, not a complete hosted distinct-user role matrix or global CDN purge guarantee.

Single 57519-byte image transport comparison, agent region and no browser cache: first app request about 1.54s; three repeat app requests 0.489/0.439/0.514s, legacy direct 0.426/0.155/0.141s. Preview protection/server hop differs. This is delivery-cost evidence, not a dashboard baseline or B17 improvement. Measure comparable useful-dashboard and first-audio times before release.

### Remaining acceptance actions

Use this exact Preview, not old staging deployments that still issue permanent public URLs. For any failure stop rollout; return page URL, device/browser, step, expected/actual result, error text and screenshot. Do not include signed URLs or tokens.

| Owner / environment | Action | Expected successful result |
| --- | --- | --- |
| User / staging desktop | Open dashboard, songs, playlists and Settings | Existing artwork and intended private content load |
| User / staging phone | Play song, lock phone, pause longer than ten minutes, resume and seek | Correct position; smooth playback; working lock-screen controls |
| User / staging phone | Restart, repeat, change version, switch songs and playlist tracks | Correct source and no overlapping audio |
| User / staging phone | Leave public playlist idle beyond ten minutes, then select next track | Fresh authorised delivery and correct song |
| User / staging | Upload a disposable supported audio file below 50 MB as a new song and new version | Finalization succeeds; artwork/waveform/playback correct |
| User / staging | Attempt a supported audio file above 50 MB | Clear size error; no usable partial version or duplicate allocation |
| Agent / staging | Verify actual successful upload near inclusive 50 MB boundary | Storage and app limits agree; quota accounting correct |
| User / staging | Change designated song, playlist and workspace artwork using supported raster files | New image appears and persists after reload |
| Agent / staging | Exercise actual upload/finalize/removal on an explicitly disposable fixture | Private bucket write/cleanup paths work without changing permissions |
| Agent / staging | Controlled public-share revoke and playlist-entry removal | No fresh authorisation; existing capability ends within accepted cache/expiry contract |
| Agent / staging | Full owner/member/outsider role matrix and account switching | Intended access only; no cross-account cached content |
| Agent / staging | Comparable dashboard/image/first-audio measurements | Added delivery cost acceptable and recorded separately from B17 baseline |
| Agent / Production, after staging acceptance | Deploy compatible app first, then private buckets and 50 MB bucket ceiling | Live app/auth/public media and legacy URL denial verified; stop on failure |

No database migration is required for this candidate. Production rollout order is compatible application first, then bucket configuration. Preserve the prior deployment/commit for code rollback, but rolling back to old permanent-URL code while buckets remain private breaks media. Prefer fix-forward. Reopening buckets restores the confirmed known-URL privacy defect and requires explicit security review; never silently do that as a rollback. No file move/delete or mass reference rewrite is planned.

## Chrome on iPhone first-play follow-up, 2 November 2026

User reports other staging tests pass, but repeated new uploads need a second Play on mobile; browser clarified as Chrome on iPhone. Treat this as user-reported acceptance with B25 still open. Source e5dd6435 starts media in the original tap and preserves that element across asynchronous WaveSurfer attachment. Waveform preparation no longer gates the initial media play; constructor-triggered initial loads aren't duplicated. Existing pause/navigation cleanup covers the early element. No production change.

Local checks: 245 Node tests, TypeScript, focused lint zero errors; eight real-media Chromium transport tests pass, including a gesture-only first-play policy. The new mobile regression fails against the pre-fix source. This simulated policy is not physical WebKit validation. New Preview https://song-review-app-v2-d1qnlsvnw-corisleachmans-projects.vercel.app is Ready at exact source e5dd6435. CI 41412981282 passes with 30 browser cases and 10 skipped. Hosted login/config/public song/artwork return 200; signed-out dashboard/private audio 401, invalid artwork 404. Exact device retest must use this new source, not e19c8582.

Next user action after deployment: in Chrome on the same iPhone, upload a disposable supported song, open it and tap Play once immediately. Expect audio to start without permission warning, Retry or second tap. Repeat with another new upload, then reload an existing song and test first Play, pause/resume and seeking. Stop on failure and return page URL, iOS/Chrome version, format/size and screenshot/error text without signed media URLs.

## First-play phone acceptance, 2 November 2026

The user initially retested the older 68v0n1nrf Preview. After being directed to the corrected d1qnlsvnw Preview (e5dd6435), the user confirmed “That worked”. Record B25 first-play acceptance on Chrome on iPhone as user-verified staging evidence. No repeat test is required now. Production is unchanged. This confirmation does not supply independent evidence for the remaining agent-owned upload-boundary/cleanup, live revocation, role-matrix and comparative performance checks above. Earlier pending phone-retest statements are superseded for B25 only.

## Live acceptance and query-cost checkpoint, 2 November 2026

Synthetic-only staging fixture: exact 52428800-byte WAV upload/finalize/play passes; row size equals Storage object size. 52428802-byte file is rejected; targeted inventory confirms zero matching song/version/object for the rejected fixture. Workspace storage counter equals the sum of finalized sizes joined through songs (legacy version account_id is not the canonical workspace relation). No real song was modified. Existing owner and a separate existing member both play the private fixture; switching the member to another active workspace returns Not found for its private media. No new Auth user/membership or billing change. This extends hosted role coverage; it is not a third distinct nonmember-user identity test.

Synthetic public-song sharing was enabled and disabled through the app. New public song/media requests then return 404. A synthetic public playlist intentionally served the private fixture with 307; removing its entry through the app leaves the playlist 200 with zero tracks and audio 404. The issued audio token had 600 seconds remaining at issuance; Range returned 206, then 400 at expiry+3 seconds before any deletion. No token/path was saved in the repository. This checks one region/origin path and does not retract already buffered bytes.

Source 5464b27f added existing Server-Timing instrumentation. This identifies sequential database round trips as substantial cost, not just Preview transport overhead. Source 89bdf552 joins version/song and entry/playlist using verified existing foreign keys (staging and Production read-only); latest and playlist-entry requests run independently in parallel. No cache, new permissions, schema, TTL or player change. The latest finalized-only and same-workspace/public-entry checks remain mandatory before signing. 246 Node tests, TypeScript and focused lint pass; two Vercel builds pass; browser CI 41422213111 has 30 passed/10 skipped.

Paired measurement: same existing public staging version, two warmups per candidate then five alternating samples, before 5464b27f and after 89bdf552. Handler median 1067.8 → 748.0 ms (29.9% reduction); total HTTP median 1.272609 → 1.077889 s (15.3% reduction). Preview protection/network cost remains; these are CLI transport/server timings, not dashboard/phone first-audio measurements. New measured Preview: https://song-review-app-v2-gp7sfh7t3-corisleachmans-projects.vercel.app . Current-source hosted probes pass: private signed-out 401, revoked song 404, removed playlist entry 404, existing public playlist 200 and intended track delivery 307. Its player is unchanged from the physical-phone accepted source.

Cleanup: user explicitly approved deletion of only the agent-created synthetic song and playlist. Not yet executed: Chrome reports an extension panel blocking automation. The blocked screenshot/address was not inspected through another surface. Resume approved HTTPS testing after the user closes that panel; preserve the separate in-app browser upload flow. Production remains unchanged. Earlier remaining-action rows are historical where this checkpoint supplies completion evidence; cleanup and Production are not complete.

## Final candidate verification, 2 November 2026

Head 62ba8881 merges the current launch records; application code is identical to measured source 89bdf552. Primary Preview https://song-review-app-v2-65bhbnyrn-corisleachmans-projects.vercel.app is Ready at that exact head. Browser CI 41423050784 passes 30 cases/10 skipped. Exact-head HTTP checks pass: signed-out private 401, revoked synthetic share 404, intended public media 307 targeting staging. The separate secondary-project deployment check was still pending at this checkpoint. PR #68 is mergeable and remains draft. Approved fixture cleanup is still waiting on the Chrome extension panel; Production is unchanged. No repeat phone/upload test is requested.

## Approved fixture cleanup completed, 2 November 2026

After the user closed the blocking Chrome extension panel, the approved synthetic song was deleted through the staging app. Readback confirms its version and audio object are gone. The empty approved test playlist was removed using a guarded SQL delete because the current UI has no playlist-delete control. Zero matching song/version/object/playlist/entry rows remain. Storage accounting released exactly 52428800 bytes and matches remaining finalized sizes (64762207 bytes). Other songs and the separate upload flow were preserved. All four checks pass at PR head 62ba8881. Earlier cleanup-blocked statements are historical. Production rollout is next; do not mark Production complete until deployment/configuration/live checks pass.

## Production release, 2 November 2026

Release order was compatible application first, then Storage configuration. PR #68 merged as ff15719f868442ae2f6690119d57981f8b93531a; Vercel primary project prj_GoSvIjynlundQRAjTe4NIrwY0Gz0 (song-review-app-v2), team team_z9MLYFXhcAfyoZfq63V6NDri, Production deployment dpl_5DUjouXJFu6ueiEuXwBgSkMHx6xW is Ready and aliased to https://www.song-room.live/ . Staging/code acceptance is 246 Node tests, TypeScript/focused lint, all four PR checks and exact-head CI 41423050784 (30 passed, 10 skipped). The release merge adds documentation to tested application source; no new app logic.

Before access cutover, live authorised audio redirected to hxtsuhmqrufcdplidtov Storage, signed Range returned 206 and artwork/public song/playlist worked. Existing Production Google identity was present (seven Auth users), avoiding signup. Dashboard access used its existing signed-in owner session. Email login configuration stays enabled; password management stays disabled.

Through the authenticated Production dashboard, song-images public=false was saved first and verified; delivered artwork stayed 200 while the previously primed direct public artwork URL changed from 200 to 400 for HEAD/GET. Then song-files public=false and file_size_limit=52428800 were saved and read back. Its MIME list and the artwork size/MIME settings were preserved. Global 50 MB and enabled spend cap verified in Storage settings; no billing or broader permission change. No Production file was uploaded, moved or deleted, and no schema/migration/environment-variable/dependency change occurred.

Post-cutover live verification:
- Homepage/login/config/public song/public playlist 200. Signed-out private audio 401; invalid artwork 404.
- Intended public audio 307, Production upstream verified, signed Range 206; corresponding old public audio Range 400. App artwork 200 (146544 bytes); public playlist artwork samples all three 200 and intended track 307.
- Owner dashboard populated with 25 songs; all 23 delivered artwork images loaded. Existing song first Play advances to 0:25, Home seeks to zero and pause works. A separately confirmed private song also advances to 0:26 without Retry. Playback left paused.
- Readback confirms both buckets private and audio limit 52428800; seven Auth users remain. Bounded 20-minute error-level scan for the release deployment has zero rows.

Limits: physical iPhone acceptance, actual exact/oversize uploads and timed expiry/revocation tests are staging evidence; no live payment, fresh Production upload, Production share mutation or exhaustive Production role matrix was performed. The origin/agent-region direct URL probes are not a distributed CDN invalidation proof. Supabase warns that earlier cached public assets may persist; previously downloaded/buffered bytes cannot be retracted. Newly issued access follows the bounded-capability contract; no immediate universal revocation is promised. Current owners/users with an old pre-release page may need to reload to receive compatible delivery URLs. These limits do not close broader L5 S2-S7 work.

Rollback: the previous live code deployment at preflight was dpl_FgrUmz3bewUmGeCt1yLTGyY1rdEU (64ea7b7a, documentation-only relative to the old application). Rolling back to that app while media buckets stay private would break old public-URL clients. Prefer a compatible fix-forward release. No down migration exists or is needed. Reopening public buckets restores the confirmed privacy defect and requires explicit security review; never do it silently as a playback workaround. No mass reference rewrite or file deletion occurred.
