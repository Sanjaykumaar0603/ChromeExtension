export type BlurMode = 'none' | 'screen' | 'click' | 'draw';

export interface BlurState {
  blurMode?: BlurMode;
  hoverUnblur?: boolean;
}

export interface BlurRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StorageData {
  blurMode: BlurMode;
  hoverUnblur: boolean;
}