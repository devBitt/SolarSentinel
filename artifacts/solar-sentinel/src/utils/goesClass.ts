export const getGoesColor = (cls: string): string => {
  if (!cls) return '#6B8FA8';
  const letter = cls[0];
  return ({ X: '#9333EA', M: '#EF4444', C: '#F59E0B', B: '#6B8FA8' } as Record<string,string>)[letter] || '#6B8FA8';
};
export const getAlertLevel = (prob: number) => {
  if (prob >= 0.9) return { level: 'EXTREME', color: '#9333EA', bgClass: 'bg-purple-900/40', borderClass: 'border-purple-500' };
  if (prob >= 0.75) return { level: 'WARNING', color: '#EF4444', bgClass: 'bg-red-900/40', borderClass: 'border-red-500' };
  if (prob >= 0.5) return { level: 'WATCH', color: '#F59E0B', bgClass: 'bg-amber-900/40', borderClass: 'border-amber-500' };
  return { level: 'NOMINAL', color: '#22C55E', bgClass: 'bg-green-900/20', borderClass: 'border-green-700' };
};
