import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — The Song Room",
  description: "The terms and conditions governing your use of The Song Room.",
};

export default function TermsPage() {
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
          <h1 className="legal-title">Terms of<br />Service</h1>
          <p className="legal-meta">Last updated: June 2026 · Effective immediately</p>
        </header>

        <div className="legal-section">
          <h2>Agreement</h2>
          <p>These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of The Song Room (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), a music collaboration platform available at <a className="legal-link" href="https://song-room.live">song-room.live</a>. By creating an account or using the platform, you agree to these Terms.</p>
          <p>If you are using The Song Room on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.</p>
        </div>

        <div className="legal-section">
          <h2>What The Song Room Is</h2>
          <p>The Song Room is a software-as-a-service platform that lets musicians, producers, and creative teams share audio files, leave timestamped feedback, track decisions, and manage collaborative music projects in shared workspaces.</p>
        </div>

        <div className="legal-section">
          <h2>Your Account</h2>
          <p>To use The Song Room you must create an account. You are responsible for:</p>
          <ul>
            <li>Keeping your login credentials secure and confidential</li>
            <li>All activity that occurs under your account</li>
            <li>Notifying us immediately if you suspect unauthorised access</li>
          </ul>
          <p>You must be at least 13 years old to use the platform. Accounts are for individuals — you may not share your account credentials with others.</p>
        </div>

        <div className="legal-section">
          <h2>Acceptable Use</h2>
          <p>You may use The Song Room only for lawful purposes and in accordance with these Terms. You agree not to:</p>
          <ul>
            <li>Upload content you do not have the right to share</li>
            <li>Infringe the intellectual property rights of others</li>
            <li>Use the platform to distribute malware or harmful code</li>
            <li>Attempt to access systems or data you are not authorised to access</li>
            <li>Use the platform to harass, abuse, or harm other users</li>
            <li>Resell or sublicense access to the platform</li>
            <li>Reverse-engineer or attempt to extract the platform&apos;s source code</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these rules.</p>
        </div>

        <div className="legal-section">
          <h2>Your Content</h2>
          <p>You retain full ownership of all audio files, images, comments, and other content you upload to The Song Room (&ldquo;Your Content&rdquo;). By uploading content, you grant us a limited, non-exclusive licence to store, display, and transmit Your Content solely to provide the platform&apos;s features to you and your collaborators.</p>
          <p>We do not claim ownership of Your Content and will not use it for any purpose beyond operating the platform. You are responsible for ensuring that Your Content does not infringe any third-party rights.</p>
        </div>

        <div className="legal-section">
          <h2>Plans and Billing</h2>
          <p>The Song Room offers a free plan and paid subscription plans. Paid plans are billed monthly or annually as selected at checkout. All payments are processed securely by Stripe — we do not store your payment details.</p>
          <ul>
            <li>Subscriptions renew automatically at the end of each billing period</li>
            <li>You can cancel your subscription at any time from your account settings</li>
            <li>Cancellation takes effect at the end of the current billing period — you retain access until then</li>
            <li>We do not offer refunds for partial billing periods</li>
          </ul>
          <p>We may change plan pricing with at least 30 days&apos; notice sent to your registered email address.</p>
        </div>

        <div className="legal-section">
          <h2>Storage Limits</h2>
          <p>Each plan includes a storage allowance. If you exceed your plan&apos;s storage limit, you will be notified and asked to upgrade or remove files. We will not delete your files without advance notice.</p>
        </div>

        <div className="legal-section">
          <h2>Availability</h2>
          <p>We aim to keep The Song Room available and reliable, but we do not guarantee uninterrupted service. We may carry out maintenance, apply updates, or experience outages beyond our control. We are not liable for losses caused by platform unavailability.</p>
        </div>

        <div className="legal-section">
          <h2>Termination</h2>
          <p>You may close your account at any time from your account settings. We may suspend or terminate your account if you violate these Terms, with notice where reasonably practicable.</p>
          <p>On termination, your data will be deleted in accordance with our <a className="legal-link" href="/privacy">Privacy Policy</a>. You should export any content you wish to keep before closing your account.</p>
        </div>

        <div className="legal-section">
          <h2>Intellectual Property</h2>
          <p>The Song Room platform — including its design, code, branding, and features — is owned by us and protected by applicable intellectual property law. These Terms do not grant you any rights to our intellectual property beyond the limited licence to use the platform as described here.</p>
        </div>

        <div className="legal-section">
          <h2>Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, The Song Room is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including loss of data, loss of revenue, or loss of business opportunity.</p>
          <p>Our total liability to you for any claim arising under these Terms will not exceed the amount you paid us in the 12 months prior to the claim.</p>
        </div>

        <div className="legal-section">
          <h2>Governing Law</h2>
          <p>These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        </div>

        <div className="legal-section">
          <h2>Changes to These Terms</h2>
          <p>We may update these Terms from time to time. When we make material changes, we&apos;ll notify you by email at least 14 days before they take effect. Continued use of the platform after that date constitutes acceptance of the updated Terms.</p>
        </div>

        <div className="legal-section">
          <h2>Contact</h2>
          <p>Questions about these Terms? Get in touch at <a className="legal-link" href="mailto:hello@song-room.live">hello@song-room.live</a></p>
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
