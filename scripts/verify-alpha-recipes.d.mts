type RGBColor = {r: number; g: number; b: number; a?: number};
export function checkFillAppearance(rendered: RGBColor, backing: RGBColor, role: string): {
  actualContrast: number;
  actualDelta: number;
  minimumContrast: number;
  maximumContrast: number;
  minimumDelta: number;
  pass: boolean;
};
