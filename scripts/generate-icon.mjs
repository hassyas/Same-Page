// P1 — generates the app's marketingAssets.icon (Devvit's real config-file.v1
// schema requires a square PNG, 1024x1024, <=500KB — the brief's assumed
// "512px favicon + 1200x630 OG image / preview-image key" doesn't exist in
// the actual schema; this replaces that with what Devvit really reads).
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

function hexPoints(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

// Same geometry as HiveMark.tsx's 0-48 viewBox, scaled + centered into a
// 1024x1024 canvas with a 48px black frame (proportional to the spec's
// 24px-at-512 frame).
const SCALE = 9.6;
const OFFSET = 288;
const scalePoints = (pts) =>
  pts
    .split(' ')
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return `${x * SCALE + OFFSET},${y * SCALE + OFFSET}`;
    })
    .join(' ');

const bigHex = scalePoints(hexPoints(20, 24, 16));
const smallHexA = scalePoints(hexPoints(34, 14, 8));
const smallHexB = scalePoints(hexPoints(36, 32, 8));

const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#f5f3ee"/>
  <rect x="24" y="24" width="976" height="976" fill="none" stroke="#000000" stroke-width="48"/>
  <polygon points="${bigHex}" fill="#121212"/>
  <polygon points="${smallHexA}" fill="#e86a2c"/>
  <polygon points="${smallHexB}" fill="#e86a2c"/>
</svg>`;

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } });
const png = resvg.render().asPng();
writeFileSync(new URL('../public/icon.png', import.meta.url), png);
console.log(`Wrote public/icon.png (${(png.length / 1024).toFixed(1)} KB)`);
