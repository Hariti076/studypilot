import { useTheme } from './useTheme';

/** Theme-aware colours for Recharts (which can't read Tailwind's dark: classes). */
export function useChartColors() {
  const { dark } = useTheme();
  return {
    axis: dark ? '#94a3b8' : '#64748b',
    grid: dark ? '#1e293b' : '#e2e8f0',
    muted: dark ? '#475569' : '#cbd5e1',
    cursor: dark ? 'rgba(255,255,255,.05)' : 'rgba(15,23,42,.04)',
    tooltip: {
      borderRadius: 12,
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      background: dark ? '#0f172a' : '#ffffff',
      color: dark ? '#e2e8f0' : '#0f172a',
      boxShadow: '0 8px 24px rgba(15,23,42,.12)',
      fontSize: 13,
    },
  };
}
