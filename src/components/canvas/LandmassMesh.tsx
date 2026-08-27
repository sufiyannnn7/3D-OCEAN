import * as THREE from 'three';
import { SCENE_WIDTH, SCENE_DEPTH } from '../../services/coordinateTransform';
import { GridManifest } from '../../types/ocean';

export class LandmassMesh {
  public group: THREE.Group;
  private landMesh: THREE.Mesh | null = null;
  private coastLines: THREE.LineSegments | null = null;
  private geometry: THREE.PlaneGeometry | null = null;

  constructor(manifest: GridManifest) {
    this.group = new THREE.Group();
    this.group.name = 'LandmassLayer';

    this.buildLandmasses(manifest);
  }

  private buildLandmasses(manifest: GridManifest) {
    const { nLat, nLon, lats, lons } = manifest.grid;

    // Grid for land elevation
    this.geometry = new THREE.PlaneGeometry(
      SCENE_WIDTH,
      SCENE_DEPTH,
      nLon - 1,
      nLat - 1
    );
    this.geometry.rotateX(-Math.PI / 2);

    const pos = this.geometry.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    for (let r = 0; r < nLat; r++) {
      const latIdx = nLat - 1 - r;
      const lat = lats[latIdx];

      for (let c = 0; c < nLon; c++) {
        const lon = lons[c];
        const vertexIdx = r * nLon + c;

        const isLandPoint = this.checkIsLand(lat, lon);

        if (isLandPoint) {
          const elevation = 0.7 + 0.3 * Math.sin(lat * 0.3) * Math.cos(lon * 0.2);
          pos.setY(vertexIdx, elevation);

          colors[vertexIdx * 3 + 0] = 0.04 + 0.02 * elevation;
          colors[vertexIdx * 3 + 1] = 0.07 + 0.03 * elevation;
          colors[vertexIdx * 3 + 2] = 0.13 + 0.05 * elevation;
        } else {
          pos.setY(vertexIdx, -2.5);
          colors[vertexIdx * 3 + 0] = 0.0;
          colors[vertexIdx * 3 + 1] = 0.0;
          colors[vertexIdx * 3 + 2] = 0.0;
        }
      }
    }

    this.geometry.computeVertexNormals();
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.landMesh = new THREE.Mesh(this.geometry, material);
    this.landMesh.castShadow = true;
    this.landMesh.receiveShadow = true;
    this.group.add(this.landMesh);

    // Glowing Neon Coastline Grid outline
    const wireGeom = new THREE.WireframeGeometry(this.geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x3894f2,
      transparent: true,
      opacity: 0.22,
    });
    this.coastLines = new THREE.LineSegments(wireGeom, wireMat);
    this.group.add(this.coastLines);
  }

  private checkIsLand(lat: number, lon: number): boolean {
    if (lon < 39 && lat > -30) return true;
    if (lon < 42 && lat > -15 && lat < 12) return true;
    if (lon < 51 && lat > 8 && lat < 12 && lat < 11.5 && lon < 50.5) return true;
    if (lon < 44 && lat > 12) return true;

    // Madagascar
    if (lon >= 43.5 && lon <= 50.5 && lat >= -25.5 && lat <= -12.0) {
      if (Math.abs(lon - 47.0) < (25.5 + lat) * 0.2 + 1.2) return true;
    }

    // Arabia / Middle East
    if (lat >= 12.5 && lat <= 30) {
      if (lon >= 43 && lon <= 59.5) {
        if (lon < 43.5 && lat < 15) return false;
        if (lat > 24 && lon > 50 && lon < 56) return false;
        if (lat >= 13 && lon <= 59) return true;
      }
      if (lat >= 24.5 && lon >= 57 && lon <= 68.5) return true;
    }

    // Indian Subcontinent
    if (lat >= 7.8 && lat <= 30) {
      if (lat < 15) {
        const halfWidth = (lat - 7.5) * 1.5;
        if (Math.abs(lon - 77.5) <= halfWidth) return true;
      } else if (lat < 23) {
        if (lon >= 72.5 && lon <= 87.0) return true;
      } else {
        if (lon >= 67.5 && lon <= 90.0) return true;
      }
    }

    // Sri Lanka
    if (lat >= 5.8 && lat <= 9.8 && lon >= 79.5 && lon <= 82.0) return true;

    // Southeast Asia & Indonesia
    if (lat >= 0 && lat <= 30) {
      if (lon >= 92 && lat >= 15 && lon <= 105) return true;
      if (lon >= 99 && lat >= 1.2 && lat < 15) return true;
    }
    if (lat >= -6 && lat <= 5.8 && lon >= 95 && lon <= 106) {
      const expectedLon = 95 + (5.8 - lat) * 1.8;
      if (Math.abs(lon - expectedLon) < 2.5) return true;
    }
    if (lat >= -8.8 && lat <= -5.8 && lon >= 105.5 && lon <= 116) return true;

    // Australia NW
    if (lat <= -11.5 && lon >= 114) {
      if (lat <= -19 || lon >= 121 || (lat <= -14 && lon >= 125)) return true;
      if (lat <= -12.5 && lon >= 115 && lon + lat * 1.5 > 98) return true;
    }

    return false;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    if (this.geometry) this.geometry.dispose();
  }
}
