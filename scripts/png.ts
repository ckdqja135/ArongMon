import { deflateSync, inflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function encodePng(w: number, h: number, rgba: Uint8ClampedArray): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** 간단한 캔버스: 그리드들을 배치하고 정수 배율로 확대해서 PNG로 저장 */
export class Sheet {
  data: Uint8ClampedArray;
  constructor(public w: number, public h: number, bg = [96, 96, 112]) {
    this.data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) this.data.set([bg[0], bg[1], bg[2], 255], i * 4);
  }
  blit(rgba: Uint8ClampedArray, gw: number, gh: number, ox: number, oy: number) {
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const s = (y * gw + x) * 4;
        if (rgba[s + 3] === 0) continue;
        const tx = ox + x, ty = oy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        this.data.set(rgba.subarray(s, s + 4), (ty * this.w + tx) * 4);
      }
  }
  png(scale: number): Buffer {
    const W = this.w * scale, H = this.h * scale;
    const out = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const s = ((Math.floor(y / scale)) * this.w + Math.floor(x / scale)) * 4;
        out.set(this.data.subarray(s, s + 4), (y * W + x) * 4);
      }
    return encodePng(W, H, out);
  }
}

/** 8비트 RGB/RGBA PNG 읽기 (인터레이스 없음) */
export function decodePng(buf: Buffer): { w: number; h: number; data: Uint8ClampedArray } {
  let p = 8;
  let w = 0, h = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error('8비트, 인터레이스 없는 PNG만 지원');
      colorType = body[9];
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!bpp) throw new Error(`지원하지 않는 색 형식 ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = px[i * bpp];
    data[i * 4 + 1] = px[i * bpp + 1];
    data[i * 4 + 2] = px[i * bpp + 2];
    data[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255;
  }
  return { w, h, data };
}
