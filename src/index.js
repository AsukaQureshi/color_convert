/**
 * Public API for color-convert.
 *
 * The exports here are thin wrappers around the normalized-channel core in
 * core.js. Each public function takes one color representation and returns
 * another, routing through the normalized form so there is exactly one
 * rounding step per output.
 */

import {
  hexToNorm,
  normToHex,
  normToRgb,
  rgbToNorm,
  normToHsl,
  hslToNorm,
} from './core.js';

/**
 * Convert #RRGGBB (or #RGB) to an {r, g, b} tuple of 0-255 integers.
 *
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  return normToRgb(hexToNorm(hex));
}

/**
 * Convert #RRGGBB (or #RGB) to an {h, s, l} tuple of integers.
 * h is 0-359, s and l are 0-100.
 *
 * @param {string} hex
 * @returns {{h: number, s: number, l: number}}
 */
export function hexToHsl(hex) {
  return normToHsl(hexToNorm(hex));
}

/**
 * Convert 0-255 integer RGB to a lowercase #rrggbb string.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  return normToHex(rgbToNorm(r, g, b));
}

/**
 * Convert 0-255 integer RGB to an {h, s, l} tuple of integers.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{h: number, s: number, l: number}}
 */
export function rgbToHsl(r, g, b) {
  return normToHsl(rgbToNorm(r, g, b));
}

/**
 * Convert integer HSL (h 0-359, s/l 0-100) to a lowercase #rrggbb string.
 *
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string}
 */
export function hslToHex(h, s, l) {
  return normToHex(hslToNorm(h, s, l));
}

/**
 * Convert integer HSL (h 0-359, s/l 0-100) to an {r, g, b} tuple of 0-255
 * integers.
 *
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {{r: number, g: number, b: number}}
 */
export function hslToRgb(h, s, l) {
  return normToRgb(hslToNorm(h, s, l));
}
