'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';
import BetaBanner from '@/components/BetaBanner';

const POST_LOGIN_INVITE_PATH_KEY = 'song_review_post_login_invite_path';

function normalizeRedirectTarget(value: string | null) {
  if (!value) return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

async function resolvePostLoginRedirect(redirectTo: string) {
  const normalized = normalizeRedirectTarget(redirectTo);
  if (normalized === '/' || normalized === '/dashboard' || normalized === '/settings' || normalized === '/identify') {
    return normalized === '/' ? '/dashboard' : normalized;
  }
  const inviteMatch = normalized.match(/^\/invite\/([^/?#]+)/);
  if (inviteMatch) return normalized;
  const versionMatch = normalized.match(/^\/songs\/([^/]+)\/versions\/([^/?#]+)/);
  if (versionMatch) {
    const [, songId, versionId] = versionMatch;
    try {
      const response = await fetch(`/api/versions/${versionId}`, { cache: 'no-store' });
      if (response.ok) return normalized;
    } catch (error) {
      console.error('Post-login version redirect validation error:', error);
    }
    return `/songs/${songId}`;
  }
  const songMatch = normalized.match(/^\/songs\/([^/?#]+)/);
  if (songMatch) return normalized;
  return '/dashboard';
}

// ── SVG draw paths (Thunder BlackLC letterforms) ──
// ── SVG draw paths - real Thunder BlackLC letterforms extracted via fonttools ──
// Same paths as headline-svg-v5.html (the signed-off wireframe). Flat array, y=0 for CREATE, y=144 for TOGETHER.
const SVG_PATHS = [
  { y: 0,   d: "M37.2 56.39999999999999C37.2 54.0 37.6 53.19999999999999 38.400000000000006 53.19999999999999C39.2 53.19999999999999 39.6 54.0 39.6 56.39999999999999V92.0H75.60000000000001V59.0C75.60000000000001 35.400000000000006 61.800000000000004 22.0 37.800000000000004 22.0C14.200000000000001 22.0 1.2000000000000002 34.79999999999998 1.2000000000000002 59.0V128.8C1.2000000000000002 153.0 14.200000000000001 166.0 37.800000000000004 166.0C61.800000000000004 166.0 75.60000000000001 152.6 75.60000000000001 128.8V96.0H39.6V131.6C39.6 133.8 39.2 134.8 38.400000000000006 134.8C37.6 134.8 37.2 133.8 37.2 131.6Z", len: 810, delay: 0.179 },
  { y: 0,   d: "M78.00000000000001 24.0V164.0H114.00000000000001V114.0H114.4C116.4 114.0 116.4 114.4 116.4 117.19999999999999V135.2C116.4 146.0 116.60000000000002 155.2 118.4 164.0H154.40000000000003C152.60000000000002 155.4 152.40000000000003 146.2 152.40000000000003 135.6V134.0C152.40000000000003 112.6 140.4 99.6 132.0 99.6V97.2C140.60000000000002 97.2 152.40000000000003 85.8 152.40000000000003 62.39999999999999V61.39999999999999C152.40000000000003 36.0 138.60000000000002 24.0 114.80000000000001 24.0ZM114.00000000000001 55.19999999999999H114.4C116.4 55.19999999999999 116.4 55.599999999999994 116.4 58.19999999999999V79.6C116.4 82.39999999999999 116.4 82.8 114.4 82.8H114.00000000000001Z", len: 788, delay: 0.007 },
  { y: 0,   d: "M206.8 55.19999999999999V24.0H154.8V164.0H206.8V132.8H190.8V105.8H206.8V74.6H190.8V55.19999999999999Z", len: 610, delay: 0.077 },
  { y: 0,   d: "M218.20000000000002 24.0 208.60000000000002 164.0H244.60000000000002V135.2H247.00000000000003V164.0H283.0L274.20000000000005 24.0ZM244.60000000000002 104.0V86.8H247.00000000000003V104.0Z", len: 632, delay: 0.062 },
  { y: 0,   d: "M356.40000000000003 24.0H284.40000000000003V55.19999999999999H302.40000000000003V164.0H338.40000000000003V55.19999999999999H356.40000000000003Z", len: 580, delay: 0.206 },
  { y: 0,   d: "M410.40000000000003 55.19999999999999V24.0H358.40000000000003V164.0H410.40000000000003V132.8H394.40000000000003V105.8H410.40000000000003V74.6H394.40000000000003V55.19999999999999Z", len: 610, delay: 0.189 },
  { y: 144, d: "M72.8 24.0H0.8V55.19999999999999H18.8V164.0H54.800000000000004V55.19999999999999H72.8Z", len: 580, delay: 0.250 },
  { y: 144, d: "M74.80000000000001 59.0V128.8C74.80000000000001 153.0 87.80000000000001 166.0 111.4 166.0C135.4 166.0 149.20000000000002 152.6 149.20000000000002 128.8V59.0C149.20000000000002 35.400000000000006 135.4 22.0 111.4 22.0C87.80000000000001 22.0 74.80000000000001 34.79999999999998 74.80000000000001 59.0ZM110.80000000000001 56.39999999999999C110.80000000000001 54.0 111.20000000000002 53.19999999999999 112.00000000000001 53.19999999999999C112.80000000000001 53.19999999999999 113.20000000000002 54.0 113.20000000000002 56.39999999999999V131.6C113.20000000000002 133.8 112.80000000000001 134.8 112.00000000000001 134.8C111.20000000000002 134.8 110.80000000000001 133.8 110.80000000000001 131.6Z", len: 730, delay: 0.024 },
  { y: 144, d: "M187.60000000000002 56.39999999999999C187.60000000000002 54.0 188.00000000000003 53.19999999999999 188.80000000000004 53.19999999999999C189.60000000000002 53.19999999999999 190.00000000000003 54.0 190.00000000000003 56.39999999999999V81.6H226.00000000000006V59.0C226.00000000000006 35.400000000000006 212.20000000000005 22.0 188.20000000000005 22.0C164.60000000000002 22.0 151.60000000000002 34.79999999999998 151.60000000000002 59.0V128.8C151.60000000000002 155.4 166.40000000000003 166.0 179.60000000000002 166.0C188.60000000000002 166.0 197.00000000000003 161.2 199.20000000000005 152.8H201.60000000000002V164.0H226.00000000000006V85.6H187.60000000000002ZM187.60000000000002 108.8H190.00000000000003V131.6C190.00000000000003 133.8 189.60000000000002 134.8 188.80000000000004 134.8C188.00000000000003 134.8 187.60000000000002 133.8 187.60000000000002 131.6Z", len: 796, delay: 0.118 },
  { y: 144, d: "M280.40000000000003 55.19999999999999V24.0H228.40000000000003V164.0H280.40000000000003V132.8H264.40000000000003V105.8H280.40000000000003V74.6H264.40000000000003V55.19999999999999Z", len: 610, delay: 0.008 },
  { y: 144, d: "M354.40000000000003 24.0H282.40000000000003V55.19999999999999H300.40000000000003V164.0H336.40000000000003V55.19999999999999H354.40000000000003Z", len: 580, delay: 0.061 },
  { y: 144, d: "M394.80000000000007 24.0V76.6H392.40000000000003V24.0H356.40000000000003V164.0H392.40000000000003V107.8H394.80000000000007V164.0H430.80000000000007V24.0Z", len: 858, delay: 0.141 },
  { y: 144, d: "M485.20000000000005 55.19999999999999V24.0H433.20000000000005V164.0H485.20000000000005V132.8H469.20000000000005V105.8H485.20000000000005V74.6H469.20000000000005V55.19999999999999Z", len: 610, delay: 0.007 },
  { y: 144, d: "M487.6000000000001 24.0V164.0H523.6000000000001V114.0H524.0000000000001C526.0000000000001 114.0 526.0000000000001 114.4 526.0000000000001 117.19999999999999V135.2C526.0000000000001 146.0 526.2 155.2 528.0000000000001 164.0H564.0000000000001C562.2 155.4 562.0000000000001 146.2 562.0000000000001 135.6V134.0C562.0000000000001 112.6 550.0000000000001 99.6 541.6000000000001 99.6V97.2C550.2 97.2 562.0000000000001 85.8 562.0000000000001 62.39999999999999V61.39999999999999C562.0000000000001 36.0 548.2 24.0 524.4000000000001 24.0ZM523.6000000000001 55.19999999999999H524.0000000000001C526.0000000000001 55.19999999999999 526.0000000000001 55.599999999999994 526.0000000000001 58.19999999999999V79.6C526.0000000000001 82.39999999999999 526.0000000000001 82.8 524.0000000000001 82.8H523.6000000000001Z", len: 788, delay: 0.056 },
];

const BG_IMAGES = [
  'https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/Song%20Room%20Branding/song%20room%20bg%20-%20person1%20Large.jpeg',
  'https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/Song%20Room%20Branding/song%20room%20bg%20-%20person2%20Large.jpeg',
  'https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/Song%20Room%20Branding/song%20room%20bg%20-%20person3%20Large.jpeg',
  'https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/Song%20Room%20Branding/song%20room%20bg%20-%20person4%20Large.jpeg',
  'https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/Song%20Room%20Branding/song%20room%20bg%20-%20person5%20Large.jpeg',
  'https://raw.githubusercontent.com/corisleachman/song-review-app/main/wireframes/Song%20Room%20Branding/song%20room%20bg%20-%20person6%20Large.jpeg',
];

function LoginContent() {
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // BG slideshow
  const [bgIndex, setBgIndex] = useState(0);
  const [previousBgIndex, setPreviousBgIndex] = useState<number | null>(null);
  const eqRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const googleStatus = searchParams.get('google');
  const googleMessage = searchParams.get('message');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener('change', syncPreference);
    return () => mediaQuery.removeEventListener('change', syncPreference);
  }, []);

  // Redirect after OAuth
  useEffect(() => {
    let mounted = true;
    const syncSessionAndRedirect = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const arrivedFromOAuthFlow = searchParams.get('google') === 'success';
      if (arrivedFromOAuthFlow && data.session) {
        const requestedRedirect = searchParams.get('redirectTo');
        const storedInvitePath =
          typeof window !== 'undefined' ? window.sessionStorage.getItem(POST_LOGIN_INVITE_PATH_KEY) : null;
        const inviteRedirect =
          storedInvitePath && /^\/invite\/[^/?#]+$/.test(storedInvitePath) ? storedInvitePath : null;
        const redirectCandidate =
          inviteRedirect && (!requestedRedirect || requestedRedirect === '/dashboard')
            ? inviteRedirect
            : requestedRedirect;
        const redirectTo = await resolvePostLoginRedirect(redirectCandidate);
        if (!mounted) return;
        if (typeof window !== 'undefined' && inviteRedirect === redirectTo) {
          window.sessionStorage.removeItem(POST_LOGIN_INVITE_PATH_KEY);
        }
        window.location.assign(redirectTo);
      }
    };
    void syncSessionAndRedirect();
    return () => { mounted = false; };
  }, [supabase, searchParams]);

  // BG crossfade
  useEffect(() => {
    let cancelled = false;
    let nextImage: HTMLImageElement | null = null;
    const id = window.setTimeout(() => {
      const nextIndex = (bgIndex + 1) % BG_IMAGES.length;
      nextImage = new Image();
      nextImage.onload = () => {
        if (cancelled) return;
        setPreviousBgIndex(bgIndex);
        setBgIndex(nextIndex);
      };
      nextImage.src = BG_IMAGES[nextIndex];
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
      if (nextImage) nextImage.onload = null;
    };
  }, [bgIndex]);

  // EQ visualiser
  useEffect(() => {
    const container = eqRef.current;
    if (!container) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const BAR_COUNT = prefersReducedMotion ? 36 : 72;
    const bars: HTMLDivElement[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const b = document.createElement('div');
      b.className = styles.eqBar;
      b.style.transform = 'scaleY(0.06)';
      b.style.opacity = '0.18';
      container.appendChild(b);
      bars.push(b);
    }

    if (prefersReducedMotion) {
      return () => bars.forEach(b => b.remove());
    }

    const state = bars.map(() => ({ h: 3, target: 3, vel: 0 }));
    let lastMouseX = -1, lastMouseY = -1;
    let mouseActivity = 0, beatPhase = 0, kickEnergy = 0, subEnergy = 0;
    let lastTime = performance.now();
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMouseX, dy = e.clientY - lastMouseY;
      mouseActivity = Math.min(1, mouseActivity + Math.sqrt(dx*dx + dy*dy) * 0.012);
      lastMouseX = e.clientX; lastMouseY = e.clientY;
    };
    document.addEventListener('mousemove', onMove);
    const tick = (now: number) => {
      if (document.visibilityState === 'hidden') {
        animRef.current = 0;
        return;
      }

      const dt = now - lastTime; lastTime = now;
      beatPhase = (beatPhase + dt / 2000) % 1;
      const beatPos = (beatPhase * 4) % 1, beatNum = Math.floor(beatPhase * 4);
      if (beatPos < 0.04 && (beatNum === 0 || beatNum === 2)) kickEnergy = Math.min(1, kickEnergy + mouseActivity * 0.95 + 0.35);
      if (Math.abs(beatPos - 0.5) < 0.03 && (beatNum === 1 || beatNum === 3)) subEnergy = Math.min(1, subEnergy + mouseActivity * 0.6 + 0.22);
      mouseActivity = Math.max(0.18, mouseActivity - 0.006);
      kickEnergy = Math.max(0, kickEnergy - 0.022);
      subEnergy  = Math.max(0, subEnergy  - 0.014);
      bars.forEach((bar, i) => {
        const s = state[i], t = i / BAR_COUNT;
        const isBass = t < 0.20, isLow = t < 0.38, isMid = t < 0.65;
        const maxH = isBass ? 52 : isLow ? 42 : isMid ? 32 : 22;
        let energy = mouseActivity;
        if (isBass) energy = Math.max(energy, kickEnergy * 0.95);
        if (isLow)  energy = Math.max(energy, kickEnergy * 0.65 + subEnergy * 0.3);
        if (isMid)  energy = Math.max(energy, subEnergy  * 0.45 + mouseActivity * 0.5);
        const tp = isBass ? 0.06+energy*0.55 : isLow ? 0.05+energy*0.38 : isMid ? 0.08+energy*0.28 : 0.10+energy*0.20;
        if (Math.random() < tp) {
          s.target = Math.min(maxH, (isBass ? 4+energy*maxH*0.92 : isLow ? 4+energy*maxH*0.78 : isMid ? 3+energy*maxH*0.65 : 2+energy*maxH*0.55) + Math.random()*(isBass?10:isMid?7:5)*energy);
        } else {
          s.target = Math.max(2, s.target * (isBass ? 0.88+energy*0.06 : isLow ? 0.82+energy*0.05 : isMid ? 0.74 : 0.62));
        }
        s.vel = s.vel * (isBass?0.65:isLow?0.60:isMid?0.55:0.48) + (s.target - s.h) * (isBass?0.28:isLow?0.32:isMid?0.38:0.48);
        s.h = Math.max(2, Math.min(maxH, s.h + s.vel));
        bar.style.transform = `scaleY(${Math.max(0.04, s.h / maxH)})`;
        const alpha = isBass ? 0.15+(s.h/maxH)*0.55 : 0.10+(s.h/maxH)*0.38;
        bar.style.opacity = alpha.toFixed(2);
      });
      animRef.current = requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelAnimationFrame(animRef.current);
        animRef.current = 0;
        return;
      }

      if (!animRef.current) {
        lastTime = performance.now();
        animRef.current = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animRef.current = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animRef.current);
      bars.forEach(b => b.remove());
    };
  }, []);

  // Auth handlers - unchanged from original
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', redirectTo);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    });
    if (signInError) { setError(signInError.message); setGoogleLoading(false); }
  };

  return (
    <div className={styles.root}>
      {/* Background slides */}
      <div className={styles.bg} aria-hidden="true">
        {(previousBgIndex === null || previousBgIndex === bgIndex
          ? [bgIndex]
          : [previousBgIndex, bgIndex]
        ).map(i => (
          <div
            key={i}
            className={`${styles.bgSlide} ${i === bgIndex ? styles.bgSlideActive : ''}`}
            style={{ backgroundImage: `url('${BG_IMAGES[i]}')` }}
          />
        ))}
        <div className={styles.bgVeil} />
      </div>

      {/* Page */}
      <div className={styles.page}>
        <div className={styles.betaBannerRow}>
          <BetaBanner />
        </div>
        <nav className={styles.nav}>
          <div className={styles.navBrand}>The Song Room</div>
        </nav>

        {/* Left - auth */}
        <div className={styles.left}>
          {/* Auth panel */}
          <div className={styles.authPanel}>
            <p className={styles.authIntro}>
              Use Google to log in or create your Song Room account.
            </p>

            {/* Google */}
            <button
              className={styles.btnGoogle}
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className={styles.formFooter}>
              <span>During beta, Google is the only account option. </span>
              <a className={styles.formLink} href="/terms">Terms</a>
              <span className={styles.formSeparator} aria-hidden="true"> · </span>
              <a className={styles.formLink} href="/privacy">Privacy</a>
            </div>

            {/* Error */}
            {error && <div className={styles.fieldError} role="alert">{error}</div>}
            {googleStatus === 'error' && !error && (
              <div className={styles.fieldError} role="alert">{googleMessage || 'Sign-in could not be completed. Please try again.'}</div>
            )}
          </div>
        </div>

        {/* Right - SVG headline */}
        <div className={styles.right}>
          <div className={styles.headlineSvgWrap}>
            <svg
              viewBox="0 0 563 344"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: 'auto', overflow: 'visible' }}
              role="img"
              aria-label="Create together"
            >
              {SVG_PATHS.map((p, i) => (
                <g key={i} transform={`translate(0,${p.y})`}>
                  <path
                    d={p.d}
                    fill="none"
                    stroke="#F4F0E8"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={p.len}
                    strokeDashoffset={prefersReducedMotion ? 0 : p.len}
                    strokeOpacity={prefersReducedMotion ? 1 : 0}
                  >
                    {!prefersReducedMotion && (
                      <>
                        <animate attributeName="stroke-dashoffset" from={p.len} to="0" dur="3.8s" begin={`${p.delay}s`} calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
                        <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin={`${p.delay}s`} fill="freeze"/>
                      </>
                    )}
                  </path>
                </g>
              ))}
            </svg>
          </div>
          <p className={styles.heroTagline}>Every version. Every note. One room.</p>
        </div>

        {/* EQ */}
        <div className={styles.eqWrap} ref={eqRef} />

        <footer className={styles.footer}>
          <span className={styles.footerNote}>© The Song Room 2026</span>
          <span className={styles.footerNote}>Collaborative music review</span>
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.root} style={{ background: '#0E0A0A' }} />}>
      <LoginContent />
    </Suspense>
  );
}
