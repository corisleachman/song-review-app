# Audio Player Fixes — Mobile, Background Playback & Performance

**Applies to:** `app/songs/[id]/versions/[versionId]/page.tsx`  
**Date resolved:** April 2026  
**Tested on:** iPhone (Chrome), iOS lock screen, app switching

---

## Context

The player page uses WaveSurfer.js v7 with a reactive canvas visualisation (animated frequency bars + waveform line drawn on `<canvas>` elements in the hero background). Several interconnected audio bugs were discovered and resolved during development of the private two-person build. This document captures the final working architecture so it can be applied cleanly to the consumer-facing v2 build.

---

## Bug 1 — Audio kept playing when navigating to a different song

**Symptom:** Navigating away from a song page (← Songs, or changing version) left the previous audio still playing in the background alongside the new one.

**Root cause:** The WaveSurfer instance and its internal `<audio>` element were not being explicitly stopped before navigation.

**Fix:** A `stopPlayback()` function pauses the audio without destroying it. Call it on every navigation point:

```tsx
const stopPlayback = useCallback(() => {
  if (wavesurferRef.current) {
    try { wavesurferRef.current.pause(); } catch {}
  }
  if (audioRef.current) {
    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } catch {}
  }
  reactivePlayingRef.current = false;
  stopReactiveDrawing();
  setIsPlaying(false);
}, [...]);
```

Call sites:
- `← Songs` button: `onClick={() => { stopPlayback(); router.push('/dashboard'); }}`
- Change Version modal: `onClick={() => { stopPlayback(); setShowVersionModal(false); router.push(...); }}`

**Do NOT** call `wavesurferRef.current.destroy()` on navigation — this breaks background audio (see Bug 2).

---

## Bug 2 — Audio stopped when locking screen or switching apps on iOS

**Symptom:** Music stopped immediately when the user locked their iPhone, pressed the home button, or switched to another app. This happened in Chrome on iOS.

**Root cause (after investigation):** The original fix for Bug 1 introduced `new Audio()` with `crossOrigin = 'anonymous'` passed as the `media:` option to WaveSurfer. This puts the audio fetch into CORS mode, which iOS suspends when the app is backgrounded. Additionally, calling `createMediaElementSource(audio)` on the `<audio>` element (needed for the Web Audio API reactive visualisation) hands ownership of that element to the `AudioContext` — and iOS suspends `AudioContext`s when backgrounded, killing the audio with it.

**Final working architecture:**

### Audio element
Let WaveSurfer create its own internal `<audio>` element — do **not** pass a `media:` option and do **not** set `crossOrigin` on any element that produces audible output.

```tsx
const ws = WaveSurfer.create({
  container,
  waveColor: 'rgba(255,255,255,0.2)',
  progressColor: '#ff1493',
  // ... other options
  // NO media: option here
});

// Get the internal element WaveSurfer created (no crossOrigin set)
const audio = ws.getMediaElement() as HTMLAudioElement;
audioRef.current = audio;
analyserAudioRef.current = audio; // same element, used for desktop reactive graph
```

### Why this works
Supabase public storage buckets serve `Access-Control-Allow-Origin: *` response headers on all files. The browser honours these server-side CORS headers for audio playback without needing `crossOrigin` set on the element. Without `crossOrigin`, iOS treats the `<audio>` element as regular OS-level media and keeps it playing through lock screen and app switching.

---

## Bug 3 — Reactive visualisation vs background audio (the fundamental conflict)

**Symptom:** Enabling the Web Audio API reactive visualisation (animated frequency bars) caused audio to stop when backgrounded, even when Bug 2 was otherwise fixed.

**Root cause:** `createMediaElementSource(audioElement)` transfers ownership of the audio element to the `AudioContext`. iOS suspends `AudioContext`s when the app is backgrounded, and since the audio element is now owned by the context, it gets suspended too.

**The conflict:** Web Audio API reactive visualisation and iOS background audio are mutually exclusive when using the same audio element with a live `AudioContext`.

