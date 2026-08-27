import * as THREE from 'three';
import { sampleColormap } from '../../services/colorScales';
import { defaultCoordTransform, SCENE_WIDTH, SCENE_DEPTH } from '../../services/coordinateTransform';
import { GridManifest, TimestepData, VisualizationSettings } from '../../types/ocean';

export class OceanSliceMesh {
  public group: THREE.Group;
  private sliceMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;
  private manifest: GridManifest;
  private currentDepthY: number = 0;

  constructor(manifest: GridManifest) {
    this.manifest = manifest;
    this.group = new THREE.Group();
    this.group.name = 'OceanSliceLayer';

    const { nLat, nLon } = this.manifest.grid;

    // Plane geometry matching grid dimensions (width = X, height = Z)
    this.geometry = new THREE.PlaneGeometry(
      SCENE_WIDTH,
      SCENE_DEPTH,
      nLon - 1,
      nLat - 1
    );

    // Rotate plane to lie horizontally in the X-Z plane (normal pointing up along +Y)
    this.geometry.rotateX(-Math.PI / 2);

    // Vertex colors material with smooth double-sided rendering
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      roughness: 0.25,
      metalness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.sliceMesh = new THREE.Mesh(this.geometry, this.material);
    this.sliceMesh.receiveShadow = true;
    this.group.add(this.sliceMesh);
  }

  /**
   * Update the slice vertex colors and position according to current visualization settings
   */
  public update(
    stepData: TimestepData,
    settings: VisualizationSettings
  ): void {
    const { nLat, nLon } = this.manifest.grid;
    const { variable, depthIndex, opacity, verticalExaggeration, colormap, colorRange } = settings;

    // Update material opacity
    this.material.opacity = Math.max(0.05, opacity);

    // Calculate Y position in 3D scene
    const depthMeters = this.manifest.depths_m[depthIndex] || 0;
    const targetPos = defaultCoordTransform.geoTo3D(0, 0, depthMeters, verticalExaggeration);
    this.currentDepthY = targetPos.y;
    this.sliceMesh.position.y = this.currentDepthY;

    // Extract 1D flat slice array [depth][flatIdx]
    const matrix3D = variable === 'temperature' ? stepData.TEMP : stepData.SAL;
    const slice = matrix3D[Math.min(depthIndex, matrix3D.length - 1)] || [];

    const minVal = colorRange.min;
    const maxVal = colorRange.max;
    const valRange = maxVal - minVal || 1;

    // PlaneGeometry vertices are indexed (nLat rows x nLon cols)
    const count = nLat * nLon;
    const colors = new Float32Array(count * 3);

    // Three.js PlaneGeometry with rotateX(-Math.PI/2) arranges vertices from top-left (Z = -SCENE_DEPTH/2, X = -SCENE_WIDTH/2)
    // In our spatial domain: latMax is North (-Z in Three.js), latMin is South (+Z)
    // Row 0 of PlaneGeometry corresponds to North (latIdx = nLat - 1)
    for (let r = 0; r < nLat; r++) {
      const latIdx = nLat - 1 - r;

      for (let c = 0; c < nLon; c++) {
        const lonIdx = c;
        const vertexIdx = r * nLon + c;
        const flatIdx = latIdx * nLon + lonIdx;
        const val = slice[flatIdx];

        if (val === null || val === undefined || isNaN(val)) {
          // Land / Masked point -> transparent dark navy slate
          colors[vertexIdx * 3 + 0] = 0.02;
          colors[vertexIdx * 3 + 1] = 0.05;
          colors[vertexIdx * 3 + 2] = 0.12;
        } else {
          // Scientific Colormap sampling
          const norm = Math.max(0, Math.min(1, (val - minVal) / valRange));
          const rgb = sampleColormap(norm, colormap);

          colors[vertexIdx * 3 + 0] = rgb.r;
          colors[vertexIdx * 3 + 1] = rgb.g;
          colors[vertexIdx * 3 + 2] = rgb.b;
        }
      }
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.attributes.color.needsUpdate = true;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public getMesh(): THREE.Mesh {
    return this.sliceMesh;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
