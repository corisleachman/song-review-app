// Song Room email standard v2 (TSR v3 brand). Pure string builders with no
// imports so they can be unit-tested and reused by every transactional email.
// Wireframe: https://corisleachman.github.io/song-review-app/wireframes/email-system-v2.html

export const EMAIL_FROM = 'Song Room <noreply@song-room.live>';

const C = {
  canvas: '#0E0A0A', card: '#1C1515', rule: '#2E2626', straw: '#F0E48C', red: '#C0392B',
  text: '#F4EDE4', secondary: '#D4C4B0', meta: '#8F7E70',
};
// Gmail recolours borders, so rules are 1px painted cells instead.
const RULE = `height:1px;line-height:1px;font-size:0;${bg(C.rule)}`;
const BODY = "'DM Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "'ThunderBlack','Arial Narrow','Helvetica Neue',Arial,sans-serif";

// Gmail's iPhone app in dark mode inverts emails it thinks are dark, and it
// ignores the color-scheme meta tag. It leaves background-image alone, so every
// fill is painted twice (bg). Light text is wrapped in two blend layers (lock)
// that undo the inversion in Gmail only; elsewhere they blend to no change.
// Technique: https://www.hteumeuleu.com/2021/fixing-gmail-dark-mode-css-blend-modes/
function bg(color: string) {
  return `background-color:${color};background-image:linear-gradient(${color},${color});`;
}

function lock(inner: string) {
  return `<span class="gm-s" style="display:block;"><span class="gm-d" style="display:block;">${inner}</span></span>`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function songInitials(title: string) {
  const letters: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const first = word.match(/[A-Za-z0-9\u00C0-\u024F]/);
    if (first) letters.push(first[0]);
    if (letters.length === 2) break;
  }
  return letters.join('').toUpperCase() || 'SR';
}

