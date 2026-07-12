export interface CropCss {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ViewportInfo {
  innerWidthCss: number;
  innerHeightCss: number;
  cropCss: CropCss;
}

export interface CropPixel {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TranslationResponse {
  japanese: string;
  french: string;
}

export interface SelectionMessage {
  type: 'START_SELECTION';
}

export interface SelectionResultMessage {
  type: 'SELECTION_COMPLETE';
  viewportInfo: ViewportInfo;
}

export interface CancelSelectionMessage {
  type: 'CANCEL_SELECTION';
}
