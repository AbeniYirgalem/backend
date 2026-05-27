import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && full.endsWith('.ts')) processFile(full);
  }
}

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch (e) { return false; }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  let changed = false;

  content = content.replace(/(['"])(\.\.\/[^'\"]*|\.\/[^'\"]*)\1/g, (m, quote, spec) => {
    if (!spec.startsWith('./') && !spec.startsWith('../')) return m;
    if (spec.match(/\.(js|ts|json)$/)) return m;

    const abs = path.resolve(dir, spec);
    if (fileExists(abs + '.ts')) {
      changed = true;
      return `${quote}${spec}.js${quote}`;
    }
    if (fileExists(path.join(abs, 'index.ts'))) {
      changed = true;
      return `${quote}${spec}/index.js${quote}`;
    }
    return m;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched', path.relative(root, filePath));
  }
}

walk(srcRoot);
console.log('Extension additions complete.');