function oneLine(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  const chars = Array.from(value);
  return chars.length <= max ? value : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

export interface EmailShell {
  origin: string;
  preheader: string;
  workspaceName: string;
  eyebrow: string;
  headline: string;
  bodyHtml: string;
  // Null for code-only emails (reauthentication).
  cta: { label: string; href: string } | null;
  footerReason: string;
  // Off for people who aren't members yet (invites).
  showSettings?: boolean;
}

// Anatomy: A header, B eyebrow, C headline, D/E body, F one red button, G footer.
export function renderEmailShell(shell: EmailShell) {
  const logo = new URL('/marketing-assets/songroom-logo-white.png', shell.origin).toString();
  const settings = new URL('/settings/workspace', shell.origin).toString();
  const home = new URL('/', shell.origin).toString();
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(shell.headline)}</title>
<style>
@font-face{font-family:'ThunderBlack';src:url('${new URL('/marketing-assets/thunder-blacklc.woff2', shell.origin).toString()}') format('woff2');}
body{margin:0;padding:0;${bg(C.canvas)}}
a{text-decoration:none}
u + .body .gm-s{background:#000;mix-blend-mode:screen}
u + .body .gm-d{background:#000;mix-blend-mode:difference}
@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}.hl{font-size:22px!important}.song-l{font-size:40px!important}.song-m{font-size:30px!important}.song-s{font-size:24px!important}.art{width:96px!important;height:96px!important}.artcell{width:96px!important;padding-right:16px!important}.btnt{width:100%!important}.btnt a{display:block!important;text-align:center!important;padding-left:12px!important;padding-right:12px!important}.mk{width:80px!important}.vpill{letter-spacing:.1em!important}}
</style></head>
<body class="body" style="margin:0;padding:0;${bg(C.canvas)}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(shell.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(C.canvas)}"><tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;${bg(C.rule)}"><tr><td style="padding:1px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(C.canvas)}">
<tr><td class="px" style="padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><a href="${escapeHtml(home)}"><img src="${escapeHtml(logo)}" width="46" height="44" alt="Song Room" style="display:block;border:0;"></a></td>
<td align="right" style="font-family:${BODY};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${C.meta};">${lock(escapeHtml(shell.workspaceName))}</td>
</tr></table></td></tr>
<tr><td style="${RULE}">&nbsp;</td></tr>
<tr><td class="px" style="padding:32px 32px 24px;">
<div style="font-family:${BODY};font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:${C.straw};font-weight:700;">${lock(`&#9679;&nbsp; ${escapeHtml(shell.eyebrow)}`)}</div>
<div class="hl" style="font-family:${BODY};font-size:24px;line-height:1.3;color:${C.text};margin-top:12px;font-weight:600;">${lock(escapeHtml(shell.headline))}</div>
</td></tr>
${shell.bodyHtml}
${shell.cta ? `<tr><td class="px" style="padding:24px 32px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" class="btnt"><tr><td style="${bg(C.red)}">
<a href="${escapeHtml(shell.cta.href)}" style="display:inline-block;padding:16px 28px;font-family:${BODY};font-weight:700;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:${C.text};">${lock(`${escapeHtml(shell.cta.label)} &rarr;`)}</a>
</td></tr></table>
</td></tr>
` : ''}<tr><td class="px" style="padding:28px 32px;">
<div style="${RULE}">&nbsp;</div>
<div style="padding-top:18px;font-family:${BODY};font-size:12px;line-height:1.7;color:${C.meta};">
${lock(`${escapeHtml(shell.footerReason)}<br>
${shell.showSettings === false ? '' : `<a href="${escapeHtml(settings)}" style="color:${C.secondary};text-decoration:underline;">Notification settings</a> &nbsp;&middot;&nbsp; `}<a href="${escapeHtml(home)}" style="color:${C.secondary};text-decoration:underline;">song-room.live</a>`)}
</div></td></tr>
</table></td></tr></table></td></tr></table>
</body></html>`;
}

interface SongCard {
  origin: string;
  song: string;
  artworkUrl: string | null;
  pill: string;
  rows: Array<[string, string]>;
}

// D: the song card shared by every song email.
function songCardHtml(card: SongCard) {
  // No artwork: the Song Room tile (the same image used when an artwork link
  // expires). An image, because Gmail would recolour dark initials on straw.
  const artSrc = card.artworkUrl ?? new URL('/marketing-assets/email-artwork-fallback.png', card.origin).toString();
  const art = `<img src="${escapeHtml(artSrc)}" width="132" height="132" alt="${escapeHtml(songInitials(card.song))}" class="art" style="display:block;width:132px;height:132px;border:0;${bg(C.straw)}color:${C.canvas};font-family:${DISPLAY};font-size:40px;font-weight:900;text-align:center;line-height:132px;">`;
  const row = ([key, value]: [string, string]) => `<tr><td class="mk" style="padding:3px 0;font-family:${BODY};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.meta};width:96px;">${lock(escapeHtml(key))}</td><td style="padding:3px 0;font-family:${BODY};font-size:14px;color:${C.text};">${lock(escapeHtml(value))}</td></tr>`;
  const titleSize = songTitleSize(card.song);
  return `<tr><td class="px" style="padding:0 32px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(C.rule)}"><tr><td style="padding:1px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(C.card)}"><tr>
