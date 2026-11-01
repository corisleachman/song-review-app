# Storage privacy review

1 November 2026. [Current checklist](LAUNCH_CHECKLIST.md). B23, L5/S2-S3.

## Confirmed evidence

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

### Staging configuration limitation

The connector returned 403 when listing the verified primary project's environment metadata. CLI fallback pulls for the known historical staging branches supplied empty Supabase values, so no usable local staging connection was established. No hosted variable was edited, no permission widened and no Production settings substituted. Temporary pull output was removed. Confirm the existing protected staging branch/configuration before deploying. An automatic Preview isn't proof of staging isolation.

### Exact next test gate

All rows are Not run. Confirm staging source/project first. No bucket switch is authorised by this preparation checkpoint: complete compatible serving paths and the rollout plan first.

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
