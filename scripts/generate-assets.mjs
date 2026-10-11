// Generates the original inspiration imagery shipped with Yamica Studio.
//
// Every image is procedural artwork authored here as SVG and rasterised with
// Chromium, so the library has no third-party licensing questions.
// Run: npm run assets   (writes public/library/inspiration/*.jpg + meta json)

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/library/inspiration");
mkdirSync(outDir, { recursive: true });

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const R = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const grain = (o = 0.09, f = 0.85) => `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 ${o}"/></feComponentTransfer>
  </filter>`;
const grainRect = `<rect width="100%" height="100%" filter="url(#grain)"/>`;
const blur = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
const vignette = (o = 0.18) => `<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${o}"/></radialGradient>`;
const vigRect = `<rect width="100%" height="100%" fill="url(#vig)"/>`;

const svg = (w, h, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

const P = [900, 1125];
const LAND = [1200, 900];
const SQ = [1000, 1000];

const assets = [];
const add = (id, size, make) => assets.push({ id, size, make });

/* ------------------------------------------------------------ architecture */

add("arch-concrete-arches", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#DCD7CF"/>`;
  const aw = 260;
  for (let i = -1; i < 4; i++) {
    const x = 70 + i * (aw + 60);
    b += `<path d="M${x} ${h} V520 a${aw / 2} ${aw / 2} 0 0 1 ${aw} 0 V${h}Z" fill="#B9B3AA"/>`;
    b += `<path d="M${x + 18} ${h} V528 a${aw / 2 - 18} ${aw / 2 - 18} 0 0 1 ${aw - 36} 0 V${h}Z" fill="#EFE9DF"/>`;
    b += `<path d="M${x + aw - 70} ${h} V560 q30 -70 52 -30 V${h}Z" fill="#E4DCCF" opacity=".8"/>`;
  }
  b += `<rect y="${h - 210}" width="${w}" height="210" fill="#CFC8BD"/>`;
  b += `<path d="M0 ${h - 210} L${w} ${h - 300} L${w} ${h - 210}Z" fill="#E9E2D7" opacity=".7"/>`;
  b += `<rect width="${w}" height="${h}" fill="url(#light)"/>`;
  return svg(w, h, grain(0.1) + `<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6E6" stop-opacity=".5"/><stop offset="1" stop-color="#6E6458" stop-opacity=".25"/></linearGradient>`, b + grainRect);
});

add("arch-stair", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#EDE5D8"/>`;
  for (let i = 0; i < 14; i++) {
    const y = 120 + i * 70;
    const x = 80 + i * 48;
    b += `<path d="M${x} ${y} H${w} V${y + 70} H${x + 48}Z" fill="${i % 2 ? "#E2D8C8" : "#E8DFD1"}"/>`;
    b += `<path d="M${x} ${y} H${w} V${y + 14} H${x + 10}Z" fill="#FBF6EC"/>`;
  }
  b += `<path d="M0 0 L${w * 0.55} 0 L${w * 0.15} ${h} L0 ${h}Z" fill="#8E8274" opacity=".28" filter="url(#b8)"/>`;
  b += `<path d="M${w * 0.62} 0 L${w} 0 L${w} ${h * 0.4}Z" fill="#fff" opacity=".35" filter="url(#b8)"/>`;
  return svg(w, h, grain(0.1) + blur("b8", 8), b + grainRect);
});

add("arch-colonnade", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#E6DED1"/>`;
  b += `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#D3C8B8"/>`;
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 175;
    b += `<path d="M${x + 90} ${h * 0.72} L${x + 300} ${h} L${x + 360} ${h} L${x + 140} ${h * 0.72}Z" fill="#B5A792" opacity=".55"/>`;
    b += `<rect x="${x}" y="40" width="70" height="${h * 0.72 - 40}" fill="url(#col)"/>`;
    b += `<rect x="${x - 10}" y="40" width="90" height="22" fill="#F4EEE4"/>`;
  }
  b += `<rect width="${w}" height="40" fill="#CFC4B3"/>`;
  return svg(w, h, grain(0.1) + `<linearGradient id="col"><stop offset="0" stop-color="#F7F2E9"/><stop offset=".6" stop-color="#E3D9CA"/><stop offset="1" stop-color="#B9AC98"/></linearGradient>`, b + grainRect);
});

