// English copy (D45): the same keys as Arabic (the Messages type checks that) and no Arabic
// text left behind, except the language toggle, which names Arabic in Arabic.
import { describe, it, expect } from 'vitest';
import { en } from './en';

const ARABIC = /[؀-ۿ]/;
const DASHES = /[–—]/;

// Every string in the tree, with functions called on sample arguments
const strings = (node: unknown, path: string, out: [string, string][]) => {
  if (typeof node === 'string') out.push([path, node]);
  else if (typeof node === 'function') out.push([path, String((node as (...a: unknown[]) => unknown)(2, 'x', 'y'))]);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) strings(value, `${path}.${key}`, out);
  }
  return out;
};

describe('English messages', () => {
  const all = strings(en, 'en', []);

  it('contain no Arabic outside the language toggle', () => {
    const arabic = all.filter(([path, text]) => ARABIC.test(text) && path !== 'en.shell.otherLanguage');
    expect(arabic).toEqual([]);
  });

  it('follow the copy rules: no em or en dashes', () => {
    expect(all.filter(([, text]) => DASHES.test(text))).toEqual([]);
  });
});
