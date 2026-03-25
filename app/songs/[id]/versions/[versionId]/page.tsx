'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from './version.module.css';

interface Comment { id: string; author: string; body: string; created_at: string; }
interface Thread { id: string; timestamp_seconds: number; created_by: string; created_at: string; comments: Comment[]; }
interface Action { id: string; description: string; status: string; suggested_by: string; comment_id: string | null; timestamp_seconds: number | null; created_at: string; }
interface Version { id: string; version_number: number; label: string | null; file_path: string; file_name: string; created_by: string; }
interface Song { id: string; title: string; }

const COLORS = ['#ff6b6b', '#4ecdc4', '#f7dc6f', '#45b7d1', '#bb8fce', '#98d8c8', '#ffa07a'];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const d = Math.floor((s % 1) * 10);
  return `${m}:${String(sec).padStart(2,'0')}.${d}`;
}

export default function VersionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string|null>(null);
  const [waveErr, setWaveErr] = useState<string|null>(null);
  const [song, setSong] = useState<Song|null>(null);
  const [version, setVersion] = useState<Version|null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState('');
  const [selectedThread, setSelectedThread] = useState<string|null>(null);
  const [pendingTs, setPendingTs] = useState<number|null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const id = getIdentity();
    if (!id) { router.push('/identify'); return; }
    setIdentity(id);
    loadAll();
  }, [songId, versionId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [sr, vsr, vr] = await Promise.all([
        supabase.from('songs').select('id,title').eq('id', songId).single(),
        supabase.from('song_versions').select('*').eq('song_id', songId).order('version_number', {ascending:true}),
        supabase.from('song_versions').select('*').eq('id', versionId).single(),
      ]);
      setSong(sr.data);
      setVersions(vsr.data || []);
      setVersion(vr.data);
      if (vr.data?.file_path) {
        const {data: sd} = await supabase.storage.from('song-files').createSignedUrl(vr.data.file_path, 3600);
        if (sd?.signedUrl) setAudioUrl(sd.signedUrl);
        else {
          const {data: pd} = supabase.storage.from('song-files').getPublicUrl(vr.data.file_path);
          setAudioUrl(pd.publicUrl);
        }
      }
      await Promise.all([loadThreads(), loadActions()]);
    } finally { setLoading(false); }
  }

  async function loadThreads() {
    const {data} = await supabase.from('comment_threads').select('*,comments(*)').eq('song_version_id', versionId).order('timestamp_seconds',{ascending:true});
    setThreads(data || []);
    return data || [];
  }

  async function loadActions() {
    const res = await fetch(`/api/actions/by-song/${songId}`);
    if (res.ok) { const {actions:d} = await res.json(); setActions(d||[]); }
  }

  const initWS = useCallback(async (el: HTMLDivElement, url: string) => {
    if (wavesurferRef.current) { try { wavesurferRef.current.destroy(); } catch {} wavesurferRef.current = null; }
    const WS = (await import('wavesurfer.js')).default;
    if (!el.isConnected) return;
    const ws = WS.create({
      container: el, waveColor: 'rgba(255,255,255,0.15)', progressColor: 'rgba(255,20,147,0.8)',
      cursorColor: '#ff1493', cursorWidth: 1, height: 100, barWidth: 2, barGap: 1, barRadius: 2,
      interact: true, normalize: true,
    });
    ws.on('ready', (d: number) => { setWaveErr(null); setDuration(d); setReady(true); });
    ws.on('timeupdate', (t: number) => setCurrentTime(t));
    ws.on('seeking', (t: number) => setCurrentTime(t));
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));
    ws.on('error', (e: Error) => { setWaveErr(e.message||String(e)); });
    ws.on('interaction', (t: number) => { setPendingTs(t); setSelectedThread(null); setNewComment(''); });
    ws.load(url);
    wavesurferRef.current = ws;
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    setReady(false); setWaveErr(null);
    let n = 0;
    const go = () => { if (waveformRef.current) initWS(waveformRef.current, audioUrl); else if (n++<20) setTimeout(go, 50); };
    go();
    return () => { if (wavesurferRef.current) { try { wavesurferRef.current.destroy(); } catch {} wavesurferRef.current = null; } };
  }, [audioUrl, initWS]);

  useEffect(() => {
    const tid = searchParams.get('threadId');
    if (tid && threads.length > 0 && ready) {
      setSelectedThread(tid);
      const t = threads.find(x => x.id === tid);
      if (t && wavesurferRef.current && duration > 0) wavesurferRef.current.seekTo(t.timestamp_seconds / duration);
    }
  }, [searchParams, threads, ready, duration]);

  function seekTo(secs: number) {
    if (wavesurferRef.current && ready && duration > 0) wavesurferRef.current.seekTo(secs / duration);
  }

  function openThread(t: Thread) {
    setSelectedThread(t.id);
    setPendingTs(null);
    setReplyText('');
    setSubmitErr('');
    seekTo(t.timestamp_seconds);
  }

  async function submitThread() {
    if (!newComment.trim() || pendingTs === null || submitting) return;
    setSubmitting(true); setSubmitErr('');
    try {
      const res = await fetch('/api/threads/create', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ versionId, songId, timestamp: pendingTs, author: identity, commentText: newComment.trim() }),
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      const {threadId} = await res.json();
      setNewComment(''); setPendingTs(null);
      await loadThreads();
      setSelectedThread(threadId);
    } catch(e:any) { setSubmitErr(e.message||'Failed to post'); }
    finally { setSubmitting(false); }
  }

  async function submitReply() {
    if (!replyText.trim() || !selectedThread || submitting) return;
    setSubmitting(true); setSubmitErr('');
    try {
      const res = await fetch('/api/threads/reply', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ threadId: selectedThread, songId, text: replyText.trim(), author: identity }),
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      setReplyText('');
      await loadThreads();
    } catch(e:any) { setSubmitErr(e.message||'Failed to send'); }
    finally { setSubmitting(false); }
  }

  async function markAction(comment: Comment, thread: Thread) {
    await fetch('/api/actions/create', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ commentId: comment.id, songId, description: comment.body, suggestedBy: comment.author, timestampSeconds: thread.timestamp_seconds }),
    });
    await loadActions();
  }

  async function toggleAction(action: Action) {
    await fetch(`/api/actions/${action.id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: action.status === 'pending' ? 'completed' : 'pending' }),
    });
    await loadActions();
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;

  const activeThread = threads.find(t => t.id === selectedThread) ?? null;
  const pending = actions.filter(a => a.status === 'pending');
  const done = actions.filter(a => a.status === 'completed');

  return (
    <div className={styles.page}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>Songs</button>
        <h1 className={styles.songTitle}>{song?.title}</h1>
        {version && <span className={styles.vBadge}>v{version.version_number}</span>}
        <div className={styles.topRight}>
          <select className={styles.vSelect} value={versionId} onChange={e => router.push(`/songs/${songId}/versions/${e.target.value}`)}>
            {versions.map(v => <option key={v.id} value={v.id}>v{v.version_number}{v.label?` — ${v.label}`:''}</option>)}
          </select>
          <button className={styles.uploadBtn} onClick={() => router.push(`/songs/${songId}/upload`)}>↑ Upload new version</button>
          <div className={styles.avatar}>{identity?.[0]?.toUpperCase()}</div>
        </div>
      </div>

      {/* Player */}
      <div className={styles.player}>
        <div className={styles.playerRow}>
          <button className={styles.playBtn} onClick={() => wavesurferRef.current?.playPause()} disabled={!ready}>
            {playing
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><rect x="2" y="1" width="4" height="12" rx="1"/><rect x="8" y="1" width="4" height="12" rx="1"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><path d="M3 1.5l10 5.5-10 5.5z"/></svg>}
          </button>
          <span className={styles.time}>{fmt(currentTime)} <span className={styles.timeSep}>/</span> {fmt(duration)}</span>
          {!ready && audioUrl && !waveErr && <span className={styles.loadingWave}>Loading waveform…</span>}
          {waveErr && <span className={styles.waveErr}>⚠ {waveErr}</span>}
        </div>

        <div className={styles.waveWrap}>
          <div ref={waveformRef} className={styles.waveform} style={{height:100,minHeight:100}} />
          {ready && duration > 0 && threads.map((t,i) => (
            <button key={t.id}
              className={`${styles.marker} ${selectedThread===t.id?styles.markerOn:''}`}
              style={{left:`${(t.timestamp_seconds/duration)*100}%`, background: COLORS[i%COLORS.length]}}
              onClick={() => openThread(t)}
              title={`${t.created_by} @ ${fmt(t.timestamp_seconds)}`}
            />
          ))}
        </div>

        <p className={styles.hint}>click anywhere on the waveform to leave a comment</p>

        {pendingTs !== null && (
          <div className={styles.inlineBox}>
            <span className={styles.inlineLabel}>💬 Comment at {fmt(pendingTs)}</span>
            <textarea className={styles.inlineInput} placeholder="What's happening here?" value={newComment}
              onChange={e => setNewComment(e.target.value)} rows={2} autoFocus
              onKeyDown={e => { if (e.key==='Enter' && e.metaKey) submitThread(); }}
            />
            {submitErr && <p className={styles.errMsg}>{submitErr}</p>}
            <div className={styles.inlineBtns}>
              <button className={styles.cancelBtn} onClick={() => { setPendingTs(null); setSubmitErr(''); }}>Cancel</button>
              <button className={styles.postBtn} onClick={submitThread} disabled={!newComment.trim()||submitting}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className={styles.cols}>

        {/* LEFT — Actions */}
        <div className={styles.actionsCol}>
          <div className={styles.colHeader}>
            <span className={styles.colTitle}>ACTIONS</span>
            {pending.length > 0 && <span className={styles.pendingPill}>{pending.length} pending</span>}
          </div>
          {actions.length === 0 && <p className={styles.empty}>No actions yet.</p>}
          {[...pending, ...done].map(a => (
            <div key={a.id} className={`${styles.actionRow} ${a.status==='completed'?styles.actionDone:''}`}>
              <button className={`${styles.circle} ${a.status==='completed'?styles.circleDone:''}`} onClick={() => toggleAction(a)}>
                {a.status==='completed' && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </button>
              <div className={styles.actionText}>
                <p className={`${styles.actionDesc} ${a.status==='completed'?styles.strikethrough:''}`}>{a.description}</p>
                <span className={styles.actionMeta}>
                  {a.suggested_by}
                  {a.timestamp_seconds != null &&
                    <button className={styles.tsBtn} onClick={() => seekTo(a.timestamp_seconds!)}>· @ {fmt(a.timestamp_seconds)}</button>}
                  {a.status==='completed' && ' · done'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT — Threads */}
        <div className={styles.threadsCol}>

          {/* No thread selected — show list */}
          {!activeThread && (
            <>
              {threads.length > 0 && (
                <div className={styles.colHeader}>
                  <span className={styles.colTitle}>{threads.length} thread{threads.length!==1?'s':''}</span>
                </div>
              )}
              {threads.length === 0 && pendingTs === null && (
                <p className={styles.empty}>Click anywhere on the waveform to start a thread.</p>
              )}
              {threads.map((t,i) => (
                <div key={t.id} className={styles.threadRow} onClick={() => openThread(t)}>
                  <span className={styles.threadDot} style={{background:COLORS[i%COLORS.length]}} />
                  <div className={styles.threadRowText}>
                    <span className={styles.threadRowTime}>@ {fmt(t.timestamp_seconds)}</span>
                    <p className={styles.threadRowPreview}>{t.comments?.[0]?.body?.slice(0,80)??''}</p>
                  </div>
                  <span className={styles.threadCount}>{t.comments?.length??0}</span>
                </div>
              ))}
            </>
          )}

          {/* Active thread */}
          {activeThread && (
            <div className={styles.threadView}>
              <div className={styles.threadViewTop}>
                <button className={styles.backThreads} onClick={() => setSelectedThread(null)}>
                  ← {threads.length} thread{threads.length!==1?'s':''}
                </button>
                <span className={styles.threadTs}>@ {fmt(activeThread.timestamp_seconds)}</span>
              </div>

              <div className={styles.bubbles}>
                {activeThread.comments?.map(c => {
                  const own = c.author === identity;
                  const hasAction = actions.some(a => a.comment_id === c.id);
                  return (
                    <div key={c.id} className={own ? styles.bubbleWrapOwn : styles.bubbleWrapOther}>
                      {!own && <span className={styles.bubbleAuthor}>{c.author}</span>}
                      <div className={own ? styles.bubbleOwn : styles.bubbleOther}>{c.body}</div>
                      {own && <span className={styles.bubbleAuthor}>{c.author}</span>}
                      {!hasAction && (
                        <button className={styles.markAction} onClick={() => markAction(c, activeThread)}>
                          + Mark as action
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {submitErr && <p className={styles.errMsg}>{submitErr}</p>}

              <div className={styles.replyBar}>
                <span className={styles.replyDot} style={{background: COLORS[threads.indexOf(activeThread)%COLORS.length]}} />
                <input className={styles.replyInput} placeholder="Reply…" value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitReply();} }}
                />
                <span className={styles.replyTime}>{fmt(currentTime)}</span>
                <button className={styles.sendBtn} onClick={submitReply} disabled={!replyText.trim()||submitting}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M1 8l13-6-4 6 4 6z"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
