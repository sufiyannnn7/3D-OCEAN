import { ArgoFloat, ArgoManifest, ArgoCast, ArgoProfilePoint } from '../types/argo';

class ArgoDataLoader {
  private manifest: ArgoManifest | null = null;
  private floats: ArgoFloat[] | null = null;
  private loadingPromise: Promise<ArgoFloat[]> | null = null;

  /**
   * Fetch Argo manifest
   */
  public async loadManifest(): Promise<ArgoManifest> {
    if (this.manifest) return this.manifest;
    try {
      const res = await fetch('/data/argo/manifest.json');
      if (!res.ok) throw new Error(`Failed to load argo manifest: ${res.statusText}`);
      this.manifest = await res.json();
      return this.manifest!;
    } catch (err) {
      console.error('Error loading argo manifest:', err);
      throw err;
    }
  }

  /**
   * Fetch all 78 real Argo floats
   */
  public async loadFloats(): Promise<ArgoFloat[]> {
    if (this.floats) return this.floats;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const res = await fetch('/data/argo/floats.json');
        if (!res.ok) throw new Error(`Failed to load argo floats: ${res.statusText}`);
        const data: ArgoFloat[] = await res.json();
        this.floats = data;
        this.loadingPromise = null;
        return data;
      } catch (err) {
        this.loadingPromise = null;
        console.error('Error loading argo floats:', err);
        throw err;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Get a specific float by Float ID / WMO ID
   */
  public async getFloatById(floatId: string): Promise<ArgoFloat | undefined> {
    const list = await this.loadFloats();
    return list.find(f => f.floatId === floatId);
  }

  /**
   * Helper: Group flat profile points by distinct cast timestamp
   */
  public groupProfilesByCast(profiles: ArgoProfilePoint[]): ArgoCast[] {
    const castMap = new Map<string, ArgoProfilePoint[]>();

    profiles.forEach(p => {
      if (!castMap.has(p.time)) {
        castMap.set(p.time, []);
      }
      castMap.get(p.time)!.push(p);
    });

    const casts: ArgoCast[] = [];
    castMap.forEach((points, time) => {
      // Sort points by depth ascending (surface downwards)
      points.sort((a, b) => a.depth - b.depth);

      // Format date label (e.g. "Jan 01, 2025")
      let dateLabel = time;
      try {
        const d = new Date(time);
        dateLabel = d.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });
      } catch {}

      casts.push({
        time,
        dateLabel,
        points,
      });
    });

    // Sort casts by timestamp ascending
    casts.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return casts;
  }
}

export const argoDataLoader = new ArgoDataLoader();
