'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ActionStatus, getActionStatusLabel, getActionStatusToast, getNextActionStatus, isOpenAction } from '@/lib/actionWorkflow';
import { createClient } from '@/lib/supabase';
import { formatTimestamp } from '@/lib/auth';
import { getVersionDisplayLabel } from '@/lib/versionDisplay';
import styles from './version.module.css';

const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

interface Comment {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

interface Thread {
  id: string;
  timestamp_seconds: number;
  created_by: string;
  created_at: string;
  comments: Comment[];
}

interface Action {
  id: string;
  description: string;
  status: ActionStatus;
  suggested_by: string;
  comment_id: string | null;
  timestamp_seconds: number | null;
  created_at: string;
  song_version_id?: string | null;
  song_version_label?: string | null;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  resolved_in_version_id: string | null;
  resolved_in_version_label?: string | null;
  comments?: {
    id: string;
    body: string;
    author: string;
    thread_id: string;
  } | null;
}

interface WorkspaceMember {
  userId: string;
  email: string | null;
  displayName: string;
  role: 'owner' | 'admin' | 'member';
}

interface Task {
  id: string;
  song_id: string;
  description: string;
  status: 'pending' | 'completed';
  sort_order: number;
  created_at: string;
}

interface Version {
  id: string;
  version_number: number;
  label: string | null;
  display_name?: string;
  notes?: string | null;
  file_path: string;
  file_name: string;
  created_by: string;
  created_at?: string;
}

interface Song {
  id: string;
  title: string;
  image_url: string | null;
}

interface BootstrapPayload {
  identity: {
    userId: string;
    email: string | null;
    profileId: string;
    displayName: string;
    authorName: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string | null;
    membershipRole: 'owner' | 'member';
  };
}

type Rgb = {
  r: number;
  g: number;
  b: number;
};

const MARKER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce'];
const DEFAULT_REACTIVE_PRIMARY: Rgb = { r: 255, g: 20, b: 147 };
const DEFAULT_REACTIVE_SECONDARY: Rgb = { r: 0, g: 212, b: 255 };
const INIT_REQUEST_TIMEOUT_MS = 12000;
const BOOTSTRAP_TIMEOUT_MS = 8000;

type ActionsTab = 'this_version' | 'all_versions';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mixColor(start: Rgb, end: Rgb, amount: number, alpha: number) {
  const r = Math.round(start.r + (end.r - start.r) * amount);
  const g = Math.round(start.g + (end.g - start.g) * amount);
  const b = Math.round(start.b + (end.b - start.b) * amount);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function brighten(color: Rgb, amount: number) {
  return {
    r: clamp(Math.round(color.r + (255 - color.r) * amount), 0, 255),
    g: clamp(Math.round(color.g + (255 - color.g) * amount), 0, 255),
    b: clamp(Math.round(color.b + (255 - color.b) * amount), 0, 255),
  };
}

function darken(color: Rgb, amount: number) {
  return {
    r: clamp(Math.round(color.r * (1 - amount)), 0, 255),
    g: clamp(Math.round(color.g * (1 - amount)), 0, 255),
    b: clamp(Math.round(color.b * (1 - amount)), 0, 255),
  };
}

async function extractPaletteFromImageUrl(url: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.crossOrigin = 'anonymous';
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('Could not read artwork colors.'));
    nextImage.src = url;
  });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Could not inspect artwork colors.');
  }

  const sampleWidth = 40;
  const sampleHeight = 40;
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  let strongR = 0;
  let strongG = 0;
  let strongB = 0;
  let strongWeight = 0;
  let softR = 0;
  let softG = 0;
  let softB = 0;
  let softWeight = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3] / 255;

    if (alpha < 0.5) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = (r + g + b) / 3 / 255;
    const vividWeight = saturation * 0.8 + brightness * 0.2 + 0.1;
    const softWeightSample = (1 - saturation) * 0.35 + brightness * 0.65 + 0.1;

    strongR += r * vividWeight;
    strongG += g * vividWeight;
    strongB += b * vividWeight;
    strongWeight += vividWeight;

    softR += r * softWeightSample;
    softG += g * softWeightSample;
    softB += b * softWeightSample;
    softWeight += softWeightSample;
  }

  const base = strongWeight
    ? {
        r: Math.round(strongR / strongWeight),
        g: Math.round(strongG / strongWeight),
        b: Math.round(strongB / strongWeight),
      }
    : DEFAULT_REACTIVE_PRIMARY;

  const companionSeed = softWeight
    ? {
        r: Math.round(softR / softWeight),
        g: Math.round(softG / softWeight),
        b: Math.round(softB / softWeight),
      }
    : DEFAULT_REACTIVE_SECONDARY;

  return {
    primary: brighten(base, 0.08),
    secondary: brighten(companionSeed, 0.18),
    shadow: darken(base, 0.42),
  };
}

