// Coarse ink map: read P5 PGM files and print an ASCII density grid (no image viewer needed).
import fs from "node:fs";

function readPgm(buf) {
  // tokenise the header: P5 <w> <h> <max>
  let i = 0;
  const tok = () => {
    while (buf[i] === 0x23) { while (buf[i] !== 0x0a) i++; }   // comment
    while (/\s/.test(String.fromCharCode(buf[i]))) i++;
    let s = "";
    while (i < buf.length && !/\s/.test(String.fromCharCode(buf[i]))) s += String.fromCharCode(buf[i++]);
    return s;
  };
  const magic = tok();
  if (magic !== "P5") throw new Error("not P5: " + magic);
  const w = Number(tok()), h = Number(tok()), max = Number(tok());
  i++; // single whitespace after maxval
  return { w, h, max, px: buf.subarray(i) };
}

const RAMP = " .:-=+*#%@";
export function inkMap(file, cols = 96, rows = 34) {
  const { w, h, max, px } = readPgm(fs.readFileSync(file));
  const out = [];
  let ink = 0, minX = w, maxX = -1, minY = h, maxY = -1;
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * w) / cols), x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / cols));
      const y0 = Math.floor((r * h) / rows), y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / rows));
      let sum = 0, n = 0, dark = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = 1 - px[y * w + x] / max;   // 1 = black
          sum += v; n++;
          if (v > 0.25) { dark++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
      }
      const d = sum / n; ink += sum;
      line += RAMP[Math.min(RAMP.length - 1, Math.round(d * 22))];
    }
    out.push(line);
  }
  return {
    dims: `${w}x${h}`, coverage: ink / (w * h),
    inkBox: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    art: out.join("\n"),
  };
}

if (process.argv[2]) {
  for (let p = 1; p <= 6; p++) {
    const f = process.argv[2].replace("%d", String(p));
    if (!fs.existsSync(f)) continue;
    const m = inkMap(f);
    console.log(`\n===== page ${p}  ${m.dims}  coverage ${(m.coverage * 100).toFixed(1)}%  inkBox ${JSON.stringify(m.inkBox)} =====`);
    console.log(m.art);
  }
}
