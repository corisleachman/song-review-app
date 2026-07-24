# The Song Room SEO content engine

This system generates one reviewable SEO article from the approved topic queue each week.

## How it works

1. `.github/workflows/generate-seo-article.yml` runs every Monday at 08:17 UTC or manually from GitHub Actions.
2. `scripts/generate-seo-article.mjs` selects the highest-priority topic with `status: ready`.
3. The script combines the topic with `seo/brand-context.md` and asks OpenAI for a structured article.
4. It writes a branded HTML page into `wireframes/Song Room Branding/blog/`.
5. It rebuilds the blog index and marks the topic as published.
6. The workflow opens a pull request. Nothing publishes until that pull request is reviewed and merged.

## Required GitHub configuration

In repository Settings, open **Secrets and variables → Actions**.

Create this repository secret:

- `OPENAI_API_KEY`: an OpenAI project API key.

Create these repository variables:

- `OPENAI_MODEL`: the model used for article generation. If omitted, the script uses `gpt-5-mini`.
- `SITE_URL`: use `https://song-room.live`.

## First run

After this setup is merged into `main`:

1. Add the secret and variables above.
2. Open the **Actions** tab.
3. Select **Generate SEO article**.
4. Select **Run workflow**.
5. Review the pull request created by the workflow.
6. Merge it when the article is ready to publish.

## Topic management

Edit `seo/topics.json` to add, reprioritise or pause articles.

Supported statuses:

- `ready`: eligible for generation.
- `paused`: ignored by the agent.
- `published`: already generated.

Lower priority numbers run first.

## Publishing safety

The agent never commits generated content directly to `main`. Every article arrives through a pull request so claims, tone and usefulness can be checked before publication.

## Before the custom domain switches

The blog index intentionally starts with `noindex, nofollow` while the marketing site is still a GitHub Pages preview. The generation script creates article pages for the future `song-room.live/blog/` location. Remove the noindex directive from the blog index when the custom domain points to the marketing site.

## Next extensions

- Generate a Resend newsletter draft after an article is approved.
- Generate LinkedIn, Instagram and Threads copy from the article.
- Add article hero-image generation.
- Feed Search Console performance into topic prioritisation.
- Create content-refresh pull requests for pages that rank but do not yet convert.
