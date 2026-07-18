import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

interface SongEntryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SongEntryPage(props: SongEntryPageProps) {
  const params = await props.params;
  noStore();
  const songId = params.id;

  const [{ data: song }, { data: latestVersion, error: latestVersionError }] = await Promise.all([
    supabaseServer
      .from('songs')
      .select('id')
      .eq('id', songId)
      .maybeSingle(),
    supabaseServer
      .from('song_versions')
      .select('id')
      .eq('song_id', songId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!song) {
    notFound();
  }

  if (latestVersionError) {
    throw latestVersionError;
  }

  if (latestVersion?.id) {
    redirect(`/songs/${songId}/versions/${latestVersion.id}`);
  }

  redirect(`/songs/${songId}/upload`);
}
