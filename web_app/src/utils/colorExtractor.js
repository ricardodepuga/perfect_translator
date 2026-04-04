/**
 * Extracts dominant colours from an image using canvas sampling.
 * Returns an object with primary, secondary, and accent HSL strings
 * ready to be injected as CSS custom properties.
 */
export function extractColorsFromImage(imgSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 64; // sample at a small size for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      const colorBuckets = {};

      for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent and near-white/near-black pixels
        if (a < 128) continue;
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;

        // Quantize to reduce noise
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;

        if (!colorBuckets[key]) {
          colorBuckets[key] = { r: qr, g: qg, b: qb, count: 0 };
        }
        colorBuckets[key].count++;
      }

      // Sort by frequency
      const sorted = Object.values(colorBuckets).sort((a, b) => b.count - a.count);

      if (sorted.length === 0) {
        resolve(null); // no usable colors
        return;
      }

      const toHSL = ({ r, g, b }) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }

        return {
          h: Math.round(h * 360),
          s: Math.round(s * 100),
          l: Math.round(l * 100)
        };
      };

      const primary = toHSL(sorted[0]);
      // Pick secondary from a different hue bucket if available
      const secondary = sorted.length > 1 ? toHSL(sorted[1]) : { ...primary, l: Math.min(primary.l + 15, 70) };

      // Ensure decent saturation for UI usage
      const ensureSat = (hsl) => ({ ...hsl, s: Math.max(hsl.s, 40) });

      resolve({
        primary: ensureSat(primary),
        secondary: ensureSat(secondary),
      });
    };

    img.onerror = () => resolve(null);
    img.src = imgSrc;
  });
}

/**
 * Applies extracted colours as CSS custom properties on :root
 */
export function applyThemeColors(colors) {
  if (!colors) return;

  const root = document.documentElement;
  const { primary, secondary } = colors;

  // Main accent (buttons, active toggles, focus rings)
  root.style.setProperty('--accent-h', primary.h);
  root.style.setProperty('--accent-s', `${primary.s}%`);
  root.style.setProperty('--accent-l', `${primary.l}%`);
  root.style.setProperty('--accent', `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)`);
  root.style.setProperty('--accent-hover', `hsl(${primary.h}, ${primary.s}%, ${Math.min(primary.l + 8, 65)}%)`);
  root.style.setProperty('--accent-glow', `hsla(${primary.h}, ${primary.s}%, ${primary.l}%, 0.35)`);

  // Secondary (subtle accents, borders)
  root.style.setProperty('--accent-secondary', `hsl(${secondary.h}, ${secondary.s}%, ${secondary.l}%)`);
}

/**
 * Resets theme back to default blue
 */
export function resetThemeColors() {
  const root = document.documentElement;
  root.style.setProperty('--accent-h', 217);
  root.style.setProperty('--accent-s', '91%');
  root.style.setProperty('--accent-l', '60%');
  root.style.setProperty('--accent', 'hsl(217, 91%, 60%)');
  root.style.setProperty('--accent-hover', 'hsl(217, 91%, 68%)');
  root.style.setProperty('--accent-glow', 'hsla(217, 91%, 60%, 0.35)');
  root.style.setProperty('--accent-secondary', 'hsl(192, 91%, 43%)');
}
