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

  // Use a single unified scale factor based on width to preserve the 1:1 pixel aspect ratio.
  const scale = screenshotWidth / innerWidthCss;

  // On iOS Safari, the screenshot returned by captureVisibleTab is of the full screen,
  // but innerHeightCss only includes the visible web content (excluding top/bottom browser bars).
  // We calculate the top bar offset from the screenshot's actual virtual height to avoid
  // display zoom scaling mismatches (e.g. window.screen.height mismatching screenshot size).
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1);
  const screenshotHeightCss = screenshotHeight / scale;
  const yOffset = isIOS ? (screenshotHeightCss - innerHeightCss) / 2 : 0;

  const x = Math.round(cropCss.left * scale);
  const y = Math.round((cropCss.top + yOffset) * scale);
  const width = Math.round(cropCss.width * scale);
  const height = Math.round(cropCss.height * scale);

  return { x, y, width, height };
}
