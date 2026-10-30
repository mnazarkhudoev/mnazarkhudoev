// Checks for the profile README and its generated SVGs. Run: npm run check (from tools/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { XMLValidator } from 'fast-xml-parser';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');
const SVGS = ['assets/banner-dark.svg', 'assets/banner-light.svg', 'assets/stack-dark.svg', 'assets/stack-light.svg'];

for (const file of SVGS) {
  test(`${file} is valid, self-contained and accessible`, () => {
    assert.ok(existsSync(root + file), 'missing');
    const svg = read(file);
    assert.equal(XMLValidator.validate(svg), true, 'invalid XML');
    assert.match(svg, /<svg[^>]+role="img"/);
    assert.match(svg, /<title[^>]*>[^<]{10,}<\/title>/);
    assert.doesNotMatch(svg, /<script|<foreignObject|@import|url\(\s*['"]?https?:/i);
    assert.doesNotMatch(svg, /(?:href|src)="https?:/, 'external reference');
    // Fonts can't load inside GitHub-served SVGs, so all text is outlined to paths.
    assert.doesNotMatch(svg, /<text\b/);
    assert.ok(statSync(root + file).size < 150_000, 'too large');
  });
}

test('banner animation respects reduced motion', () => {
  for (const f of ['assets/banner-dark.svg', 'assets/banner-light.svg']) {
    const svg = read(f);
    assert.match(svg, /@keyframes|<animateMotion/);
    assert.match(svg, /@media \(prefers-reduced-motion: reduce\)/);
  }
});

test('README swaps dark/light assets and only uses local images', () => {
  const md = read('README.md');
  for (const name of ['banner', 'stack']) {
    assert.match(md, new RegExp(`<source media="\\(prefers-color-scheme: dark\\)" srcset="assets/${name}-dark.svg">`));
    assert.match(md, new RegExp(`<img [^>]*src="assets/${name}-light.svg"`));
  }
  const imgs = [...md.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);
  for (const src of imgs) {
    assert.doesNotMatch(src, /^https?:/, `external image ${src}`);
    assert.ok(existsSync(root + src), `${src} missing`);
  }
  for (const alt of md.match(/<img [^>]*>/g)) assert.match(alt, /alt="[^"]{10,}"/);
});

test('README links to the resume site and CV, shows no email or repos', () => {
  const md = read('README.md');
  assert.match(md, /https:\/\/mnazarkhudoev\.pages\.dev\/?[")]/);
  assert.match(md, /https:\/\/mnazarkhudoev\.pages\.dev\/Muzaffar_Nazarkhudoev\.pdf/);
  assert.doesNotMatch(md, /@gmail\.com|@ucentralasia/i);
  assert.doesNotMatch(md, /github\.com\/mnazarkhudoev\//i, 'no repo links');
});

test('experience is general: no company names or dates', () => {
  const md = read('README.md');
  assert.match(md, /experience/i);
  assert.doesNotMatch(md, /Iron Bull|MMD|DevClub|20(2[3-6])\.\d\d/);
});
