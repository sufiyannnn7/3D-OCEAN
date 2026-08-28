import { WaveManifest, WaveTimestepData, WaveSample, WaveStats } from '../types/wave';

class WaveDataLoader {
  private manifest: WaveManifest | null = null;
  private stepCache: Map<number, WaveTimestepData> = new Map();
  private pendingRequests: Map<number, Promise<WaveTimestepData>> = new Map();

  /**
   * Load and cache waves manifest.json
   */
  public async loadManifest(): Promise<WaveManifest> {
    if (this.manifest) return this.manifest;

    const res = await fetch('/data/waves/manifest.json');
    if (!res.ok) {
      throw new Error(`Failed to load waves manifest: HTTP ${res.status}`);
    }
    this.manifest = await res.json();
    return this.manifest!;
  }

  /**
   * Dynamically load a single wave timestep JSON file with LRU/memory caching
   */
  public async loadTimestep(stepIndex: number): Promise<WaveTimestepData> {
    // Check if already in cache
    if (this.stepCache.has(stepIndex)) {
      return this.stepCache.get(stepIndex)!;
    }

    // Check if request is already in flight
    if (this.pendingRequests.has(stepIndex)) {
      return this.pendingRequests.get(stepIndex)!;
    }

    const padIdx = stepIndex.toString().padStart(2, '0');
    const fileName = `step_${padIdx}.json`;

    const fetchPromise = (async () => {
      const res = await fetch(`/data/waves/${fileName}`);
      if (!res.ok) {
        throw new Error(`Failed to load wave timestep ${fileName}: HTTP ${res.status}`);
      }
      const data: WaveTimestepData = await res.json();

      // Store in cache
      this.stepCache.set(stepIndex, data);
      this.pendingRequests.delete(stepIndex);

      // Preload adjacent steps asynchronously in background
      this.preloadAdjacentSteps(stepIndex);

      return data;
    })();

    this.pendingRequests.set(stepIndex, fetchPromise);
    return fetchPromise;
  }

  /**
   * Background preloading of adjacent steps for seamless scrubbing
   */
  private preloadAdjacentSteps(currentIndex: number): void {
    if (!this.manifest) return;
    const maxSteps = this.manifest.times.length;

    const targets = [currentIndex + 1, currentIndex - 1, currentIndex + 2];
    for (const t of targets) {
      if (t >= 0 && t < maxSteps && !this.stepCache.has(t) && !this.pendingRequests.has(t)) {
        this.loadTimestep(t).catch(() => {});
      }
    }
  }

  /**
   * Bilinear spatial interpolation of wave parameters at any continuous (lat, lon)
   */
  public sampleWaveAt(stepData: WaveTimestepData, lat: number, lon: number): WaveSample {
    if (!this.manifest) {
      return { hs: null, pwp: null, mwd: null };
    }

    const { grid } = this.manifest;

    if (lat < grid.latMin || lat > grid.latMax || lon < grid.lonMin || lon > grid.lonMax) {
      return { hs: null, pwp: null, mwd: null };
    }

    const latFrac = (lat - grid.latMin) / (grid.latMax - grid.latMin);
    const lonFrac = (lon - grid.lonMin) / (grid.lonMax - grid.lonMin);

    const r = latFrac * (grid.latCount - 1);
    const c = lonFrac * (grid.lonCount - 1);

    const r0 = Math.floor(r);
    const r1 = Math.min(grid.latCount - 1, r0 + 1);
    const c0 = Math.floor(c);
    const c1 = Math.min(grid.lonCount - 1, c0 + 1);

    const dr = r - r0;
    const dc = c - c0;

    const i00 = r0 * grid.lonCount + c0;
    const i01 = r0 * grid.lonCount + c1;
    const i10 = r1 * grid.lonCount + c0;
    const i11 = r1 * grid.lonCount + c1;

    const hs00 = stepData.hs[i00];
    const hs01 = stepData.hs[i01];
    const hs10 = stepData.hs[i10];
    const hs11 = stepData.hs[i11];

    // If all 4 corners are land/null
    if (hs00 === null && hs01 === null && hs10 === null && hs11 === null) {
      return { hs: null, pwp: null, mwd: null };
    }

    // Bilinear interpolation helper for valid values
    const interp = (arr: (number | null)[]) => {
      const v00 = arr[i00];
      const v01 = arr[i01];
      const v10 = arr[i10];
      const v11 = arr[i11];

      let weightSum = 0;
      let valSum = 0;

      if (v00 !== null) { const w = (1 - dc) * (1 - dr); weightSum += w; valSum += v00 * w; }
      if (v01 !== null) { const w = dc * (1 - dr); weightSum += w; valSum += v01 * w; }
      if (v10 !== null) { const w = (1 - dc) * dr; weightSum += w; valSum += v10 * w; }
      if (v11 !== null) { const w = dc * dr; weightSum += w; valSum += v11 * w; }

      if (weightSum === 0) return null;
      return valSum / weightSum;
    };

    const hsInterp = interp(stepData.hs);
    const pwpInterp = interp(stepData.pwp);
    const mwdInterp = interp(stepData.mwd);

    return {
      hs: hsInterp !== null ? Number(hsInterp.toFixed(2)) : null,
      pwp: pwpInterp !== null ? Number(pwpInterp.toFixed(1)) : null,
      mwd: mwdInterp !== null ? Math.round(mwdInterp) : null,
    };
  }

