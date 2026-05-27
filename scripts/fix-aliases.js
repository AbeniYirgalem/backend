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

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes("@/")) return;

  const dir = path.dirname(filePath);
  const updated = content.replace(/(['\"])@\/(.*?)\1/g, (m, quote, p1) => {
    const target = path.join(srcRoot, p1);
    let rel = path.relative(dir, target).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return quote + rel + quote;
  });

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Updated', path.relative(root, filePath));
  }
}

walk(srcRoot);
console.log('Alias fix-up complete.');