<td class="artcell" width="132" valign="top" style="width:132px;padding:16px 20px 16px 16px;">${art}</td>
<td valign="top" style="padding:16px 16px 16px 0;">
<div class="${titleSize.className}" style="font-family:${DISPLAY};font-weight:900;font-size:${titleSize.px}px;line-height:.92;text-transform:uppercase;color:${C.text};letter-spacing:.01em;word-break:break-word;">${lock(escapeHtml(card.song))}</div>
<div style="margin:10px 0 12px;"><span style="display:inline-block;${bg(C.straw)}padding:1px;"><span class="vpill" style="display:inline-block;${bg(C.card)}color:${C.straw};font-family:${BODY};font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;padding:4px 8px;">${lock(escapeHtml(card.pill))}</span></span></div>
<table role="presentation" cellpadding="0" cellspacing="0">${card.rows.map(row).join('')}</table>
</td></tr></table>
</td></tr></table>
</td></tr>`;
}

// E: a labelled quote (notes, comments). bodyHtml must already be escaped.
function quoteHtml(label: string, bodyHtml: string, options: { muted?: boolean; bottom?: number } = {}) {
  const bar = options.muted ? C.rule : C.straw;
  const color = options.muted ? C.meta : C.secondary;
  return `<tr><td class="px" style="padding:0 32px ${options.bottom ?? 8}px;">
<div style="font-family:${BODY};font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${C.meta};font-weight:700;margin:0 0 10px;">${lock(escapeHtml(label))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="3" style="${bg(bar)}font-size:0;">&nbsp;</td>
<td style="padding:4px 0 4px 16px;font-family:${BODY};font-size:15px;line-height:1.6;color:${color};white-space:pre-wrap;">${lock(bodyHtml)}</td></tr></table>
</td></tr>`;
}

function readMoreHtml(link: string, label: string) {
  return `<br><a href="${escapeHtml(link)}" style="color:${C.text};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

function paragraphHtml(bodyHtml: string) {
  return `<tr><td class="px" style="padding:0 32px 12px;font-family:${BODY};font-size:15px;line-height:1.6;color:${C.secondary};">${lock(bodyHtml)}</td></tr>`;
}

export interface VersionUploadEmailData {
  origin: string;
  link: string;
  songTitle: string;
  artworkUrl: string | null;
  versionNumber: number;
  versionLabel: string | null;
  notes: string | null;
  uploaderName: string;
  uploadedAt: Date;
  status: string | null;
  previous: { versionNumber: number; uploadedAt: Date } | null;
  workspaceName: string;
}

const STATUS_LABELS: Record<string, string> = {
  writing: 'Writing', in_progress: 'In progress', mixing: 'Mixing', mastering: 'Mastering', finished: 'Finished',
};
const NOTES_LIMIT = 280;

// Thunder is condensed, so short titles can be large; long titles step down so
// they don't run to four or five lines beside the artwork.
export function songTitleSize(title: string) {
  const length = Array.from(title).length;
  if (length <= 16) return { px: 48, className: 'song-l' };
  if (length <= 28) return { px: 36, className: 'song-m' };
  return { px: 28, className: 'song-s' };
}

export function formatEmailDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', timeZoneName: 'short',
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' }).format(date);
}

