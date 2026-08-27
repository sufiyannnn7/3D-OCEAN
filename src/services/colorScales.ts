import * as THREE from 'three';
import { ColormapType } from '../types/ocean';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Scientific Colormap Color Stops (Normalized 0.0 to 1.0)
const COLORMAP_STOPS: Record<ColormapType, [number, number, number, number][]> = {
  // Google Turbo (Standard high-dynamic range scientific rainbow)
  turbo: [
    [0.00, 48, 18, 59],
    [0.10, 70, 107, 227],
    [0.25, 40, 188, 235],
    [0.40, 44, 222, 148],
    [0.55, 164, 252, 60],
    [0.70, 251, 185, 56],
    [0.85, 251, 86, 33],
    [1.00, 122, 4, 3],
  ],
  // Ocean Thermal (Deep navy -> azure -> cyan -> gold -> deep red)
  thermal: [
    [0.00, 15, 23, 42],
    [0.15, 30, 58, 138],
    [0.30, 2, 132, 199],
    [0.50, 6, 182, 212],
    [0.70, 234, 179, 8],
    [0.85, 239, 68, 68],
    [1.00, 153, 27, 27],
  ],
  // cmocean Haline (Dedicated scientific salinity colormap: deep blue -> teal -> light green -> bright yellow)
  haline: [
    [0.00, 39, 24, 76],
    [0.20, 43, 67, 133],
    [0.40, 44, 114, 142],
    [0.60, 40, 161, 130],
    [0.80, 109, 205, 89],
    [1.00, 253, 231, 37],
  ],
  // Viridis (Perceptually uniform sequential colormap)
  viridis: [
    [0.00, 68, 1, 84],
    [0.25, 59, 82, 139],
    [0.50, 33, 145, 140],
    [0.75, 94, 201, 98],
    [1.00, 253, 231, 37],
  ],
  // Plasma
  plasma: [
    [0.00, 13, 8, 135],
    [0.25, 126, 3, 168],
    [0.50, 204, 71, 120],
    [0.75, 248, 149, 64],
    [1.00, 240, 249, 33],
  ],
  // CoolWarm (Bipolar diverging)
  coolwarm: [
    [0.00, 59, 76, 192],
    [0.25, 141, 176, 254],
    [0.50, 221, 221, 221],
    [0.75, 244, 154, 123],
    [1.00, 180, 4, 38],
  ],
};

/**
 * Interpolate colormap at normalized value t (0.0 to 1.0)
 */
export function sampleColormap(t: number, colormap: ColormapType = 'turbo'): RGB {
  const clampedT = Math.max(0, Math.min(1, isNaN(t) ? 0 : t));
  const stops = COLORMAP_STOPS[colormap] || COLORMAP_STOPS.turbo;

  if (clampedT <= stops[0][0]) {
    return { r: stops[0][1] / 255, g: stops[0][2] / 255, b: stops[0][3] / 255 };
  }
  if (clampedT >= stops[stops.length - 1][0]) {
    const last = stops[stops.length - 1];
    return { r: last[1] / 255, g: last[2] / 255, b: last[3] / 255 };
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (clampedT >= s0[0] && clampedT <= s1[0]) {
      const frac = (clampedT - s0[0]) / (s1[0] - s0[0]);
      const r = s0[1] + frac * (s1[1] - s0[1]);
      const g = s0[2] + frac * (s1[2] - s0[2]);
      const b = s0[3] + frac * (s1[3] - s0[3]);
      return { r: r / 255, g: g / 255, b: b / 255 };
    }
  }

  return { r: 0, g: 0, b: 0 };
}

/**
 * Return CSS color string for a value normalized to min/max
 */
export function getColorForValue(
  val: number | null,
  min: number,
  max: number,
  colormap: ColormapType = 'turbo'
): string {
  if (val === null || isNaN(val)) {
    return 'rgba(255, 255, 255, 0.05)';
  }
  const norm = (val - min) / (max - min);
  const { r, g, b } = sampleColormap(norm, colormap);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * Generate a 1D Look-Up Table (LUT) DataTexture for Three.js shaders
 */
export function createColormapTexture(colormap: ColormapType, size: number = 256): THREE.DataTexture {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    const { r, g, b } = sampleColormap(t, colormap);
    data[i * 4 + 0] = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Return CSS gradient string for colorbar legends
 */
export function getCssGradient(colormap: ColormapType, direction: 'right' | 'top' = 'right'): string {
  const stops = COLORMAP_STOPS[colormap] || COLORMAP_STOPS.turbo;
  const stopStrs = stops.map(s => `rgb(${s[1]}, ${s[2]}, ${s[3]}) ${(s[0] * 100).toFixed(0)}%`);
  return `linear-gradient(to ${direction}, ${stopStrs.join(', ')})`;
}
