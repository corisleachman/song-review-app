'use client';

import { useState } from 'react';
import { useSettingsData, useSettingsActions } from '@/lib/settingsContext';
import type { Theme } from '@/lib/settingsContext';
import styles from '../settings.module.css';

const PRESETS: Record<string, Theme> = {
  Pulse:  { primary_color: '#ff1493', accent_color: '#a855f7', background_color: '#0d0914' },
  Ocean:  { primary_color: '#0ea5e9', accent_color: '#06b6d4', background_color: '#0f172a' },
  Sunset: { primary_color: '#f97316', accent_color: '#ec4899', background_color: '#1c1917' },
  Forest: { primary_color: '#10b981', accent_color: '#14b8a6', background_color: '#0f766e' },
  Purple: { primary_color: '#a855f7', accent_color: '#7c3aed', background_color: '#2e1065' },
  Rose:   { primary_color: '#f43f5e', accent_color: '#e11d48', background_color: '#500724' },
};

const DEFAULT_THEME: Theme = PRESETS.Pulse;

export default function AppearancePage() {
  const { theme, identityLabel } = useSettingsData();
  const { setTheme } = useSettingsActions();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleChange = (key: keyof Theme, value: string) => {
    setTheme({ ...theme, [key]: value });
    setSaved(false);
  };

  const handlePreset = (preset: Theme) => {
    setTheme(preset);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/profile/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || 'Failed to save theme.');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save theme.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Appearance</h2>
        <p>Your personal colour theme. Changes apply only to your sign-in — other members keep their own choices.</p>
      </div>

      {/* ── Colour controls ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Colours</h3>
          <p>Adjust the primary, accent, and background colours.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.colourGrid}>
            {([
              { key: 'primary_color' as keyof Theme,    label: 'Primary'    },
              { key: 'accent_color' as keyof Theme,     label: 'Accent'     },
              { key: 'background_color' as keyof Theme, label: 'Background' },
            ]).map(({ key, label }) => (
              <div key={key} className={styles.colourControl}>
                <label className={styles.colourLabel}>{label}</label>
                <div className={styles.colourInputRow}>
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className={styles.colourSwatch}
                  />
                  <input
                    type="text"
                    value={theme[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className={styles.textInput}
                    placeholder="#ff1493"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Presets ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Presets</h3>
          <p>Start from a curated colour scheme.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.presetGrid}>
            {Object.entries(PRESETS).map(([name, preset]) => (
              <button
                key={name}
                type="button"
                className={styles.presetButton}
                style={{ background: `linear-gradient(135deg, ${preset.primary_color}, ${preset.accent_color})` }}
                onClick={() => handlePreset(preset)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Save ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Save changes</h3>
          <p>Signed in as <strong>{identityLabel || 'you'}</strong>. Theme is personal to your account.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.appearanceActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save theme'}
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => handlePreset(DEFAULT_THEME)}
            >
              Reset to default
            </button>
          </div>
          {saveError && <p className={styles.blockError}>{saveError}</p>}
        </div>
      </div>
    </div>
  );
}