export function buildVersionUploadEmail(data: VersionUploadEmailData) {
  const song = oneLine(data.songTitle) || 'Untitled song';
  const uploader = oneLine(data.uploaderName) || 'A collaborator';
  const workspace = oneLine(data.workspaceName) || 'your workspace';
  const label = data.versionLabel ? oneLine(data.versionLabel) : '';
  const versionName = `Version ${data.versionNumber}${label ? ` · ${label}` : ''}`;
  const status = data.status ? STATUS_LABELS[data.status] ?? null : null;
  const uploadedAt = formatEmailDate(data.uploadedAt);
  const previous = data.previous
    ? `Version ${data.previous.versionNumber} · ${formatShortDate(data.previous.uploadedAt)}`
    : null;
  const notesFull = data.notes?.trim() ?? '';
  const notes = notesFull ? truncate(notesFull, NOTES_LIMIT) : '';
  const notesTruncated = notes !== notesFull;
  const ctaLabel = `Listen to Version ${data.versionNumber}`;

  const subject = `${song}: Version ${data.versionNumber} is ready to hear`;
  const preheader = truncate(
    `${uploader} uploaded ${versionName} to ${workspace}.${notes ? ` “${oneLine(notes)}”` : ''}`,
    140,
  );

  const songCard = songCardHtml({
    origin: data.origin,
    song,
    artworkUrl: data.artworkUrl,
    pill: versionName,
    rows: [
      ['By', uploader],
      ['Uploaded', uploadedAt],
      ...(status ? [['Status', status] as [string, string]] : []),
      ...(previous ? [['Previous', previous] as [string, string]] : []),
    ],
  });

  const notesBlock = notes
    ? quoteHtml(`Notes from ${uploader}`, `${escapeHtml(notes)}${notesTruncated ? readMoreHtml(data.link, 'Read the full notes in Song Room') : ''}`)
    : '';

  const html = renderEmailShell({
    origin: data.origin,
    preheader,
    workspaceName: workspace,
    eyebrow: 'New version',
    headline: `${uploader} uploaded a new version of ${song}.`,
    bodyHtml: songCard + notesBlock,
    cta: { label: ctaLabel, href: data.link },
    footerReason: `You’re getting this because you’re a member of ${workspace} on Song Room.`,
  });

  const text = [
    `${uploader} uploaded a new version of ${song}.`,
    '',
    `Song: ${song}`,
    `Version: ${versionName}`,
    `Uploaded: ${uploadedAt} by ${uploader}`,
    status ? `Status: ${status}` : null,
    previous ? `Previous: ${previous}` : null,
    notes ? '' : null,
    notes ? `Notes from ${uploader}:` : null,
    notes ? `${notes}${notesTruncated ? ' (read the full notes in Song Room)' : ''}` : null,
    '',
    `${ctaLabel}: ${data.link}`,
    '',
    '--',
    `You’re getting this because you’re a member of ${workspace} on Song Room.`,
    `Notification settings: ${new URL('/settings/workspace', data.origin).toString()}`,
  ].filter(line => line !== null).join('\n');

  return { subject, preheader, html, text };
}

const COMMENT_LIMIT = 600;
const PARENT_LIMIT = 200;

export interface ThreadEmailData {
  origin: string;
  link: string;
  songTitle: string;
  artworkUrl: string | null;
  versionNumber: number | null;
  versionLabel: string | null;
  timestampSeconds: number;
  actorName: string;
  commentBody: string;
  isReply: boolean;
  // The comment that opened the thread, shown on replies for context.
  parent: { author: string; body: string } | null;
  workspaceName: string;
}

