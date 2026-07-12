import { describe, it, expect } from 'vitest';
import { mapCssToPixels } from '../src/content/coordinate-mapper';
import type { ViewportInfo } from '../src/shared/types';

describe('Coordinate Mapper', () => {
  it('should map coordinates correctly at 1x zoom (devicePixelRatio = 1)', () => {
    const viewportInfo: ViewportInfo = {
      innerWidthCss: 800,
      innerHeightCss: 600,
      cropCss: {
        left: 100,
        top: 150,
        width: 200,
        height: 300,
      },
    };

    const result = mapCssToPixels(viewportInfo, 800, 600);

    expect(result).toEqual({
      x: 100,
      y: 150,
      width: 200,
      height: 300,
    });
  });

  it('should map coordinates correctly at 2x zoom (HiDPI / devicePixelRatio = 2)', () => {
    const viewportInfo: ViewportInfo = {
      innerWidthCss: 800,
      innerHeightCss: 600,
      cropCss: {
        left: 100,
        top: 150,
        width: 200,
        height: 300,
      },
    };

    // Screenshot pixels are double the CSS pixels
    const result = mapCssToPixels(viewportInfo, 1600, 1200);

    expect(result).toEqual({
      x: 200,
      y: 300,
      width: 400,
      height: 600,
    });
  });

  it('should map coordinates correctly at fractional browser zoom (e.g. 1.25x)', () => {
    const viewportInfo: ViewportInfo = {
      innerWidthCss: 1000,
      innerHeightCss: 800,
      cropCss: {
        left: 120,
        top: 80,
        width: 400,
        height: 240,
      },
    };

    // Screenshot pixels are 1.25x the CSS pixels
    const result = mapCssToPixels(viewportInfo, 1250, 1000);

    expect(result).toEqual({
      x: 150,
      y: 100,
      width: 500,
      height: 300,
    });
  });

  it('should throw an error for invalid CSS viewport dimensions', () => {
    const invalidInfo: ViewportInfo = {
      innerWidthCss: 0,
      innerHeightCss: 600,
      cropCss: { left: 10, top: 10, width: 100, height: 100 },
    };

    expect(() => mapCssToPixels(invalidInfo, 800, 600)).toThrow('Invalid viewport CSS dimensions');
  });

  it('should throw an error for invalid screenshot dimensions', () => {
    const viewportInfo: ViewportInfo = {
      innerWidthCss: 800,
      innerHeightCss: 600,
      cropCss: { left: 10, top: 10, width: 100, height: 100 },
    };

    expect(() => mapCssToPixels(viewportInfo, 0, 600)).toThrow('Invalid screenshot dimensions');
  });
});
