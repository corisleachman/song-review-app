'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { themeManager, ColorTheme } from '@/lib/themeManager';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [theme, setTheme] = useState<ColorTheme>({
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#a855f7',
    background: '#0f172a',
    text: '#ffffff',
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const currentTheme = themeManager.getTheme();
    setTheme(currentTheme);
  }, []);

  const handleColorChange = (key: keyof ColorTheme, value: string) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    themeManager.applyTheme(updated);
    setSaved(false);
  };

  const handleSave = () => {
    themeManager.setTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultTheme = {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#a855f7',
      background: '#0f172a',
      text: '#ffffff',
    };
    setTheme(defaultTheme);
    themeManager.setTheme(defaultTheme);
  };

  const generatePairing = () => {
    const newTheme: ColorTheme = {
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
      background: theme.background,
      text: theme.text,
    };
    setTheme(newTheme);
    themeManager.applyTheme(newTheme);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backButton}>
          ← Back
        </Link>
        <h1>⚙️ Settings & Branding</h1>
      </div>

      <div className={styles.content}>
        {/* Brand Explorer */}
        <div className={styles.brandExplorer}>
          <div className={styles.explorerHeader}>
            <h2>🎨 Brand Explorer</h2>
            <p>Customize your color scheme and watch it update live across the entire app.</p>
          </div>

          <div className={styles.colorPicker}>
            {/* Primary & Accent */}
            <div className={styles.pickerRow}>
              <div className={styles.colorControl}>
                <label>Primary Color</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.primary}
                    onChange={e => handleColorChange('primary', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.primary}
                    onChange={e => handleColorChange('primary', e.target.value)}
                    className={styles.textInput}
                  />
                </div>
              </div>

              <div className={styles.arrowIcon}>→</div>

              <div className={styles.colorControl}>
                <label>Accent Color</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.accent}
                    onChange={e => handleColorChange('accent', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.accent}
                    onChange={e => handleColorChange('accent', e.target.value)}
                    className={styles.textInput}
                  />
                </div>
              </div>
            </div>

            {/* Background */}
            <div className={styles.pickerRow}>
              <div className={styles.colorControl}>
                <label>Background</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.background}
                    onChange={e => handleColorChange('background', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.background}
                    onChange={e => handleColorChange('background', e.target.value)}
                    className={styles.textInput}
                  />
                </div>
              </div>

              <button onClick={handleReset} className={styles.resetButton}>
                ↺
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className={styles.previewSection}>
            <h3>Live Preview</h3>
            <div
              className={styles.previewBox}
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
              }}
            >
              <div className={styles.previewContent}>
                <h4 style={{ color: theme.text }}>Your Theme</h4>
                <p style={{ color: theme.text }}>Colors update live as you change them</p>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className={styles.presetsSection}>
            <h3>✨ Color Presets</h3>
            <div className={styles.presetGrid}>
              {[
                { name: 'Ocean', primary: '#0066cc', accent: '#00d4ff', bg: '#0a0e27' },
                { name: 'Sunset', primary: '#ff6b35', accent: '#ff1493', bg: '#1a0f0f' },
                { name: 'Forest', primary: '#2d6a4f', accent: '#40916c', bg: '#0f1f18' },
                { name: 'Purple', primary: '#7209b7', accent: '#f72585', bg: '#10041b' },
                { name: 'Neon', primary: '#00ff41', accent: '#0099ff', bg: '#0a0e27' },
                { name: 'Rose', primary: '#f75590', accent: '#ffa502', bg: '#1a0f1f' },
              ].map(preset => (
                <button
                  key={preset.name}
                  className={styles.presetButton}
                  onClick={() => {
                    const newTheme: ColorTheme = {
                      primary: preset.primary,
                      secondary: preset.primary,
                      accent: preset.accent,
                      background: preset.bg,
                      text: '#ffffff',
                    };
                    setTheme(newTheme);
                    themeManager.applyTheme(newTheme);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})`,
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={handleSave} className={styles.saveButton}>
              {saved ? '✓ Saved!' : '💾 Save Theme'}
            </button>
            <button onClick={handleReset} className={styles.resetButtonLarge}>
              ↻ Reset to Default
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.infoPanel}>
          <h3>💡 Tips</h3>
          <ul className={styles.tipsList}>
            <li>Colors are saved to your browser and will persist</li>
            <li>Both Coris and Al can set their own themes</li>
            <li>Changes apply instantly across all pages</li>
            <li>Use presets for quick theme selection</li>
            <li>Primary + Accent colors create your brand gradient</li>
          </ul>

          <h3 style={{ marginTop: '24px' }}>📱 Current Theme Values</h3>
          <div className={styles.themeValues}>
            <div className={styles.themeValue}>
              <span>Primary:</span>
              <code>{theme.primary}</code>
            </div>
            <div className={styles.themeValue}>
              <span>Accent:</span>
              <code>{theme.accent}</code>
            </div>
            <div className={styles.themeValue}>
              <span>Background:</span>
              <code>{theme.background}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