add("arch-curve", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#C9CBD3"/>`;
  for (let i = 0; i < 9; i++) {
    const y = 40 + i * 130;
    b += `<path d="M-50 ${y + 60} Q${w / 2} ${y - 40} ${w + 50} ${y + 60} V${y + 110} Q${w / 2} ${y + 10} -50 ${y + 110}Z" fill="#F2EEF2"/>`;
    b += `<path d="M-50 ${y + 110} Q${w / 2} ${y + 10} ${w + 50} ${y + 110} V${y + 126} Q${w / 2} ${y + 26} -50 ${y + 126}Z" fill="#A9A3B6"/>`;
  }
  b += `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  return svg(w, h, grain(0.08) + `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DDF0" stop-opacity=".45"/><stop offset="1" stop-color="#8A8398" stop-opacity=".2"/></linearGradient>`, b + grainRect);
});

/* ------------------------------------------------------------------ nature */

add("nature-leaf-shadow", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#EFE6D6"/><rect width="${w}" height="${h}" fill="url(#warm)"/>`;
  let leaves = "";
  for (let i = 0; i < 26; i++) {
    const x = R(80, w - 40);
    const y = R(40, h - 80);
    const len = R(70, 150);
    const rot = R(-160, 20);
    leaves += `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0 Q${len * 0.35} ${-len / 2} 0 ${-len} Q${-len * 0.35} ${-len / 2} 0 0Z"/>`;
  }
  leaves += `<path d="M${w} 120 Q${w * 0.55} ${h * 0.45} ${w * 0.25} ${h}" stroke-width="9" fill="none" stroke="#6E7563"/>`;
  b += `<g fill="#6E7563" opacity=".42" filter="url(#b6)">${leaves}</g>`;
  return svg(w, h, grain(0.11) + blur("b6", 6) + `<radialGradient id="warm" cx="70%" cy="20%" r="80%"><stop offset="0" stop-color="#FFF8E8"/><stop offset="1" stop-color="#D9CCB4"/></radialGradient>`, b + grainRect);
});

add("nature-dunes", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#F1E3CC"/>`;
  const cols = ["#EAD5B5", "#E1C6A0", "#D6B68D", "#C9A57C", "#BC9670"];
  cols.forEach((c, i) => {
    const y = 240 + i * 140;
    b += `<path d="M0 ${y} C${w * 0.25} ${y - 120} ${w * 0.5} ${y + 80} ${w} ${y - 60} V${h} H0Z" fill="${c}"/>`;
    b += `<path d="M0 ${y} C${w * 0.25} ${y - 120} ${w * 0.5} ${y + 80} ${w} ${y - 60}" stroke="#FFF3DE" stroke-width="5" fill="none" opacity=".7"/>`;
  });
  return svg(w, h, grain(0.12), b + `<rect width="${w}" height="${h}" fill="url(#vig)"/>` + grainRect).replace("<defs>", "<defs>" + vignette(0.15));
});

add("nature-sea", LAND, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="url(#s)"/><rect y="${h * 0.52}" width="${w}" height="${h * 0.48}" fill="url(#sea)"/>${Array.from({ length: 40 }, (_, i) => `<rect x="${R(0, w)}" y="${h * 0.55 + i * 10}" width="${R(40, 220)}" height="2" fill="#fff" opacity="${R(0.15, 0.4)}"/>`).join("")}`;
  return svg(w, h, grain(0.09) + `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8DCE3"/><stop offset=".5" stop-color="#F3E7DE"/></linearGradient><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9C3C8"/><stop offset="1" stop-color="#8E9DA3"/></linearGradient>`, b + grainRect);
});

add("nature-pebbles", SQ, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#CFC6B8"/>`;
  const cols = ["#E8E1D6", "#B8B0A3", "#8D877F", "#D9CFC0", "#A69C8E", "#F1ECE4", "#6F6A64"];
  for (let i = 0; i < 70; i++) {
    const x = R(0, w);
    const y = R(0, h);
    const rx = R(30, 80);
    const ry = rx * R(0.6, 0.85);
    const rot = R(0, 180);
    b += `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="${rx}" ry="${ry}" fill="#5A544D" opacity=".35" transform="translate(6 8)" filter="url(#b4)"/><ellipse rx="${rx}" ry="${ry}" fill="${pick(cols)}"/><ellipse rx="${rx * 0.7}" ry="${ry * 0.5}" cx="${-rx * 0.15}" cy="${-ry * 0.25}" fill="#fff" opacity=".18"/></g>`;
  }
  return svg(w, h, grain(0.12) + blur("b4", 4), b + grainRect);
});

