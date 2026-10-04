/** Tailwind text colour for a quiz percentage (null = not attempted). */
export function scoreColor(percent: number | null): string {
  if (percent == null) return 'text-slate-400'
  if (percent >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (percent >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}
