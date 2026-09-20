'use client';

import Script from 'next/script';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import styles from './TurnstileWidget.module.css';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: 'dark';
    size: 'flexible';
    callback: (token: string) => void;
    'error-callback': () => void;
    'expired-callback': () => void;
    'timeout-callback': () => void;
  }) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  action: 'email_login' | 'email_signup' | 'email_resend';
  onError: () => void;
  onTokenChange: (token: string) => void;
  siteKey: string;
};

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ action, onError, onTokenChange, siteKey }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onErrorRef = useRef(onError);
    const onTokenChangeRef = useRef(onTokenChange);

    useEffect(() => {
      onErrorRef.current = onError;
      onTokenChangeRef.current = onTokenChange;
    }, [onError, onTokenChange]);

    const reset = useCallback(() => {
      onTokenChangeRef.current('');
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }, []);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const renderWidget = useCallback(() => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'dark',
          size: 'flexible',
          callback: token => onTokenChangeRef.current(token),
          'error-callback': () => {
            onTokenChangeRef.current('');
            onErrorRef.current();
          },
          'expired-callback': reset,
          'timeout-callback': reset,
        });
      } catch {
        onTokenChangeRef.current('');
        onErrorRef.current();
      }
    }, [action, reset, siteKey]);

    useEffect(() => {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
        widgetIdRef.current = null;
      };
    }, [renderWidget]);

    return (
      <div className={styles.root}>
        <Script
          id="cloudflare-turnstile"
          src={TURNSTILE_SCRIPT_URL}
          strategy="afterInteractive"
          async
          onReady={renderWidget}
          onError={() => onErrorRef.current()}
        />
        <div ref={containerRef} role="group" aria-label="Security check" />
      </div>
    );
  },
);

export default TurnstileWidget;