add("nature-fern", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#F2EEE2"/>`;
  const frond = (x, y, rot, s, c) => {
    let g = `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${c}"><path d="M0 0 Q10 -200 0 -420" stroke="${c}" stroke-width="4" fill="none"/>`;
    for (let i = 0; i < 22; i++) {
      const yy = -20 - i * 18;
      const len = 90 - Math.abs(i - 7) * 4;
      g += `<path transform="translate(0 ${yy}) rotate(70)" d="M0 0 Q${len * 0.2} ${-len / 2} 0 ${-len} Q${-len * 0.2} ${-len / 2} 0 0Z"/><path transform="translate(0 ${yy}) rotate(-70)" d="M0 0 Q${len * 0.2} ${-len / 2} 0 ${-len} Q${-len * 0.2} ${-len / 2} 0 0Z"/>`;
    }
    return g + "</g>";
  };
  b += frond(300, h + 20, 12, 2.4, "#A9B89E") + frond(640, h + 60, -18, 2.1, "#6E8466") + frond(120, 640, 40, 1.1, "#C7D0BB");
  return svg(w, h, grain(0.09), b + grainRect);
});

/* --------------------------------------------------------------------- art */

add("art-cutouts", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#F3ECDD"/>`;
  b += `<path d="M120 180 C220 60 360 160 330 300 C300 440 120 420 90 320 C70 260 80 220 120 180Z" fill="#D98F77"/>`;
  b += `<path d="M520 120 C600 140 640 260 700 300 C760 340 800 460 700 480 C580 500 600 360 520 320 C440 280 440 100 520 120Z" fill="#8FA58A"/>`;
  b += `<path d="M200 620 Q260 520 330 610 T470 620 T610 600 Q700 600 720 700 Q600 820 450 760 T200 760Z" fill="#2F3A56"/>`;
  b += `<path d="M600 840 C660 780 780 820 780 900 C780 1000 640 1040 600 960 C580 920 570 870 600 840Z" fill="#E9C46A"/>`;
  b += `<path d="M110 860 l40 -90 l40 90 l90 -40 l-50 80 l70 60 l-100 -10 l-30 100 l-30 -100 l-100 10 l70 -60 l-50 -80Z" fill="#B9A9C9"/>`;
  return svg(w, h, grain(0.1), b + grainRect);
});

add("art-line-portrait", P, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#F6F1E7"/><circle cx="560" cy="380" r="170" fill="#E9C9C0" opacity=".6"/>
  <path fill="none" stroke="#2B2826" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M300 260 C330 150 520 120 590 230 C640 310 610 420 600 500 C590 600 520 690 440 690 C360 690 300 620 290 540 M600 330 C560 320 520 330 500 350 M400 340 C430 320 470 330 480 350 M520 380 C540 400 560 400 570 380 M410 390 C430 410 450 410 465 390 M490 400 C480 470 470 500 500 520 C510 525 520 520 525 512 M450 580 C480 600 520 600 545 580 M440 690 C440 760 420 800 330 850 M560 670 C570 740 600 800 700 840 M330 850 C400 900 600 900 700 840"/>
  <path fill="none" stroke="#6E5690" stroke-width="3" d="M300 260 C250 380 260 520 330 600 C260 700 240 820 220 900" opacity=".8"/>`;
  return svg(w, h, grain(0.08), b + grainRect);
});

add("art-brush", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#F4EFE6"/>`;
  b += `<g filter="url(#rough)" fill="#2B2826"><path d="M120 620 C300 420 560 380 760 460 C900 520 1000 470 1080 380 L1100 420 C1010 540 880 590 740 520 C560 440 340 480 150 660Z"/><path d="M220 260 C380 230 520 250 640 220 L650 250 C520 290 380 270 230 300Z" opacity=".85"/><circle cx="920" cy="230" r="70" fill="#B9A9C9"/></g>`;
  return svg(w, h, grain(0.1) + `<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="26"/></filter>`, b + grainRect);
});

/* ---------------------------------------------------------------- abstract */

