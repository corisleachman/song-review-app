import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabaseServer';

const resend = new Resend(process.env.RESEND_API_KEY);

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { threadId, songId, versionId, timestamp, author, commentText, isReply } = await req.json();

    // Get song and version details
    const { data: songData } = await supabaseServer
      .from('songs')
      .select('title')
      .eq('id', songId)
      .single();

    const { data: versionData } = await supabaseServer
      .from('song_versions')
      .select('version_number, label')
      .eq('id', versionId)
      .single();

    // Determine recipient (the other person)
    const corisEmail = process.env.CORIS_EMAIL;
    const alEmail = process.env.AL_EMAIL;
    const recipient = author === 'Coris' ? alEmail : corisEmail;

    if (!recipient) {
      console.error('Recipient email not configured');
      return NextResponse.json({ sent: false });
    }

    const versionName = versionData?.label
      ? `Version ${versionData.version_number} - ${versionData.label}`
      : `Version ${versionData?.version_number}`;

    const deepLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/songs/${songId}/versions/${versionId}?thread=${threadId}`;

    const subject = isReply
      ? `New reply on ${songData?.title || 'Song'} - ${versionName} at ${formatTimestamp(timestamp)}`
      : `New comment on ${songData?.title || 'Song'} - ${versionName} at ${formatTimestamp(timestamp)}`;

    const emailText = `
${author} ${isReply ? 'replied' : 'commented'} on ${songData?.title || 'your song'} (${versionName}) at ${formatTimestamp(timestamp)}:

"${commentText}"

Click here to view and reply: ${deepLink}
    `.trim();

    const result = await resend.emails.send({
      from: 'Song Review <onboarding@resend.dev>',
      to: recipient,
      subject,
      text: emailText,
      html: `
        <p><strong>${author}</strong> ${isReply ? 'replied' : 'commented'} on <strong>${songData?.title}</strong> (${versionName}) at <strong>${formatTimestamp(timestamp)}</strong>:</p>
        <blockquote style="margin: 20px 0; padding: 15px; border-left: 2px solid #ccc;">
          <p>${commentText}</p>
        </blockquote>
        <p><a href="${deepLink}" style="padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none;">View Thread</a></p>
      `,
    });

    console.log('Email sent:', result);
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ sent: false, error: String(error) }, { status: 500 });
  }
}
