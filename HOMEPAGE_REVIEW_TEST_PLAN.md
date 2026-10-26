# Homepage review: implementation status and user testing

Updated 26 October 2026.

## Current status

Homepage work is isolated on `codex/homepage-first-visit-login`, based on the production branch `clone-clean`. The user approved pushing this branch and opening a draft PR with a Preview deployment. Production deployment and merge remain unapproved. The original local app runs at http://localhost:3006 while its development server remains running.

Implemented:

- Outlined Log in button beside Start for free on desktop.
- Persistent phone header and footer login link.
- Working section, legal and email contact destinations in the footer.
- Homepage images, screenshots, icons, slideshow pictures, video and fonts bundled under `public/marketing-assets/`, with source URLs and hashes in `manifest.json`.
- Existing waveform screenshot moved directly after the hero, keeping its enlarge interaction.
- Phone introduction sized around its contents rather than clipped to a viewport-based row.
- Existing billing totals made larger and higher contrast. Prices, billing intervals and signup links are unchanged.

Copy work is complete locally:

- Free is described as 500 MB and up to five collaborators in addition to the owner. Metadata and the final signup invitation use the same allowance.
- Removed the unimplemented three-version restriction and unsupported plan-exclusive format/share/branding claims. Paid differences now match the existing upgrade screen: storage, collaborator allowance and Studio priority support. Product behaviour has not changed.
- Signup notes use the existing `/api/auth/email/config` response: Google-only when email auth is disabled, Google or email when enabled, and a general next-page note if configuration is unavailable.
- The write-like-coris skill and both supporting references are installed under `.agents/skills/write-like-coris/` and were read before editing.
- Signed-in homepage redirection remains an optional later enhancement, outside these changes.

Before rollout: complete the configured-preview authentication checks below. No production deployment has been made.

## Known local authentication blocker

The current checkout does not have the Supabase URL/public key needed by the browser client. The login route was reached, but it failed with `Your project's URL and API key are required to create a Supabase client`. The dev overlay also reported the existing cookie script placement in `app/layout.tsx`. Neither configuration nor that pre-existing layout was changed by this task. Therefore account-entry checks 6–8, 28, 32–33 and 40 must be completed in a configured preview. Do not treat the local login failure as a successful check.

## Test order and failure evidence

Run the local checks first. Agent must resolve failures before preview deployment. Once deployment is authorised, Agent deploys the intended focused changes to preview and repeats the checks there. Production deployment requires separate authorisation and passing preview checks.

For EVERY failed check below, stop that journey and return the check number, exact URL, browser/device, screenshot and the full visible error. Include relevant Console/Network errors if available. Do not proceed into account creation, payment or production rollout after a failure.

Use a private browser window for signed-out tests. Use your existing account for returning-user tests. Don't create a new account or complete a payment just to test these homepage changes.

## Local user checklist

Every numbered row is assigned to User in the local app at http://localhost:3006 unless the Where column names another location.

