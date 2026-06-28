export const formatSI = (val: number): string => {
  if (!val || val === 0) return '—';
  if (val >= 1e-4) return `${(val*1e4).toFixed(1)}×10⁻⁴`;
  if (val >= 1e-5) return `${(val*1e5).toFixed(1)}×10⁻⁵`;
  if (val >= 1e-6) return `${(val*1e6).toFixed(1)}×10⁻⁶`;
  return `${(val*1e7).toFixed(1)}×10⁻⁷`;
};
