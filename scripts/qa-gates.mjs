// UI Kit QA gates (00-AGENT-MASTER-PROMPT §7 "Automated", 01-color §10.3, 02-typography §10,
// 03-icon §2, 04-layout §13). `npm run qa` exits non-zero on any violation.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PHOSPHOR_KEEP = new Set(['Icon', 'IconContext', 'IconBase', 'IconProps', 'IconWeight', 'SSR']);
const SRC = join(ROOT, 'src');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f));
const code = files.filter((f) => /\.tsx?$/.test(f));
const css = files.filter((f) => f.endsWith('.css'));

const gates = [
  {
    name: 'Hex colors live only in tokens.css',
    files: files.filter((f) => !f.endsWith('tokens.css')),
    test: /#[0-9a-fA-F]{3,8}\b(?![\w-])/,
    // allow "#123" style issue refs in comments only when not a color literal context
    skipLine: (l) => /^\s*(\/\/|\*|\/\*)/.test(l),
  },
  {
    name: 'No gradients except the landing navy wash',
    files,
    test: /gradient\(/,
    skipLine: (l) => /--bg-wash-hero|^\s*(\/\/|\*|\/\*)/.test(l),
  },
  { name: 'No em/en dashes in copy', files: code, test: /[—–]/ },
  { name: 'No pure black', files, test: /#000\b|#000000\b|rgba?\(0,\s*0,\s*0/ },
  { name: 'No physical left/right in CSS', files: css, test: /(^|[\s;{])(left|right)\s*:/ },
  {
    name: 'No arbitrary Tailwind values',
    files: code,
    test: /\b[a-z][\w-]*-\[[^\]]+\]/,
    skipLine: (l) => /env\(/.test(l),
  },
  { name: 'Phosphor weights: regular or fill only', files: code, test: /weight="(thin|light|bold|duotone)"/ },
  {
    name: 'Icon sizes from tokens (16, 20, 24, 32, 52)',
    files: code,
    test: /<\w+Icon\b[^>]*\bsize=\{(?!16\}|20\}|24\}|32\}|52\})\d+\}/,
  },
  { name: 'No emoji', files: code, test: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u },
  {
    name: 'Phosphor: *Icon exports only (un-suffixed names are deprecated)',
    files: code,
    test: {
      test: (line) => {
        const m = line.match(/import (?:type )?\{([^}]*)\} from '@phosphor-icons\/react'/);
        if (!m) return false;
        return m[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .some((name) => !PHOSPHOR_KEEP.has(name) && !name.endsWith('Icon'));
      },
    },
  },
  { name: 'No console.log in shipped code', files: code, test: /console\.log\(/ },
];

let failures = 0;
for (const gate of gates) {
  const hits = [];
  for (const file of gate.files) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (gate.skipLine?.(line)) return;
        if (gate.test.test(line)) hits.push(`  ${relative(ROOT, file)}:${i + 1}  ${line.trim().slice(0, 110)}`);
      });
  }
  console.log(`${hits.length ? 'FAIL' : 'PASS'}  ${gate.name}${hits.length ? ` (${hits.length})` : ''}`);
  hits.slice(0, 10).forEach((h) => console.log(h));
  failures += hits.length;
}

process.exit(failures ? 1 : 0);