add("abs-color-field", P, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#B8A6C8"/><rect x="70" y="80" width="${w - 140}" height="520" fill="#D7C9E2" filter="url(#b14)"/><rect x="70" y="660" width="${w - 140}" height="380" fill="#EBD9A2" filter="url(#b14)"/>`;
  return svg(w, h, grain(0.1) + blur("b14", 14), b + grainRect);
});

add("abs-gradient-dawn", LAND, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.68}" cy="${h * 0.62}" r="160" fill="#FFF4D8" opacity=".85" filter="url(#b40)"/>`;
  return svg(w, h, grain(0.08) + blur("b40", 40) + `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9C3D8"/><stop offset=".55" stop-color="#EAD3CC"/><stop offset="1" stop-color="#F3E3BF"/></linearGradient>`, b + grainRect);
});

add("abs-shapes", SQ, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#EFE9DE"/><rect x="120" y="140" width="380" height="520" fill="#A9B89E"/><circle cx="640" cy="420" r="220" fill="#E9C9C0"/><rect x="560" y="640" width="300" height="220" fill="#34312E"/><circle cx="300" cy="790" r="70" fill="#EFD98F"/><path d="M120 900 H880" stroke="#34312E" stroke-width="3"/>`;
  return svg(w, h, grain(0.1), b + grainRect);
});

/* ---------------------------------------------------------------- textures */

add("tex-linen", SQ, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#DED4C2"/>`;
  for (let y = 0; y < h; y += 6) b += `<rect y="${y}" width="${w}" height="${R(1.5, 3.4)}" fill="#F2EADC" opacity="${R(0.3, 0.8)}"/>`;
  for (let x = 0; x < w; x += 6) b += `<rect x="${x}" width="${R(1, 2.6)}" height="${h}" fill="#BFB29C" opacity="${R(0.2, 0.55)}"/>`;
  for (let i = 0; i < 60; i++) b += `<rect x="${R(0, w)}" y="${R(0, h)}" width="${R(40, 160)}" height="${R(3, 5)}" fill="#C9BCA6" opacity=".7"/>`;
  return svg(w, h, grain(0.14, 1.2), b + `<rect width="${w}" height="${h}" fill="url(#vig)"/>` + grainRect).replace("<defs>", "<defs>" + vignette(0.22));
});

add("tex-knit", SQ, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#D7D2CB"/>`;
  for (let y = -20; y < h + 20; y += 26) {
    for (let x = 0; x < w; x += 40) {
      b += `<path d="M${x + 2} ${y} q8 18 18 22 q10 -4 18 -22 q-8 22 -18 30 q-10 -8 -18 -30Z" fill="#EEEAE4"/><path d="M${x + 20} ${y + 22} q-6 4 -18 -20" stroke="#A7A097" stroke-width="2" fill="none"/>`;
    }
  }
  return svg(w, h, grain(0.12), b + `<rect width="${w}" height="${h}" fill="url(#vig)"/>` + grainRect).replace("<defs>", "<defs>" + vignette(0.28));
});

add("tex-terrazzo", SQ, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#EFE8DC"/>`;
  const cols = ["#B9A9C9", "#A9B89E", "#E9C9C0", "#34312E", "#EFD98F", "#C9BBA7"];
  for (let i = 0; i < 220; i++) {
    const x = R(0, w), y = R(0, h), s = R(6, 34);
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + R(-0.4, 0.4);
      const r = s * R(0.5, 1);
      return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`;
    });
    b += `<polygon points="${pts.join(" ")}" fill="${pick(cols)}"/>`;
  }
  return svg(w, h, grain(0.12), b + grainRect);
});

add("tex-marble", P, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#F1EEEA"/><rect width="${w}" height="${h}" filter="url(#marble)"/>`;
  return svg(w, h, grain(0.06) + `<filter id="marble"><feTurbulence type="fractalNoise" baseFrequency=".006 .02" numOctaves="5" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .52  0 0 0 0 .55  0 0 0 -2.6 1.7"/></filter>`, b + grainRect);
});

add("tex-crumpled", LAND, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#EDE6EE" filter="url(#paper)"/>`;
  return svg(w, h, grain(0.06) + `<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="4" seed="9" result="n"/><feDiffuseLighting in="n" lighting-color="#F4EEF6" surfaceScale="5" result="l"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting><feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/></filter>`, b + grainRect);
});

/* ------------------------------------------------------------------- urban */

