import type { ViewportInfo, CropPixel } from '../shared/types';

/**
 * Maps CSS coordinates of a selection to screenshot pixel coordinates.
 * 
 * @param viewportInfo Selection crop box and viewport size in CSS pixels
 * @param screenshotWidth Width of the captured screenshot in actual pixels
 * @param screenshotHeight Height of the captured screenshot in actual pixels
 * @returns Bounding box in screenshot pixels
 */
export function mapCssToPixels(
  viewportInfo: ViewportInfo,
  screenshotWidth: number,
  screenshotHeight: number
): CropPixel {
  const { innerWidthCss, innerHeightCss, cropCss } = viewportInfo;

  if (innerWidthCss <= 0 || innerHeightCss <= 0) {
    throw new Error('Invalid viewport CSS dimensions');
  }

  if (screenshotWidth <= 0 || screenshotHeight <= 0) {
    throw new Error('Invalid screenshot dimensions');
  }

  const scaleX = screenshotWidth / innerWidthCss;
  const scaleY = screenshotHeight / innerHeightCss;

  const x = Math.round(cropCss.left * scaleX);
  const y = Math.round(cropCss.top * scaleY);
  const width = Math.round(cropCss.width * scaleX);
  const height = Math.round(cropCss.height * scaleY);

  return { x, y, width, height };
}
