// @vitest-environment node
// UI Kit 02-typography §4.2: Western digits in both locales, Intl only, real minus sign
import { describe, it, expect } from 'vitest';
import { fmtIQD, fmtGrams, fmtPct, fmtRate, fmtNumber, fmtAmountWords, fmtDateNumeric } from './formatters';
import { isolateFigures } from './bidi';
import { noOrphan } from './noOrphan';

const EASTERN_DIGITS = /[٠-٩]/;

describe('formatters', () => {
  it('IQD uses Western digits and grouping', () => {
    expect(fmtIQD(1_284_500)).toBe('1,284,500');
    expect(fmtIQD(1_284_500)).not.toMatch(EASTERN_DIGITS);
  });

  it('grams keep 2 to 3 decimals', () => {
    expect(fmtGrams(12.5)).toBe('12.50');
    expect(fmtGrams(84.2567)).toBe('84.257');
  });

  it('signed percentages use a real minus (−) and an explicit plus', () => {
    expect(fmtPct(0.0084)).toBe('+0.84%');
    expect(fmtPct(-0.0127)).toBe('−1.27%');
  });

  it('commission rates are unsigned', () => {
    expect(fmtRate(0.015)).toBe('1.5%');
    expect(fmtRate(0.01)).toBe('1.0%');
  });

  it('plain numbers group thousands', () => {
    expect(fmtNumber(1310)).toBe('1,310');
  });
});

describe('isolateFigures (bidi)', () => {
  const LRI = '⁦';
  const PDI = '⁩';

  it('wraps percentages so "%" stays after the digits inside Arabic text', () => {
    expect(isolateFigures('بنسبة 0.84%.')).toBe(`بنسبة ${LRI}0.84%${PDI}.`);
  });

  it('leaves a sentence-final period outside the isolate', () => {
    expect(isolateFigures('عيار 21.')).toBe(`عيار ${LRI}21${PDI}.`);
  });

  it('keeps grouped numbers intact', () => {
    expect(isolateFigures('عند 1,310 د.ع')).toBe(`عند ${LRI}1,310${PDI} د.ع`);
  });
});

describe('fmtDateNumeric', () => {
  it('writes day/month/year with Western digits for tight spaces', () => {
    expect(fmtDateNumeric('2026-10-19T12:00:00Z').replace(/‏/g, '')).toBe('19/10/2026');
  });
});

describe('fmtAmountWords', () => {
  it('writes round amounts in Arabic words with Western digits and the right plural', () => {
    expect(fmtAmountWords(500_000)).toBe('500 ألف');
    expect(fmtAmountWords(1_000_000)).toBe('1 مليون');
    expect(fmtAmountWords(5_000_000)).toBe('5 ملايين');
  });
});

describe('noOrphan', () => {
  it('joins the last two words with a non-breaking space', () => {
    expect(noOrphan('سوق الذهب بسعره الحقيقي')).toBe('سوق الذهب بسعره الحقيقي');
  });
});
