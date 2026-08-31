/**
 * Constants, not runtime theming. Supporting dark mode would mean
 * introducing a ThemeProvider and a hook, not editing this file.
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  border: '#E2E5EA',
  text: '#111418',
  textMuted: '#6B7280',
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
  favorite: '#EF4444',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  full: 999,
} as const;

export const typography = {
  title: {fontSize: 24, fontWeight: '700'},
  heading: {fontSize: 18, fontWeight: '600'},
  body: {fontSize: 15, fontWeight: '400'},
  caption: {fontSize: 13, fontWeight: '400'},
} as const;

export const tokens = {colors, spacing, radius, typography};