| # | Owner | Where | Exact action | Expected result |
|---|---|---|---|---|
| 1 | User | Local app, desktop private window | Open `http://localhost:3006/`. | Homepage opens without signing in. |
| 2 | User | Local app, desktop | Look for Log in without scrolling. | It is an outlined button beside the red Start for free button, separate from Features and Pricing. |
| 3 | User | Local app, desktop | Hover over Log in, then Start for free. | Each has a visible response; login remains readable and signup retains its red emphasis. |
| 4 | User | Local app, desktop keyboard | Tab through the header; use Shift+Tab to return. | Controls receive visible focus in the order Features, Pricing, Log in, Start for free. |
| 5 | User | Local app, desktop | Scroll down several sections. | Header stays available and Log in remains visible. |
| 6 | User | Configured preview app, desktop | Click Log in. | `/login` opens; no plan is selected by that link. |
| 7 | User | Configured preview app, signed out | Return to the preview homepage and click Start for free in the header. | Signup redirects to `/login?signupPlan=free` and presents the Free signup context. |
| 8 | User | Configured preview app, signed out | Repeat Start for free from the hero, Free price card and final section. | Each preserves Free signup intent. |
| 9 | User | Local app, mobile viewport 390x844 | Open the homepage at the top. | Compact dark header shows the logo and outlined Log in button. |
| 10 | User | Local app, mobile | Leave the cookie banner open and tap the header Log in button. | Banner does not cover the button; login opens. |
| 11 | User | Local app, mobile | Return home and scroll halfway down. | Login remains available in the fixed header. |
| 12 | User | Local app, narrow viewport 320x568 | Read the entire introduction and scroll if needed. | All introductory text fits its row; the next image row does not cover it. |
| 13 | User | Local app, landscape viewport 844x390 | Open and scroll the homepage. | Header login stays visible and text doesn't force horizontal page scrolling. |
| 14 | User | Local app, tablet viewport 768x1024 | Open the homepage and inspect header controls. | Log in and Start for free remain distinct and usable. |
| 15 | User | Local app, desktop browser | Increase zoom to 200%, then inspect the header and introduction. | Text stays readable and account controls remain reachable. |
| 16 | User | Local app, mobile | Scroll between sections and attempt horizontal page scrolling. | The page itself has no unintended horizontal overflow; the phone screenshot gallery can still scroll sideways. |
| 17 | User | Local app | Scroll immediately below the hero. | The real waveform/song screenshot appears before the problem section and artwork-colour feature. |
| 18 | User | Local app | Click or tap that early screenshot. | Screenshot viewer opens with the song-view image and caption. |
| 19 | User | Local app, screenshot viewer | Use Next and Previous. | Viewer moves through the remaining screenshots without broken images. |
| 20 | User | Local app, screenshot viewer | Press Escape on desktop, then reopen and use Close. | Both close the viewer and restore page interaction. |
| 21 | User | Local app, mobile gallery | Swipe through phone screenshots and tap one. | Scrolling works and the selected screenshot enlarges. |
| 22 | User | Local app | Scroll to footer and click Features. | URL ends in `#features`; the problem/features section comes into view below the header. |
| 23 | User | Local app | Click footer Pricing. | URL ends in `#pricing`; pricing appears below the fixed header. |
| 24 | User | Local app | Click the header logo from lower down the page. | URL ends in `#hero` and the page returns to the opening section. |
| 25 | User | Local app | Dismiss cookie banner if it covers the footer, then click Privacy. | The actual Privacy Policy opens at `/privacy`. |
| 26 | User | Local app | Return home and click Terms. | Terms of Service opens at `/terms`. |
| 27 | User | Local app | Inspect or activate Contact without sending a message. | Target is `mailto:hello@song-room.live`; a configured mail app may open. No message is sent automatically. |
| 28 | User | Configured preview app | Click footer Log in. | `/login` opens, matching the header login destination. |
| 29 | User | Local app, pricing | Leave Annual selected. | Pro shows £7.17/month with £86 billed yearly; Studio shows £15.83/month with £190 billed yearly. Totals are readable. |
| 30 | User | Local app, pricing | Select Monthly. | Pro changes to £9/month and Studio to £19/month; billing notes change to billed monthly. |
| 31 | User | Local app, pricing | Inspect Choose Pro and Choose Studio links after switching periods. | Monthly links carry `billing=month`; Annual links carry `billing=year`. |
| 32 | User | Configured preview app, signed out | Click Choose Pro with Monthly selected; stop at login. | Login URL preserves `signupPlan=pro&billing=month`; signup context reflects Pro monthly. |
| 33 | User | Configured preview app, signed out | Repeat Studio with Annual selected; stop at login. | Login preserves `signupPlan=studio&billing=year`; signup context reflects Studio annual. |
| 34 | User | Local app, pricing | Switch Monthly and Annual several times. | Prices, notes and destination links remain in sync; no layout break. |
| 35 | User | Local app, private window | Open a fresh homepage with the cookie banner visible; choose Reject and reload. | Banner disappears and does not return in that window; homepage still works. |
| 36 | User | Local app, browser Network panel | Reload the homepage and scroll through the galleries. Filter requests for `github`, `googleapis` and `gstatic`. | Homepage fonts and media make no requests to those hosts. This check applies to the homepage, not login/legal pages. |
| 37 | User | Local app, browser Network panel | Filter for `/marketing-assets/` while scrolling through the page. | Assets load from localhost without 404s; lazy-loaded images appear as their sections approach. |
| 38 | User | Local app | Inspect the tab icon and the opening slideshow. | Favicon loads and photos continue rotating without blank cells. |
| 39 | User | Local app, video section | Inspect video playback and toggle its sound control on, then off. | Video loads from the site, starts muted where browser policy permits and the control toggles sound. |
| 40 | User | Configured preview app, existing signed-in session | Open homepage and click Log in. | Existing login behaviour takes you into your app; no duplicate account is created. The homepage itself still remains public. |
| 41 | User | Local app, pricing and final signup section | Read the plan lists, invitation text and page description. | Free consistently states 500 MB and five collaborators; there is no three-version limit or plan-exclusive format/share claim. Pro/Studio differences match the app upgrade screen. |
| 42 | User | Configured preview app, homepage | Compare signup notes with the sign-in options actually offered on `/login`. | Google-only configuration says a Google account is needed; email-enabled configuration mentions Google or email. No account creation is required. |
| 43 | User | Local app, browser Network request blocking | Block `/api/auth/email/config`, then reload the homepage. Remove the block after checking. | Both notes retain the general next-page wording, the page still works and no inaccurate Google-only claim appears. |

