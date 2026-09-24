import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import useMediaQuery from './useMediaQuery';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** 键名跟随 api.ts 的约定：裸 kebab-case，无前缀 */
const STORAGE_KEY = 'chat-theme';

const CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f5f6f8',
  dark: '#17181a',
};

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** 只有显式选过浅色/深色才写存储；「跟随系统」靠删除键来表示，所以键存在即覆盖系统 */
function readStoredMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Safari 隐私模式下 localStorage 会抛异常，退化成跟随系统
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;

    // 移动端浏览器地址栏跟随主题，避免深色页面顶着一条白条
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', THEME_COLOR[resolved]);
  }, [resolved]);

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next = CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length];
      try {
        if (next === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 存不下就只在本次会话内生效
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, resolved, cycle }), [mode, resolved, cycle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
