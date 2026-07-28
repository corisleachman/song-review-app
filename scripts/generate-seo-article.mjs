import fs from 'node:fs/promises';
import path from 'node:path';

const TOPICS_PATH = 'seo/topics.json';
const BRAND_PATH = 'seo/brand-context.md';
const BLOG_DIR = 'public/blog';
const SITE_URL = process.env.SITE_URL || 'https://song-room.live';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function consentAssets() {
  return `<!-- Cookie consent and consent-gated analytics -->
<link rel="stylesheet" href="/cookie-consent.css" data-tsr-cookie-consent>
<script defer src="/cookie-consent.js" data-tsr-cookie-consent></script>`;
}

function sanitiseBodyHtml(value = '') {
  let html = String(value).trim();
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '');
  html = html.replace(/<h2\b[^>]*>\s*(?:call to action|related internal guides(?: to read next)?|further reading|summary|introduction|conclusion)\s*<\/h2>[\s\S]*?(?=<h2\b|$)/gi, '');
  html = html.replace(/<p>\s*(?:short answer|summary)\s*:\s*/gi, '<p>');
  return html.trim();
}

function validateBodyHtml(html) {
  const blocked = [
    /<h1\b/i,
    /<script\b/i,
    /<style\b/i,
    /<h2\b[^>]*>\s*call to action\s*<\/h2>/i,
    /related internal guides/i,
    /thesongroom\.example/i
  ];
  const failed = blocked.find(pattern => pattern.test(html));
  if (failed) throw new Error(`Generated bodyHtml failed validation: ${failed}`);
}

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'seo_geo_article',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              seoTitle: { type: 'string' },
              metaDescription: { type: 'string' },
              excerpt: { type: 'string' },
              directAnswer: { type: 'string' },
              bodyHtml: { type: 'string' },
              faq: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { question: { type: 'string' }, answer: { type: 'string' } }, required: ['question', 'answer'] } }
            },
            required: ['title', 'seoTitle', 'metaDescription', 'excerpt', 'directAnswer', 'bodyHtml', 'faq']
          }
        }
      }
    })
  });

  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI returned no article text.');
  return JSON.parse(text);
}