add("urban-windows", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#C6C2BC"/>`;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 5; c++) {
      const x = 60 + c * 165, y = 50 + r * 125;
      const lit = rnd() < 0.18;
      b += `<rect x="${x}" y="${y}" width="120" height="90" fill="${lit ? "#F6DFA8" : pick(["#8E949A", "#9EA3A7", "#7F858C"])}"/><rect x="${x}" y="${y + 90}" width="120" height="8" fill="#E9E5DF"/>`;
      if (!lit) b += `<path d="M${x} ${y} L${x + 120} ${y} L${x} ${y + 60}Z" fill="#fff" opacity=".18"/>`;
    }
  b += `<rect width="${w}" height="${h}" fill="url(#dawn)"/>`;
  return svg(w, h, grain(0.1) + `<linearGradient id="dawn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3D9C9" stop-opacity=".45"/><stop offset="1" stop-color="#5D5F6A" stop-opacity=".25"/></linearGradient>`, b + grainRect);
});

add("urban-crosswalk", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#5F5D5A"/>`;
  for (let i = 0; i < 9; i++) b += `<rect x="${-100 + i * 150}" y="0" width="80" height="${h}" fill="#ECE6DA" transform="skewX(-12)"/>`;
  b += `<g fill="#1E1C1B" opacity=".45" filter="url(#b5)"><ellipse cx="420" cy="520" rx="22" ry="190" transform="rotate(38 420 520)"/><ellipse cx="760" cy="420" rx="22" ry="210" transform="rotate(38 760 420)"/></g>`;
  return svg(w, h, grain(0.14) + blur("b5", 5), b + grainRect);
});

add("urban-skyline", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  const layers = [
    ["#D7D1DA", 380],
    ["#BDB7C4", 470],
    ["#9F99A8", 560],
    ["#7E7987", 650],
  ];
  for (const [c, base] of layers) {
    let x = 0, d = `M0 ${h} V${base}`;
    while (x < w) {
      const bw = R(50, 140), bh = R(40, 220);
      d += ` V${base - bh} H${x + bw}`;
      x += bw;
    }
    d += ` V${h}Z`;
    b += `<path d="${d}" fill="${c}"/>`;
  }
  b += `<circle cx="${w * 0.75}" cy="260" r="60" fill="#FFF1D6" opacity=".9" filter="url(#b20)"/>`;
  return svg(w, h, grain(0.08) + blur("b20", 20) + `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5DDE8"/><stop offset="1" stop-color="#F5E5D0"/></linearGradient>`, b + grainRect);
});

/* --------------------------------------------------------- fashion details */

add("fd-buttons", SQ, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#C9D3BF"/>`;
  for (let i = 0; i < 18; i++) {
    const x = R(80, w - 80), y = R(80, h - 80), r = R(28, 60);
    b += `<g transform="translate(${x} ${y})"><circle r="${r}" cx="5" cy="8" fill="#3E4A3A" opacity=".35" filter="url(#b4)"/><circle r="${r}" fill="url(#shell)"/><circle r="${r * 0.72}" fill="none" stroke="#C8BFAE" stroke-width="2"/>${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, c]) => `<circle cx="${a * r * 0.18}" cy="${c * r * 0.18}" r="${r * 0.08}" fill="#8D8474"/>`).join("")}</g>`;
  }
  return svg(w, h, grain(0.1) + blur("b4", 4) + `<radialGradient id="shell" cx="35%" cy="35%"><stop offset="0" stop-color="#FFFDF8"/><stop offset=".7" stop-color="#EDE6DA"/><stop offset="1" stop-color="#D8CFC0"/></radialGradient>`, b + grainRect);
});

add("fd-pleats", P, ([w, h]) => {
  let b = "";
  for (let x = 0; x < w; x += 60) b += `<rect x="${x}" width="60" height="${h}" fill="url(#pleat)"/>`;
  return svg(w, h, grain(0.08) + `<linearGradient id="pleat"><stop offset="0" stop-color="#E9C9C0"/><stop offset=".55" stop-color="#F7E9E4"/><stop offset=".56" stop-color="#C9A49A"/><stop offset="1" stop-color="#E2BCB1"/></linearGradient>`, b + `<rect width="${w}" height="${h}" fill="url(#vig)"/>` + grainRect).replace("<defs>", "<defs>" + vignette(0.2));
});

