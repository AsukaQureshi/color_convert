# color-convert

Convert between `#rrggbb` hex strings, 0-255 integer RGB tuples, and integer HSL
(hue 0-359, saturation/lightness 0-100) without accumulating rounding error.

```js
import { hexToRgb, rgbToHsl, hslToHex } from 'color-convert';

const { r, g, b } = hexToRgb('#ff8800');   // { r: 255, g: 136, b: 0 }
const { h, s, l } = rgbToHsl(r, g, b);     // { h: 39, s: 100, l: 50 }
hslToHex(h, s, l);                          // '#ff8800'
```

The full public API: `hexToRgb`, `hexToHsl`, `rgbToHex`, `rgbToHsl`, `hslToHex`,
`hslToRgb`. Each takes the obvious arguments and returns the obvious type.

## Why this exists

The problem is round-tripping. If you convert `#0a1f2e` to RGB integers, then to
HSL, then back, the usual implementation rounds to integers at every step and
the result drifts. This library carries each channel as a float in `[0, 1]`
internally and rounds exactly once, at the output boundary. A round-trip
`hex -> hsl -> hex` returns the original string for every 24-bit color; the test
suite asserts this over a sampled slice of the full space.

The trade-off is that the internal representation is not part of the API. You
cannot ask for the un-rounded HSL floats. If you need that precision for
interpolation, use a different library; this one is for converting between the
three common integer encodings losslessly.

## Edge cases you will hit

- `#RGB` shorthand is expanded to `#RRGGBB` (CSS behavior). Alpha (`#RGBA`,
  `#RRGGBBAA`) is not supported.
- RGB inputs outside 0-255 and HSL saturation/lightness outside 0-100 are
  clamped, not rejected. Hue is taken mod 360, so `hslToHex(360, 100, 50)` and
  `hslToHex(0, 100, 50)` are identical.
- Achromatic colors (gray, black, white) report hue 0, not the hue they were
  constructed with. `hslToHex(0, 0, 50)` and `hslToHex(123, 0, 50)` both produce
  `#808080`.

## Running the tests

```
node --test
```
