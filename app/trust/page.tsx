import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security & Trust — The Song Room",
  description:
    "The security and discoverability measures built into The Song Room.",
  alternates: { canonical: "/trust" },
  openGraph: {
    type: "website",
    title: "Security & Trust — The Song Room",
    description:
      "The security and discoverability measures built into The Song Room.",
    url: "/trust",
    images: [
      { url: "/song-room-preview.jpg", width: 1200, height: 630, alt: "The Song Room" },
    ],
  },
};

const SECURITY: [string, string][] = [
  ["Encrypted connection", "Every page loads over HTTPS, enforced site-wide so the connection can't be downgraded."],
  ["Hardened browser headers", "Protections against clickjacking, content-sniffing and referrer leakage on every response."],
  ["Content Security Policy", "A policy governs what's allowed to run on the page, and it's actively monitored."],
  ["Row-level database security", "Access is enforced row by row, so people only ever reach their own songs and data."],
  ["Server-verified access", "Sign-in and permissions are checked on the server, never trusted from the browser."],
  ["Google sign-in", "Accounts use Google authentication, so The Song Room never sees or stores your password."],
  ["Encryption at rest", "Uploaded audio and account data are encrypted where they're stored."],
  ["Server-only secrets", "Keys and credentials stay on the server and are never shipped to the browser."],
  ["Injection protection", "User content is escaped and database queries are parameterised to block injection attacks."],
  ["Continuous dependency scanning", "Third-party code is scanned automatically and patched as security fixes ship."],
  ["Abuse protection on public forms", "Public inputs are rate-limited and spam-guarded."],
  ["Cookie consent", "Non-essential tracking only runs after you agree."],
];

const DISCOVERABILITY: [string, string][] = [
  ["robots.txt", "Clear crawl rules tell search engines what to index."],
  ["XML sitemap", "A full sitemap helps search engines find every page."],
  ["Page titles & descriptions", "Every page carries purpose-written search metadata."],
  ["Social share cards", "Links unfurl into rich previews when shared on social and in messages."],
  ["Favicon & app icons", "Proper icons across browsers, tabs and devices."],
  ["Custom 404 page", "A branded, helpful page when something can't be found."],
  ["Mobile-first & responsive", "Designed for the phone first, scaling cleanly up to desktop."],
  ["Canonical URLs", "One clear address per page, so search ranking isn't split."],
  ["Privacy Policy & Terms", "Both published and linked from the site footer."],
  ["Accessibility checks in CI", "Automated accessibility tests run on every change before it ships."],
  ["Consent-gated analytics", "Usage analytics that only run once you've given consent."],
];

function Check() {
  return (
    <span className="trust-check" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path d="M2 8.5 L6 12.5 L14 3.5" />
      </svg>
    </span>
  );
}

