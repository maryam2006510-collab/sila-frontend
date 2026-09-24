// src/lib/bidi.ts
// Server-provided Arabic sentences (AI reasons, risk insights, error messages) can embed
// figures such as "0.77%". Inside Arabic text the Unicode bidi algorithm turns digits
// into Arabic numbers and the "%" drifts to the wrong side ("%0.77"). Wrapping each
// figure in LRI…PDI isolates keeps it intact, like <bdi> does for our own markup.

const LRI = '⁦';
const PDI = '⁩';
// Starts and ends on a digit (a sentence-final "." stays outside), optional trailing %
const FIGURE = /[+\-−]?\d(?:[\d,.]*\d)?\s?%?/g;

export const isolateFigures = (text: string): string =>
  text.replace(FIGURE, (m) => {
    const trailing = m.endsWith(' ') ? ' ' : '';
    return `${LRI}${m.trimEnd()}${PDI}${trailing}`;
  });