function renderArticle(article, topic, slug, publishedDate) {
  const canonical = `${SITE_URL}/blog/${slug}.html`;
  const faqSchema = article.faq.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: article.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) } : null;
  const articleSchema = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.metaDescription, datePublished: publishedDate, dateModified: publishedDate, author: { '@type': 'Organization', name: 'The Song Room' }, publisher: { '@type': 'Organization', name: 'The Song Room' }, mainEntityOfPage: canonical };

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(article.seoTitle)} | The Song Room</title>
<meta name="description" content="${escapeHtml(article.metaDescription)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:site_name" content="The Song Room"><meta property="og:title" content="${escapeHtml(article.seoTitle)}"><meta property="og:description" content="${escapeHtml(article.metaDescription)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/blog/styles.css">
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ''}
${consentAssets()}
</head>
<body>
<header class="site-header"><a class="brand" href="/">THE SONG ROOM</a><nav><a href="/blog/">Guides</a><a class="button" href="/login">Open The Song Room</a></nav></header>
<main><article class="article-shell"><p class="eyebrow">The Song Room guides</p><h1>${escapeHtml(article.title)}</h1><p class="standfirst">${escapeHtml(article.excerpt)}</p><div class="answer-summary">${escapeHtml(article.directAnswer)}</div><div class="article-meta"><time datetime="${publishedDate}">${new Date(publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time><span>${escapeHtml(topic.audience)}</span></div><div class="article-body">${article.bodyHtml}</div><section class="article-cta"><p class="eyebrow">Keep the work moving</p><h2>A shared room for every song.</h2><p>Keep versions, timestamped feedback, decisions and next steps together from first demo to finished track.</p><a class="button" href="/login">Try The Song Room</a></section></article></main>
<footer><p>© ${new Date().getUTCFullYear()} The Song Room</p></footer>
</body></html>`;
}

async function rebuildIndex(topics) {
  const published = topics.filter(t => t.status === 'published').sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const cards = published.map(t => `<article class="guide-card"><p class="eyebrow">${escapeHtml(t.intent)}</p><h2><a href="/blog/${t.slug}.html">${escapeHtml(t.generatedTitle || t.title)}</a></h2><p>${escapeHtml(t.excerpt || '')}</p><a class="text-link" href="/blog/${t.slug}.html">Read guide →</a></article>`).join('\n');
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Songwriting and collaboration guides | The Song Room</title><meta name="description" content="Practical guides for artists, producers, songwriters and bands working together on recorded music."><link rel="canonical" href="${SITE_URL}/blog/"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/blog/styles.css">${consentAssets()}</head><body><header class="site-header"><a class="brand" href="/">THE SONG ROOM</a><nav><a href="/blog/">Guides</a><a class="button" href="/login">Open The Song Room</a></nav></header><main class="index-shell"><p class="eyebrow">The Song Room guides</p><h1>Better ways to finish songs together.</h1><p class="standfirst">Practical workflows for sharing demos, organising versions, giving useful feedback and moving music forward.</p><section class="guide-grid">${cards || '<p>The first guide is being prepared.</p>'}</section></main><footer><p>© ${new Date().getUTCFullYear()} The Song Room</p></footer></body></html>`;
  await fs.writeFile(path.join(BLOG_DIR, 'index.html'), html);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');
  const topicsData = JSON.parse(await fs.readFile(TOPICS_PATH, 'utf8'));
  const brandContext = await fs.readFile(BRAND_PATH, 'utf8');
  const existingTitles = topicsData.topics.filter(t => t.status === 'published').map(t => t.generatedTitle || t.title);
  const topic = topicsData.topics.filter(t => t.status === 'ready').sort((a, b) => a.priority - b.priority)[0];
  if (!topic) { console.log('No ready topics remain.'); return; }

  const prompt = `${brandContext}\n\nARTICLE BRIEF\nPrimary keyword: ${topic.keyword}\nWorking title: ${topic.title}\nAudience: ${topic.audience}\nSearch intent: ${topic.intent}\nExisting article titles to avoid duplicating: ${existingTitles.join('; ') || 'None'}\n\nWrite a genuinely useful editorial article of roughly 1,200 to 1,800 words. Return directAnswer as a polished, self-contained two-to-four sentence answer suitable for search snippets and AI answer engines. Do not repeat that answer inside bodyHtml. Return bodyHtml as valid semantic HTML beginning with natural introductory paragraphs, followed by descriptive H2 and H3 sections. Never include H1, script, style, head, JSON-LD, schema markup or markdown fences inside bodyHtml. Never create visible headings called Summary, Introduction, Conclusion, Further reading, Related internal guides, Call to action or similar production labels. Do not invent internal guides or links. The page template already supplies the product call to action after the article, so bodyHtml must end with a natural editorial conclusion rather than another promotional block. Every <li> must have a closing </li>. Use question-led headings only where they sound natural. Include concrete steps and realistic music-making examples, but avoid invented statistics, invented authorities, unsupported claims and unnecessarily precise technical prescriptions. Distinguish stems from multitracks accurately. Do not assert that one file format, sample rate, loudness target or delivery specification is universally correct; advise readers to confirm destination requirements. Do not mention a help centre, customer story, feature, integration or internal article unless it is explicitly present in the brand context or existing-title list. Avoid placeholder copy, generic AI phrasing, fake names and overly promotional language. Keep the meta description at or below 155 characters. Include 3 to 5 concise, self-contained FAQs separately. Mention The Song Room once in the main article where it naturally solves the workflow problem, then rely on the separate page CTA. Validate the HTML structure before returning it.`;
  const article = await callOpenAI(prompt);
  article.bodyHtml = sanitiseBodyHtml(article.bodyHtml);
  validateBodyHtml(article.bodyHtml);
  const slug = slugify(article.title);
  const publishedDate = new Date().toISOString().slice(0, 10);
  await fs.mkdir(BLOG_DIR, { recursive: true });
  await fs.writeFile(path.join(BLOG_DIR, `${slug}.html`), renderArticle(article, topic, slug, publishedDate));
  Object.assign(topic, { status: 'published', slug, generatedTitle: article.title, excerpt: article.excerpt, publishedAt: publishedDate, model: MODEL });
  await fs.writeFile(TOPICS_PATH, `${JSON.stringify(topicsData, null, 2)}\n`);
  await rebuildIndex(topicsData.topics);
  console.log(`Generated ${slug}.html`);
}

main().catch(error => { console.error(error); process.exit(1); });