function Item({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="trust-item">
      <Check />
      <div className="trust-item-body">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}

export default function TrustPage() {
  return (
    <>
      <style>{`
        @font-face {
          font-family: "ThunderLC";
          src: url("https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/fonts/Thunder-LC.ttf") format("truetype");
          font-weight: 700; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: "ThunderBlack";
          src: url("https://corisleachman.github.io/song-review-app/wireframes/fonts/Thunder-BlackLC.woff2") format("woff2"),
               url("https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/fonts/Thunder-BlackLC.otf") format("opentype");
          font-weight: 900; font-style: normal; font-display: swap;
        }
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap");

        .trust-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(14,10,10,0.96);
          border-bottom: 1px solid rgba(244,237,228,0.10);
          padding: 0 48px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          backdrop-filter: blur(8px);
        }
        .trust-nav-logo {
          font-family: "ThunderLC", sans-serif; font-weight: 700;
          font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase;
          color: #F4EDE4; text-decoration: none;
        }
        .trust-nav-logo em { color: #C0392B; font-style: italic; }
        .trust-nav-back {
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #D4C4B0; text-decoration: none;
          border: 1px solid rgba(244,237,228,0.18); padding: 8px 18px;
          transition: color 150ms, border-color 150ms;
        }
        .trust-nav-back:hover { color: #F4EDE4; border-color: #D4C4B0; }

        .trust-main { max-width: 1000px; margin: 0 auto; padding: 72px 48px 100px; }

        .trust-header {
          border-bottom: 1px solid rgba(244,237,228,0.10);
          padding-bottom: 48px; margin-bottom: 64px;
        }
        .trust-eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: 0.16em;
          text-transform: uppercase; color: #F0E48C; margin-bottom: 20px;
        }
        .trust-title {
          font-family: "ThunderBlack", "ThunderLC", sans-serif; font-weight: 900;
          font-size: clamp(52px, 9vw, 104px); line-height: 0.9;
          letter-spacing: 0.01em; text-transform: uppercase; color: #F4EDE4;
        }
        .trust-title span { color: #F0E48C; }
        .trust-lede {
          margin-top: 24px; max-width: 560px;
          font-size: 16px; line-height: 1.6; color: #D4C4B0;
        }

        .trust-stats {
          display: flex; flex-wrap: wrap; margin-top: 40px;
          border: 1px solid rgba(244,237,228,0.18);
        }
        .trust-stat {
          flex: 1; min-width: 150px; padding: 20px 24px;
          border-right: 1px solid rgba(244,237,228,0.10);
          display: flex; flex-direction: column; gap: 8px;
        }
        .trust-stat:last-child { border-right: none; }
        .trust-stat-num {
          font-family: "ThunderBlack", "ThunderLC", sans-serif; font-weight: 900;
          font-size: 44px; line-height: 0.9; color: #F0E48C;
        }
        .trust-stat-num.plain { color: #F4EDE4; }
        .trust-stat-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #8C7B6B;
        }

        .trust-section { margin-bottom: 64px; }
        .trust-section-head {
          display: flex; align-items: baseline; gap: 16px;
          padding-bottom: 16px; border-bottom: 1px solid rgba(244,237,228,0.18);
        }
        .trust-section-head h2 {
          font-family: "ThunderBlack", "ThunderLC", sans-serif; font-weight: 900;
          font-size: clamp(28px, 5vw, 42px); line-height: 0.9;
          text-transform: uppercase; color: #F4EDE4;
        }
        .trust-section-count {
          font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #F0E48C;
        }

        .trust-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          border: 1px solid rgba(244,237,228,0.10); border-bottom: none;
          margin-top: 24px;
        }
        .trust-item {
          display: flex; gap: 16px; padding: 22px 24px;
          border-bottom: 1px solid rgba(244,237,228,0.10);
          border-right: 1px solid rgba(244,237,228,0.10);
        }
        .trust-item:nth-child(2n) { border-right: none; }
        .trust-check {
          flex-shrink: 0; width: 26px; height: 26px;
          border: 1px solid #F0E48C;
          display: flex; align-items: center; justify-content: center; margin-top: 2px;
        }
        .trust-check svg { width: 15px; height: 15px; display: block; }
        .trust-check svg path {
          stroke: #F0E48C; stroke-width: 2.4; fill: none;
          stroke-linecap: square; stroke-linejoin: miter;
        }
        .trust-item-body h3 {
          font-family: "DM Sans", sans-serif; font-size: 15px; font-weight: 600;
          color: #F4EDE4; margin-bottom: 5px;
        }
        .trust-item-body p {
          font-family: "DM Sans", sans-serif; font-size: 13.5px;
          line-height: 1.55; color: #8C7B6B;
        }

        .trust-footer {
          max-width: 1000px; margin: 0 auto; padding: 32px 48px 64px;
          border-top: 1px solid rgba(244,237,228,0.10);
          display: flex; flex-wrap: wrap; gap: 16px;
          align-items: center; justify-content: space-between;
        }
        .trust-footer-logo {
          font-family: "ThunderLC", sans-serif; font-weight: 700;
          font-size: 20px; text-transform: uppercase; letter-spacing: 0.03em;
          color: #F4EDE4;
        }
        .trust-footer-logo em { color: #C0392B; font-style: italic; }
        .trust-footer-links { display: flex; gap: 20px; }
        .trust-footer-links a {
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: #D4C4B0; text-decoration: none;
        }
        .trust-footer-links a:hover { color: #F4EDE4; }

        .trust-nav-logo:focus-visible, .trust-nav-back:focus-visible,
        .trust-footer-links a:focus-visible {
          outline: 2px solid #F0E48C; outline-offset: 3px;
        }

        @media (prefers-reduced-motion: no-preference) {
          .trust-header, .trust-section {
            animation: trustRise 0.55s cubic-bezier(0.23,1,0.32,1) both;
          }
          .trust-section:nth-of-type(2) { animation-delay: 0.08s; }
          @keyframes trustRise {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: none; }
          }
        }

        @media (max-width: 680px) {
          .trust-nav { padding: 0 20px; }
          .trust-main { padding: 48px 20px 72px; }
          .trust-footer { padding: 28px 20px 56px; }
          .trust-grid { grid-template-columns: 1fr; }
          .trust-item:nth-child(n) { border-right: none; }
          .trust-stat { border-right: none; border-bottom: 1px solid rgba(244,237,228,0.10); }
          .trust-stat:last-child { border-bottom: none; }
        }
      `}</style>

      <nav className="trust-nav">
        <Link className="trust-nav-logo" href="/">The <em>Song</em> Room</Link>
        <Link className="trust-nav-back" href="/">← Home</Link>
      </nav>

      <main className="trust-main">
        <header className="trust-header">
          <p className="trust-eyebrow">Trust &amp; Launch Readiness</p>
          <h1 className="trust-title">Secure.<br />Discoverable.<br /><span>Ship-ready.</span></h1>
          <p className="trust-lede">A live snapshot of the security and discoverability measures already built into The Song Room.</p>
          <div className="trust-stats">
            <div className="trust-stat">
              <span className="trust-stat-num">12</span>
              <span className="trust-stat-label">Security measures</span>
            </div>
            <div className="trust-stat">
              <span className="trust-stat-num">11</span>
              <span className="trust-stat-label">SEO &amp; discoverability</span>
            </div>
            <div className="trust-stat">
              <span className="trust-stat-num plain">HTTPS</span>
              <span className="trust-stat-label">Enforced site-wide</span>
            </div>
          </div>
        </header>

        <section className="trust-section">
          <div className="trust-section-head">
            <h2>Security</h2>
            <span className="trust-section-count">Protections in place</span>
          </div>
          <div className="trust-grid">
            {SECURITY.map(([title, desc]) => (
              <Item key={title} title={title} desc={desc} />
            ))}
          </div>
        </section>

        <section className="trust-section">
          <div className="trust-section-head">
            <h2>Discoverability &amp; SEO</h2>
            <span className="trust-section-count">In place</span>
          </div>
          <div className="trust-grid">
            {DISCOVERABILITY.map(([title, desc]) => (
              <Item key={title} title={title} desc={desc} />
            ))}
          </div>
        </section>
      </main>

      <footer className="trust-footer">
        <p className="trust-footer-logo">The <em>Song</em> Room</p>
        <nav className="trust-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/">Home</Link>
        </nav>
      </footer>
    </>
  );
}
