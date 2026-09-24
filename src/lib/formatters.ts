// src/lib/formatters.ts
// Financial and Metric Formatters per UI Kit 02-typography-system.md §4.2
// Every figure in the UI goes through these: Western digits in both locales,
// Intl formatting only, a real minus sign (−) for displayed deltas.

const MINUS = '−';

const iqdFormat = new Intl.NumberFormat('ar-IQ', { numberingSystem: 'latn', maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const gramsFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const pctFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const rateFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});
const compactFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});
const amountWordsFormat = new Intl.NumberFormat('ar-IQ-u-nu-latn', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumFractionDigits: 2,
});
const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const withRealMinus = (s: string) => s.replace('-', MINUS);

export const fmtIQD = (v: number): string => withRealMinus(iqdFormat.format(v));

export const fmtNumber = (v: number): string => withRealMinus(numberFormat.format(v));

export const fmtUSD = (v: number): string => withRealMinus(usdFormat.format(v));

export const fmtGrams = (v: number): string => withRealMinus(gramsFormat.format(v));

// Signed change, e.g. +0.84% / −1.27%
export const fmtPct = (v: number): string => withRealMinus(pctFormat.format(v));

// Unsigned rate, e.g. commission 1.5%
export const fmtRate = (v: number): string => rateFormat.format(v);

// Only where the exact value is one tap away (02-typography §4.2)
export const fmtCompact = (v: number): string => withRealMinus(compactFormat.format(v));

// Round amounts in Arabic words with Western digits ("500 ألف", "5 ملايين"), same rule as above:
// used on quick-pick chips that fill the exact value
export const fmtAmountWords = (v: number): string => withRealMinus(amountWordsFormat.format(v));

// Iraqi month names (تشرين الأول), Western digits
const dateFormat = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
// 19/10/2026 (the locale adds RLM marks so it reads day first in RTL): for tight spaces only
const dateNumericFormat = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { hour: '2-digit', minute: '2-digit' });

const toDate = (v: Date | string | number) => (v instanceof Date ? v : new Date(v));

export const fmtDate = (v: Date | string | number): string => dateFormat.format(toDate(v));
export const fmtDateNumeric = (v: Date | string | number): string => dateNumericFormat.format(toDate(v));
export const fmtDateTime = (v: Date | string | number): string => dateTimeFormat.format(toDate(v));
export const fmtTime = (v: Date | string | number): string => timeFormat.format(toDate(v));

const arRelative = new Intl.RelativeTimeFormat('ar-u-nu-latn', { numeric: 'auto' });

// "خلال 30 ثانية", "خلال دقيقة واحدة": a wait in seconds, with Arabic number agreement
export const fmtRelativeFuture = (seconds: number): string =>
  seconds < 60 ? arRelative.format(seconds, 'second') : arRelative.format(Math.ceil(seconds / 60), 'minute');

export const fmtRelativeTime = (time: Date | string | number, locale: 'ar' | 'en' = 'ar'): string => {
  const date = toDate(time);
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (locale === 'ar') {
    // Intl handles Arabic number agreement (ثانيتين، 5 ثوانٍ، 3 دقائق), Western digits
    if (diffInSeconds < 5) return 'الآن';
    if (diffInSeconds < 60) return arRelative.format(-diffInSeconds, 'second');
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return arRelative.format(-minutes, 'minute');
    return arRelative.format(-Math.floor(minutes / 60), 'hour');
  }

  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};
