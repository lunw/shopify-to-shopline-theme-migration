#!/usr/bin/env node
/**
 * audit-i18n.mjs — verify every t() key used by a SHOPLINE theme exists in EVERY locale.
 *
 * Why: SHOPLINE's t() returns the key string itself when the key is missing, and
 * `| default("…")` cannot rescue it because the key string is truthy. The result is raw
 * text like "products.product.add_to_cart" rendered to shoppers.
 *
 * Checking only en.json is not enough: a key present in en but missing in zh-hans-cn
 * shows raw text for Chinese visitors while English looks perfect.
 *
 * Usage:
 *   node scripts/audit-i18n.mjs [theme-dir] [locale.json ...]
 *
 *   node scripts/audit-i18n.mjs                     # ./  all locales
 *   node scripts/audit-i18n.mjs ./theme             # ./theme all locales
 *   node scripts/audit-i18n.mjs ./theme en.json     # one locale only
 *
 * Exit code: 0 = all keys present; 1 = missing keys found.
 */
import fs from 'fs';
import path from 'path';

const themeDir = process.argv[2] && !process.argv[2].endsWith('.json')
  ? process.argv[2]
  : '.';
const localeArgs = (process.argv[2] && process.argv[2].endsWith('.json')
  ? process.argv.slice(2)
  : process.argv.slice(3));

const I18N = path.join(themeDir, 'i18n');
const DIRS = ['layout', 'sections', 'components', 'blocks', 'templates'];

if (!fs.existsSync(I18N)) {
  console.error(`error: no i18n directory at ${I18N}`);
  process.exit(1);
}

// ---------- collect keys used in templates ----------
const used = new Map(); // key -> [file:line]

function scan(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const re = /["'`]([a-zA-Z0-9_.-]+)["'`]\s*\|\s*t\(/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const key = m[1];
      if (!key.includes('.')) continue;
      if (!used.has(key)) used.set(key, []);
      used.get(key).push(`${path.relative(themeDir, file)}:${i + 1}`);
    }
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) scan(p);
  }
}

for (const d of DIRS) walk(path.join(themeDir, d));

// ---------- check every locale ----------
const hasKey = (locale, key) => {
  let cur = locale;
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return false;
    cur = cur[part];
  }
  return true;
};

const locales = localeArgs.length
  ? localeArgs
  : fs
      .readdirSync(I18N)
      .filter((f) => f.endsWith('.json') && !f.endsWith('.schema.json'))
      .sort();

console.log(`theme   : ${path.resolve(themeDir)}`);
console.log(`keys    : ${used.size}`);
console.log(`locales : ${locales.length}\n`);

let totalMissing = 0;

for (const file of locales) {
  let locale;
  try {
    locale = JSON.parse(fs.readFileSync(path.join(I18N, file), 'utf8'));
  } catch (e) {
    console.log(`✖ ${file}  unreadable: ${e.message}`);
    totalMissing++;
    continue;
  }

  const missing = [...used.keys()].filter((k) => !hasKey(locale, k));

  if (missing.length === 0) {
    console.log(`✔ ${file}`);
  } else {
    totalMissing += missing.length;
    console.log(`✖ ${file}  missing ${missing.length}`);
    for (const k of missing.slice(0, 5)) {
      console.log(`    ${k}   (${used.get(k).slice(0, 2).join(', ')})`);
    }
    if (missing.length > 5) console.log(`    …and ${missing.length - 5} more`);
  }
}

if (totalMissing) {
  console.log(`\n${totalMissing} missing. Fix by using a key that exists in the locale files,`);
  console.log('or by replacing t() with a literal string.');
  process.exit(1);
}

console.log('\n✔ every key exists in every locale');
