export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0A0A0F',
    secondary: '#111118',
    card: '#16161F',
    elevated: '#1C1C28',
    modal: '#1A1A24',
    overlay: 'rgba(0,0,0,0.7)',
  },

  // Brand
  accent: {
    primary: '#6C63FF',
    secondary: '#A78BFA',
    light: 'rgba(108,99,255,0.15)',
    border: 'rgba(108,99,255,0.3)',
  },

  // Status
  status: {
    success: '#10B981',
    successBg: 'rgba(16,185,129,0.15)',
    warning: '#F59E0B',
    warningBg: 'rgba(245,158,11,0.15)',
    error: '#EF4444',
    errorBg: 'rgba(239,68,68,0.15)',
    info: '#3B82F6',
    infoBg: 'rgba(59,130,246,0.15)',
    pending: '#8B5CF6',
    pendingBg: 'rgba(139,92,246,0.15)',
  },

  // Text
  text: {
    primary: '#F0F0FF',
    secondary: '#9090B0',
    muted: '#60607A',
    inverse: '#0A0A0F',
    accent: '#A78BFA',
  },

  // Borders
  border: {
    default: '#2A2A3F',
    subtle: '#1E1E2E',
    focus: '#6C63FF',
  },

  // Role-based
  role: {
    admin: '#F59E0B',
    adminBg: 'rgba(245,158,11,0.15)',
    manager: '#3B82F6',
    managerBg: 'rgba(59,130,246,0.15)',
    employee: '#10B981',
    employeeBg: 'rgba(16,185,129,0.15)',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  fontFamily: {
    regular: undefined, // system default (San Francisco / Roboto)
    medium: undefined,
    bold: undefined,
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const Spacing = {
  0: 0,
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
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const Theme = { Colors, Typography, Spacing, Radius, Shadows };
export default Theme;
