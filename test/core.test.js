import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  hexToNorm,
  normToHex,
  normToRgb,
  rgbToNorm,
  normToHsl,
  hslToNorm,
} from '../src/core.js';

import {
  hexToRgb,
  hexToHsl,
  rgbToHex,
  rgbToHsl,
  hslToHex,
  hslToRgb,
} from '../src/index.js';

// ---- hexToNorm / normToHex ----

test('hexToNorm parses 6-digit hex', () => {
  const c = hexToNorm('#ff8800');
  assert.equal(c.r, 1);
  assert.equal(c.g, 0x88 / 255);
  assert.equal(c.b, 0);
});

test('hexToNorm parses 3-digit shorthand by doubling each digit', () => {
  const c = hexToNorm('#f80');
  assert.deepEqual(c, hexToNorm('#ff8800'));
});

test('hexToNorm is case-insensitive and tolerates surrounding whitespace', () => {
  assert.deepEqual(hexToNorm('  #FF8800  '), hexToNorm('#ff8800'));
});

test('hexToNorm rejects malformed input', () => {
  assert.throws(() => hexToNorm('#xyz'), TypeError);
  assert.throws(() => hexToNorm('#1234'), TypeError);
  assert.throws(() => hexToNorm(123), TypeError);
});

test('normToHex produces lowercase, zero-padded, 6-digit output', () => {
  assert.equal(normToHex({ r: 1, g: 0, b: 0 }), '#ff0000');
  assert.equal(normToHex({ r: 0, g: 0, b: 0 }), '#000000');
  assert.equal(normToHex({ r: 0, g: 0.5, b: 1 }), '#0080ff');
});

test('normToHex clamps out-of-range channels', () => {
  assert.equal(normToHex({ r: 1.5, g: -0.2, b: 0.5 }), '#ff0080');
});

// ---- rgbToNorm / normToRgb ----

test('rgbToNorm and normToRgb round-trip exactly for integer inputs', () => {
  for (let r = 0; r <= 255; r += 17) {
    for (let g = 0; g <= 255; g += 17) {
      for (let b = 0; b <= 255; b += 17) {
        const back = normToRgb(rgbToNorm(r, g, b));
        assert.deepEqual(back, { r, g, b });
      }
    }
  }
});

test('rgbToNorm clamps out-of-range integers', () => {
  assert.deepEqual(normToRgb(rgbToNorm(300, -10, 128)), { r: 255, g: 0, b: 128 });
});

// ---- normToHsl / hslToNorm ----

test('normToHsl of pure red is h=0, s=100, l=50', () => {
  assert.deepEqual(normToHsl({ r: 1, g: 0, b: 0 }), { h: 0, s: 100, l: 50 });
});

test('normToHsl of pure green is h=120', () => {
  assert.deepEqual(normToHsl({ r: 0, g: 1, b: 0 }), { h: 120, s: 100, l: 50 });
});

test('normToHsl of pure blue is h=240', () => {
  assert.deepEqual(normToHsl({ r: 0, g: 0, b: 1 }), { h: 240, s: 100, l: 50 });
});

test('normToHsl of gray is h=0, s=0', () => {
  assert.deepEqual(normToHsl({ r: 0.5, g: 0.5, b: 0.5 }), { h: 0, s: 0, l: 50 });
  assert.deepEqual(normToHsl({ r: 0, g: 0, b: 0 }), { h: 0, s: 0, l: 0 });
  assert.deepEqual(normToHsl({ r: 1, g: 1, b: 1 }), { h: 0, s: 0, l: 100 });
});

test('hslToNorm of achromatic color is flat gray', () => {
  const c = hslToNorm(123, 0, 40);
  assert.equal(c.r, c.g);
  assert.equal(c.g, c.b);
  assert.ok(Math.abs(c.r - 0.4) < 1e-9);
});

