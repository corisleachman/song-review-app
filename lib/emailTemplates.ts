// Song Room email standard v2 (TSR v3 brand). Pure string builders with no
// imports so they can be unit-tested and reused by every transactional email.
// Wireframe: https://corisleachman.github.io/song-review-app/wireframes/email-system-v2.html

export const EMAIL_FROM = 'Song Room <noreply@song-room.live>';

const C = {
  canvas: '#0E0A0A', card: '#1C1515', rule: '#2E2626', straw: '#F0E48C', red: '#C0392B',
  text: '#F4EDE4', secondary: '#D4C4B0', meta: '#8F7E70',
};
const BODY = "'DM Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "'ThunderBlack','Arial Narrow','Helvetica Neue',Arial,sans-serif";

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
  cta: { label: string; href: string };
  footerReason: string;
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
body{margin:0;padding:0;background:${C.canvas};}
a{text-decoration:none}
@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}.hl{font-size:22px!important}.song{font-size:40px!important}.art{width:96px!important;height:96px!important}.artcell{width:96px!important;padding-right:16px!important}.btnt{width:100%!important}.btnt a{display:block!important;text-align:center!important;padding-left:12px!important;padding-right:12px!important}.mk{width:80px!important}.vpill{letter-spacing:.1em!important}}
</style></head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(shell.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};"><tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.canvas};border:1px solid ${C.rule};">
<tr><td class="px" style="padding:24px 32px;border-bottom:1px solid ${C.rule};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><a href="${escapeHtml(home)}"><img src="${escapeHtml(logo)}" width="46" height="44" alt="Song Room" style="display:block;border:0;"></a></td>
<td align="right" style="font-family:${BODY};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${C.meta};">${escapeHtml(shell.workspaceName)}</td>
</tr></table></td></tr>
<tr><td class="px" style="padding:32px 32px 24px;">
<div style="font-family:${BODY};font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:${C.straw};font-weight:700;">&#9679;&nbsp; ${escapeHtml(shell.eyebrow)}</div>
<div class="hl" style="font-family:${BODY};font-size:24px;line-height:1.3;color:${C.text};margin-top:12px;font-weight:600;">${escapeHtml(shell.headline)}</div>
</td></tr>
${shell.bodyHtml}
<tr><td class="px" style="padding:24px 32px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" class="btnt"><tr><td style="background:${C.red};">
<a href="${escapeHtml(shell.cta.href)}" style="display:inline-block;padding:16px 28px;font-family:${BODY};font-weight:700;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:${C.text};">${escapeHtml(shell.cta.label)} &rarr;</a>
</td></tr></table>
</td></tr>
<tr><td class="px" style="padding:28px 32px;">
<div style="border-top:1px solid ${C.rule};padding-top:18px;font-family:${BODY};font-size:12px;line-height:1.7;color:${C.meta};">
${escapeHtml(shell.footerReason)}<br>
<a href="${escapeHtml(settings)}" style="color:${C.secondary};text-decoration:underline;">Notification settings</a> &nbsp;&middot;&nbsp; <a href="${escapeHtml(home)}" style="color:${C.secondary};text-decoration:underline;">song-room.live</a>
</div></td></tr>
</table></td></tr></table>
</body></html>`;
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

  const art = data.artworkUrl
    ? `<img src="${escapeHtml(data.artworkUrl)}" width="132" height="132" alt="${escapeHtml(songInitials(song))}" class="art" style="display:block;width:132px;height:132px;border:0;background:${C.straw};color:${C.canvas};font-family:${DISPLAY};font-size:40px;font-weight:900;text-align:center;line-height:132px;">`
    : `<table role="presentation" width="132" height="132" cellpadding="0" cellspacing="0" class="art" style="width:132px;height:132px;background:${C.straw};"><tr><td align="center" valign="middle" style="font-family:${DISPLAY};font-weight:900;font-size:52px;line-height:1;color:${C.canvas};letter-spacing:.02em;">${escapeHtml(songInitials(song))}</td></tr></table>`;
  const row = (key: string, value: string) => `<tr><td class="mk" style="padding:3px 0;font-family:${BODY};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.meta};width:96px;">${key}</td><td style="padding:3px 0;font-family:${BODY};font-size:14px;color:${C.text};">${escapeHtml(value)}</td></tr>`;
  const rows = [
    row('By', uploader),
    row('Uploaded', uploadedAt),
    status ? row('Status', status) : '',
    previous ? row('Previous', previous) : '',
  ].join('');

  const songCard = `<tr><td class="px" style="padding:0 32px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.rule};"><tr>
<td class="artcell" width="132" valign="top" style="width:132px;padding:16px 20px 16px 16px;">${art}</td>
<td valign="top" style="padding:16px 16px 16px 0;">
<div class="song" style="font-family:${DISPLAY};font-weight:900;font-size:48px;line-height:.92;text-transform:uppercase;color:${C.text};letter-spacing:.01em;word-break:break-word;">${escapeHtml(song)}</div>
<div style="margin:10px 0 12px;"><span class="vpill" style="display:inline-block;border:1px solid ${C.straw};color:${C.straw};font-family:${BODY};font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;padding:4px 8px;">${escapeHtml(versionName)}</span></div>
<table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr></table>
</td></tr>`;

  const notesBlock = notes ? `<tr><td class="px" style="padding:0 32px 8px;">
<div style="font-family:${BODY};font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${C.meta};font-weight:700;margin:0 0 10px;">Notes from ${escapeHtml(uploader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="3" style="background:${C.straw};font-size:0;">&nbsp;</td>
<td style="padding:4px 0 4px 16px;font-family:${BODY};font-size:15px;line-height:1.6;color:${C.secondary};white-space:pre-wrap;">${escapeHtml(notes)}${notesTruncated ? `<br><a href="${escapeHtml(data.link)}" style="color:${C.text};text-decoration:underline;">Read the full notes in Song Room</a>` : ''}</td></tr></table>
</td></tr>` : '';

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