**Failed approaches (do not retry):**
1. Setting `crossOrigin = 'anonymous'` on the element → breaks background audio
2. Muted second `Audio()` element in sync → iOS detects two audio sessions, double-audio glitch
3. Skipping the reactive graph entirely on mobile → works for background audio but loses the rich visualisation

**Final working solution — Pre-computed frequency frames:**

On mobile, pre-compute frequency and time-domain data from the `AudioBuffer` that WaveSurfer already decoded (to render the waveform). Run it through `OfflineAudioContext` — which processes faster than real-time and is NOT subject to iOS backgrounding rules. Store the frames in a ref. The reactive animation reads from the pre-computed frames at `currentTime` instead of querying a live `AnalyserNode`.

On desktop, the live Web Audio API graph works as normal (desktops don't suspend `AudioContext`s).

### Pre-computation function

```tsx
async function precomputeFrequencyFrames(audioBuffer: AudioBuffer) {
  const fps = 24;
  const totalFrames = Math.ceil(audioBuffer.duration * fps);
  const fftSize = 2048;
  const freqBins = fftSize / 2;
  const freqFrames: Uint8Array[] = [];
  const timeFrames: Uint8Array[] = [];
  const chunkSize = 60;

  for (let chunkStart = 0; chunkStart < totalFrames; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, totalFrames);
    const chunkDuration = (chunkEnd - chunkStart) / fps;
    const startTime = chunkStart / fps;
    const sampleRate = audioBuffer.sampleRate;
    const frameSamples = Math.ceil(sampleRate / fps);
    const chunkSamples = (chunkEnd - chunkStart) * frameSamples;

    try {
      const offline = new OfflineAudioContext(
        audioBuffer.numberOfChannels, chunkSamples, sampleRate
      );
      const source = offline.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offline.destination);
      source.start(0, startTime, chunkDuration);
      const rendered = await offline.startRendering();
      const channelData = rendered.getChannelData(0);

      for (let f = chunkStart; f < chunkEnd; f++) {
        const frameOffset = (f - chunkStart) * frameSamples;
        const slice = channelData.slice(frameOffset, frameOffset + fftSize);

        // Time domain: float [-1,1] → Uint8 [0,255]
        const timeFrame = new Uint8Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
          timeFrame[i] = Math.round(((slice[i] ?? 0) + 1) * 127.5);
        }
        timeFrames.push(timeFrame);

        // Frequency: RMS energy per bucket, scaled 0-255
        const freqFrame = new Uint8Array(freqBins);
        const bucketSize = Math.floor(fftSize / freqBins);
        for (let b = 0; b < freqBins; b++) {
          let energy = 0;
          for (let s = 0; s < bucketSize; s++) {
            const sample = slice[b * bucketSize + s] ?? 0;
            energy += sample * sample;
          }
          freqFrame[b] = Math.min(255, Math.round(Math.sqrt(energy / bucketSize) * 600));
        }
        freqFrames.push(freqFrame);
      }
    } catch {
      for (let f = chunkStart; f < chunkEnd; f++) {
        freqFrames.push(new Uint8Array(freqBins));
        timeFrames.push(new Uint8Array(fftSize).fill(128));
      }
    }
    await new Promise(r => setTimeout(r, 0)); // yield to main thread
  }
  return { freqFrames, timeFrames, fps };
}
```

### Trigger pre-computation after WaveSurfer ready

```tsx
ws.on('ready', (dur: number) => {
  // ... existing ready handling ...

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const audioBuffer = ws.getDecodedData();
    if (audioBuffer) {
      void precomputeFrequencyFrames(audioBuffer).then(frames => {
        if (loadId === waveLoadIdRef.current) {
          precomputedFreqRef.current = frames;
          // If playback already started while pre-computation was running,
          // kick off reactive drawing now that frames are available
          if (reactivePlayingRef.current) {
            startReactiveDrawingRef.current?.();
          }
        }
      });
    }
  }
});
```

**Important:** `startReactiveDrawing` is a `useCallback` not in `initWaveSurfer`'s closure. Use a ref to access it:

```tsx
const startReactiveDrawingRef = useRef<(() => void) | null>(null);
// After startReactiveDrawing is defined:
startReactiveDrawingRef.current = startReactiveDrawing;
```

### In the reactive drawing loop

```tsx
const startReactiveDrawing = useCallback(() => {
  const analyser = reactiveAnalyserRef.current;
  const precomputed = precomputedFreqRef.current;
  if (!analyser && !precomputed) return;

  const fftSize = analyser ? analyser.fftSize : 2048;
  const freqBins = analyser ? analyser.frequencyBinCount : 1024;
  const timeData = new Uint8Array(fftSize);
  const frequencyData = new Uint8Array(freqBins);

  const render = () => {
    if (analyser) {
      // Desktop: live FFT from Web Audio API
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);
    } else if (precomputed) {
      // Mobile: look up pre-computed frame by currentTime
      const ws = wavesurferRef.current;
      const currentTime = ws ? ws.getCurrentTime() : 0;
      const frameIndex = Math.min(
        Math.floor(currentTime * precomputed.fps),
        precomputed.freqFrames.length - 1
      );
      const freqFrame = precomputed.freqFrames[frameIndex];
      const timeFrame = precomputed.timeFrames[frameIndex];
      if (freqFrame) frequencyData.set(freqFrame.slice(0, freqBins));
      if (timeFrame) timeData.set(timeFrame.slice(0, fftSize));
    }
    // ... rest of drawing unchanged
  };
  // ...
}, [...]);
```

### In the isPlaying useEffect

```tsx
useEffect(() => {
  if (isPlaying) {
    const isMobile = typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Skip ensureReactiveAudioGraph — pre-computed frames handle reactivity
      reactivePlayingRef.current = true;
      startReactiveDrawing();
    } else {
      // Desktop: set up live Web Audio API graph
      void ensureReactiveAudioGraph(analyserAudioRef.current).then(ready => {
        if (ready) {
          reactivePlayingRef.current = true;
          startReactiveDrawing();
        }
      });
    }
  } else {
    reactivePlayingRef.current = false;
    stopReactiveDrawing();
    drawReactiveIdle();
  }
}, [...]);
```

---

## Bug 4 — Double audio on play (two instances starting split-second apart)

**Symptom:** On mobile, pressing play started two instances of the track a split-second apart. One would then get killed, stopping the reactive animation.

**Root cause:** The WaveSurfer init `useEffect` had an unstable dependency array — it included `clearWaveTimers`, `initWaveSurfer`, `stopPlayback`, and `stopReactiveDrawing`. These are `useCallback` functions whose references re-create whenever their own dependencies change. Any render that re-creates any of them triggered a second WaveSurfer init mid-flight.

**Fix:** Trim the dependency array to only the two values that should actually trigger a new load:

```tsx
useEffect(() => {
  // ... init logic
}, [audioUrl, waveReloadNonce]); // NOT the callback functions
```

The callbacks are accessed via closure and don't need to be in the dep array — they're always current at call time.

---

## Bug 5 — Lock screen shows wrong artwork / no artwork

**Symptom:** The iOS lock screen showed a generic image regardless of which song was playing.

**Root cause:** `songTitleRef` and `songImageRef` were declared but never assigned. Song data loaded into React state via `setSong()` but the refs weren't updated.

**Fix:** Set both refs immediately when song data loads:

```tsx
setSong(songRes.data);
songTitleRef.current = songRes.data?.title ?? '';
songImageRef.current = songRes.data?.image_url ?? '';
```

Also update `songImageRef` when cover art is replaced via the upload overlay:

```tsx
setSong(prev => prev ? { ...prev, image_url: imageUrl } : prev);
songImageRef.current = imageUrl;
```

Then pass both to `MediaMetadata` in the `ws.on('play')` handler:

```tsx
if ('mediaSession' in navigator) {
  const artwork: MediaImage[] = songImageRef.current
    ? [{ src: songImageRef.current, sizes: '512x512', type: 'image/jpeg' }]
    : [];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: songTitleRef.current || 'Song Review',
    artist: 'Polite Rebels',
    album: 'Song Review App',
    artwork,
  });
  navigator.mediaSession.setActionHandler('play', () => ws.play());
  navigator.mediaSession.setActionHandler('pause', () => ws.pause());
  navigator.mediaSession.playbackState = 'playing';
}
```

---

## Bug 6 — First song visit hangs with flashing "Loading…" text

**Symptom:** On a fresh page load, navigating to the first song always failed — the waveform showed "Loading…" indefinitely. Reloading the page fixed it. Every subsequent song worked first time without reloading.

**Root cause:** While `loading === true`, the component renders only a spinner — the `<div ref={waveformRef}>` does not exist in the DOM. The `audioUrl` state is set at the same time as `setLoading(false)` in the same async block, but the WaveSurfer init `useEffect` fires on `audioUrl` change before React has re-rendered to remove the spinner. A `tryInit` polling loop retried 20 times over 1 second, never finding `waveformRef.current`, and silently gave up.

On subsequent visits the component rendered faster (assets cached), so the ref was ready before retries exhausted.

**Fix:** Guard the WaveSurfer init effect against the loading state:

```tsx
useEffect(() => {
  // Don't attempt init while the page is still loading — the waveform
  // div doesn't exist in the DOM until loading=false removes the spinner.
  if (!audioUrl || loading) return;

  // ... rest of init
}, [audioUrl, waveReloadNonce, loading]);
```

When `loading` flips to `false`, React re-renders (waveform div appears in DOM), the effect re-runs with `audioUrl` still set, and `initWaveSurfer` finds `waveformRef.current` immediately on the first try.

---

## Bug 7 — Reactive visualisation lost after lazy audio loading was introduced

**Symptom:** After implementing lazy audio loading (Bug 8), the reactive frequency bars stopped animating entirely on mobile.

**Root cause:** Two issues combined:

1. The play button had `disabled={!isReady}` — since `isReady` is only `true` after `ws.load()` completes, and `ws.load()` now only happens on first play press, the button was permanently disabled before being pressed. Users saw a warning flash when tapping it.

2. Pre-computation of frequency frames (needed for mobile reactive bars) is async — takes 2-3 seconds after `ready` fires. But `ws.play()` fires immediately after `ready`, so `isPlaying` became `true` and `startReactiveDrawing()` was called while `precomputedFreqRef.current` was still `null`. The drawing function found neither a live analyser nor pre-computed frames, and returned immediately.

**Fix — Part 1: Button disabled state**

```tsx
// Before (broken): disabled before audio ever loads
disabled={!isReady}

// After (correct): only disabled while actively loading after first press
disabled={audioLoadedRef.current && !isReady}
```

**Fix — Part 2: Start reactive drawing when pre-computation finishes**

If playback starts before pre-computation finishes, the `.then()` callback kicks off drawing once frames are ready:

```tsx
void precomputeFrequencyFrames(audioBuffer).then(frames => {
  if (loadId === waveLoadIdRef.current) {
    precomputedFreqRef.current = frames;
    // If already playing, start the reactive animation now
    if (reactivePlayingRef.current) {
      startReactiveDrawingRef.current?.();
    }
  }
});
```

Users may see ~2-3 seconds of idle colour animation at the start of a song on mobile before the frequency-reactive bars kick in. This is expected with lazy loading.

---

## Bug 8 — Excessive Supabase Storage egress from repeated MP3 downloads

**Symptom:** Supabase cached egress exceeded the 5GB free plan quota (6.1GB used in one billing cycle) from just two users testing the app. The entire amount came from `Song-collab` project audio file delivery.

**Root cause:** WaveSurfer called `ws.load(url)` immediately on page initialisation, downloading the full MP3 on every page view regardless of whether the user pressed play. During active testing — loading pages, reviewing comments, checking waveforms — every visit triggered a full MP3 download from Supabase Storage.

**Fix — Lazy audio loading:**

Decouple WaveSurfer initialisation from audio loading. Create the WaveSurfer instance without calling `ws.load()`. Only fetch the audio on the first play button press.

```tsx
// audioLoadedRef tracks whether ws.load() has been called
const audioLoadedRef = useRef(false);

// In initWaveSurfer — create WaveSurfer but DO NOT call ws.load()
const ws = WaveSurfer.create({ container, ...options });
wavesurferRef.current = ws;
// ← no ws.load(url) here

// In the play button onClick:
onClick={() => {
  const ws = wavesurferRef.current;
  if (!ws || !audioUrl) return;
  if (!audioLoadedRef.current) {
    // First press: load audio then play
    audioLoadedRef.current = true;
    void ws.load(audioUrl).catch((err: Error) => {
      const msg = err?.message || String(err);
      if (!msg.toLowerCase().includes('aborted')) {
        setWaveErr(msg || 'Failed to load audio. Please try again.');
      }
    });
    ws.once('ready', () => { void ws.play(); });
  } else {
    // Subsequent presses: already loaded, just play/pause
    ws.playPause();
  }
}}
// Button is only disabled while actively loading after first press:
disabled={audioLoadedRef.current && !isReady}
```

Reset `audioLoadedRef` in:
- The init effect cleanup (version switch resets it)
- `retryWaveform()` (error retry resets it)

**Expected impact:** ~80-90% reduction in Supabase Storage egress for typical testing sessions where pages are visited without always playing audio.

**Note — future improvement (v2):** Pre-compute waveform peaks at upload time and store as JSON in the `song_versions` table. The waveform shape would then render from stored peak data without downloading the MP3 at all, and audio would only be fetched on play. This is the correct long-term architecture for a consumer-facing product.

---

## Summary — Architecture Rules

| Rule | Reason |
|---|---|
| Never set `crossOrigin` on the main playback `<audio>` element | iOS suspends CORS-mode audio when backgrounded |
| Never pass `media:` to WaveSurfer with a manually created `Audio()` | Same reason — use `ws.getMediaElement()` after creation |
| Never call `createMediaElementSource()` on mobile | Hands element ownership to AudioContext, iOS suspends it |
| Use `OfflineAudioContext` for frequency pre-computation | Not subject to iOS backgrounding rules, runs to completion |
| Only `[audioUrl, waveReloadNonce, loading]` in WaveSurfer init effect deps | Other callbacks cause spurious re-runs → double-audio |
| Call `stopPlayback()` on every navigation, never `destroy()` | Pause without destroying preserves background audio state |
| Don't call `ws.load()` on init — call it on first play press | Prevents full MP3 download on every page view |
| Guard WaveSurfer init effect with `loading` state | `waveformRef` div not in DOM while loading spinner renders |
| `disabled={audioLoadedRef.current && !isReady}` on play button | Button must be pressable before audio loads |

---

## Commits (song-review-app repo, branch: main)

| Commit | Description |
|---|---|
| `93958d4` | Add Media Session API — lock screen playback controls |
| `1ebfe3b` | Remove crossOrigin — restore iOS background audio |
| `61d9881` | Fix lock screen artwork + restore reactive waveform |
| `2bc257a` | Remove muted second audio element — caused double-audio |
| `dc5f412` | Skip Web Audio API graph on mobile (interim step) |
| `ee3232b` | Pre-computed frequency frames — full solution |
| `6334ce3` | Fix useEffect deps — stop double-audio on play/pause |
| `62cc6f8` | Fix first-load hang — guard init effect with loading state |
| `bc9efa0` | Lazy audio loading — only fetch MP3 on first play press |
| `f121167` | Fix play button disabled before audio loaded |
| `3903a8d` | Restore reactive visualisation after lazy load |