add("fd-stitching", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#55657E"/><rect width="${w}" height="${h}" fill="url(#tw)"/>`;
  b += `<path d="M0 520 Q600 380 1200 470 V900 H0Z" fill="#4A5970"/><path d="M0 520 Q600 380 1200 470" stroke="#34405A" stroke-width="6" fill="none"/>`;
  b += `<path d="M0 548 Q600 408 1200 498" stroke="#D9A35B" stroke-width="5" stroke-dasharray="18 10" fill="none"/><path d="M0 566 Q600 426 1200 516" stroke="#D9A35B" stroke-width="5" stroke-dasharray="18 10" fill="none"/>`;
  b += `<circle cx="860" cy="250" r="44" fill="#B7A27E"/><circle cx="860" cy="250" r="30" fill="none" stroke="#8D7A57" stroke-width="4"/>`;
  return svg(w, h, grain(0.12) + `<pattern id="tw" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" stroke="#2E3A50" stroke-width="2" opacity=".5"/></pattern>`, b + grainRect);
});

add("fd-scallop", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#B9A9C9"/><rect width="${w}" height="${h * 0.58}" fill="#FBF8F2"/>`;
  for (let x = 0; x < w + 60; x += 60) {
    b += `<path d="M${x - 30} ${h * 0.58} a30 30 0 0 0 60 0" fill="#FBF8F2"/><circle cx="${x}" cy="${h * 0.58 - 2}" r="6" fill="#B9A9C9"/>`;
  }
  for (let y = 60; y < h * 0.5; y += 90) for (let x = 40; x < w; x += 90) b += `<circle cx="${x + ((y / 90) % 2) * 45}" cy="${y}" r="9" fill="none" stroke="#D9D0E2" stroke-width="3"/>`;
  return svg(w, h, grain(0.08), b + grainRect);
});

/* -------------------------------------------------------------- historical */

add("hist-deco", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#2F3A56"/>`;
  for (let i = 0; i < 24; i++) {
    const a = Math.PI + (Math.PI * i) / 23;
    b += `<line x1="${w / 2}" y1="${h * 0.7}" x2="${w / 2 + Math.cos(a) * 700}" y2="${h * 0.7 + Math.sin(a) * 700}" stroke="#D9C38F" stroke-width="3" opacity=".8"/>`;
  }
  for (const r of [160, 250, 340]) b += `<path d="M${w / 2 - r} ${h * 0.7} a${r} ${r} 0 0 1 ${r * 2} 0" fill="none" stroke="#D9C38F" stroke-width="6"/>`;
  b += `<rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#232C42"/><path d="M0 ${h * 0.72} H${w} M0 ${h * 0.74} H${w}" stroke="#D9C38F" stroke-width="3"/>`;
  return svg(w, h, grain(0.1), b + grainRect);
});

add("hist-damask", P, ([w, h]) => {
  const motif = (x, y) => `<g transform="translate(${x} ${y})" fill="#C8BBA0"><path d="M0 -110 C30 -70 60 -60 60 -20 C60 20 20 30 0 70 C-20 30 -60 20 -60 -20 C-60 -60 -30 -70 0 -110Z"/><path d="M0 -60 C14 -40 26 -30 26 -14 C26 6 10 12 0 30 C-10 12 -26 6 -26 -14 C-26 -30 -14 -40 0 -60Z" fill="#EAE2D1"/><path d="M-60 -20 C-100 -40 -110 10 -80 20 M60 -20 C100 -40 110 10 80 20" stroke="#C8BBA0" stroke-width="6" fill="none"/></g>`;
  let b = `<rect width="${w}" height="${h}" fill="#E4DACA"/>`;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) b += motif(c * 280 + (r % 2) * 140 + 40, r * 230 + 120);
  return svg(w, h, grain(0.12), b + `<rect width="${w}" height="${h}" fill="url(#vig)"/>` + grainRect).replace("<defs>", "<defs>" + vignette(0.25));
});

add("hist-bauhaus", P, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#EEE6D6"/><circle cx="560" cy="360" r="230" fill="#D98F77"/><rect x="90" y="520" width="520" height="70" fill="#2B2826"/><rect x="300" y="610" width="70" height="420" fill="#2F3A56"/><path d="M620 1040 L860 620 L860 1040Z" fill="#E9C46A"/><circle cx="180" cy="210" r="60" fill="none" stroke="#2B2826" stroke-width="10"/>`;
  return svg(w, h, grain(0.1), b + grainRect);
});

