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

export function timeAgo(dateStr: string, lang: 'en' | 'pt' = 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return lang === 'en' ? 'now' : 'agora';
  if (hours < 24) return `${hours}${lang === 'en' ? 'h ago' : 'h atrás'}`;
  return `${Math.floor(hours / 24)}${lang === 'en' ? 'd ago' : 'd atrás'}`;
}
