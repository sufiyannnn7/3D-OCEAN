export type OceanVariable = 'temperature' | 'salinity';

export interface GridManifest {
  title: string;
  grid: {
    nLat: number;
    nLon: number;
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    latStep: number;
    lonStep: number;
    lats: number[];
    lons: number[];
    layout: string;
  };
  depths_m: number[];
  nDepth: number;
  times: string[];
  nTime: number;
  variables: {
    TEMP: {
      units: string;
      longName: string;
      colorBarMin: number;
      colorBarMax: number;
      dataMin?: number;
      dataMax?: number;
      note?: string;
    };
    SAL: {
      units: string;
      longName: string;
      colorBarMin: number;
      colorBarMax: number;
    };
  };
  missingValue: null;
  sourceNote: string;
  files: string[];
}

export interface TimestepData {
  timeIndex: number;
  time: string;
  TEMP: (number | null)[][];
  SAL: (number | null)[][];
}

export type ColormapType = 'turbo' | 'thermal' | 'viridis' | 'haline' | 'plasma' | 'coolwarm';

export interface VisualizationSettings {
  variable: OceanVariable;
  depthIndex: number;
  currentDepth: number; // in meters
  timestepIndex: number;
  opacity: number; // 0.0 to 1.0
  verticalExaggeration: number; // 1.0 to 6.0
  colorRange: {
    min: number;
    max: number;
    autoScale: boolean;
  };
  colormap: ColormapType;
  showArgoFloats: boolean;
  showSeabed: boolean;
  showLandmass: boolean;
  showCoordinates: boolean;
  showTrajectories: boolean;
  showIsoVolume: boolean;
  cameraPreset: 'overview' | 'topdown' | 'arabian' | 'bayofbengal' | 'equatorial' | 'southocean';
}
