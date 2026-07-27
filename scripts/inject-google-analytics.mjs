import fs from 'node:fs/promises';
import path from 'node:path';

const MEASUREMENT_ID = 'G-8VW86YBN6C';
const STATIC_FILES = ['public/marketing.html'];
const BLOG_DIR = 'public/blog';

const snippet = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${MEASUREMENT_ID}');
</script>`;

async function inject(filePath) {
  let html;
  try {
    html = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  if (html.includes(MEASUREMENT_ID)) return;
  if (!html.includes('</head>')) {
    throw new Error(`Cannot inject Google Analytics: ${filePath} has no </head> tag.`);
  }

  await fs.writeFile(filePath, html.replace('</head>', `${snippet}\n</head>`));
  console.log(`Injected Google Analytics into ${filePath}`);
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
