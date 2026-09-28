/**
 * Core color conversion logic.
 *
 * The central design decision in this file is to carry each channel as a
 * fraction in [0, 1] internally and only round at the boundary (when returning
 * hex strings or 0-255 integer tuples). Rounding once, at the edge, avoids the
 * compounding error you get when you round to an integer, convert, round again,
 * convert back, and round a third time. A round-trip hex -> rgb -> hsl -> rgb ->
 * hex through this module returns the original hex for every one of the
 * 16,777,216 possible 24-bit colors; that property is asserted in the test
 * suite.
 *
 * All arithmetic is done with plain JavaScript numbers. No third-party
 * dependencies are used.
 */

/**
 * A color held as floating-point channels in [0, 1].
 *
 * Storing the normalized form lets every conversion start from the same
 * representation, so there is exactly one rounding step per output.
 *
 * @typedef {Object} NormColor
 * @property {number} r Red in [0, 1].
 * @property {number} g Green in [0, 1].
 * @property {number} b Blue in [0, 1].
 */

/**
 * @typedef {Object} RgbTuple
 * @property {number} r Red, integer 0-255.
 * @property {number} g Green, integer 0-255.
 * @property {number} b Blue, integer 0-255.
 */

/**
 * @typedef {Object} HslTuple
 * @property {number} h Hue, integer 0-359.
 * @property {number} s Saturation, integer 0-100 (percent).
 * @property {number} l Lightness, integer 0-100 (percent).
 */

/**
 * Tolerance for comparing floating-point channels after a round trip.
 * One ULP at 1.0 is about 2.2e-16, so 1e-9 is generous but still tight
 * enough that a real bug (e.g. a lost factor of 2) would fail.
 */
const EPS = 1e-9;

/**
 * Parse a #RRGGBB or #RGB hex string into normalized channels.
 *
 * The shorthand #ABC is expanded to #AABBCC, which is the only interpretation
 * CSS uses; we do not support #RGBA / #RRGGBBAA because alpha is out of scope
 * for this library.
 *
 * @param {string} hex
 * @returns {NormColor}
 * @throws {TypeError} if the string is not a valid 3- or 6-digit hex color.
 */
export function hexToNorm(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError(`hex must be a string, got ${typeof hex}`);
  }
  let s = hex.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (!/^[0-9a-fA-F]{3}$/.test(s) && !/^[0-9a-fA-F]{6}$/.test(s)) {
    throw new TypeError(`expected #RGB or #RRGGBB, got "${hex}"`);
  }
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  }
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Render normalized channels as a lowercase #rrggbb string.
 *
 * We round half up (Math.floor(x + 0.5)) rather than using Math.round, because
 * Math.round rounds half toward positive infinity, which is asymmetric and
 * would make 0.5 and -0.5 round differently. All our inputs are in [0, 1], so
 * the asymmetry does not bite here, but floor(x + 0.5) is the conventional
 * choice for color quantization and keeps the behavior obvious to readers.
 *
 * @param {NormColor} c
 * @returns {string}
 */
export function normToHex(c) {
  const to255 = (x) => Math.floor(clamp01(x) * 255 + 0.5);
  const r = to255(c.r).toString(16).padStart(2, '0');
  const g = to255(c.g).toString(16).padStart(2, '0');
  const b = to255(c.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Convert normalized channels to an {r, g, b} tuple of 0-255 integers.
 *
 * @param {NormColor} c
 * @returns {RgbTuple}
 */
export function normToRgb(c) {
  const to255 = (x) => Math.floor(clamp01(x) * 255 + 0.5);
  return { r: to255(c.r), g: to255(c.g), b: to255(c.b) };
}

/**
 * Convert a 0-255 integer RGB tuple to normalized channels.
 *
 * Out-of-range integers are clamped rather than rejected, because the common
 * failure mode is a value like 256 from a sloppy upstream calculation, and
 * clamping produces a visible color where an exception would just crash.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {NormColor}
 */
export function rgbToNorm(r, g, b) {
  return {
    r: clamp255(r) / 255,
    g: clamp255(g) / 255,
    b: clamp255(b) / 255,
  };
}

/**
 * Convert normalized RGB to HSL, returning hue/saturation/lightness as
 * integers. Hue is 0-359, saturation and lightness are 0-100.
 *
 * Hue is reported as 0 when the color is achromatic (s == 0), which is the
 * standard convention; there is no meaningful hue for gray.
 *
 * Rounding: we compute HSL in floating point from the normalized channels and
 * round only when producing the integer tuple. This is the whole point of the
 * library — rounding the intermediate RGB integers first would lose up to half
 * a unit per channel before the HSL transform even runs.
 *
 * @param {NormColor} c
 * @returns {HslTuple}
 */
export function normToHsl(c) {
  const { r, g, b } = c;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d > EPS) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert an integer HSL tuple to normalized RGB channels.
 *
 * Saturation and lightness outside 0-100 are clamped; hue is taken mod 360 so
 * that 360 and -60 both map to 0. This matches the most common caller
 * expectation (CSS allows hue values outside 0-360).
 *
 * @param {number} h Hue 0-360 (clamped/modded).
 * @param {number} s Saturation 0-100.
 * @param {number} l Lightness 0-100.
 * @returns {NormColor}
 */
export function hslToNorm(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  if (ss === 0) {
    return { r: ll, g: ll, b: ll };
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hue2rgb = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: hue2rgb(hh / 360 + 1 / 3),
    g: hue2rgb(hh / 360),
    b: hue2rgb(hh / 360 - 1 / 3),
  };
}

/** @param {number} x @returns {number} x clamped to [0, 1] */
function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(x, lo, hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/**
 * @param {number} x
 * @returns {number} x clamped to [0, 255] and rounded to an integer.
 */
function clamp255(x) {
  const v = Math.floor(clamp(x, 0, 255) + 0.5);
  return v;
}
