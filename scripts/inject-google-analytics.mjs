import fs from 'node:fs/promises';
import path from 'node:path';

const STATIC_FILES = ['public/marketing.html'];
const BLOG_DIR = 'public/blog';
const CONSENT_MARKER = 'data-tsr-cookie-consent';

const consentAssets = `<!-- Cookie consent and consent-gated analytics -->
<link rel="stylesheet" href="/cookie-consent.css" ${CONSENT_MARKER}>
<script defer src="/cookie-consent.js" ${CONSENT_MARKER}></script>`;

function removeLegacyAnalytics(html) {
  return html
    .replace(/<!-- Google tag \(gtag\.js\) -->\s*/gi, '')
    .replace(/<script\s+async\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-8VW86YBN6C"><\/script>\s*/gi, '')
    .replace(/<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\('config',\s*'G-8VW86YBN6C'\);\s*<\/script>\s*/gi, '');
}

async function inject(filePath) {
  let html;
  try {
    html = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  html = removeLegacyAnalytics(html);
  if (html.includes(CONSENT_MARKER)) {
    await fs.writeFile(filePath, html);
    return;
  }
  if (!html.includes('</head>')) {
    throw new Error(`Cannot inject cookie consent: ${filePath} has no </head> tag.`);
  }

  await fs.writeFile(filePath, html.replace('</head>', `${consentAssets}\n</head>`));
  console.log(`Injected cookie consent into ${filePath}`);
}

async function main() {
  for (const filePath of STATIC_FILES) await inject(filePath);

  try {
    const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        await inject(path.join(BLOG_DIR, entry.name));
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