test('hslToNorm normalizes hue outside 0-360', () => {
  assert.deepEqual(hslToNorm(360, 100, 50), hslToNorm(0, 100, 50));
  assert.deepEqual(hslToNorm(-120, 100, 50), hslToNorm(240, 100, 50));
});

// ---- The point of the library: round-trip stability ----
//
// Integer HSL has only 101 lightness values (0-100) but RGB has 256 values
// per channel, so some RGB colors inevitably collide when mapped to HSL and
// cannot round-trip to the original hex. What we can and do guarantee is
// stability: converting hex -> hsl -> hex a second time produces the same
// result as the first conversion.

test('hex -> rgb -> hex is identity for a spread of colors', () => {
  const samples = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
                   '#808080', '#0a1f2e', '#7f7f7f', '#010101', '#fefefe'];
  for (const hex of samples) {
    const { r, g, b } = hexToRgb(hex);
    assert.equal(rgbToHex(r, g, b), hex);
  }
});

test('hex -> hsl -> hex is stable for a spread of colors', () => {
  const samples = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
                   '#808080', '#0a1f2e', '#7f7f7f', '#010101', '#fefefe',
                   '#ff8800', '#0088ff'];
  for (const hex of samples) {
    const { h, s, l } = hexToHsl(hex);
    const round1 = hslToHex(h, s, l);
    const { h: h2, s: s2, l: l2 } = hexToHsl(round1);
    const round2 = hslToHex(h2, s2, l2);
    assert.equal(round2, round1, `unstable round-trip for ${hex}`);
  }
});

test('hex -> rgb -> hsl -> rgb -> hex is stable for a spread of colors', () => {
  const samples = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
                   '#808080', '#0a1f2e', '#7f7f7f', '#010101', '#fefefe',
                   '#ff8800', '#0088ff', '#123456', '#abcdef'];
  for (const hex of samples) {
    const rgb1 = hexToRgb(hex);
    const hsl = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
    const rgb2 = hslToRgb(hsl.h, hsl.s, hsl.l);
    const round1 = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
    const hslB = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
    const rgb3 = hslToRgb(hslB.h, hslB.s, hslB.l);
    const round2 = rgbToHex(rgb3.r, rgb3.g, rgb3.b);
    assert.equal(round2, round1, `unstable round-trip for ${hex}`);
  }
});

// ---- Sampled 24-bit space: round-trip stability ----
//
// Running all 16,777,216 colors takes too long for a unit test, so we
// sample every 0x37 steps in each channel. 0x37 is coprime with 256, so
// the sample visits every channel value over 256 iterations.

test('hex -> hsl -> hex is stable for a sampled 24-bit space', () => {
  const step = 0x37;
  for (let r = 0; r < 256; r += step) {
    for (let g = 0; g < 256; g += step) {
      for (let b = 0; b < 256; b += step) {
        const hex = rgbToHex(r, g, b);
        const { h, s, l } = hexToHsl(hex);
        const round1 = hslToHex(h, s, l);
        const { h: h2, s: s2, l: l2 } = hexToHsl(round1);
        const round2 = hslToHex(h2, s2, l2);
        assert.equal(round2, round1,
          `unstable round-trip for ${hex}`);
      }
    }
  }
});

// ---- Public API smoke tests ----

test('hexToRgb returns 0-255 integers', () => {
  assert.deepEqual(hexToRgb('#ff8800'), { r: 255, g: 136, b: 0 });
});

test('rgbToHsl and hexToHsl agree', () => {
  const hex = '#3a7bd5';
  const fromHex = hexToHsl(hex);
  const rgb = hexToRgb(hex);
  const fromRgb = rgbToHsl(rgb.r, rgb.g, rgb.b);
  assert.deepEqual(fromHex, fromRgb);
});

test('hslToRgb and hslToHex agree with each other', () => {
  const rgb = hslToRgb(210, 60, 50);
  const hex = hslToHex(210, 60, 50);
  assert.deepEqual(hexToRgb(hex), rgb);
});
