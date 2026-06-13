import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — The Song Room",
  description: "How The Song Room collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @font-face {
          font-family: "ThunderLC";
          src: url("https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/fonts/Thunder-BoldLC.ttf") format("truetype");
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "ThunderLC";
          src: url("https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/fonts/Thunder-BlackLC.ttf") format("truetype");
          font-weight: 900;
          font-style: normal;
          font-display: swap;
        }
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap");

        .legal-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(14,10,10,0.96);
          border-bottom: 1px solid rgba(244,237,228,0.10);
          padding: 0 48px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          backdrop-filter: blur(8px);
        }
        .legal-nav-logo {
          font-family: "ThunderLC", sans-serif; font-weight: 700;
          font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase;
          color: #F4EDE4; text-decoration: none;
        }
        .legal-nav-logo em { color: #C0392B; font-style: italic; }
        .legal-nav-back {
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #D4C4B0; text-decoration: none;
          border: 1px solid rgba(244,237,228,0.18); padding: 8px 18px;
          transition: color 150ms, border-color 150ms;
        }
        .legal-nav-back:hover { color: #F4EDE4; border-color: #D4C4B0; }
        .legal-main {
          max-width: 720px; margin: 0 auto; padding: 80px 48px 120px;
        }
        .legal-header {
          border-bottom: 1px solid rgba(244,237,228,0.10);
          padding-bottom: 48px; margin-bottom: 64px;
        }
        .legal-eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: 0.16em;
          text-transform: uppercase; color: #C0392B; margin-bottom: 20px;
        }
        .legal-title {
          font-family: "ThunderLC", sans-serif; font-weight: 900;
          font-size: clamp(48px, 7vw, 80px); line-height: 0.95;
          letter-spacing: 0.02em; text-transform: uppercase;
          color: #F4EDE4; margin-bottom: 24px;
        }
        .legal-meta { font-size: 13px; font-style: italic; color: #8C7B6B; }
        .legal-section { margin-bottom: 56px; }
        .legal-section h2 {
          font-size: 10px; font-weight: 600; letter-spacing: 0.16em;
          text-transform: uppercase; color: #8C7B6B;
          margin-bottom: 20px; padding-bottom: 12px;
          border-bottom: 1px solid rgba(244,237,228,0.10);
        }
        .legal-section p {
          font-size: 15px; line-height: 1.8; color: #F4EDE4; margin-bottom: 16px;
        }
        .legal-section p:last-child { margin-bottom: 0; }
        .legal-section ul { list-style: none; margin-bottom: 16px; }
        .legal-section ul li {
          font-size: 15px; line-height: 1.8; color: #F4EDE4;
          padding-left: 24px; position: relative; margin-bottom: 6px;
        }
        .legal-section ul li::before {
          content: "—"; position: absolute; left: 0;
          color: #F0E48C; font-weight: 700;
        }
        .legal-section strong { color: #F4EDE4; font-weight: 600; }
        .legal-link {
          color: #F0E48C; text-decoration: underline;
          text-underline-offset: 3px; transition: color 150ms;
        }
        .legal-link:hover { color: #F4EDE4; }
        .legal-footer {
          border-top: 1px solid rgba(244,237,228,0.10);
          padding: 36px 48px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px; flex-wrap: wrap;
        }
        .legal-footer-logo {
          font-family: "ThunderLC", sans-serif; font-weight: 700;
          font-size: 16px; letter-spacing: 0.04em; text-transform: uppercase;
          color: #8C7B6B;
        }
        .legal-footer-logo em { color: #C0392B; font-style: italic; }
        .legal-footer-links { display: flex; gap: 28px; }
        .legal-footer-links a {
          font-size: 11px; font-weight: 500; letter-spacing: 0.08em;
          text-transform: uppercase; color: #8C7B6B; text-decoration: none;
          transition: color 150ms;
        }
        .legal-footer-links a:hover { color: #F4EDE4; }
        @media (max-width: 600px) {
          .legal-nav { padding: 0 20px; }
          .legal-main { padding: 48px 20px 80px; }
          .legal-footer { padding: 28px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <nav className="legal-nav">
        <a className="legal-nav-logo" href="/">The <em>Song</em> Room</a>
        <a className="legal-nav-back" href="/">← Home</a>
      </nav>

      <main className="legal-main">
        <header className="legal-header">
          <p className="legal-eyebrow">Legal</p>
          <h1 className="legal-title">Privacy<br />Policy</h1>
          <p className="legal-meta">Last updated: June 2026 · Effective immediately</p>
        </header>

        <div className="legal-section">
          <h2>Overview</h2>
          <p>The Song Room (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a music collaboration platform that lets artists, bands, and producers share song versions, leave timestamped feedback, and manage creative workflows together. This Privacy Policy explains what personal data we collect when you use The Song Room at <a className="legal-link" href="https://song-room.live">song-room.live</a>, why we collect it, and how we handle it.</p>
          <p>By using The Song Room, you agree to the collection and use of information as described here.</p>
        </div>

        <div className="legal-section">
          <h2>Information We Collect</h2>
          <p>We collect information you give us directly when you create an account or use the platform:</p>
          <ul>
            <li>Your name and email address (used for account creation and notifications)</li>
            <li>Profile information you choose to provide</li>
            <li>Audio files, cover art, and other creative content you upload</li>
            <li>Comments, annotations, and feedback you leave on tracks</li>
            <li>Workspace and collaboration settings you configure</li>
          </ul>
          <p>We also collect limited technical data automatically when you use the platform:</p>
          <ul>
            <li>Log data including IP address, browser type, and pages visited</li>
            <li>Device information such as operating system and screen resolution</li>
            <li>Usage data such as features accessed and time spent</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>How We Use Your Information</h2>
          <p>We use the data we collect to operate and improve The Song Room:</p>
          <ul>
            <li>To create and manage your account</li>
            <li>To deliver the core collaboration features — audio playback, comments, workspaces</li>
            <li>To send you email notifications about activity in your workspaces</li>
            <li>To process payments for paid plans via our billing provider</li>
            <li>To diagnose technical problems and improve platform performance</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>We do not sell your personal data. We do not use your data to train AI or machine learning models.</p>
        </div>

        <div className="legal-section">
          <h2>Third-Party Services</h2>
          <p>The Song Room uses a small number of trusted third-party services to operate:</p>
          <ul>
            <li><strong>Supabase</strong> — database and file storage (your audio and images are stored on Supabase infrastructure)</li>
            <li><strong>Stripe</strong> — payment processing for paid subscriptions (we never see or store your card details)</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Vercel</strong> — application hosting</li>
            <li><strong>Google OAuth</strong> — optional sign-in with Google</li>
          </ul>
          <p>Each of these providers processes data under their own privacy policies and data processing agreements.</p>
        </div>

        <div className="legal-section">
          <h2>Your Audio and Creative Content</h2>
          <p>Audio files, images, and other creative content you upload remain yours. We store them solely to provide the platform&apos;s functionality — playback, waveform rendering, sharing within your workspaces. We do not access, analyse, or use your creative content for any other purpose.</p>
          <p>When you delete a track or close your account, your files are permanently removed from our storage within 30 days.</p>
        </div>

        <div className="legal-section">
          <h2>Data Retention</h2>
          <p>We keep your account data for as long as your account is active. If you close your account, we delete your personal data and uploaded files within 30 days, except where retention is required by law.</p>
        </div>

        <div className="legal-section">
          <h2>Your Rights</h2>
          <p>Depending on where you are located, you may have the right to access, correct, export, or delete your personal data. To exercise any of these rights, contact us at the address below and we will respond within 30 days.</p>
        </div>

        <div className="legal-section">
          <h2>Cookies</h2>
          <p>We use session cookies to keep you signed in. We do not use third-party tracking cookies or advertising cookies.</p>
        </div>

        <div className="legal-section">
          <h2>Security</h2>
          <p>We use industry-standard measures to protect your data — encrypted connections (HTTPS), row-level security on our database, and strict access controls. No method of transmission over the internet is completely secure, but we take all reasonable precautions.</p>
        </div>

        <div className="legal-section">
          <h2>Children&apos;s Privacy</h2>
          <p>The Song Room is not directed at children under 13. We do not knowingly collect personal data from anyone under 13. If you believe we have done so, please contact us and we will delete the data promptly.</p>
        </div>

        <div className="legal-section">
          <h2>Changes to This Policy</h2>
          <p>We may update this policy from time to time. When we make material changes, we&apos;ll notify you by email or by posting a notice on the platform. The date at the top of this page shows when it was last updated.</p>
        </div>

        <div className="legal-section">
          <h2>Contact</h2>
          <p>Questions about this policy or your data? Get in touch at <a className="legal-link" href="mailto:hello@song-room.live">hello@song-room.live</a></p>
        </div>
      </main>

      <footer className="legal-footer">
        <p className="legal-footer-logo">The <em>Song</em> Room</p>
        <nav className="legal-footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/">Home</a>
        </nav>
      </footer>
    </>
  );
}
