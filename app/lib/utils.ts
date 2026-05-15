import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: string, locale: string = 'en-US') {
  return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtDateShort(d: string, locale: string = 'en-US') {
  return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

export function fmtTime(d: string, locale: string = 'en-US') {
  return new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr: string, nowStr = 'now', hAgo = 'h ago', dAgo = 'd ago'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return nowStr;
  if (hours < 24) return `${hours}${hAgo}`;
  return `${Math.floor(hours / 24)}${dAgo}`;
}

/** Simple {placeholder} template interpolation. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