## Agent verification already completed

- `npm test`: 105 tests passed, including both signup configurations, configuration-failure fallback and inline-script parsing.
- `git diff --check`: passed.
- Public homepage served through the actual local Next.js app.
- Narrow phone check: introduction height fits its cell; fixed login unobstructed; no horizontal page overflow.
- Footer Privacy and Terms opened their real routes.
- Asset files checked against their source hashes and all static/local slideshow references checked for existence.

- Five viewport checks passed at 320x568, 390x844, 844x390, 768x1024 and 1440x900: copy fits, fixed login remains unobstructed and there is no horizontal page overflow.
- Moved screenshot viewer opened with its local image, Next worked, and Close restored page interaction.
- Monthly/annual values and paid signup links changed together correctly.
- The new asset test file passes targeted ESLint.
- Account-entry reached `/login`, but login render failed because the local Supabase configuration is absent. Full signup, sign-in, session return and checkout are unverified.

The user checklist includes real-device and existing-account checks that automated inspection cannot substitute for.

## Preview and production rollout

1. Agent, repository: review the completed plan/signup wording and run `npm test` and `git diff --check`. Expected: all checks pass and no unresolved homepage claims remain. On failure, stop and return the failing output.
2. Agent, GitHub/deployment platform: only after authorisation, commit the focused homepage files and deploy to preview. Do not include unrelated pre-existing authentication/documentation changes. Expected: a preview URL for this change. On failure, stop and report deployment logs and URL.
3. User, preview app: repeat checks 1–43 using the preview URL. Use a real phone for checks 9–13 and 21. Expected: same results, with media loaded from the preview host. On failure, return evidence as specified above.
4. Agent, production: only after preview passes and production deployment is authorised, deploy the tested revision. No migrations or environment changes are required for these layout, link and asset updates. Expected: production serves the tested revision. On failure, stop and return deployment logs.
5. User and Agent, production app: repeat account-entry, legal links, screenshot viewer, annual/monthly prices and local-asset loading checks. Expected: the tested behaviour is live. Stop on any failure.

Rollback: use the previous known-good deployment or revert the focused homepage commit. Keep the previous HTML and its asset bundle together. There are no schema changes or data migrations to reverse.