/* --------------------------------------------------------------- lifestyle */

add("life-window-light", LAND, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#E8E1D7"/>`;
  for (let i = 0; i < 6; i++) b += `<path d="M0 ${150 + i * 130} C300 ${100 + i * 130} 700 ${220 + i * 130} ${w} ${140 + i * 130}" stroke="#CFC5B7" stroke-width="40" fill="none" opacity=".55" filter="url(#b10)"/>`;
  b += `<g fill="#FFF6E2" opacity=".75" filter="url(#b10)" transform="skewX(-18) translate(260 0)"><rect x="300" y="120" width="180" height="250"/><rect x="500" y="120" width="180" height="250"/><rect x="300" y="390" width="180" height="250"/><rect x="500" y="390" width="180" height="250"/></g>`;
  return svg(w, h, grain(0.1) + blur("b10", 10), b + grainRect);
});

add("life-coffee", SQ, ([w, h]) => {
  const b = `<rect width="${w}" height="${h}" fill="#D9CBB6"/><rect width="${w}" height="${h}" fill="url(#wood)"/>
  <ellipse cx="420" cy="460" rx="190" ry="190" fill="#4A3F36" opacity=".3" transform="translate(30 30)" filter="url(#b10)"/>
  <circle cx="420" cy="460" r="190" fill="#F6F1E8"/><circle cx="420" cy="460" r="110" fill="#EEE7DA"/><circle cx="420" cy="460" r="78" fill="#F6F1E8"/><circle cx="420" cy="460" r="62" fill="#8A5C3C"/><circle cx="400" cy="440" r="18" fill="#C69A70" opacity=".6"/>
  <path d="M640 220 l220 -40 l30 170 l-220 40Z" fill="#F3EEE3"/><path d="M670 240 l170 -30 M676 270 l150 -26 M682 300 l160 -28" stroke="#9A928A" stroke-width="3"/>
  <circle cx="760" cy="760" r="70" fill="#E9C9C0"/><path d="M700 740 q60 -30 120 0" stroke="#C98E8A" stroke-width="6" fill="none"/>`;
  return svg(w, h, grain(0.12) + blur("b10", 10) + `<pattern id="wood" width="${w}" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 Q250 14 500 22 T1000 18" stroke="#C4B399" stroke-width="3" fill="none"/></pattern>`, b + grainRect);
});

add("life-beach", P, ([w, h]) => {
  let b = `<rect width="${w}" height="${h}" fill="#EAD9BD"/>`;
  b += `<g transform="rotate(-14 ${w / 2} ${h / 2}) translate(120 160)"><rect width="560" height="820" fill="#F7F2E8"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect y="${i * 120 + 20}" width="560" height="50" fill="${["#B9A9C9", "#A9B89E", "#E9C46A"][i % 3]}"/>`).join("")}<rect width="560" height="820" fill="url(#fold)"/></g>`;
  b += `<ellipse cx="760" cy="140" rx="140" ry="40" fill="#6B5B48" opacity=".25" filter="url(#b10)"/>`;
  return svg(w, h, grain(0.14) + blur("b10", 10) + `<linearGradient id="fold"><stop offset="0" stop-color="#000" stop-opacity=".06"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset=".52" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".02"/></linearGradient>`, b + grainRect);
});

/* ----------------------------------------------------------------- render */

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const meta = {};
for (const a of assets) {
  const [w, h] = a.size;
  const markup = a.make(a.size);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${markup}</body></html>`);
  await page.waitForTimeout(50);
  const file = join(outDir, `${a.id}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 84, clip: { x: 0, y: 0, width: w, height: h } });
  // dominant colour: average of a downscaled canvas
  const dominant = await page.evaluate(async ([svgMarkup, ww, hh]) => {
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) (r += d[i]), (g += d[i + 1]), (b += d[i + 2]);
    const n = d.length / 4;
    return "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
    void ww; void hh;
  }, [markup, w, h]);
  meta[a.id] = { width: w, height: h, dominant };
  process.stdout.write(".");
}
await browser.close();
writeFileSync(join(root, "src/lib/inspiration/generated.json"), JSON.stringify(meta, null, 2));
console.log(`\n${assets.length} images written to public/library/inspiration`);
