import { GridManifest, TimestepData, OceanVariable } from '../types/ocean';

class GridDataLoader {
  private manifest: GridManifest | null = null;
  private timestepCache: Map<string, TimestepData> = new Map();
  private loadingPromises: Map<string, Promise<TimestepData>> = new Map();

  /**
   * Fetch grid dataset manifest
   */
  public async loadManifest(): Promise<GridManifest> {
    if (this.manifest) return this.manifest;
    try {
      const res = await fetch('/data/grid/manifest.json');
      if (!res.ok) throw new Error(`Failed to load manifest: ${res.statusText}`);
      this.manifest = await res.json();
      return this.manifest!;
    } catch (err) {
      console.error('Error loading grid manifest:', err);
      throw err;
    }
  }

  /**
   * Fetch a specific timestep JSON data
   */
  public async loadTimestep(stepFile: string): Promise<TimestepData> {
    const key = stepFile.endsWith('.json') ? stepFile : `${stepFile}.json`;
    if (this.timestepCache.has(key)) {
      return this.timestepCache.get(key)!;
    }
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const promise = (async () => {
      try {
        const res = await fetch(`/data/grid/${key}`);
        if (!res.ok) throw new Error(`Failed to load timestep ${key}: ${res.statusText}`);
        const data: TimestepData = await res.json();
        this.timestepCache.set(key, data);
        this.loadingPromises.delete(key);
        return data;
      } catch (err) {
        this.loadingPromises.delete(key);
        console.error(`Error loading timestep ${key}:`, err);
        throw err;
      }
    })();

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Preload all timesteps in the background
   */
  public async preloadAllTimesteps(): Promise<void> {
    const manifest = await this.loadManifest();
    manifest.files.forEach(file => {
      this.loadTimestep(file).catch(() => {});
    });
  }

  /**
   * Get 1D flat row-major slice (length = nLat * nLon = 5400) for a specific variable and depth level
   */
  public getSlice(
    stepData: TimestepData,
    variable: OceanVariable,
    depthIndex: number
  ): (number | null)[] {
    const matrix = variable === 'temperature' ? stepData.TEMP : stepData.SAL;
    const safeDepthIdx = Math.max(0, Math.min(matrix.length - 1, depthIndex));
    return matrix[safeDepthIdx] || [];
  }

  /**
   * Sample grid value at a specific latitude and longitude and depth index
   */
  public sampleValue(
    stepData: TimestepData,
    variable: OceanVariable,
    depthIndex: number,
    lat: number,
    lon: number
  ): number | null {
    if (!this.manifest) return null;
    const { latMin, latMax, nLat, lonMin, lonMax, nLon } = this.manifest.grid;

    if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) return null;

    const latIdx = Math.round(((lat - latMin) / (latMax - latMin)) * (nLat - 1));
    const lonIdx = Math.round(((lon - lonMin) / (lonMax - lonMin)) * (nLon - 1));

    const slice = this.getSlice(stepData, variable, depthIndex);
    const flatIdx = latIdx * nLon + lonIdx;
    
    return slice[flatIdx] !== undefined ? slice[flatIdx] : null;
  }

  /**
   * Calculate summary statistics for the active slice (excluding nulls)
   */
  public getSliceStats(
    stepData: TimestepData,
    variable: OceanVariable,
    depthIndex: number
  ): { min: number; max: number; mean: number; validCount: number } {
    const slice = this.getSlice(stepData, variable, depthIndex);
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let validCount = 0;

    // Standard valid physical boundaries to ignore extreme boundary artifacts
    const validLower = variable === 'temperature' ? 0.0 : 25.0;
    const validUpper = variable === 'temperature' ? 36.0 : 40.0;

    for (let i = 0; i < slice.length; i++) {
      const val = slice[i];
      if (val !== null && !isNaN(val) && val >= validLower && val <= validUpper) {
        if (val < min) min = val;
        if (val > max) max = val;
        sum += val;
        validCount++;
      }
    }

    if (validCount === 0) return { min: 0, max: 0, mean: 0, validCount: 0 };
    return {
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      mean: Number((sum / validCount).toFixed(2)),
      validCount
    };
  }
}

export const gridDataLoader = new GridDataLoader();
