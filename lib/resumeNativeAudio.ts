// Recover a failed native-media resume only through our stable, authorised URL.
// Already-playing/loaded media is untouched; no timer swaps an active source.
export async function resumeNativeAudio(
  audio: HTMLAudioElement,
  options: { isCurrent: () => boolean; origin?: string; timeoutMs?: number } = { isCurrent: () => true },
) {
  const current = () => options.isCurrent();
  const aborted = () => new DOMException('Playback changed.', 'AbortError');
  if (!current()) throw aborted();
  const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const original = audio.getAttribute('src') ?? '';
  try {
    await audio.play();
    return;
  } catch (error) {
    if (!current()) throw aborted();
    const name = error instanceof Error ? error.name : '';
    // User-gesture policy and an intentional pause/navigation aren't expiry.
    if (name === 'NotAllowedError' || name === 'AbortError') throw error;
    if (audio.error?.code !== 2 && audio.error?.code !== 4 && name !== 'NotSupportedError') throw error;
    const origin = options.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    let url: URL;
    try { url = new URL(original, origin); } catch { throw error; }
    if (url.origin !== origin || !url.pathname.startsWith('/api/media/audio/')) throw error;
    url.searchParams.set('renew', String(Date.now()));
    await new Promise<void>((resolve, reject) => {
      const clean = () => {
        clearTimeout(timer);
        audio.removeEventListener('loadedmetadata', ready);
        audio.removeEventListener('error', failed);
        audio.removeEventListener('seeked', restored);
      };
      const failed = () => { clean(); reject(new Error('Audio could not be renewed. Press Play to try again.')); };
      const restored = () => {
        clean();
        if (!current()) { reject(aborted()); return; }
        resolve();
      };
      const ready = () => {
        if (!current()) { clean(); reject(aborted()); return; }
        try {
          // Seeking is asynchronous in real media elements. Don't restart play
          // until the saved position has actually been restored.
          audio.addEventListener('seeked', restored);
          audio.currentTime = Number.isFinite(audio.duration) ? Math.min(position, audio.duration) : position;
          if (!audio.seeking) restored();
        } catch { clean(); reject(new Error('Audio position could not be restored.')); }
      };
      const timer = setTimeout(failed, options.timeoutMs ?? 12000);
      audio.addEventListener('loadedmetadata', ready);
      audio.addEventListener('error', failed);
      try {
        audio.crossOrigin = 'anonymous';
        audio.src = url.toString();
        audio.load();
      } catch { failed(); }
    });
    if (!current()) throw aborted();
    // One retry only. An inaccessible resource must surface an error, not loop.
    await audio.play();
  }
}
