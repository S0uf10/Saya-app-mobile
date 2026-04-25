// Design system tokens — source of truth for the mobile app
// Colors extracted from the web app (loyalty-app) — Tailwind purple scale

export const colors = {
  // Primary purple — purple-600 = #9333ea (matches web app bg-purple-600)
  primary: '#9333ea',
  primaryLight: '#a855f7',     // purple-500
  primaryDark: '#7e22ce',      // purple-700
  primaryDeep: '#581c87',      // purple-900
  primaryBg: 'rgba(147, 51, 234, 0.12)',
  primaryBgStrong: 'rgba(147, 51, 234, 0.20)',
  primaryBorder: 'rgba(147, 51, 234, 0.35)',

  // Dark theme (client side)
  dark: {
    bg: '#0f172a',         // slate-900
    bgDeep: '#080c18',     // deeper black
    card: '#1e293b',       // slate-800
    cardBorder: '#334155', // slate-700
    text: '#f1f5f9',       // slate-100
    textSoft: '#e2e8f0',   // slate-200
    muted: '#94a3b8',      // slate-400
    subtle: '#64748b',     // slate-500
    divider: '#1e293b',    // slate-800
    input: '#1e293b',      // slate-800
    inputBorder: '#334155',// slate-700
    placeholder: '#475569',// slate-600
  },

  // Light theme (merchant side)
  light: {
    bg: '#f8fafc',         // slate-50
    card: '#ffffff',
    cardBorder: '#e2e8f0', // slate-200
    text: '#0f172a',       // slate-900
    textSoft: '#1e293b',   // slate-800
    muted: '#64748b',      // slate-500
    subtle: '#94a3b8',     // slate-400
    divider: '#f1f5f9',    // slate-100
    input: '#ffffff',
    inputBorder: '#e2e8f0',// slate-200
    placeholder: '#9ca3af',
  },

  // Semantic colors
  success: '#10b981',
  successLight: '#d1fae5',
  successBorder: '#a7f3d0',
  successText: '#065f46',

  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningBorder: '#fde68a',
  warningText: '#92400e',

  danger: '#ef4444',
  dangerLight: '#fee2e2',
  dangerBorder: '#fecaca',
  dangerText: '#991b1b',

  info: '#3b82f6',
  infoLight: '#dbeafe',
  infoBorder: '#bfdbfe',
  infoText: '#1e40af',

  amber: '#f59e0b',
  amberLight: '#fffbeb',
  amberBg: 'rgba(245, 158, 11, 0.15)',
  amberBorder: 'rgba(245, 158, 11, 0.40)',

  // Glass morphism (for dark backgrounds) — matches web app bg-white/10, border-white/20
  glass: {
    bg: 'rgba(255, 255, 255, 0.10)',
    bgStrong: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.20)',
    borderStrong: 'rgba(255, 255, 255, 0.30)',
  },
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
}

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
}

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
}

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  purple: {
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 8,
  },
}

// Gradient configs for expo-linear-gradient
export const gradients = {
  // Client background — from-slate-900 via-purple-950 to-slate-900
  clientBg: ['#0f172a', '#3b0764', '#0f172a'] as const,
  // Primary button gradient — purple-500 → purple-600 → purple-700
  primaryBtn: ['#a855f7', '#9333ea', '#7e22ce'] as const,
  // Header subtle gradient
  headerDark: ['#0f172a', 'rgba(15,23,42,0)'] as const,
}

export const levelColorWithOpacity = (color: string, opacity: number): string => {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}
