export interface WaveVariableMeta {
  key: string;
  sourceVariable: string;
  units: string;
  description: string;
}

export interface WaveGridMeta {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latCount: number;
  lonCount: number;
  latStep: number;
  lonStep: number;
  sourceLatCount?: number;
  sourceLonCount?: number;
  sourceLatStep?: number;
  sourceLonStep?: number;
  layout: string;
}

export interface WaveManifest {
  source: string;
  sourceFile: string;
  dataType: string;
  forecastIssue: string;
  note: string;
  variables: {
    waveHeight: WaveVariableMeta;
    peakWavePeriod: WaveVariableMeta;
    meanWaveDirection: WaveVariableMeta;
  };
  grid: WaveGridMeta;
  times: string[];
}

export interface WaveTimestepData {
  time: string;
  latCount: number;
  lonCount: number;
  hs: (number | null)[];
  pwp: (number | null)[];
  mwd: (number | null)[];
}

export interface WaveSettings {
  showWaves: boolean;
  intensity: number; // 0.2 to 3.0, default 1.0
  isPlaying: boolean;
  timestepIndex: number; // 0 to 15
  colorByWaveHeight: boolean;
  opacity: number;
}

export interface WaveSample {
  hs: number | null;
  pwp: number | null;
  mwd: number | null;
}

export interface WaveStats {
  minHs: number;
  maxHs: number;
  meanHs: number;
  meanPwp: number;
  dominantMwd: number;
  validCount: number;
}
