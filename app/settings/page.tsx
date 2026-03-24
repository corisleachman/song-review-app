'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getIdentity } from '@/lib/auth';
import styles from './settings.module.css';

interface Theme {
  primary_color: string;
  accent_color: string;
  background_color: string;
}

const PRESETS: { [key: string]: Theme } = {
  Pulse: {
    primary_color: '#ff1493',
    accent_color: '#a855f7',
    background_color: '#0d0914',
  },
  Ocean: {
    primary_color: '#0ea5e9',
    accent_color: '#06b6d4',
    background_color: '#0f172a',
  },
  Sunset: {
    primary_color: '#f97316',
    accent_color: '#ec4899',
    background_color: '#1c1917',
  },
  Forest: {
    primary_color: '#10b981',
    accent_color: '#14b8a6',
    background_color: '#0f766e',
  },
  Purple: {
    primary_color: '#a855f7',
    accent_color: '#7c3aed',
    background_color: '#2e1065',
  },
  Rose: {
    primary_color: '#f43f5e',
    accent_color: '#e11d48',
    background_color: '#500724',
  },
};

export default function SettingsPage() {
  const identity = getIdentity();
  const [theme, setTheme] = useState<Theme>({
    primary_color: '#ff1493',
    accent_color: '#a855f7',
    background_color: '#0d0914',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        setTheme(data);
        applyTheme(data);
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    if (identity) {
      loadSettings();
    }
  }, [identity]);

  // Apply theme to CSS variables and update page styling
  const applyTheme = (newTheme: Theme) => {
    document.documentElement.style.setProperty('--color-primary', newTheme.primary_color);
    document.documentElement.style.setProperty('--color-accent', newTheme.accent_color);
    document.documentElement.style.setProperty('--color-bg-darkest', newTheme.background_color);
  };

  const handleColorChange = (key: keyof Theme, value: string) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    applyTheme(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      console.error('Error saving settings:', err);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = (presetTheme: Theme) => {
    setTheme(presetTheme);
    applyTheme(presetTheme);
    setSaved(false);
  };

  const handleReset = () => {
    handlePreset(PRESETS.Pulse);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backButton}>
          ← Back
        </Link>
        <h1 className={styles.title}>⚙️ Settings</h1>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.brandExplorer}>
          <div className={styles.explorerHeader}>
            <h2>Color Theme</h2>
            <p>Customize your colors. Changes apply live across the app.</p>
          </div>

          {/* Color Picker Section */}
          <div className={styles.colorPicker}>
            <div className={styles.pickerRow}>
              {/* Primary Color */}
              <div className={styles.colorControl}>
                <label className={styles.label}>Primary Color</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.primary_color}
                    onChange={e => handleColorChange('primary_color', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.primary_color}
                    onChange={e => handleColorChange('primary_color', e.target.value)}
                    className={styles.textInput}
                    placeholder="#ff1493"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className={styles.colorControl}>
                <label className={styles.label}>Accent Color</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.accent_color}
                    onChange={e => handleColorChange('accent_color', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.accent_color}
                    onChange={e => handleColorChange('accent_color', e.target.value)}
                    className={styles.textInput}
                    placeholder="#a855f7"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className={styles.colorControl}>
                <label className={styles.label}>Background</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.background_color}
                    onChange={e => handleColorChange('background_color', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.background_color}
                    onChange={e => handleColorChange('background_color', e.target.value)}
                    className={styles.textInput}
                    placeholder="#0d0914"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className={styles.presetsSection}>
            <h3>Quick Presets</h3>
            <div className={styles.presetGrid}>
              {Object.entries(PRESETS).map(([name, preset]) => (
                <button
                  key={name}
                  onClick={() => handlePreset(preset)}
                  className={styles.presetButton}
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary_color}, ${preset.accent_color})`,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              onClick={handleSave}
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Theme'}
            </button>
            <button
              onClick={handleReset}
              className={styles.resetButtonLarge}
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.infoPanel}>
          <h3>ℹ️ How It Works</h3>
          <ul className={styles.tipsList}>
            <li>Colors update <strong>live</strong> as you change them</li>
            <li>See changes immediately on the page</li>
            <li>Click presets to try different themes</li>
            <li>Use hex colors or the color picker</li>
            <li>Click Save to store your theme</li>
            <li>Your colors persist when you log out</li>
            <li>Coris and Al each have separate color preferences</li>
          </ul>

          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)' }}>
              Logged in as: <strong>{identity}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