export function formatPlayhead(seconds: number) {
  const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${secs}` : `${mins}:${secs}`;
}

export function buildThreadEmail(data: ThreadEmailData) {
  const song = oneLine(data.songTitle) || 'Untitled song';
  const actor = oneLine(data.actorName) || 'Someone';
  const workspace = oneLine(data.workspaceName) || 'your workspace';
  const label = data.versionLabel ? oneLine(data.versionLabel) : '';
  const versionName = data.versionNumber
    ? `Version ${data.versionNumber}${label ? ` · ${label}` : ''}`
    : label || 'This version';
  const at = formatPlayhead(data.timestampSeconds);
  const bodyFull = data.commentBody.trim() || 'No message was included.';
  const body = truncate(bodyFull, COMMENT_LIMIT);
  const bodyTruncated = body !== bodyFull;
  const parentAuthor = data.parent ? oneLine(data.parent.author) || 'Someone' : '';
  const parentBody = data.parent?.body.trim() ? truncate(oneLine(data.parent.body), PARENT_LIMIT) : '';
  const showParent = data.isReply && Boolean(parentBody);

  const subject = data.isReply
    ? `${song}: ${actor} replied at ${at}`
    : `${song}: ${actor} commented at ${at}`;
  const headline = data.isReply
    ? `${actor} replied${showParent ? ` to ${parentAuthor}` : ''} on ${song} at ${at}.`
    : `${actor} commented on ${song} at ${at}.`;
  const ctaLabel = data.isReply ? 'Open the thread' : `Reply to ${actor}`;
  const preheader = truncate(`${actor}: “${oneLine(body)}”`, 140);

  const card = songCardHtml({
    origin: data.origin,
    song,
    artworkUrl: data.artworkUrl,
    pill: versionName,
    rows: [['At', at], ['By', actor]],
  });
  const parentBlock = showParent
    ? quoteHtml(`${parentAuthor} wrote`, escapeHtml(parentBody), { muted: true, bottom: 20 })
    : '';
  const commentBlock = quoteHtml(
    data.isReply ? `${actor} replied` : `${actor} wrote`,
    `${escapeHtml(body)}${bodyTruncated ? readMoreHtml(data.link, 'Read the full comment in Song Room') : ''}`,
  );

  const html = renderEmailShell({
    origin: data.origin,
    preheader,
    workspaceName: workspace,
    eyebrow: data.isReply ? 'New reply' : 'New comment',
    headline,
    bodyHtml: card + parentBlock + commentBlock,
    cta: { label: ctaLabel, href: data.link },
    footerReason: `You’re getting this because you’re a member of ${workspace} on Song Room.`,
  });

  const text = [
    headline,
    '',
    `Song: ${song}`,
    `Version: ${versionName}`,
    `At: ${at}`,
    showParent ? '' : null,
    showParent ? `${parentAuthor} wrote:` : null,
    showParent ? parentBody : null,
    '',
    data.isReply ? `${actor} replied:` : `${actor} wrote:`,
    `${body}${bodyTruncated ? ' (read the full comment in Song Room)' : ''}`,
    '',
    `${ctaLabel}: ${data.link}`,
    '',
    '--',
    `You’re getting this because you’re a member of ${workspace} on Song Room.`,
    `Notification settings: ${new URL('/settings/workspace', data.origin).toString()}`,
  ].filter(line => line !== null).join('\n');

  return { subject, preheader, html, text };
}

export interface InviteEmailData {
  origin: string;
  link: string;
  inviterName: string;
  workspaceName: string;
}

export function buildInviteEmail(data: InviteEmailData) {
  const inviter = oneLine(data.inviterName) || 'Someone';
  const workspace = oneLine(data.workspaceName) || 'a workspace';
  const subject = `${inviter} invited you to ${workspace} on Song Room`;
  const headline = `${inviter} invited you to join ${workspace} on Song Room.`;
  const explain = 'Song Room is where you share song versions with collaborators and leave feedback at the exact moment in the track. Sign in or create an account with this email address to accept.';
  const preheader = truncate(`Join ${workspace} to hear new versions and leave feedback.`, 140);
  const ctaLabel = `Join ${workspace}`;

  const bodyHtml = paragraphHtml(escapeHtml(explain))
    + paragraphHtml(`<span style="color:${C.meta};font-size:13px;">If the button doesn’t work, paste this link into your browser:</span><br><a href="${escapeHtml(data.link)}" style="color:${C.text};text-decoration:underline;word-break:break-all;font-size:13px;">${escapeHtml(data.link)}</a>`);

  const html = renderEmailShell({
    origin: data.origin,
    preheader,
    workspaceName: workspace,
    eyebrow: 'You’re invited',
    headline,
    bodyHtml,
    cta: { label: ctaLabel, href: data.link },
    footerReason: `You’re getting this because ${inviter} invited this email address to ${workspace}. If you weren’t expecting it, you can ignore this email.`,
    showSettings: false,
  });

  const text = [
    headline,
    '',
    explain,
    '',
    `${ctaLabel}: ${data.link}`,
    '',
    '--',
    `You’re getting this because ${inviter} invited this email address to ${workspace}. If you weren’t expecting it, you can ignore this email.`,
  ].join('\n');

  return { subject, preheader, html, text };
}

// Supabase Auth templates. Supabase fills the Go-template placeholders
// ({{ .RedirectTo }}, {{ .TokenHash }}, {{ .Token }}, {{ .Email }},
// {{ .SiteURL }}) when it sends, so they are inserted unescaped. The link
// contracts match the tested staging templates in EMAIL_PASSWORD_STAGING_ROLLOUT.md.
export type AuthTemplateKind = 'confirm_signup' | 'reset_password' | 'reauthentication' | 'password_changed';

const AUTH_ORIGIN = 'https://www.song-room.live';
export const AUTH_LINKS = {
  confirm_signup: '{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup',
  reset_password: '{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery',
  password_changed: '{{ .SiteURL }}/forgot-password',
} as const;
const LINK_SLOT = 'https://song-room.invalid/__auth_link__';
const EMAIL_SLOT = '__AUTH_EMAIL__';
const TOKEN_SLOT = '__AUTH_TOKEN__';

export function buildAuthTemplate(kind: AuthTemplateKind) {
  const ignore = 'If you didn’t ask for this, you can ignore this email.';
  const spec = {
    confirm_signup: {
      subject: 'Confirm your email for Song Room',
      eyebrow: 'One more step',
      headline: 'Confirm your email to finish creating your Song Room account.',
      body: paragraphHtml(escapeHtml(`Use the button below to verify your email address. ${ignore}`)),
      cta: 'Confirm my email',
      footer: 'You’re getting this because this email address was used to sign up for Song Room.',
    },
    reset_password: {
      subject: 'Reset your Song Room password',
      eyebrow: 'Password reset',
      headline: 'Choose a new password for your Song Room account.',
      body: paragraphHtml(escapeHtml('This link works once and expires soon. If you didn’t ask to reset your password, you can ignore this email and your password stays the same.')),
      cta: 'Choose a new password',
      footer: 'You’re getting this because a password reset was requested for this email address on Song Room.',
    },
    reauthentication: {
      subject: `${TOKEN_SLOT} is your Song Room verification code`,
      eyebrow: 'Verification code',
      headline: 'Use this code to confirm your password change.',
      body: `<tr><td class="px" style="padding:0 32px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" style="${bg(C.rule)}"><tr><td style="padding:1px;"><table role="presentation" cellpadding="0" cellspacing="0" style="${bg(C.card)}"><tr><td style="padding:16px 24px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:.2em;color:${C.straw};">${lock(TOKEN_SLOT)}</td></tr></table></td></tr></table></td></tr>`
        + paragraphHtml(escapeHtml('The code expires shortly. If you didn’t try to change your password, ignore this email and your password stays the same.')),
      cta: null,
      footer: 'You’re getting this because someone tried to change the password on this Song Room account.',
    },
    password_changed: {
      subject: 'Your Song Room password was changed',
      eyebrow: 'Security',
      headline: `The password for ${EMAIL_SLOT} was just changed.`,
      body: paragraphHtml(`${escapeHtml('If this was you, there’s nothing else to do. If it wasn’t, reset your password now and email')} <a href="mailto:hello@song-room.live" style="color:${C.text};text-decoration:underline;">hello@song-room.live</a>.`),
      cta: 'It wasn’t me: reset now',
      footer: 'This is a security notice for your Song Room account.',
    },
  }[kind];

  const html = renderEmailShell({
    origin: AUTH_ORIGIN,
    preheader: spec.headline,
    workspaceName: '',
    eyebrow: spec.eyebrow,
    headline: spec.headline,
    bodyHtml: spec.body,
    cta: spec.cta ? { label: spec.cta, href: LINK_SLOT } : null,
    footerReason: spec.footer,
    showSettings: false,
  });
  const link = kind === 'reauthentication' ? '' : AUTH_LINKS[kind];
  const fill = (value: string) => value
    .split(escapeHtml(LINK_SLOT)).join(link)
    .split(LINK_SLOT).join(link)
    .split(TOKEN_SLOT).join('{{ .Token }}')
    .split(EMAIL_SLOT).join('{{ .Email }}');
  return { subject: fill(spec.subject), html: fill(html) };
}
