// Test setup: DOM matchers + cleanup between component tests.
// Pure-logic suites run in the faster `node` environment, so DOM-only steps are guarded.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

const hasDom = typeof window !== 'undefined';

afterEach(async () => {
  if (!hasDom) return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
