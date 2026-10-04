export function srgb(value) {
  if (value.startsWith('#')) {
    let hex = value.slice(1); if (hex.length <= 4) hex = [...hex].map(x => x + x).join('');
    return { colorSpace: 'srgb', components: [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), alpha: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 };
  }
  const [l, c, h, alpha = 1] = value.match(/[\d.]+/g).map(Number);
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const L = (l + .3963377774 * a + .2158037573 * b) ** 3, M = (l - .1055613458 * a - .0638541728 * b) ** 3, S = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * L - 3.3077115913 * M + .2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - .3413193965 * S, -.0041960863 * L - .7034186147 * M + 1.707614701 * S];
  return { colorSpace: 'srgb', components: rgb.map(x => +Math.max(0, Math.min(1, x <= .0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - .055)).toFixed(8)), alpha };
}
