// Color theme system for Song Review App
// Handles color customization, persistence, and live updates

export interface ColorTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_THEME: ColorTheme = {
  primary: '#3b82f6',
  secondary: '#1e40af',
  accent: '#a855f7',
  background: '#0f172a',
  text: '#ffffff',
};

export class ThemeManager {
  private storageKey = 'songReview_colorTheme';
  private listeners: ((theme: ColorTheme) => void)[] = [];

  getTheme(): ColorTheme {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : DEFAULT_THEME;
  }

  setTheme(theme: ColorTheme): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(this.storageKey, JSON.stringify(theme));
    this.applyTheme(theme);
    this.notifyListeners(theme);
  }

  applyTheme(theme: ColorTheme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-bg-dark', theme.background);
    root.style.setProperty('--color-text-primary', theme.text);
  }

  subscribe(listener: (theme: ColorTheme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(theme: ColorTheme): void {
    this.listeners.forEach(listener => listener(theme));
  }

  resetToDefault(): void {
    this.setTheme(DEFAULT_THEME);
  }

  // Generate complementary color pairing
  static generatePairing(fromColor: string, toColor: string) {
    return {
      primary: fromColor,
      secondary: this.adjustBrightness(fromColor, -0.3),
      accent: toColor,
      background: '#0d0914',
      text: '#ffffff',
    };
  }

  private static adjustBrightness(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}

export const themeManager = new ThemeManager();
