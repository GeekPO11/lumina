
export enum AppState {
  WELCOME = 'WELCOME',
  MODEL_STUDIO = 'MODEL_STUDIO',
  WARDROBE_RACK = 'WARDROBE_RACK',
  PHOTOSHOOT = 'PHOTOSHOOT',
  RUNWAY = 'RUNWAY'
}

export interface ModelReferences {
  front?: string;
  side?: string;
  back?: string;
}

export interface WardrobeReferences {
  front?: string;
  back?: string;
  detail?: string;
  accessory?: string; // New field for branding/hats/bags
}

export interface ModelParams {
  type: 'generated' | 'reference';
  useBiometrics: boolean; // Toggle to enforce strict numbers vs visual reference
  
  // Demographics
  gender: string;
  ethnicity: string;
  ageRange: string;
  
  // Appearance
  eyeColor: string;
  hairColor: string;
  height: string;
  bodyType: string;

  // Measurements (Inches)
  chest: number;
  waist: number;
  hips: number;
  shoulder: number;
  inseam: number;

  // Visual Assets
  references: ModelReferences;
}

export interface WardrobeParams {
  sku: string;
  fabric: string;
  fit: string;
  trendContext?: string;
  // New visual assets
  references: WardrobeReferences;
  
  // New settings
  background: 'white' | 'grey' | 'lifestyle' | 'custom';
  autoFabric: boolean;
  backgroundPreference?: string; // Kept for compatibility if needed
}

export interface LogEntry {
  timestamp: string;
  system: string;
  message: string;
}

export enum ImageSize {
  OneK = "1K",
  TwoK = "2K",
  FourK = "4K"
}

export interface CatalogCopy {
  title: string;
  description: string;
  keywords: string[];
}

export interface GeneratedAsset {
  id: string;
  url: string; // Base64 data URL
  prompt: string;
  type: 'image' | 'video';
  approved?: boolean;
  catalogCopy?: CatalogCopy;
}