  /**
   * Compute summary statistics for active wave forecast step
   */
  public getWaveStats(stepData: WaveTimestepData): WaveStats {
    let minHs = Infinity;
    let maxHs = -Infinity;
    let sumHs = 0;
    let sumPwp = 0;
    let validCount = 0;

    // Vector average for direction
    let sumSinDir = 0;
    let sumCosDir = 0;

    for (let i = 0; i < stepData.hs.length; i++) {
      const h = stepData.hs[i];
      const p = stepData.pwp[i];
      const m = stepData.mwd[i];

      if (h !== null && h >= 0) {
        if (h < minHs) minHs = h;
        if (h > maxHs) maxHs = h;
        sumHs += h;
        validCount++;

        if (p !== null) sumPwp += p;
        if (m !== null) {
          const rad = (m * Math.PI) / 180;
          sumSinDir += Math.sin(rad);
          sumCosDir += Math.cos(rad);
        }
      }
    }

    if (validCount === 0) {
      return { minHs: 0, maxHs: 0, meanHs: 0, meanPwp: 0, dominantMwd: 0, validCount: 0 };
    }

    const meanHs = Number((sumHs / validCount).toFixed(2));
    const meanPwp = Number((sumPwp / validCount).toFixed(1));
    let dominantMwd = Math.round((Math.atan2(sumSinDir, sumCosDir) * 180) / Math.PI);
    if (dominantMwd < 0) dominantMwd += 360;

    return {
      minHs: Number(minHs.toFixed(2)),
      maxHs: Number(maxHs.toFixed(2)),
      meanHs,
      meanPwp,
      dominantMwd,
      validCount,
    };
  }

  /**
   * Convert timestep data into an RGBA Float32Array suitable for GPU DataTexture
   */
  public createWaveDataTextureBuffer(stepData: WaveTimestepData): Float32Array {
    const count = stepData.latCount * stepData.lonCount;
    const buffer = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const hs = stepData.hs[i];
      const mwd = stepData.mwd[i];
      const pwp = stepData.pwp[i];

      const offset = i * 4;
      if (hs !== null && hs >= 0) {
        buffer[offset + 0] = hs; // R = HS (meters)
        buffer[offset + 1] = mwd !== null ? (mwd * Math.PI) / 180 : 0; // G = MWD in radians
        buffer[offset + 2] = pwp !== null ? pwp : 8.0; // B = PWP in seconds
        buffer[offset + 3] = 1.0; // A = Valid ocean mask
      } else {
        buffer[offset + 0] = 0.0;
        buffer[offset + 1] = 0.0;
        buffer[offset + 2] = 0.0;
        buffer[offset + 3] = 0.0; // Land / invalid
      }
    }

    return buffer;
  }
}

export const waveDataLoader = new WaveDataLoader();
