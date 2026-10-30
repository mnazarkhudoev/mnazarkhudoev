// Generates the profile README's SVG assets (dark + light) in ../assets.
// Text is converted to outlines because GitHub serves SVGs with a CSP that blocks fonts.
// Run: npm install && npm run build (from tools/).
import { writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const fontDir = (pkg, file) => new URL(`node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url).pathname;
const fonts = {
  display: opentype.loadSync(fontDir('space-grotesk', 'space-grotesk-latin-700-normal.woff')),
  body: opentype.loadSync(fontDir('space-grotesk', 'space-grotesk-latin-500-normal.woff')),
  mono: opentype.loadSync(fontDir('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff')),
};

// Same tokens as the resume site (src/styles/global.css).
const THEMES = {
  dark: {
    bg: '#0f2135', grid: 'rgb(141 184 224 / 0.07)', gridMajor: 'rgb(141 184 224 / 0.13)',
    wire: '#8db8e0', wireDim: 'rgb(141 184 224 / 0.35)', ink: '#e6edf5', muted: '#94a9c0',
    signal: '#ff7a45', panel: '#0a1828', header: '#1b3350',
  },
  light: {
    bg: '#eef2f6', grid: 'rgb(47 94 140 / 0.07)', gridMajor: 'rgb(47 94 140 / 0.13)',
    wire: '#2f5e8c', wireDim: 'rgb(47 94 140 / 0.35)', ink: '#0f2135', muted: '#4a6078',
    signal: '#e2551c', panel: '#f8fafc', header: '#dbe5ee',
  },
};

const SKILLS = [
  { group: 'backend', items: ['Python', 'Django', 'Django REST Framework', 'Java', 'Spring Framework', 'Go', 'REST API design', 'Authentication'] },
  { group: 'databases', items: ['PostgreSQL', 'MySQL', 'SQL', 'Relational modeling', 'Query optimization'] },
  { group: 'frontend', items: ['React', 'JavaScript', 'HTML', 'CSS', 'Bootstrap', 'Responsive UI'] },
  { group: 'tools_practices', items: ['Git', 'Linux', 'Debugging', 'Code review', 'Technical docs', 'Testing'] },
];

/** Lays out `str` glyph by glyph (kerning + tracking in em) and returns outline path data and width. */
function outline(font, str, x, y, size, { tracking = 0, anchor = 'start' } = {}) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  const advances = glyphs.map((g, i) => {
    const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    return (g.advanceWidth + kern) * scale + (i < glyphs.length - 1 ? tracking * size : 0);
  });
  const width = advances.reduce((a, b) => a + b, 0);
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const d = glyphs
    .map((g, i) => {
      const p = g.getPath(cx, y, size).toPathData(1);
      cx += advances[i];
      return p;
    })
    .join('');
  return { d, width };
}

const grid = (t, w, h) => `
  <defs>
    <pattern id="minor" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M16 0H0V16" fill="none" stroke="${t.grid}" stroke-width="1"/>
    </pattern>
    <pattern id="major" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="url(#minor)"/>
      <path d="M80 0H0V80" fill="none" stroke="${t.gridMajor}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="${t.bg}"/>
  <rect width="${w}" height="${h}" fill="url(#major)"/>`;

// Drawing-sheet frame with registration marks in two corners.
const frame = (t, w, h) => `
  <rect x="16.5" y="16.5" width="${w - 33}" height="${h - 33}" fill="none" stroke="${t.wireDim}"/>
  <path d="M16 34V16H34M${w - 16} ${h - 34}V${h - 16}H${w - 34}" fill="none" stroke="${t.wire}" stroke-width="2.5"/>`;

function banner(t, name) {
  const W = 1280;
  const H = 360;
  const [first, last] = ['Muzaffar', 'Nazarkhudoev'];
  const l1 = outline(fonts.display, first, 64, 150, 100, { tracking: -0.04 });
  const l2 = outline(fonts.display, last, 64, 250, 100, { tracking: -0.04 });
  const right = 64 + Math.max(l1.width, l2.width);

  const label = outline(fonts.mono, 'backend developer', (64 + right) / 2, 296, 16, { anchor: 'middle' });
  const dimY = 290;

  // Topology: clients -> API gateway -> services -> database.
  const clients = [112, 180, 248].map((y) => ({ x: 818, y }));
  const gw = { x: 920, y: 180 };
  const services = [104, 180, 256].map((y) => ({ x: 1050, y }));
  const db = { x: 1176, y: 180 };
  const edges = [
    ...clients.map((c) => `M${c.x + 10} ${c.y}L${gw.x - 20} ${gw.y}`),
    ...services.map((s) => `M${gw.x + 20} ${gw.y}L${s.x - 20} ${s.y}`),
    ...services.map((s) => `M${s.x + 20} ${s.y}L${db.x - 32} ${db.y}`),
  ].join('');
  const route = (c, s) => `M${c.x} ${c.y}L${gw.x} ${gw.y}L${s.x} ${s.y}L${db.x} ${db.y}`;
  const reverse = (c, s) => `M${db.x} ${db.y}L${s.x} ${s.y}L${gw.x} ${gw.y}L${c.x} ${c.y}`;
  const packets = [
    { path: route(clients[0], services[1]), dur: 3.2, delay: 0, reply: false },
    { path: route(clients[1], services[0]), dur: 3.6, delay: 1.1, reply: false },
    { path: route(clients[2], services[2]), dur: 3.4, delay: 2.0, reply: false },
    { path: reverse(clients[1], services[2]), dur: 3.8, delay: 0.6, reply: true },
    { path: reverse(clients[0], services[0]), dur: 3.5, delay: 2.4, reply: true },
  ];
  const moving = packets
    .map(
      (p) => `
    <g>
      ${p.reply ? '' : `<circle r="9" fill="${t.signal}" opacity="0.22"/>`}
      <circle r="4" fill="${p.reply ? t.wire : t.signal}"/>
      <animateMotion dur="${p.dur}s" begin="-${p.delay}s" repeatCount="indefinite" path="${p.path}"/>
    </g>`,
    )
    .join('');
  const still = `
    <circle cx="${(gw.x + services[0].x) / 2}" cy="${(gw.y + services[0].y) / 2}" r="4" fill="${t.signal}"/>
    <circle cx="${(services[2].x + db.x) / 2}" cy="${(services[2].y + db.y) / 2}" r="4" fill="${t.signal}"/>`;

  const caption = (txt, x) => `<path d="${outline(fonts.mono, txt, x, 318, 12, { anchor: 'middle' }).d}" fill="${t.muted}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
  <title id="t">${name}, backend developer. A diagram of requests flowing from clients through an API gateway and services to a database.</title>
  <style>
    .still { display: none; }
    @media (prefers-reduced-motion: reduce) {
      .moving { display: none; }
      .still { display: inline; }
    }
  </style>${grid(t, W, H)}${frame(t, W, H)}
  <path d="${l1.d}" fill="${t.ink}"/>
  <path d="${l2.d}" fill="${t.ink}"/>
  <g stroke="${t.wire}" fill="none">
    <path d="M64 ${dimY - 8}V${dimY + 8}M${right.toFixed(1)} ${dimY - 8}V${dimY + 8}"/>
    <path d="M64 ${dimY}H${right.toFixed(1)}" stroke="${t.wireDim}"/>
  </g>
  <rect x="${((64 + right) / 2 - label.width / 2 - 12).toFixed(1)}" y="${dimY - 12}" width="${(label.width + 24).toFixed(1)}" height="24" fill="${t.bg}"/>
  <path d="${label.d}" fill="${t.wire}"/>
  <path d="${edges}" stroke="${t.wireDim}" fill="none"/>
  <g fill="${t.panel}" stroke="${t.wire}" stroke-width="1.5">
    ${clients.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="10"/>`).join('')}
    <rect x="${gw.x - 20}" y="${gw.y - 30}" width="40" height="60"/>
    ${services.map((s) => `<rect x="${s.x - 20}" y="${s.y - 18}" width="40" height="36"/>`).join('')}
    <path d="M${db.x - 32} ${db.y - 40}v80c0 6 14 11 32 11s32-5 32-11v-80"/>
    <ellipse cx="${db.x}" cy="${db.y - 40}" rx="32" ry="11"/>
    <path d="M${db.x - 32} ${db.y - 10}c0 6 14 11 32 11s32-5 32-11M${db.x - 32} ${db.y + 20}c0 6 14 11 32 11s32-5 32-11" fill="none"/>
  </g>
  ${caption('clients', 818)}${caption('api', gw.x)}${caption('services', 1050)}${caption('postgres', db.x)}
  <g class="moving">${moving}
  </g>
  <g class="still">${still}
  </g>
</svg>
`;
}

function stack(t) {
  const W = 1280;
  const colW = 282;
  const gap = 24;
  const x0 = (W - (colW * 4 + gap * 3)) / 2;
  const top = 48;
  const headH = 44;
  const rowH = 38;
  const maxRows = Math.max(...SKILLS.map((s) => s.items.length));
  const H = top + headH + maxRows * rowH + 48;

  const tables = SKILLS.map((s, i) => {
    const x = x0 + i * (colW + gap);
    const h = headH + s.items.length * rowH;
    const head = outline(fonts.mono, s.group, x + 16, top + 28, 15);
    const rows = s.items
      .map((item, r) => {
        const y = top + headH + r * rowH;
        const txt = outline(fonts.body, item, x + 16, y + 25, 17);
        const sep = r > 0 ? `<path d="M${x} ${y}H${x + colW}" stroke="${t.wireDim}"/>` : '';
        // First row is the table's key: the skill I'd lead with.
        const pk = r === 0 ? `<path d="${outline(fonts.mono, 'pk', x + colW - 16, y + 24, 12, { anchor: 'end' }).d}" fill="${t.signal}"/>` : '';
        return `${sep}<path d="${txt.d}" fill="${t.ink}"/>${pk}`;
      })
      .join('');
    return `
  <g>
    <rect x="${x}" y="${top}" width="${colW}" height="${h}" fill="${t.panel}" stroke="${t.wire}" stroke-width="1.5"/>
    <rect x="${x}" y="${top}" width="${colW}" height="${headH}" fill="${t.header}" stroke="${t.wire}" stroke-width="1.5"/>
    <path d="${head.d}" fill="${t.ink}"/>${rows}
  </g>`;
  }).join('');

  const all = SKILLS.map((s) => `${s.group}: ${s.items.join(', ')}`).join('. ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
  <title id="t">Tech stack. ${all}.</title>${grid(t, W, H)}${frame(t, W, H)}${tables}
</svg>
`;
}

const out = (f) => new URL(`../assets/${f}`, import.meta.url).pathname;
for (const [theme, t] of Object.entries(THEMES)) {
  writeFileSync(out(`banner-${theme}.svg`), banner(t, 'Muzaffar Nazarkhudoev'));
  writeFileSync(out(`stack-${theme}.svg`), stack(t));
}
console.log('assets written');
