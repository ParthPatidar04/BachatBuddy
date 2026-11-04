import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

// Categorical palette in fixed slot order (never cycled). Each mode is its own selected
// step set, not an automatic flip. Anything past slot 7 folds into "Other" (OTHER_COLOR).
const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};
export const OTHER_COLOR = '#898781';

export const useChartTheme = () => {
  const { theme } = useTheme();
  return useMemo(() => {
    const series = SERIES[theme];
    return {
      series,
      income: series[0], // blue
      expense: series[1], // orange
      grid: theme === 'dark' ? '#2c2c2a' : '#e1e0d9',
      axis: theme === 'dark' ? '#383835' : '#c3c2b7',
      tick: '#898781',
      gap: theme === 'dark' ? '#18152a' : '#ffffff', // card surface, used for the 2px gaps between fills
    };
  }, [theme]);
};

// Top N categories keep their own slot; the rest are summed into one "Other" slice
export function foldCategories(rows, keep = 6) {
  if (rows.length <= keep + 1) return rows.map((r, i) => ({ ...r, slot: i }));
  const head = rows.slice(0, keep).map((r, i) => ({ ...r, slot: i }));
  const rest = rows.slice(keep);
  const total = rest.reduce((s, r) => s + r.total, 0);
  const percent = rest.reduce((s, r) => s + r.percent, 0);
  return [...head, { category: `Other (${rest.length})`, total: Math.round(total * 100) / 100, percent: Math.round(percent * 100) / 100, slot: -1 }];
}
export const slotColor = (theme, slot) => (slot < 0 ? OTHER_COLOR : theme.series[slot]);