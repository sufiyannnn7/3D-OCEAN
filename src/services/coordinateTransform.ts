import * as THREE from 'three';

export interface DomainExtent {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  depthMax: number;
}

export const DEFAULT_EXTENT: DomainExtent = {
  latMin: -29.5,
  latMax: 29.5,
  lonMin: 30.5,
  lonMax: 119.5,
  depthMax: 3000,
};

// 3D Scene scaling dimensions (World Units)
export const SCENE_WIDTH = 90; // Lon extent in 3D units (-45 to +45)
export const SCENE_DEPTH = 60; // Lat extent in 3D units (-30 to +30)
export const BASE_DEPTH_HEIGHT = 15; // Max depth baseline height at 1.0x exaggeration

export class CoordinateTransform {
  private extent: DomainExtent;

  constructor(extent: DomainExtent = DEFAULT_EXTENT) {
    this.extent = extent;
  }

  /**
   * Convert geographic coordinate (lat, lon, depth in meters) to Three.js Cartesian Vector3 (x, y, z)
   */
  public geoTo3D(
    lat: number,
    lon: number,
    depthMeters: number = 0,
    verticalExaggeration: number = 1.0
  ): THREE.Vector3 {
    // Lon -> X (-SCENE_WIDTH/2 to +SCENE_WIDTH/2)
    const lonNorm = (lon - this.extent.lonMin) / (this.extent.lonMax - this.extent.lonMin);
    const x = (lonNorm - 0.5) * SCENE_WIDTH;

    // Lat -> Z (Three.js Z: North is -Z, South is +Z)
    const latNorm = (lat - this.extent.latMin) / (this.extent.latMax - this.extent.latMin);
    const z = (0.5 - latNorm) * SCENE_DEPTH;

    // Depth -> Y (Surface is Y = 0, deeper is negative Y)
    const depthNorm = Math.min(1.0, Math.max(0, depthMeters / this.extent.depthMax));
    const y = -depthNorm * BASE_DEPTH_HEIGHT * verticalExaggeration;

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Convert Three.js Cartesian Vector3 back to geographic coordinates (lat, lon, depth in meters)
   */
  public worldToGeo(
    point: THREE.Vector3,
    verticalExaggeration: number = 1.0
  ): { lat: number; lon: number; depth: number; inBounds: boolean } {
    const lonNorm = point.x / SCENE_WIDTH + 0.5;
    const latNorm = 0.5 - point.z / SCENE_DEPTH;

    const lon = this.extent.lonMin + lonNorm * (this.extent.lonMax - this.extent.lonMin);
    const lat = this.extent.latMin + latNorm * (this.extent.latMax - this.extent.latMin);

    const totalHeight = BASE_DEPTH_HEIGHT * verticalExaggeration;
    const depthNorm = Math.max(0, -point.y / totalHeight);
    const depth = depthNorm * this.extent.depthMax;

    const inBounds =
      lonNorm >= 0 && lonNorm <= 1 &&
      latNorm >= 0 && latNorm <= 1 &&
      depthNorm >= 0 && depthNorm <= 1.2;

    return {
      lat: Number(lat.toFixed(2)),
      lon: Number(lon.toFixed(2)),
      depth: Number(depth.toFixed(1)),
      inBounds,
    };
  }

  /**
   * Get bounding box corners in 3D
   */
  public getBoundingBox(verticalExaggeration: number = 1.0) {
    const min = this.geoTo3D(this.extent.latMin, this.extent.lonMin, this.extent.depthMax, verticalExaggeration);
    const max = this.geoTo3D(this.extent.latMax, this.extent.lonMax, 0, verticalExaggeration);
    return new THREE.Box3(min, max);
  }
}

export const defaultCoordTransform = new CoordinateTransform();
