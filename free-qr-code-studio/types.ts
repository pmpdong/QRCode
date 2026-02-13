
export enum QRType {
  URL = 'URL',
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  WIFI = 'WIFI',
  VCARD = 'VCARD'
}

export interface QRConfig {
  value: string;
  fgColor: string;
  bgColor: string;
  size: number;
  level: 'L' | 'M' | 'Q' | 'H';
  includeMargin: boolean;
  bottomText?: string;
  imageSettings?: {
    src: string;
    x?: number;
    y?: number;
    height: number;
    width: number;
    excavate: boolean;
  };
}

export interface AISuggestion {
  primaryColor: string;
  secondaryColor: string;
  label: string;
  description: string;
}