function formatVersionDate(value?: string) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatThreadPreview(text?: string) {
  if (!text) return 'No text yet';
  return text.length > 68 ? `${text.slice(0, 68)}…` : text;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeStoragePath(path: string) {
  return path.replace(/^\/+/, '').trim();
}

function sortThreadsByTimestamp(items: Thread[]) {
  return [...items].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
}

function logVersionInit(event: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  console.info(`[version-init] ${event}${payload}`);
}

async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  label: string,
  timeoutMs = INIT_REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = window.setTimeout(() => controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);

  logVersionInit(`${label}:start`, typeof input === 'string' ? { url: input } : undefined);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => null);

    logVersionInit(`${label}:finish`, {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    });

    if (!response.ok) {
      const message = payload && typeof payload.error === 'string'
        ? payload.error
        : `${label} failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    logVersionInit(`${label}:error`, {
      elapsedMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function validateAudioFile(file: File) {
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name);

  if (!isAudio) {
    return 'Choose an audio file such as MP3, WAV, M4A, FLAC, or OGG.';
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return 'That file is too large for the current upload flow. Try a file under 200 MB.';
  }

  return null;
}

export default function VersionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;

  const waveformRef = useRef<HTMLDivElement>(null);
  const waveformWrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroOverlayRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const actionsPanelRef = useRef<HTMLDivElement>(null);
  const threadsPanelRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveLoadIdRef = useRef(0);
  const waveRetryTimerRef = useRef<number | null>(null);
  const waveLoadTimeoutRef = useRef<number | null>(null);
  const waveAutoRetryUsedRef = useRef(false);
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null);
  const desktopReactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileReactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileReactiveStripRef = useRef<HTMLCanvasElement>(null);
  const hoverXRef = useRef<number>(-1);
  const pendingTimestampRef = useRef<number | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);
  const reactiveAudioContextRef = useRef<AudioContext | null>(null);
  const reactiveAnalyserRef = useRef<AnalyserNode | null>(null);
  const reactiveSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reactiveAnimationFrameRef = useRef<number | null>(null);
  const reactiveRefreshTimeoutRef = useRef<number | null>(null);
  const reactivePlayingRef = useRef(false);

  const [identity, setIdentity] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveErr, setWaveErr] = useState<string | null>(null);
  const [isRetryingWave, setIsRetryingWave] = useState(false);
  const [waveReloadNonce, setWaveReloadNonce] = useState(0);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [clickXPercent, setClickXPercent] = useState<number>(0);
  const [editingLabel, setEditingLabel] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [actionModalCommentId, setActionModalCommentId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('open');
  const [actionAssignedToUserId, setActionAssignedToUserId] = useState('');
  const [actionsTab, setActionsTab] = useState<ActionsTab>('this_version');
  const [actionFilter, setActionFilter] = useState<'all' | 'open' | 'done' | 'assigned_to_me'>('all');
  // markedCommentIds derived from loaded actions — no separate state needed
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [threadLinkCopied, setThreadLinkCopied] = useState(false);
  const [timestampCopied, setTimestampCopied] = useState(false);
  const [showUploadVersionModal, setShowUploadVersionModal] = useState(false);
  const [pendingVersionFile, setPendingVersionFile] = useState<File | null>(null);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [versionUploadProgress, setVersionUploadProgress] = useState(0);
  const [versionUploadError, setVersionUploadError] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [animatedCommentId, setAnimatedCommentId] = useState<string | null>(null);
  const [mobileReactiveStripWidth, setMobileReactiveStripWidth] = useState(700);
  const [reactivePalette, setReactivePalette] = useState(() => ({
    primary: DEFAULT_REACTIVE_PRIMARY,
    secondary: DEFAULT_REACTIVE_SECONDARY,
    shadow: darken(DEFAULT_REACTIVE_PRIMARY, 0.42),
  }));
  const [initialLoadNonce, setInitialLoadNonce] = useState(0);

  const shouldUseReactiveAudioGraph = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const touchDevice = navigator.maxTouchPoints > 0;

    return !coarsePointer && !touchDevice && window.innerWidth > 768;
  }, []);
  const statusToastTimerRef = useRef<number | null>(null);
  const commentAnimationTimerRef = useRef<number | null>(null);
  const dragTaskId = useRef<string | null>(null);

  const supabase = createClient();

  const clearWaveTimers = useCallback(() => {
    if (waveRetryTimerRef.current) {
      window.clearTimeout(waveRetryTimerRef.current);
      waveRetryTimerRef.current = null;
    }
    if (waveLoadTimeoutRef.current) {
      window.clearTimeout(waveLoadTimeoutRef.current);
      waveLoadTimeoutRef.current = null;
    }
  }, []);

  const stopReactiveDrawing = useCallback(() => {
    if (reactiveAnimationFrameRef.current !== null) {
      cancelAnimationFrame(reactiveAnimationFrameRef.current);
      reactiveAnimationFrameRef.current = null;
    }
  }, []);

  const clearReactiveRefreshTimeout = useCallback(() => {
    if (reactiveRefreshTimeoutRef.current !== null) {
      window.clearTimeout(reactiveRefreshTimeoutRef.current);
      reactiveRefreshTimeoutRef.current = null;
    }
  }, []);

  const getReactiveCanvasEntries = useCallback(() => {
    return [
      {
        canvas: desktopReactiveCanvasRef.current,
        container: heroOverlayRef.current,
      },
      {
        canvas: mobileReactiveCanvasRef.current,
        container: heroRef.current,
      },
      {
        canvas: mobileReactiveStripRef.current,
        container: heroContentRef.current,
      },
    ].filter(
      (entry): entry is { canvas: HTMLCanvasElement; container: HTMLDivElement } =>
        Boolean(entry.canvas && entry.container)
    );
  }, []);

  const drawReactiveIdle = useCallback(() => {
    for (const { canvas } of getReactiveCanvasEntries()) {
      const context = canvas.getContext('2d');
      if (!context) continue;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, mixColor(reactivePalette.primary, reactivePalette.secondary, 0.18, 0.16));
      gradient.addColorStop(1, mixColor(reactivePalette.primary, reactivePalette.secondary, 0.82, 0.08));

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.lineWidth = 2;
      context.strokeStyle = 'rgba(255,255,255,0.12)';
      context.beginPath();

      const points = 36;
      for (let i = 0; i < points; i += 1) {
        const x = (width / (points - 1)) * i;
        const y = height * 0.5 + Math.sin(i * 0.55) * 8;

        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
    }
  }, [getReactiveCanvasEntries, reactivePalette]);

  const resizeReactiveCanvas = useCallback(() => {
    const ratio = window.devicePixelRatio || 1;
    for (const { canvas, container } of getReactiveCanvasEntries()) {
      const { width, height } = container.getBoundingClientRect();

      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));

      const context = canvas.getContext('2d');
      if (context) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(ratio, ratio);
      }
    }

    if (!reactivePlayingRef.current) {
      drawReactiveIdle();
    }
  }, [drawReactiveIdle, getReactiveCanvasEntries]);

  const queueReactiveCanvasRefresh = useCallback(() => {
    resizeReactiveCanvas();
    requestAnimationFrame(() => {
      resizeReactiveCanvas();
      requestAnimationFrame(() => {
        resizeReactiveCanvas();
      });
    });

    clearReactiveRefreshTimeout();
    reactiveRefreshTimeoutRef.current = window.setTimeout(() => {
      resizeReactiveCanvas();
      reactiveRefreshTimeoutRef.current = null;
    }, 140);
  }, [clearReactiveRefreshTimeout, resizeReactiveCanvas]);

  const startReactiveDrawing = useCallback(() => {
    const analyser = reactiveAnalyserRef.current;

    if (!analyser) return;

    const timeData = new Uint8Array(analyser.fftSize);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const render = () => {
      const loop = (Math.sin(performance.now() / 2400) + 1) / 2;
      const accentA = mixColor(reactivePalette.primary, reactivePalette.secondary, loop, 0.24);
      const accentB = mixColor(reactivePalette.primary, reactivePalette.secondary, 1 - loop, 0.18);
      const lineColor = mixColor(reactivePalette.primary, reactivePalette.secondary, loop, 0.46);
      const glowColor = mixColor(reactivePalette.primary, reactivePalette.secondary, 1 - loop, 0.36);

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);
      for (const { canvas } of getReactiveCanvasEntries()) {
        const context = canvas.getContext('2d');
        if (!context) continue;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        context.clearRect(0, 0, width, height);

        const wash = context.createLinearGradient(0, 0, width, height);
        wash.addColorStop(0, accentA);
        wash.addColorStop(0.5, mixColor(reactivePalette.primary, reactivePalette.secondary, 0.5, 0.12));
        wash.addColorStop(1, accentB);
        context.fillStyle = wash;
        context.fillRect(0, 0, width, height);

        const bars = 72;
        const barWidth = width / bars;
        for (let i = 0; i < bars; i += 1) {
          const sample = frequencyData[Math.min(frequencyData.length - 1, i * 3)] ?? 0;
          const magnitude = sample / 255;
          const barHeight = 14 + magnitude * height * 0.4;
          const x = i * barWidth;
          const y = height - barHeight;
          const barGradient = context.createLinearGradient(0, y, 0, height);
          barGradient.addColorStop(0, mixColor(reactivePalette.primary, reactivePalette.secondary, loop, 0.34));
          barGradient.addColorStop(1, mixColor(reactivePalette.primary, reactivePalette.secondary, 1 - loop, 0.06));

          context.fillStyle = barGradient;
          context.fillRect(x, y, Math.max(2, barWidth - 4), barHeight);
        }

        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 3;
        context.strokeStyle = lineColor;
        context.shadowBlur = 34;
        context.shadowColor = glowColor;
        context.beginPath();

        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i += 1) {
          const value = timeData[i] / 128;
          const y = (value * height) / 2;

          if (i === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }

          x += sliceWidth;
        }

        context.stroke();
        context.shadowBlur = 0;
      }

      if (reactivePlayingRef.current) {
        reactiveAnimationFrameRef.current = requestAnimationFrame(render);
      } else {
        drawReactiveIdle();
      }
    };

    stopReactiveDrawing();
    reactiveAnimationFrameRef.current = requestAnimationFrame(render);
  }, [drawReactiveIdle, getReactiveCanvasEntries, reactivePalette, stopReactiveDrawing]);

  const ensureReactiveAudioGraph = useCallback(async (audio: HTMLAudioElement | null) => {
    if (!audio) return false;

    if (!reactiveAudioContextRef.current) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (!AudioContextCtor) return false;

      reactiveAudioContextRef.current = new AudioContextCtor();
    }

    if (!reactiveSourceRef.current) {
      reactiveSourceRef.current = reactiveAudioContextRef.current.createMediaElementSource(audio);
      reactiveAnalyserRef.current = reactiveAudioContextRef.current.createAnalyser();
      reactiveAnalyserRef.current.fftSize = 2048;
      reactiveAnalyserRef.current.smoothingTimeConstant = 0.82;

      reactiveSourceRef.current.connect(reactiveAnalyserRef.current);
      reactiveAnalyserRef.current.connect(reactiveAudioContextRef.current.destination);
    }

    if (reactiveAudioContextRef.current.state === 'suspended') {
      await reactiveAudioContextRef.current.resume();
    }

    return true;
  }, []);

  const retryWaveform = useCallback((mode: 'auto' | 'manual' = 'manual') => {
    clearWaveTimers();
    if (mode === 'manual') {
      waveAutoRetryUsedRef.current = false;
    }
    setWaveErr(null);
    setIsReady(false);
    setIsRetryingWave(mode === 'auto');
    setCurrentTime(0);
    setDuration(0);
    setWaveReloadNonce(count => count + 1);
  }, [clearWaveTimers]);

  const showStatusToast = useCallback((message: string) => {
    if (statusToastTimerRef.current) {
      window.clearTimeout(statusToastTimerRef.current);
    }
    setStatusToast(message);
    statusToastTimerRef.current = window.setTimeout(() => {
      setStatusToast(null);
      statusToastTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    let mounted = true;

    // In development, React Strict Mode intentionally mounts, cleans up,
    // and remounts effects once to flush side-effect bugs. That causes this
    // init sequence to log twice locally, while production runs it once per
    // actual page load/version change.
    async function resolveIdentity() {
      try {
        logVersionInit('bootstrap:start', { songId, versionId });
        const payload = await fetchJsonWithTimeout<BootstrapPayload>(
          '/api/auth/bootstrap',
          { cache: 'no-store' },
          'bootstrap',
          BOOTSTRAP_TIMEOUT_MS
        );

        if (!mounted) return;

        if (payload?.identity?.authorName) {
          setIdentity(payload.identity.authorName);
          setCurrentUserId(payload.identity.userId);
          logVersionInit('bootstrap:resolved', {
            authorName: payload.identity.authorName,
            userId: payload.identity.userId,
          });
          void loadWorkspaceMembers().catch(error => {
            console.error('Workspace members load error:', error);
            logVersionInit('workspace-members:failed', {
              message: error instanceof Error ? error.message : String(error),
            });
          });
          return;
        }

        logVersionInit('bootstrap:missing-identity', { payload });
        router.push(`/?redirectTo=${encodeURIComponent(`/songs/${songId}/versions/${versionId}`)}`);
      } catch (error) {
        console.error('Version page bootstrap error:', error);
        if (!mounted) return;

        logVersionInit('bootstrap:failed-without-identity', {
          message: error instanceof Error ? error.message : String(error),
        });
        router.push(`/?redirectTo=${encodeURIComponent(`/songs/${songId}/versions/${versionId}`)}`);
      }
    }

    logVersionInit('page:init-start', { songId, versionId, initialLoadNonce });
    void resolveIdentity();
    void load();

    return () => {
      mounted = false;
    };
  }, [initialLoadNonce, router, songId, versionId]);

  useEffect(() => {
    resizeReactiveCanvas();

    const handleResize = () => resizeReactiveCanvas();
    window.addEventListener('resize', handleResize);
    const observer = typeof ResizeObserver !== 'undefined' && heroOverlayRef.current
      ? new ResizeObserver(() => resizeReactiveCanvas())
      : null;

    if (observer && heroOverlayRef.current) {
      observer.observe(heroOverlayRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
      stopReactiveDrawing();
      clearReactiveRefreshTimeout();
    };
  }, [clearReactiveRefreshTimeout, resizeReactiveCanvas, stopReactiveDrawing]);

  useEffect(() => {
    const heroContent = heroContentRef.current;

    if (!heroContent) return;

    const updateWidth = () => {
      const { width } = heroContent.getBoundingClientRect();
      setMobileReactiveStripWidth(Math.max(320, Math.round(width)));
    };

    updateWidth();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateWidth())
      : null;

    observer?.observe(heroContent);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      queueReactiveCanvasRefresh();
    }
  }, [loading, queueReactiveCanvasRefresh, song?.image_url, versionId]);

  useEffect(() => {
    if (!song?.image_url) {
      setReactivePalette({
        primary: DEFAULT_REACTIVE_PRIMARY,
        secondary: DEFAULT_REACTIVE_SECONDARY,
        shadow: darken(DEFAULT_REACTIVE_PRIMARY, 0.42),
      });
      return;
    }

    let cancelled = false;

    void extractPaletteFromImageUrl(song.image_url)
      .then(nextPalette => {
        if (!cancelled) {
          setReactivePalette(nextPalette);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReactivePalette({
            primary: DEFAULT_REACTIVE_PRIMARY,
            secondary: DEFAULT_REACTIVE_SECONDARY,
            shadow: darken(DEFAULT_REACTIVE_PRIMARY, 0.42),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [song?.image_url]);

  useEffect(() => {
    if (isPlaying) {
      if (!shouldUseReactiveAudioGraph()) {
        reactivePlayingRef.current = false;
        stopReactiveDrawing();
        drawReactiveIdle();
        return;
      }

      void ensureReactiveAudioGraph(audioRef.current).then(ready => {
        if (ready) {
          reactivePlayingRef.current = true;
          startReactiveDrawing();
        }
      });
    } else {
      reactivePlayingRef.current = false;
      stopReactiveDrawing();
      drawReactiveIdle();
    }
  }, [drawReactiveIdle, ensureReactiveAudioGraph, isPlaying, shouldUseReactiveAudioGraph, startReactiveDrawing, stopReactiveDrawing]);

  useEffect(() => {
    return () => {
      if (statusToastTimerRef.current) {
        window.clearTimeout(statusToastTimerRef.current);
      }
      if (commentAnimationTimerRef.current) {
        window.clearTimeout(commentAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (window.innerWidth <= 768) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )
      ) {
        return;
      }

      if (!wavesurferRef.current || !isReady || waveErr) return;

      event.preventDefault();
      wavesurferRef.current.playPause();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, waveErr]);

  const triggerCommentAnimation = useCallback((commentId: string | null) => {
    if (!commentId) return;
    if (commentAnimationTimerRef.current) {
      window.clearTimeout(commentAnimationTimerRef.current);
    }
    setAnimatedCommentId(commentId);
    commentAnimationTimerRef.current = window.setTimeout(() => {
      setAnimatedCommentId(current => (current === commentId ? null : current));
      commentAnimationTimerRef.current = null;
    }, 700);
  }, []);

  async function load() {
    setLoading(true);
    setInitError(null);
    let loadErrorMessage: string | null = null;
    try {
      logVersionInit('load:start', { songId, versionId });

      const [songPayload, versionPayload, versionsPayload] = await Promise.all([
        fetchJsonWithTimeout<{ song: Song }>(
          `/api/songs/${songId}`,
          { cache: 'no-store' },
          'song'
        ),
        fetchJsonWithTimeout<{ version: Version }>(
          `/api/versions/${versionId}`,
          { cache: 'no-store' },
          'version'
        ),
        fetchJsonWithTimeout<{ versions: Version[] }>(
          `/api/songs/${songId}/versions`,
          { cache: 'no-store' },
          'versions'
        ),
      ]);

      if (!songPayload?.song) {
        throw new Error('Could not load this song.');
      }

      if (!versionPayload?.version) {
        throw new Error('Could not load this version.');
      }

      if (!Array.isArray(versionsPayload?.versions)) {
        throw new Error('Could not load the version list.');
      }

      setSong(songPayload.song);
      setVersion(versionPayload.version);
      setVersions(versionsPayload.versions);

      if (versionPayload.version?.file_path) {
        const normalizedFilePath = normalizeStoragePath(versionPayload.version.file_path);
        const { data: pub } = supabase.storage.from('song-files').getPublicUrl(normalizedFilePath);
        setAudioUrl(pub.publicUrl);
        logVersionInit('audio-url:resolved', {
          filePath: normalizedFilePath,
          hasUrl: Boolean(pub.publicUrl),
        });
      } else {
        setAudioUrl(null);
        showStatusToast('This version is missing an audio file path.');
      }

      await Promise.all([loadThreads(), loadActions(), loadTasks()]);
      setStatusToast(null);
      logVersionInit('load:success', {
        songId,
        versionId,
        hasAudioUrl: Boolean(versionPayload.version?.file_path),
      });
    } catch (error) {
      console.error('Version page load error:', error);
      const message = error instanceof Error ? error.message : 'Could not load this version.';
      loadErrorMessage = message;
      setInitError(message);
      showStatusToast(message);
      logVersionInit('load:failed', { message });
    } finally {
      setLoading(false);
      logVersionInit('load:complete', {
        loadingCleared: true,
        hasInitError: Boolean(loadErrorMessage),
      });
    }
  }

  async function loadThreads() {
    const payload = await fetchJsonWithTimeout<{ threads: Thread[] }>(
      `/api/versions/${versionId}/threads`,
      { cache: 'no-store' },
      'threads'
    );

    if (!Array.isArray(payload?.threads)) {
      throw new Error('Could not load comments.');
    }

    setThreads(payload.threads);
  }

  async function loadActions() {
    // Fetch via the canonical server route so the UI never depends on anon
    // client joins for comment-linked action state.
    const payload = await fetchJsonWithTimeout<{ actions: Action[] }>(
      `/api/actions/by-song/${songId}`,
      { cache: 'no-store' },
      'actions'
    );
    if (!Array.isArray(payload?.actions)) {
      throw new Error('Could not load actions.');
    }
    setActions(payload.actions);
  }

  async function loadWorkspaceMembers() {
    const payload = await fetchJsonWithTimeout<{ members: WorkspaceMember[] }>(
      '/api/workspace/members',
      { cache: 'no-store' },
      'workspace-members'
    );

    if (!Array.isArray(payload?.members)) {
      throw new Error('Could not load workspace members.');
    }

    setWorkspaceMembers(payload.members);
  }

  // Deep link: open thread from email. Re-runs when isReady/duration change
  // so the seek fires even if waveform loads after threads.
  useEffect(() => {
    const threadId = searchParams.get('thread') || searchParams.get('threadId');
    if (!threadId || threads.length === 0) return;
    setSelectedThreadId(threadId);
    const t = threads.find(x => x.id === threadId);
    if (!t) return;
    if (wavesurferRef.current && isReady && duration > 0) {
      wavesurferRef.current.seekTo(t.timestamp_seconds / duration);
    }
  }, [searchParams, threads, isReady, duration]);

  useEffect(() => {
    const requestedActionsTab = searchParams.get('actionsTab');
    if (requestedActionsTab === 'all_versions' || requestedActionsTab === 'this_version') {
      setActionsTab(requestedActionsTab);
      return;
    }

    setActionsTab('this_version');
  }, [searchParams, versionId]);

  useEffect(() => {
    const requestedActionFilter = searchParams.get('actionFilter');
    if (
      requestedActionFilter === 'all' ||
      requestedActionFilter === 'open' ||
      requestedActionFilter === 'done' ||
      requestedActionFilter === 'assigned_to_me'
    ) {
      setActionFilter(requestedActionFilter);
    }
  }, [searchParams, versionId]);

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (!focus || loading) return;

    const target = focus === 'actions'
      ? actionsPanelRef.current
      : focus === 'threads'
        ? threadsPanelRef.current
        : null;

    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [searchParams, loading, versionId, actions.length, threads.length]);

  const initWaveSurfer = useCallback(async (container: HTMLDivElement, url: string) => {
    const loadId = ++waveLoadIdRef.current;
    clearWaveTimers();
    logVersionInit('wave:init-start', { loadId, hasContainer: container.isConnected, url });

    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch {}
      wavesurferRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {}
      audioRef.current = null;
    }

    const WaveSurfer = (await import('wavesurfer.js')).default;
    if (!container.isConnected || loadId !== waveLoadIdRef.current) {
      logVersionInit('wave:init-cancelled', { loadId, containerConnected: container.isConnected });
      return;
    }

    // Create a native <audio> element and pass it to WaveSurfer.
    // This bypasses WaveSurfer's internal fetch entirely — which fixes mobile
    // where signed URLs or CORS can silently block the internal fetch.
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.src = url;
    audioRef.current = audio;
    reactiveSourceRef.current = null;
    reactiveAnalyserRef.current = null;
    if (reactiveAudioContextRef.current) {
      void reactiveAudioContextRef.current.close();
      reactiveAudioContextRef.current = null;
    }

    const handleWaveFailure = (message: string) => {
      if (loadId !== waveLoadIdRef.current) return;
      clearWaveTimers();
      logVersionInit('wave:init-failed', { loadId, message });

      if (!waveAutoRetryUsedRef.current) {
        waveAutoRetryUsedRef.current = true;
        setWaveErr('Waveform load interrupted. Retrying…');
        setIsRetryingWave(true);
        waveRetryTimerRef.current = window.setTimeout(() => {
          if (loadId !== waveLoadIdRef.current) return;
          retryWaveform('auto');
        }, 350);
        return;
      }

      setIsRetryingWave(false);
      setWaveErr(message);
    };

    audio.addEventListener('error', () => {
      handleWaveFailure('Could not load this audio file. Try again.');
    });

    waveLoadTimeoutRef.current = window.setTimeout(() => {
      handleWaveFailure('Waveform took too long to load. Try again.');
    }, 12000);

    const ws = WaveSurfer.create({
      container,
      waveColor: 'rgba(255,255,255,0.2)',
      progressColor: '#ff1493',
      cursorColor: 'rgba(255,255,255,0.5)',
      cursorWidth: 1,
      height: 96,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      normalize: true,
      media: audio,
    });

    ws.on('ready', (dur: number) => {
      if (loadId !== waveLoadIdRef.current) return;
      clearWaveTimers();
      setWaveErr(null);
      setDuration(dur);
      setIsReady(true);
      setIsRetryingWave(false);
      logVersionInit('wave:ready', { loadId, duration: dur });
    });
    ws.on('timeupdate', (t: number) => setCurrentTime(t));
    ws.on('seeking', (t: number) => setCurrentTime(t));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', (e: Error) => {
      const message = e?.message || String(e);
      if (loadId !== waveLoadIdRef.current || message.toLowerCase().includes('aborted')) return;
      console.error('WaveSurfer error:', e);
      handleWaveFailure(message);
    });

    ws.on('click', (relX: number) => {
      const ts = relX * ws.getDuration();
      // Use setThreads callback to get latest threads without stale closure
      setThreads(prev => {
        const nearby = prev.find(t => Math.abs(t.timestamp_seconds - ts) < 2);
        if (nearby) {
          setSelectedThreadId(nearby.id);
          setPendingTimestamp(null);
          pendingTimestampRef.current = null;
        } else {
          pendingTimestampRef.current = ts;
          setPendingTimestamp(ts);
          setClickXPercent(relX * 100);
          setNewComment('');
          setSelectedThreadId(null);
        }
        return prev;
      });
    });

    // Catch aborted/stale loads so teardown races do not surface as runtime errors.
    void ws.load(audio.src).catch((error: Error) => {
      const message = error?.message || String(error);
      if (loadId !== waveLoadIdRef.current || message.toLowerCase().includes('aborted')) return;
      console.error('WaveSurfer load error:', error);
      handleWaveFailure(message);
    });
    wavesurferRef.current = ws;
  }, [clearWaveTimers, retryWaveform]);

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
    drawReactiveIdle();
    setIsPlaying(false);
  }, [drawReactiveIdle, stopReactiveDrawing]);

  // Draw hover overlay on canvas: dimmed pink between playhead and mouse
  const drawHoverOverlay = () => {
    const canvas = hoverCanvasRef.current;
    const ws = wavesurferRef.current;
    if (!canvas || !ws) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const hx = hoverXRef.current;
    if (hx < 0) return;
    const dur = ws.getDuration();
    if (!dur) return;
    const playedX = (ws.getCurrentTime() / dur) * w;
    const mouseX = hx * w;
    if (mouseX > playedX) {
      ctx.fillStyle = 'rgba(255,20,147,0.3)';
      ctx.fillRect(playedX, 0, mouseX - playedX, h);
    }
  };

  useEffect(() => {
    if (!audioUrl) return;
    waveAutoRetryUsedRef.current = false;
    setIsReady(false);
    setWaveErr(null);
    setIsRetryingWave(false);
    setDuration(0);
    let attempts = 0;
    const tryInit = () => {
      if (waveformRef.current) {
        logVersionInit('wave:container-ready', { attempts, hasAudioUrl: true });
        initWaveSurfer(waveformRef.current, audioUrl);
      } else if (attempts++ < 20) {
        logVersionInit('wave:container-wait', { attempts });
        setTimeout(tryInit, 50);
      } else {
        const message = 'Waveform container did not mount in time.';
        setWaveErr(message);
        logVersionInit('wave:container-timeout', { attempts, message });
      }
    };
    tryInit();
    return () => {
      clearWaveTimers();
      waveLoadIdRef.current += 1;
      stopPlayback();
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch {}
        wavesurferRef.current = null;
      }
      if (audioRef.current) {
        try {
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        } catch {}
        audioRef.current = null;
      }
      reactivePlayingRef.current = false;
      stopReactiveDrawing();
      if (reactiveAudioContextRef.current) {
        void reactiveAudioContextRef.current.close();
        reactiveAudioContextRef.current = null;
      }
      reactiveSourceRef.current = null;
      reactiveAnalyserRef.current = null;
    };
  }, [audioUrl, waveReloadNonce, clearWaveTimers, initWaveSurfer, stopPlayback, stopReactiveDrawing]);

  async function loadTasks() {
    const payload = await fetchJsonWithTimeout<{ tasks: Task[] }>(
      `/api/songs/${songId}/tasks`,
      { cache: 'no-store' },
      'tasks'
    );

    if (!Array.isArray(payload?.tasks)) {
      throw new Error('Could not load tasks.');
    }

    setTasks(payload.tasks);
  }

  async function addTask() {
    if (!newTaskText.trim()) return;
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, description: newTaskText.trim() }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      showStatusToast(
        payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not add task.'
      );
      return;
    }
    setNewTaskText('');
    await loadTasks();
    showStatusToast('Task added');
  }

  async function toggleTask(task: Task) {
    const next = task.status === 'pending' ? 'completed' : 'pending';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    await loadTasks();
    showStatusToast(next === 'completed' ? 'Task completed' : 'Task moved back to pending');
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    await loadTasks();
    showStatusToast('Task removed');
  }

  async function saveTaskEdit(taskId: string) {
    if (!editingTaskText.trim()) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editingTaskText.trim() }),
    });
    setEditingTaskId(null);
    await loadTasks();
    showStatusToast('Task updated');
  }

  function handleTaskDragStart(taskId: string) {
    dragTaskId.current = taskId;
  }

  function handleTaskDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    setDragOverTaskId(overId);
  }

  async function handleTaskDrop(droppedOnId: string) {
    const fromId = dragTaskId.current;
    if (!fromId || fromId === droppedOnId) { setDragOverTaskId(null); return; }
    const pending = tasks.filter(t => t.status === 'pending');
    const fromIdx = pending.findIndex(t => t.id === fromId);
    const toIdx = pending.findIndex(t => t.id === droppedOnId);
    if (fromIdx === -1 || toIdx === -1) { setDragOverTaskId(null); return; }
    const reordered = [...pending];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setTasks([...reordered, ...tasks.filter(t => t.status === 'completed')]);
    setDragOverTaskId(null);
    dragTaskId.current = null;
    await fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(t => t.id) }),
    });
  }

  const toggleAction = async (action: Action) => {
    const newStatus = getNextActionStatus(action.status);
    await fetch(`/api/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        ...(newStatus !== 'done' ? { resolvedInVersionId: null } : {}),
      }),
    });
    await loadActions();
    showStatusToast(getActionStatusToast(newStatus));
  };

  const resolveActionInCurrentVersion = async (action: Action) => {
    const response = await fetch(`/api/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvedInVersionId: versionId }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      showStatusToast(
        payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not mark this action as resolved in this version.'
      );
      return;
    }

    await loadActions();
    showStatusToast('Action resolved in this version');
  };

  const submitThread = async () => {
    const ts = pendingTimestampRef.current;
    if (!newComment.trim() || ts === null) return;
    if (!identity) {
      showStatusToast('Could not determine who is posting this comment.');
      return;
    }
    setPosting(true);
    try {
      const res = await fetch('/api/threads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, songId, timestamp: ts, commentText: newComment.trim() }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not save comment.'
        );
      }

      const { threadId, commentId, thread } = payload;
      setNewComment('');
      setPendingTimestamp(null);
      pendingTimestampRef.current = null;

      if (thread && typeof thread === 'object') {
        setThreads(prev => sortThreadsByTimestamp([
          ...prev.filter(existing => existing.id !== thread.id),
          thread as Thread,
        ]));
      }

      try {
        await loadThreads();
      } catch (reloadError) {
        console.error('Reload threads error:', reloadError);
      }

      setSelectedThreadId(threadId);
      triggerCommentAnimation(commentId ?? null);
      showStatusToast('Comment posted');
    } catch (error) {
      console.error('Create thread error:', error);
      showStatusToast(error instanceof Error ? error.message : 'Could not save comment.');
    } finally {
      setPosting(false);
    }
  };

  const submitReply = async (threadId: string) => {
    if (!replyText.trim()) return;
    const res = await fetch('/api/threads/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, songId, versionId, text: replyText.trim() }),
    });
    if (res.ok) {
      const { commentId } = await res.json();
      setReplyText('');
      await loadThreads();
      triggerCommentAnimation(commentId ?? null);
    }
  };

  const submitAction = async () => {
    if (!actionText.trim()) return;

    if (editingActionId) {
      const response = await fetch(`/api/actions/${editingActionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: actionText.trim(),
          status: actionStatus,
          assignedToUserId: actionAssignedToUserId || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showStatusToast(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not update action.'
        );
        return;
      }
    } else if (actionModalCommentId) {
      const response = await fetch('/api/actions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: actionModalCommentId,
          songId,
          description: actionText.trim(),
          status: actionStatus,
          assignedToUserId: actionAssignedToUserId || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showStatusToast(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not create action.'
        );
        return;
      }
    }

    setActionModalCommentId(null);
    setEditingActionId(null);
    setActionText('');
    setActionStatus('open');
    setActionAssignedToUserId('');
    await loadActions();
    showStatusToast(editingActionId ? 'Action updated' : 'Action saved');
  };

  const saveLabelEdit = async () => {
    if (!version) return;
    const trimmed = labelDraft.trim();
    if (trimmed === (version.label ?? '')) {
      setEditingLabel(false);
      return;
    }
    const response = await fetch(`/api/versions/${version.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: trimmed || null }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      showStatusToast(
        payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not update version label.'
      );
      return;
    }

    setEditingLabel(false);
    const updatedVersion = payload?.version && typeof payload.version === 'object'
      ? payload.version as Version
      : { ...version, label: trimmed || null };

    setVersion(updatedVersion);
    setVersions(prev => prev.map(item => (
      item.id === version.id
        ? {
            ...item,
            label: updatedVersion.label ?? null,
            display_name: updatedVersion.display_name ?? getVersionDisplayLabel(updatedVersion),
          }
        : item
    )));
    // Refresh versions list for the switcher
    const versionsResponse = await fetch(`/api/songs/${songId}/versions`, { cache: 'no-store' });
    const versionsPayload = await versionsResponse.json().catch(() => null);
    if (versionsResponse.ok && Array.isArray(versionsPayload?.versions)) {
      setVersions(versionsPayload.versions);
    }
  };

  const seekToThread = (thread: Thread) => {
    setSelectedThreadId(thread.id);
    setPendingTimestamp(null);
    pendingTimestampRef.current = null;
    if (wavesurferRef.current && isReady && duration > 0) {
      wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
    }
  };

  async function copyThreadLink(threadId: string) {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('threadId', threadId);

    try {
      await navigator.clipboard.writeText(url.toString());
      setThreadLinkCopied(true);
      window.setTimeout(() => setThreadLinkCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy thread link:', error);
    }
  }

  async function copyThreadTimestamp(timestampSeconds: number) {
    try {
      await navigator.clipboard.writeText(formatTimestamp(Math.floor(timestampSeconds)));
      setTimestampCopied(true);
      window.setTimeout(() => setTimestampCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy timestamp:', error);
    }
  }

  function handleVersionFilePicked(file?: File) {
    if (!file) return;

    const validationError = validateAudioFile(file);
    if (validationError) {
      setVersionUploadError(validationError);
      setPendingVersionFile(null);
      setShowUploadVersionModal(true);
      return;
    }

    setPendingVersionFile(file);
    setVersionUploadError('');
    setVersionUploadProgress(0);
    setNewVersionLabel('');
    setNewVersionNotes('');
    setShowUploadVersionModal(true);
  }

  async function uploadNewVersion() {
    if (!pendingVersionFile || !identity) return;

    setUploadingVersion(true);
    setVersionUploadError('');
    setVersionUploadProgress(0);

    try {
      const res = await fetch('/api/versions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          fileName: pendingVersionFile.name,
          fileSize: pendingVersionFile.size,
          label: newVersionLabel.trim() || null,
          notes: newVersionNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.uploadUrl || !data.versionId) {
        throw new Error(data.error || 'Could not start the upload.');
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable) {
            setVersionUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener('load', () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))));
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', pendingVersionFile.type || 'audio/mpeg');
        xhr.send(pendingVersionFile);
      });

      setShowUploadVersionModal(false);
      setPendingVersionFile(null);
      setNewVersionLabel('');
      setNewVersionNotes('');
      showStatusToast('Version uploaded');
      router.push(`/songs/${songId}/versions/${data.versionId}`);
    } catch (error) {
      setVersionUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploadingVersion(false);
    }
  }

  function openEditAction(action: Action) {
    setEditingActionId(action.id);
    setActionModalCommentId(action.comment_id);
    setActionText(action.description);
    setActionStatus(action.status);
    setActionAssignedToUserId(action.assigned_to_user_id ?? '');
  }

  if (loading) return <div className={styles.loading}>Loading this version…</div>;

  if (initError) {
    return (
      <div className={styles.loading}>
        <div className={styles.initErrorCard}>
          <h1 className={styles.initErrorTitle}>This version did not finish loading</h1>
          <p className={styles.initErrorText}>{initError}</p>
          <div className={styles.initErrorActions}>
            <button
              type="button"
              className={styles.waveRetryBtn}
              onClick={() => setInitialLoadNonce(count => count + 1)}
            >
              Retry
            </button>
            <button
              type="button"
              className={styles.songsBtn}
              onClick={() => router.push('/dashboard')}
            >
              Back to songs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedThread = threads.find(t => t.id === selectedThreadId) ?? null;
  const thisVersionActions = actions.filter(action => action.song_version_id === versionId);
  const allVersionActions = actions;
  const activeActionsForTab = actionsTab === 'all_versions' ? allVersionActions : thisVersionActions;
  const openActionCount = activeActionsForTab.filter(a => isOpenAction(a.status)).length;
  const unresolvedActions = activeActionsForTab.filter(action => action.status !== 'done');
  const resolvedHereActions = activeActionsForTab.filter(action => action.resolved_in_version_id === versionId);
  const filteredActions = activeActionsForTab.filter(action => {
    if (actionFilter === 'all') return true;
    if (actionFilter === 'open') return isOpenAction(action.status);
    if (actionFilter === 'done') return action.status === 'done';
    return currentUserId ? action.assigned_to_user_id === currentUserId : false;
  });
  const orderedActions = [
    ...filteredActions.filter(action => action.status !== 'done'),
    ...filteredActions.filter(action => action.status === 'done'),
  ];
  const versionMeta = [
    version?.created_by ? `Uploaded by ${version.created_by}` : null,
    version?.created_at ? formatVersionDate(version.created_at) : null,
    duration > 0 ? formatTimestamp(Math.floor(duration)) : null,
  ].filter(Boolean);
  const versionNotes = version?.notes?.trim() || '';

  function openActionSource(action: Action) {
    const targetVersionId = action.song_version_id ?? versionId;
    const nextParams = new URLSearchParams();
    nextParams.set('focus', 'actions');
    nextParams.set('actionsTab', 'all_versions');
    nextParams.set('actionFilter', actionFilter);
    if (action.comments?.thread_id) {
      nextParams.set('thread', action.comments.thread_id);
    }

    const targetPath = `/songs/${songId}/versions/${targetVersionId}?${nextParams.toString()}`;

    if (targetVersionId !== versionId) {
      router.push(targetPath);
      return;
    }

    setActionsTab('all_versions');
    if (action.comments?.thread_id) {
      const thread = threads.find(item => item.id === action.comments?.thread_id);
      if (thread) {
        seekToThread(thread);
      } else {
        setSelectedThreadId(action.comments.thread_id);
      }
    }
    window.requestAnimationFrame(() => {
      actionsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div
        ref={heroRef}
        className={styles.hero}
        style={song?.image_url ? {
          backgroundImage: `url(${song.image_url})`,
        } : undefined}
      >
        <canvas
          ref={mobileReactiveCanvasRef}
          className={styles.heroReactiveCanvasMobile}
          width={1600}
          height={560}
          aria-hidden="true"
        />
        {/* Gradient overlay so text is always readable */}
        <div ref={heroOverlayRef} className={styles.heroOverlay}>
          <canvas
            ref={desktopReactiveCanvasRef}
            className={styles.heroReactiveCanvasDesktop}
            width={1600}
            height={560}
            aria-hidden="true"
          />

          {/* Nav row */}
          <div className={styles.heroNav}>
            <button className={styles.songsBtn} onClick={() => { stopPlayback(); router.push('/dashboard'); }}>← Songs</button>
            <div className={styles.heroNavRight}>
              <div className={styles.avatar}>{identity?.[0]?.toUpperCase()}</div>
            </div>
          </div>

          <div className={styles.heroActionRow}>
            {versions.length > 1 && (
              <button className={styles.changeVersionBtn} onClick={() => setShowVersionModal(true)}>
                Change Version
              </button>
            )}
            <button className={styles.uploadBtn} onClick={() => versionFileInputRef.current?.click()}>
              ↑ Upload new version
            </button>
          </div>

          {/* Main hero content */}
          <div ref={heroContentRef} className={styles.heroContent}>
            <canvas
              ref={mobileReactiveStripRef}
              className={styles.mobileReactiveStrip}
              width={1200}
              height={180}
              style={{ width: `${mobileReactiveStripWidth}px` }}
              aria-hidden="true"
            />

            {/* Left: title, controls, waveform */}
            <div className={styles.heroLeft}>
              <div className={styles.heroMeta}>
                {version && (
                  editingLabel ? (
                    <input
                      className={styles.heroBadgeInput}
                      value={labelDraft}
                      autoFocus
                      placeholder={`v${version.version_number}`}
                      onChange={e => setLabelDraft(e.target.value)}
                      onBlur={saveLabelEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveLabelEdit();
                        if (e.key === 'Escape') setEditingLabel(false);
                      }}
                    />
                  ) : (
                    <span
                      className={styles.heroBadge}
                      title="Double-click to rename"
                      onDoubleClick={() => { setLabelDraft(version.label ?? ''); setEditingLabel(true); }}
                    >
                      {version.display_name || getVersionDisplayLabel(version)}
                      <span
                        className={styles.heroBadgeEdit}
                        role="button"
                        tabIndex={0}
                        onClick={event => {
                          event.stopPropagation();
                          setLabelDraft(version.label ?? '');
                          setEditingLabel(true);
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            setLabelDraft(version.label ?? '');
                            setEditingLabel(true);
                          }
                        }}
                      >
                        ✎
                      </span>
                    </span>
                  )
                )}
              </div>
              <h1 className={styles.heroTitle}>{song?.title}</h1>
              <p className={styles.heroArtist}>Polite Rebels</p>
              {versionMeta.length > 0 && (
                <div className={styles.heroVersionMeta}>
                  {versionMeta.map((item, index) => (
                    <span key={`${item}-${index}`}>{item}</span>
                  ))}
                </div>
              )}
              {versionNotes && (
                <div className={styles.heroVersionNotes}>
                  <span className={styles.heroVersionNotesLabel}>Version note</span>
                  <p className={styles.heroVersionNotesText}>{versionNotes}</p>
                </div>
              )}
              <div className={styles.heroControls}>
                <button
                  className={styles.heroPlayBtn}
                  onClick={() => wavesurferRef.current?.playPause()}
                  disabled={!isReady}
                >
                  {isPlaying
                    ? <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><rect x="3" y="2" width="5" height="16" rx="1.5"/><rect x="12" y="2" width="5" height="16" rx="1.5"/></svg>
                    : <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><path d="M4 2l14 8-14 8z"/></svg>
                  }
                </button>
                <span className={styles.heroTime}>
                  {formatTimestamp(Math.floor(currentTime))}
                  <span className={styles.heroTimeSep}> / </span>
                  {formatTimestamp(Math.floor(duration))}
                </span>
                {!isReady && audioUrl && !waveErr && (
                  <span className={styles.loadingWave}>
                    {isRetryingWave ? 'Retrying…' : 'Loading…'}
                  </span>
                )}
                {waveErr && (
                  <span className={styles.waveStatus}>
                    <span className={styles.waveErrMsg}>⚠ {waveErr}</span>
                    {!isRetryingWave && (
                      <button
                        type="button"
                        className={styles.waveRetryBtn}
                        onClick={() => retryWaveform('manual')}
                      >
                        Retry
                      </button>
                    )}
                  </span>
                )}
              </div>

            </div>{/* /heroLeft */}

            {/* Right: artwork */}
            <div className={styles.heroArtwork}>
              {song?.image_url ? (
                <img
                  src={song.image_url}
                  alt={song.title}
                  className={styles.heroArtworkImg}
                  onLoad={() => queueReactiveCanvasRefresh()}
                />
              ) : (
                <div className={styles.heroArtworkPlaceholder}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                    <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.2)"/>
                  </svg>
                </div>
              )}
              <label className={styles.heroArtworkUpload} title="Upload cover art">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('songId', songId);
                    fd.append('file', file);
                    const res = await fetch('/api/songs/upload-image', { method: 'POST', body: fd });
                    if (res.ok) {
                      const { imageUrl } = await res.json();
                      setSong(prev => prev ? { ...prev, image_url: imageUrl } : prev);
                    }
                  }}
                />
                <span>Replace image</span>
              </label>
            </div>



            {/* Waveform — direct child of heroContent, full width below on mobile */}
            <div className={styles.heroWaveform}>
                <div
                  ref={waveformWrapRef}
                  className={styles.waveformWrap}
                  onMouseMove={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    hoverXRef.current = (e.clientX - rect.left) / rect.width;
                    drawHoverOverlay();
                  }}
                  onMouseLeave={() => {
                    hoverXRef.current = -1;
                    const canvas = hoverCanvasRef.current;
                    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                  }}
                >
                  <div ref={waveformRef} className={styles.waveform} style={{ height: 80, minHeight: 80 }} />
                  <canvas
                    ref={hoverCanvasRef}
                    className={styles.hoverCanvas}
                    width={1200}
                    height={80}
                    style={{ pointerEvents: 'none' }}
                  />
                  {isReady && duration > 0 && (
                    <div className={styles.markers}>
                      {threads.map((thread, i) => (
                        <button
                          key={thread.id}
                          className={`${styles.marker} ${selectedThreadId === thread.id ? styles.markerActive : ''}`}
                          style={{ left: `${(thread.timestamp_seconds / duration) * 100}%`, background: MARKER_COLORS[i % MARKER_COLORS.length] }}
                          onClick={() => seekToThread(thread)}
                          title={formatTimestamp(thread.timestamp_seconds)}
                        />
                      ))}
                    </div>
                  )}
                  {pendingTimestamp !== null && (
                    <div
                      className={styles.floatingCommentBox}
                      style={{ left: `clamp(0px, calc(${clickXPercent}% - var(--comment-box-half-width, 200px)), calc(100% - var(--comment-box-width, 400px)))` }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span className={styles.inlineFormTime}>@ {formatTimestamp(Math.floor(pendingTimestamp))}</span>
                      <textarea
                        className={styles.inlineTextarea}
                        placeholder="What's happening here?"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        rows={2}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitThread(); } }}
                      />
                      <div className={styles.inlineFormActions}>
                        <button className={styles.cancelBtn} onClick={() => { setPendingTimestamp(null); pendingTimestampRef.current = null; setClickXPercent(0); }}>Cancel</button>
                        <button className={styles.postBtn} onClick={submitThread} disabled={!newComment.trim() || posting}>
                          {posting ? 'Posting…' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!pendingTimestamp && <p className={styles.waveHint}>click anywhere on the waveform to leave a comment</p>}
            </div>

          </div>{/* /heroContent */}

        </div>{/* /heroOverlay */}
      </div>{/* /hero */}

      {/* Three-column body */}
      <div className={styles.body}>

        {/* Left: Actions */}
        <div ref={actionsPanelRef} className={styles.actionsPanel}>
          <div className={styles.actionsPanelHeader}>
            <div className={styles.sectionHeaderCopy}>
              <span className={styles.actionsPanelTitle}>ACTIONS</span>
              <span className={styles.sectionHeaderSubtle}>
                {actionsTab === 'all_versions'
                  ? 'Actions across the whole song history'
                  : 'Changes to make on this version'}
              </span>
            </div>
            <span className={styles.pendingBadge}>{openActionCount} open</span>
          </div>
          <div className={styles.actionTabRow}>
            {[
              { value: 'this_version', label: `This version (${thisVersionActions.length})` },
              { value: 'all_versions', label: `All versions (${allVersionActions.length})` },
            ].map(option => (
              <button
                key={option.value}
                className={`${styles.actionTab} ${actionsTab === option.value ? styles.actionTabActive : ''}`}
                onClick={() => setActionsTab(option.value as ActionsTab)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {unresolvedActions.length > 0 && (
            <div className={styles.actionContextCard}>
              <strong>{unresolvedActions.length} unresolved</strong>
              <span>
                {actionsTab === 'all_versions'
                  ? 'Open and in-progress actions across the song are the work still waiting for attention.'
                  : 'Open and in-progress actions are the work still to listen for in this version.'}
              </span>
            </div>
          )}
          {resolvedHereActions.length > 0 && (
            <div className={styles.actionContextCard}>
              <strong>{resolvedHereActions.length} resolved here</strong>
              <span>These actions have been marked as resolved in the version you are reviewing now.</span>
            </div>
          )}
          <div className={styles.actionFilterRow}>
            {[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'done', label: 'Done' },
              { value: 'assigned_to_me', label: 'Assigned to me' },
            ].map(option => (
              <button
                key={option.value}
                className={`${styles.actionFilterPill} ${actionFilter === option.value ? styles.actionFilterPillActive : ''}`}
                onClick={() => setActionFilter(option.value as 'all' | 'open' | 'done' | 'assigned_to_me')}
              >
                {option.label}
              </button>
            ))}
          </div>
          {actions.length === 0 && <p className={styles.empty}>No actions yet. Turn a comment into an action when something needs following up.</p>}
          {actions.length > 0 && orderedActions.length === 0 && (
            <p className={styles.empty}>No actions match this filter right now.</p>
          )}
          {orderedActions.map(action => (
            <div key={action.id} className={`${styles.actionItem} ${action.status === 'done' ? styles.actionDone : ''}`}>
              <button
                className={`${styles.actionToggle} ${action.status === 'done' ? styles.actionToggleDone : action.status === 'in_progress' ? styles.actionToggleApproved : ''}`}
                onClick={() => toggleAction(action)}
                title={`Cycle status (${action.status})`}
              >
                {action.status === 'done' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {action.status === 'in_progress' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <div className={styles.actionText}>
                <span className={`${styles.actionDesc} ${action.status === 'done' ? styles.actionDescDone : ''}`}>
                  {action.description}
                </span>
                <span className={styles.actionMeta}>
                  {action.suggested_by}
                  {actionsTab === 'all_versions' && action.song_version_label && (
                    <>
                      {' '}·{' '}
                      <button
                        type="button"
                        className={styles.actionLinkBtn}
                        onClick={() => openActionSource(action)}
                      >
                        {action.song_version_label}
                      </button>
                    </>
                  )}
                  {action.assigned_to_name && (
                    <> · Assigned to {action.assigned_to_name}</>
                  )}
                  {action.resolved_in_version_id === versionId && (
                    <> · Resolved in this version</>
                  )}
                  {action.resolved_in_version_id && action.resolved_in_version_id !== versionId && action.resolved_in_version_label && (
                    <> · Resolved in {action.resolved_in_version_label}</>
                  )}
                  {action.timestamp_seconds != null && (
                    <>
                      {' '}·{' '}
                      <button
                        type="button"
                        className={`${styles.actionLinkBtn} ${styles.actionTimestamp}`}
                        onClick={() => openActionSource(action)}
                      >
                        @ {formatTimestamp(action.timestamp_seconds)}
                      </button>
                    </>
                  )}
                  {actionsTab === 'all_versions' && !action.song_version_label && action.song_version_id && (
                    <> · Earlier version</>
                  )}
                </span>
                <div className={styles.actionControls}>
                  <span className={`${styles.actionStatusPill} ${action.status === 'in_progress' ? styles.actionStatusApproved : action.status === 'done' ? styles.actionStatusCompleted : ''}`}>
                    {getActionStatusLabel(action.status)}
                  </span>
                  {action.status !== 'done' && (
                    <button className={styles.actionResolveBtn} onClick={() => resolveActionInCurrentVersion(action)}>
                      Resolve in this version
                    </button>
                  )}
                  {action.status === 'done' && action.resolved_in_version_id === versionId && (
                    <span className={styles.actionResolvedBadge}>Resolved in this version</span>
                  )}
                  <button className={styles.actionEditBtn} onClick={() => openEditAction(action)}>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Threads */}
        <div ref={threadsPanelRef} className={styles.threadsPanel}>
          {selectedThread ? (
            <>
              <div className={styles.threadsPanelHeader}>
                <div className={styles.threadHeaderInfo}>
                  <div className={styles.threadMarkerDot} style={{ background: MARKER_COLORS[threads.findIndex(t => t.id === selectedThread.id) % MARKER_COLORS.length] }} />
                  <div className={styles.threadHeaderMeta}>
                    <span className={styles.threadTimestamp}>@ {formatTimestamp(selectedThread.timestamp_seconds)}</span>
                    <span className={styles.threadHeaderCount}>
                      {selectedThread.comments.length} message{selectedThread.comments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className={styles.threadHeaderActions}>
                  <button className={styles.threadActionBtn} onClick={() => seekToThread(selectedThread)}>
                    Jump to time
                  </button>
                  <button className={styles.threadActionBtn} onClick={() => copyThreadTimestamp(selectedThread.timestamp_seconds)}>
                    {timestampCopied ? 'Copied time' : 'Copy timestamp'}
                  </button>
                  <button className={styles.threadActionBtn} onClick={() => copyThreadLink(selectedThread.id)}>
                    {threadLinkCopied ? 'Copied link' : 'Copy link'}
                  </button>
                </div>
                <button className={styles.threadsDropdown} onClick={() => setSelectedThreadId(null)}>
                  {threads.length} thread{threads.length !== 1 ? 's' : ''} ▾
                </button>
              </div>
              <div className={styles.bubbleList}>
                {selectedThread.comments?.map(c => (
                  <div key={c.id} className={`${styles.bubbleWrap} ${c.author === identity ? styles.bubbleWrapOwn : styles.bubbleWrapOther}`}>
                    {!c.author || c.author !== identity && <span className={styles.bubbleAuthor}>{c.author}</span>}
                    <div
                      className={`${styles.bubble} ${c.author === identity ? styles.bubbleOwn : styles.bubbleOther} ${animatedCommentId === c.id ? styles.bubbleGentlePop : ''}`}
                    >
                      {c.body}
                    </div>
                    {c.author === identity && <span className={styles.bubbleAuthor}>{c.author}</span>}
                    {!actions.some(a => a.comment_id === c.id) && (
                      <button className={styles.markActionBtn} onClick={() => {
                        setActionModalCommentId(c.id);
                        setEditingActionId(null);
                        setActionText(c.body);
                        setActionStatus('open');
                        setActionAssignedToUserId('');
                      }}>
                        + Mark as action
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.replyRow}>
                <div className={styles.replyDot} />
                <input
                  className={styles.replyInput}
                  placeholder="Reply…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitReply(selectedThread.id); }}
                />
                <span className={styles.replyTime}>{formatTimestamp(Math.floor(currentTime))}</span>
                <button className={styles.replyBtn} onClick={() => submitReply(selectedThread.id)} disabled={!replyText.trim()}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 7h11M8 3l4 4-4 4"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.threadsPanelHeader}>
                <span className={styles.threadsPanelTitle}>{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
              </div>
              {threads.length === 0
                ? <p className={styles.empty}>No comments yet. Click the waveform to start the conversation.</p>
                : (
                  <div className={styles.threadIndexList}>
                    {threads.map((t, i) => (
                      <button key={t.id} className={styles.threadIndexItem} onClick={() => seekToThread(t)}>
                        <div className={styles.threadIndexDot} style={{ background: MARKER_COLORS[i % MARKER_COLORS.length] }} />
                        <div className={styles.threadIndexBody}>
                          <div className={styles.threadIndexTop}>
                            <span className={styles.threadIndexTime}>@ {formatTimestamp(t.timestamp_seconds)}</span>
                            <span className={styles.threadIndexCount}>
                              {t.comments?.length || 0} message{(t.comments?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className={styles.threadIndexPreview}>
                            {formatThreadPreview(t.comments?.[0]?.body)}
                          </span>
                          <span className={styles.threadIndexMeta}>
                            Last reply by {t.comments?.[t.comments.length - 1]?.author || t.created_by}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              }
            </>
          )}
        </div>
        {/* Right: Song Admin */}
        <div className={styles.adminPanel}>
          <div className={styles.adminPanelHeader}>
            <div className={styles.sectionHeaderCopy}>
              <span className={styles.adminPanelTitle}>SONG ADMIN</span>
              <span className={styles.sectionHeaderSubtle}>Practical tasks for this song</span>
            </div>
            {tasks.filter(t => t.status === 'pending').length > 0 && (
              <span className={styles.adminCount}>{tasks.filter(t => t.status === 'pending').length}</span>
            )}
          </div>

          {/* Add task input */}
          <div className={styles.addTaskRow}>
            <input
              className={styles.addTaskInput}
              placeholder="Add a task…"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
            />
            <button className={styles.addTaskBtn} onClick={addTask} disabled={!newTaskText.trim()}>
              +
            </button>
          </div>

          {/* Pending tasks */}
          <div className={styles.taskList}>
            {tasks.filter(t => t.status === 'pending').length === 0 && (
              <p className={styles.taskEmpty}>No song admin tasks yet. Add one when there is something to chase.</p>
            )}
            {tasks.filter(t => t.status === 'pending').map(task => (
              <div
                key={task.id}
                className={`${styles.taskRow} ${dragOverTaskId === task.id ? styles.taskRowDragOver : ''}`}
                draggable
                onDragStart={() => handleTaskDragStart(task.id)}
                onDragOver={e => handleTaskDragOver(e, task.id)}
                onDrop={() => handleTaskDrop(task.id)}
                onDragLeave={() => setDragOverTaskId(null)}
              >
                <span className={styles.taskDragHandle}>⠿</span>
                <button className={styles.taskCircle} onClick={() => toggleTask(task)} title="Mark complete" />
                {editingTaskId === task.id ? (
                  <input
                    className={styles.taskEditInput}
                    value={editingTaskText}
                    autoFocus
                    onChange={e => setEditingTaskText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTaskEdit(task.id);
                      if (e.key === 'Escape') setEditingTaskId(null);
                    }}
                    onBlur={() => saveTaskEdit(task.id)}
                  />
                ) : (
                  <span
                    className={styles.taskDesc}
                    onDoubleClick={() => { setEditingTaskId(task.id); setEditingTaskText(task.description); }}
                    title="Double-click to edit"
                  >
                    {task.description}
                  </span>
                )}
                <button className={styles.taskDeleteBtn} onClick={() => deleteTask(task.id)} title="Delete">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Completed tasks */}
          {tasks.filter(t => t.status === 'completed').length > 0 && (
            <div className={styles.completedSection}>
              <p className={styles.completedHeading}>
                COMPLETED <span className={styles.completedCount}>{tasks.filter(t => t.status === 'completed').length}</span>
              </p>
              {tasks.filter(t => t.status === 'completed').map(task => (
                <div key={task.id} className={`${styles.taskRow} ${styles.taskRowDone}`}>
                  <span className={styles.taskDragHandle} style={{ opacity: 0 }}>⠿</span>
                  <button className={`${styles.taskCircle} ${styles.taskCircleDone}`} onClick={() => toggleTask(task)} title="Mark pending">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2.5 2.5L7 1.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span className={`${styles.taskDesc} ${styles.taskDescDone}`}>{task.description}</span>
                  <button className={styles.taskDeleteBtn} onClick={() => deleteTask(task.id)} title="Delete">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Action modal */}
      {(actionModalCommentId || editingActionId) && (
        <div className={styles.modalOverlay} onClick={() => { setActionModalCommentId(null); setEditingActionId(null); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editingActionId ? 'Edit Action' : 'Mark as Action'}</h3>
            <textarea className={styles.modalTextarea} value={actionText} onChange={e => setActionText(e.target.value)} rows={3} />
            <select
              className={styles.modalInput}
              value={actionAssignedToUserId}
              onChange={e => setActionAssignedToUserId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {workspaceMembers.map(member => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
            <div className={styles.actionStateRow}>
              {(['open', 'in_progress', 'done'] as const).map(status => (
                <button
                  key={status}
                  className={`${styles.actionStateBtn} ${actionStatus === status ? styles.actionStateBtnActive : ''}`}
                  onClick={() => setActionStatus(status)}
                >
                  {getActionStatusLabel(status)}
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => { setActionModalCommentId(null); setEditingActionId(null); setActionAssignedToUserId(''); }}>Cancel</button>
              <button className={styles.postBtn} onClick={submitAction} disabled={!actionText.trim()}>
                {editingActionId ? 'Save changes' : 'Save Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusToast && <div className={styles.statusToast}>{statusToast}</div>}

      {showUploadVersionModal && (
        <div className={styles.modalOverlay} onClick={() => { if (!uploadingVersion) setShowUploadVersionModal(false); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Upload New Version</h3>
            {pendingVersionFile ? (
              <div className={styles.uploadMetaCard}>
                <strong>{pendingVersionFile.name}</strong>
                <span>{formatFileSize(pendingVersionFile.size)}</span>
              </div>
            ) : (
              <div className={styles.uploadMetaCard}>
                <strong>No file selected</strong>
                <span>Choose an MP3, WAV, M4A, FLAC, or OGG file.</span>
              </div>
            )}
            <input
              className={styles.modalInput}
              placeholder='Version label (optional, e.g. "Mix notes applied")'
              value={newVersionLabel}
              onChange={e => setNewVersionLabel(e.target.value)}
              disabled={uploadingVersion}
            />
            <textarea
              className={styles.modalTextarea}
              placeholder='Version notes (optional, e.g. "New vocal comp and tighter bridge")'
              value={newVersionNotes}
              onChange={e => setNewVersionNotes(e.target.value)}
              rows={3}
              disabled={uploadingVersion}
            />
            <p className={styles.uploadHelp}>Uploads under 200 MB work best in the current flow.</p>
            {uploadingVersion && (
              <div>
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar} style={{ width: `${versionUploadProgress}%` }} />
                </div>
                <span className={styles.progressLabel}>{versionUploadProgress}% uploaded to song-files...</span>
              </div>
            )}
            {versionUploadError && <div className={styles.errorMsg}>{versionUploadError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowUploadVersionModal(false)} disabled={uploadingVersion}>
                Cancel
              </button>
              <button className={styles.postBtn} onClick={uploadNewVersion} disabled={!pendingVersionFile || uploadingVersion}>
                {uploadingVersion ? 'Uploading…' : 'Upload version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version picker modal */}
      {showVersionModal && (
        <div className={styles.modalOverlay} onClick={() => setShowVersionModal(false)}>
          <div className={styles.versionModal} onClick={e => e.stopPropagation()}>
            <div className={styles.versionModalHeader}>
              <h3 className={styles.versionModalTitle}>Choose version</h3>
              <button className={styles.versionModalClose} onClick={() => setShowVersionModal(false)}>✕</button>
            </div>
            <div className={styles.versionModalList}>
              {versions.map(v => (
                <button
                  key={v.id}
                  className={`${styles.versionModalItem} ${v.id === versionId ? styles.versionModalItemActive : ''}`}
                  onClick={() => { setShowVersionModal(false); router.push(`/songs/${songId}/versions/${v.id}`); }}
                >
                  <span className={styles.versionModalLabel}>{v.display_name || getVersionDisplayLabel(v)}</span>
                  <span className={styles.versionModalMeta}>
                    {v.created_by} · v{v.version_number}
                  </span>
                  {v.id === versionId && (
                    <span className={styles.versionModalTick}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <input
        ref={versionFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
        style={{ display: 'none' }}
        onChange={e => {
          handleVersionFilePicked(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
