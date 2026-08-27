export interface ArgoProfilePoint {
  depth: number; // in meters (from PRES)
  temp: number; // in degC
  salinity: number; // in PSU
  time: string; // ISO string e.g. "2025-01-01T14:22:19Z"
}

export interface ArgoCast {
  time: string;
  dateLabel: string;
  points: ArgoProfilePoint[];
}

export interface ArgoFloat {
  floatId: string; // WMO ID e.g. "1902669"
  lat: number;
  lon: number;
  lastTime: string;
  nCasts: number;
  nPoints: number;
  profiles: ArgoProfilePoint[];
}

export interface ArgoManifest {
  title: string;
  nFloats: number;
  nRows: number;
  latRange: [number, number];
  lonRange: [number, number];
  depthRange_m: [number, number];
  timeRange: [string, string];
  variables: {
    TEMP: {
      units: string;
      longName: string;
    };
    PSAL: {
      units: string;
      longName: string;
    };
  };
  note: string;
  file: string;
}
