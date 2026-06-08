'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

const POST_LOGIN_INVITE_PATH_KEY = 'song_review_post_login_invite_path';

type AuthMode = 'idle' | 'signin' | 'signup' | 'forgot';

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
const SVG_PATHS = {
  CREATE: [
    { d: "M37.2 56.4C37.2 54.0 37.6 53.2 38.4 53.2C39.2 53.2 39.6 54.0 39.6 56.4V92.0H75.6V59.0C75.6 35.4 61.8 22.0 37.8 22.0C14.2 22.0 1.2 34.8 1.2 59.0V128.8C1.2 153.0 14.2 166.0 37.8 166.0C61.8 166.0 75.6 152.6 75.6 128.8V96.0H39.6V131.6C39.6 133.8 39.2 134.8 38.4 134.8C37.6 134.8 37.2 133.8 37.2 131.6Z", len: 810, delay: 0.179 },
    { d: "M78.0 24.0V164.0H114.0V114.0H114.4C116.4 114.0 116.4 114.4 116.4 117.2V135.2C116.4 146.0 116.6 155.2 118.4 164.0H154.4C152.6 155.4 152.4 146.2 152.4 135.6V134.0C152.4 112.6 140.4 99.6 132.0 99.6V97.2C140.6 97.2 152.4 85.8 152.4 62.4V61.4C152.4 36.0 138.6 24.0 114.8 24.0ZM114.0 55.2H114.4C116.4 55.2 116.4 55.6 116.4 58.2V79.6C116.4 82.4 116.4 82.8 114.4 82.8H114.0Z", len: 788, delay: 0.007 },
    { d: "M206.8 55.2V24.0H154.8V164.0H206.8V132.8H190.8V105.8H206.8V74.6H190.8V55.2Z", len: 610, delay: 0.077 },
    { d: "M218.2 24.0 208.6 164.0H244.6V135.2H247.0V164.0H283.0L274.2 24.0ZM244.6 104.0V86.8H247.0V104.0Z", len: 632, delay: 0.062 },
    { d: "M356.4 24.0H284.4V55.2H302.4V164.0H338.4V55.2H356.4Z", len: 580, delay: 0.206 },
    { d: "M358.8 55.2V24.0H406.8V164.0H370.8V107.8H368.4V164.0H332.4V55.2Z", len: 610, delay: 0.189 },
  ],
  TOGETHER: [
    { d: "M0 55.2V24.0H87.0V55.2H56.0V164.0H31.0V55.2Z", len: 380, delay: 0.250 },
    { d: "M146.5 164.0C140.3 164.0 134.6 162.98 129.2 160.93C123.9 158.88 119.2 155.85 115.3 151.84C111.4 147.83 108.3 142.94 106.0 137.16C103.8 131.38 102.6 124.85 102.6 117.56V82.44C102.6 75.15 103.8 68.62 106.0 62.84C108.3 57.06 111.4 52.17 115.3 48.16C119.2 44.15 123.9 41.12 129.2 39.07C134.6 37.02 140.3 36.0 146.5 36.0C152.7 36.0 158.4 37.02 163.8 39.07C169.1 41.12 173.8 44.15 177.7 48.16C181.6 52.17 184.7 57.06 186.9 62.84C189.1 68.62 190.3 75.15 190.3 82.44V117.56C190.3 124.85 189.1 131.38 186.9 137.16C184.7 142.94 181.6 147.83 177.7 151.84C173.8 155.85 169.1 158.88 163.8 160.93C158.4 162.98 152.7 164.0 146.5 164.0ZM146.5 141.0C153.6 141.0 159.3 138.9 163.6 134.8C167.9 130.6 170.0 124.9 170.0 117.6V82.4C170.0 75.1 167.9 69.4 163.6 65.2C159.3 61.1 153.6 59.0 146.5 59.0C139.4 59.0 133.7 61.1 129.4 65.2C125.1 69.4 123.0 75.1 123.0 82.4V117.6C123.0 124.9 125.1 130.6 129.4 134.8C133.7 138.9 139.4 141.0 146.5 141.0Z", len: 730, delay: 0.024 },
    { d: "M248.5 164.0C242.3 164.0 236.6 162.98 231.2 160.93C225.9 158.88 221.2 155.85 217.3 151.84C213.4 147.83 210.3 142.94 208.0 137.16C205.8 131.38 204.6 124.85 204.6 117.56V94.0H225.0V82.4C225.0 75.1 227.1 69.4 231.4 65.2C235.7 61.1 241.4 59.0 248.5 59.0C255.6 59.0 261.3 61.1 265.6 65.2C269.9 69.4 272.0 75.1 272.0 82.4V94.0H292.3V82.44C292.3 75.15 291.1 68.62 288.9 62.84C286.7 57.06 283.6 52.17 279.7 48.16C275.8 44.15 271.1 41.12 265.8 39.07C260.4 37.02 254.7 36.0 248.5 36.0C242.3 36.0 236.6 37.02 231.2 39.07C225.9 41.12 221.2 44.15 217.3 48.16C213.4 52.17 210.3 57.06 208.0 62.84C205.8 68.62 204.6 75.15 204.6 82.44V117.56C204.6 124.85 205.8 131.38 208.0 137.16C210.3 142.94 213.4 147.83 217.3 151.84C221.2 155.85 225.9 158.88 231.2 160.93C236.6 162.98 242.3 164.0 248.5 164.0ZM253.5 116.0V94.0H272.0V117.56C272.0 124.9 269.9 130.6 265.6 134.8C261.3 138.9 255.6 141.0 248.5 141.0C241.4 141.0 235.7 138.9 231.4 134.8C227.1 130.6 225.0 124.9 225.0 117.6V116.0Z", len: 860, delay: 0.118 },
    { d: "M299.5 162.0V38.0H378.5V60.0H324.5V88.0H372.5V110.0H324.5V140.0H379.5V162.0Z", len: 480, delay: 0.008 },
    { d: "M381.5 60.0V38.0H468.5V60.0H437.5V162.0H412.5V60.0Z", len: 380, delay: 0.061 },
    { d: "M475.5 162.0V38.0H500.5V88.0H540.5V38.0H565.5V162.0H540.5V110.0H500.5V162.0Z", len: 580, delay: 0.141 },
    { d: "M572.5 162.0V38.0H651.5V60.0H597.5V88.0H645.5V110.0H597.5V140.0H652.5V162.0Z", len: 480, delay: 0.007 },
    { d: "M660.5 162.0V38.0H706.5C713.6 38.0 719.9 39.0 725.4 41.0C730.9 43.0 735.5 45.9 739.2 49.8C742.9 53.7 745.7 58.5 747.6 64.2C749.5 69.9 750.5 76.5 750.5 84.0C750.5 91.5 749.2 97.8 746.7 102.9C744.2 108.0 740.6 111.9 735.9 114.6L755.5 162.0H730.5L712.5 118.0H685.5V162.0ZM685.5 97.0H705.5C711.5 97.0 716.1 95.4 719.3 92.2C722.5 89.0 724.1 84.5 724.1 78.7C724.1 72.9 722.5 68.5 719.3 65.4C716.1 62.3 711.5 60.8 705.5 60.8H685.5Z", len: 788, delay: 0.056 },
  ],
};

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
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<AuthMode>('idle');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [emailOpen, setEmailOpen] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // BG slideshow
  const [bgIndex, setBgIndex] = useState(0);
  const eqRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const googleStatus = searchParams.get('google');
  const googleMessage = searchParams.get('message');

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
    const id = setInterval(() => setBgIndex(i => (i + 1) % BG_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  // EQ visualiser
  useEffect(() => {
    const container = eqRef.current;
    if (!container) return;
    const BAR_COUNT = 120;
    const bars: HTMLDivElement[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const b = document.createElement('div');
      b.className = styles.eqBar;
      b.style.height = '3px';
      container.appendChild(b);
      bars.push(b);
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
        bar.style.height = s.h + 'px';
        const alpha = isBass ? 0.15+(s.h/maxH)*0.55 : 0.10+(s.h/maxH)*0.38;
        bar.style.background = `rgba(244,240,232,${alpha.toFixed(2)})`;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(animRef.current);
      bars.forEach(b => b.remove());
    };
  }, []);

  // Auth handlers — unchanged from original
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

  const handleEmailSignIn = async () => {
    setError(''); setNotice('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setEmailLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) { setError(signInError.message); setEmailLoading(false); return; }
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    const resolved = await resolvePostLoginRedirect(redirectTo);
    window.location.assign(resolved);
  };

  const handleEmailSignUp = async () => {
    setError(''); setNotice('');
    if (!email.trim() || !password || !displayName.trim()) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setEmailLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: displayName.trim(), display_name: displayName.trim() } },
    });
    if (signUpError) { setError(signUpError.message); setEmailLoading(false); return; }
    setNotice('Check your email for a confirmation link to activate your account.');
    setEmailLoading(false); setMode('idle'); setEmail(''); setPassword(''); setConfirmPassword(''); setDisplayName('');
  };

  const handleForgotPassword = async () => {
    setError(''); setNotice('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setEmailLoading(true);
    const redirectUrl = new URL('/auth/reset-password', window.location.origin);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl.toString() });
    setEmailLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setNotice("If that email is registered, you'll receive a reset link shortly.");
    setMode('idle'); setEmail('');
  };

  const isSignup = activeTab === 'signup';

  return (
    <div className={styles.root}>
      {/* Background slides */}
      <div className={styles.bg}>
        {BG_IMAGES.map((src, i) => (
          <div
            key={i}
            className={`${styles.bgSlide} ${i === bgIndex ? styles.bgSlideActive : ''}`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
        <div className={styles.bgVeil} />
      </div>

      {/* Page */}
      <div className={styles.page}>
        <nav className={styles.nav}>
          <div className={styles.navBrand}>The Song Room</div>
        </nav>

        {/* Left — auth */}
        <div className={styles.left}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${!isSignup ? styles.tabBtnActive : ''}`}
              onClick={() => { setActiveTab('login'); setMode('idle'); setError(''); setNotice(''); setEmailOpen(false); }}
            >Log in</button>
            <button
              className={`${styles.tabBtn} ${isSignup ? styles.tabBtnActive : ''}`}
              onClick={() => { setActiveTab('signup'); setMode('signup'); setError(''); setNotice(''); setEmailOpen(false); }}
            >Sign up</button>
          </div>

          {/* Auth panel */}
          <div className={styles.authPanel}>

            {/* Google */}
            <button
              className={styles.btnGoogle}
              onClick={handleGoogleSignIn}
              disabled={googleLoading || emailLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Connecting...' : isSignup ? 'Sign up with Google' : 'Log in with Google'}
            </button>

            {/* Email toggle */}
            <button className={styles.btnEmailToggle} onClick={() => setEmailOpen(o => !o)}>
              <span>{isSignup ? 'Sign up with email' : 'Continue with email'}</span>
              <svg
                className={`${styles.chevron} ${emailOpen ? styles.chevronOpen : ''}`}
                width="10" height="6" viewBox="0 0 10 6" fill="none"
              >
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
              </svg>
            </button>

            {/* Email fields */}
            <div className={`${styles.emailFields} ${emailOpen ? styles.emailFieldsOpen : ''}`}>
              {isSignup && (
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  autoComplete="name"
                  disabled={emailLoading}
                />
              )}
              <input
                className={styles.fieldInput}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={emailLoading}
                onKeyDown={e => { if (e.key === 'Enter' && !isSignup) void handleEmailSignIn(); }}
              />
              {mode !== 'forgot' && (
                <input
                  className={styles.fieldInput}
                  type="password"
                  placeholder={isSignup ? 'Password (min 8 characters)' : 'Password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  disabled={emailLoading}
                  onKeyDown={e => { if (e.key === 'Enter' && !isSignup) void handleEmailSignIn(); }}
                />
              )}
              {isSignup && (
                <input
                  className={styles.fieldInput}
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={emailLoading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleEmailSignUp(); }}
                />
              )}
              <button
                className={styles.btnSubmit}
                onClick={isSignup ? handleEmailSignUp : handleEmailSignIn}
                disabled={emailLoading}
              >
                {emailLoading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Log in')}
              </button>
              {!isSignup && (
                <div className={styles.formFooter}>
                  <button
                    className={styles.formLink}
                    onClick={() => { setMode('forgot'); setEmailOpen(true); }}
                  >Forgot password?</button>
                </div>
              )}
              {isSignup && (
                <div className={styles.formFooter}>
                  <a className={styles.formLink} href="#">Terms &amp; Privacy</a>
                </div>
              )}
            </div>

            {/* Forgot password — show when mode is forgot */}
            {mode === 'forgot' && (
              <div className={styles.forgotPanel}>
                <input
                  className={styles.fieldInput}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={emailLoading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleForgotPassword(); }}
                />
                <button
                  className={styles.btnSubmit}
                  onClick={handleForgotPassword}
                  disabled={emailLoading}
                >
                  {emailLoading ? 'Sending...' : 'Send reset link'}
                </button>
                <div className={styles.formFooter}>
                  <button className={styles.formLink} onClick={() => setMode('idle')}>Back to sign in</button>
                </div>
              </div>
            )}

            {/* Error / notice */}
            {error && <div className={styles.fieldError}>{error}</div>}
            {notice && <div className={styles.fieldNotice}>{notice}</div>}
            {googleStatus === 'error' && !error && (
              <div className={styles.fieldError}>{googleMessage || 'Sign-in could not be completed. Please try again.'}</div>
            )}
          </div>
        </div>

        {/* Right — SVG headline */}
        <div className={styles.right}>
          <div className={styles.headlineSvgWrap}>
            <svg
              viewBox="0 0 563 344"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: 'auto', overflow: 'visible' }}
            >
              {/* CREATE */}
              {SVG_PATHS.CREATE.map((p, i) => (
                <g key={`c${i}`} transform="translate(0,0)">
                  <path
                    d={p.d}
                    fill="none"
                    stroke="#F4F0E8"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={p.len}
                    strokeDashoffset={p.len}
                    strokeOpacity="0"
                  >
                    <animate attributeName="stroke-dashoffset" from={p.len} to="0" dur="3.8s" begin={`${p.delay}s`} calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
                    <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin={`${p.delay}s`} fill="freeze"/>
                  </path>
                </g>
              ))}
              {/* TOGETHER */}
              {SVG_PATHS.TOGETHER.map((p, i) => (
                <g key={`t${i}`} transform="translate(0,144)">
                  <path
                    d={p.d}
                    fill="none"
                    stroke="#F4F0E8"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={p.len}
                    strokeDashoffset={p.len}
                    strokeOpacity="0"
                  >
                    <animate attributeName="stroke-dashoffset" from={p.len} to="0" dur="3.8s" begin={`${p.delay}s`} calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
                    <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin={`${p.delay}s`} fill="freeze"/>
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
