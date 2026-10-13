"""Ink-profile a PNG (pure zlib+numpy; no PIL) — lets an agent 'see' a page as text.

Usage: python tools/png-ink.py <file.png> [cols] [rows]
Prints: dimensions, ink coverage, the ink bounding box, and an ASCII density grid.
"""
import sys
import zlib
import numpy as np

RAMP = " .:-=+*#%@"


def read_png_gray(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat, meta = 8, [], None
    while pos < len(data):
        ln = int.from_bytes(data[pos:pos + 4], "big")
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, depth, color, comp, filt, inter = (
                int.from_bytes(chunk[0:4], "big"), int.from_bytes(chunk[4:8], "big"),
                chunk[8], chunk[9], chunk[10], chunk[11], chunk[12])
            meta = dict(w=w, h=h, depth=depth, color=color, interlace=inter)
        elif typ == b"IDAT":
            idat.append(chunk)
        elif typ == b"IEND":
            break
        pos += 12 + ln
    assert meta and meta["interlace"] == 0, "interlaced PNG unsupported"
    depth, color, w, h = meta["depth"], meta["color"], meta["w"], meta["h"]
    nch = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    bpp = max(1, nch * depth // 8)
    raw = zlib.decompress(b"".join(idat))
    stride = w * nch * (depth // 8)
    out = np.zeros((h, stride), dtype=np.uint8)
    prev = np.zeros(stride, dtype=np.uint8)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = np.frombuffer(raw[p:p + stride], dtype=np.uint8).astype(np.int32).copy(); p += stride
        if f == 0:
            cur = line
        elif f == 1:
            cur = line
            for i in range(bpp, stride):
                cur[i] = (cur[i] + cur[i - bpp]) & 0xFF
        elif f == 2:
            cur = (line + prev.astype(np.int32)) & 0xFF
        elif f == 3:
            cur = line
            pl = prev.astype(np.int32)
            for i in range(stride):
                a = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((a + pl[i]) >> 1)) & 0xFF
        elif f == 4:
            cur = line
            pl = prev.astype(np.int32)
            for i in range(stride):
                a = cur[i - bpp] if i >= bpp else 0
                b = pl[i]
                c = pl[i - bpp] if i >= bpp else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                cur[i] = (cur[i] + pr) & 0xFF
        else:
            raise ValueError("filter %d" % f)
        out[y] = cur.astype(np.uint8)
        prev = out[y]
    if depth == 16:
        out = out[:, ::2]
    arr = out.reshape(h, w, nch).astype(np.float32)
    if nch >= 3:
        arr = arr[..., :3].mean(axis=2)
    elif nch == 2:
        arr = arr[..., 0]
    else:
        arr = arr[..., 0]
    return arr / 255.0


def report(path, cols=96, rows=34):
    img = read_png_gray(path)
    h, w = img.shape
    ink = 1.0 - img
    ys, xs = np.where(ink > 0.25)
    box = None if len(xs) == 0 else (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    print("%s  %dx%d  coverage %.1f%%  inkBox %s" % (path, w, h, ink.mean() * 100, box))
    ry = np.linspace(0, h, rows + 1).astype(int)
    rx = np.linspace(0, w, cols + 1).astype(int)
    for r in range(rows):
        line = ""
        for c in range(cols):
            blk = ink[ry[r]:ry[r + 1], rx[c]:rx[c + 1]]
            d = float(blk.mean()) if blk.size else 0.0
            line += RAMP[min(len(RAMP) - 1, int(round(d * 22)))]
        print(line)


if __name__ == "__main__":
    report(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 96,
           int(sys.argv[3]) if len(sys.argv) > 3 else 34)
