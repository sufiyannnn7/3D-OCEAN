import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SCENE_WIDTH, SCENE_DEPTH, BASE_DEPTH_HEIGHT, defaultCoordTransform } from '../../services/coordinateTransform';

export class SeabedMesh {
  public group: THREE.Group;
  private proceduralMesh: THREE.Mesh | null = null;
  private wireframeMesh: THREE.LineSegments | null = null;
  private glbModel: THREE.Object3D | null = null;
  private isGlbLoaded: boolean = false;
  private baseGeometry: THREE.PlaneGeometry | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SeabedLayer';

    // 1. Try loading Blender GLB asset first
    this.tryLoadGlb('/assets/seabed.glb');

    // 2. Build High-Detail Procedural Bathymetry
    this.buildProceduralSeabed();
  }

  private tryLoadGlb(url: string) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        this.glbModel = gltf.scene;
        this.glbModel.name = 'BlenderSeabedGLB';
        
        // Scale and position model to fit Indian Ocean extent
        this.glbModel.position.set(0, -BASE_DEPTH_HEIGHT, 0);
        this.group.add(this.glbModel);
        this.isGlbLoaded = true;

        // Hide procedural seabed if GLB is active
        if (this.proceduralMesh) this.proceduralMesh.visible = false;
        if (this.wireframeMesh) this.wireframeMesh.visible = false;
        console.log('Successfully loaded Blender Seabed GLB model');
      },
      undefined,
      () => {
        // Fallback: Use high-detail procedural seabed
        this.isGlbLoaded = false;
        if (this.proceduralMesh) this.proceduralMesh.visible = true;
        if (this.wireframeMesh) this.wireframeMesh.visible = true;
      }
    );
  }

  private buildProceduralSeabed() {
    const segmentsX = 90;
    const segmentsZ = 60;
    this.baseGeometry = new THREE.PlaneGeometry(SCENE_WIDTH, SCENE_DEPTH, segmentsX, segmentsZ);
    this.baseGeometry.rotateX(-Math.PI / 2);

    const pos = this.baseGeometry.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    // Sculpt bathymetry based on Indian Ocean geomorphology
    // Base ocean floor depth: ~4000m to 5000m (normalized to ~1.0)
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i); // Longitude axis (-45 to 45)
      const z = pos.getZ(i); // Latitude axis (+30 to -30)

      // Normalize coordinates
      const normLon = (x / SCENE_WIDTH) * 2; // -1 to 1
      const normLat = (-z / SCENE_DEPTH) * 2; // -1 to 1

      // Approximate Indian Ocean Bathymetric Features:
      // 1. Ninety East Ridge (Lon ~ 90°E, linear ridge running from Lat +10°N down to -30°S)
      const distTo90E = Math.abs(x - (90 - 75) * (SCENE_WIDTH / 89));
      const ninetyEastRidge = Math.exp(-Math.pow(distTo90E / 1.5, 2)) * 0.45;

      // 2. Central Indian Ridge / Carlsberg Ridge (Diagonal inverted Y ridge in Arabian Basin / Central basin)
      const carlsbergDist = Math.abs(z - 0.7 * x + 5);
      const carlsbergRidge = Math.exp(-Math.pow(carlsbergDist / 3.0, 2)) * 0.38 * (x < 10 ? 1 : 0);

      const centralRidgeDist = Math.abs(x + 5 + 0.3 * z);
      const centralRidge = Math.exp(-Math.pow(centralRidgeDist / 2.5, 2)) * 0.4 * (z > -5 ? 1 : 0);

      // 3. Sunda / Java Trench (Deep trench near Sumatra/Java: Lon > 95°E, Lat -10° to 5°)
      const trenchDist = Math.sqrt(Math.pow(x - 28, 2) + Math.pow(z + 8, 2));
      const javaTrench = trenchDist < 12 ? -0.35 * Math.exp(-Math.pow(trenchDist / 5, 2)) : 0;

      // 4. Continental Shelves (Shallow depth near coasts)
      const isNearShelf = (z < -18 && Math.abs(x - 5) < 15) || (x < -32) || (x > 32);
      const shelfElevation = isNearShelf ? 0.3 : 0.0;

      // Meso-scale abyssal hill roughness
      const noise = 0.06 * Math.sin(x * 0.5) * Math.cos(z * 0.6) + 0.04 * Math.sin(x * 1.2 + z * 0.8);

      // Combined depth factor (0.0 = surface, 1.0 = deep abyssal plain 4500m)
      const depthFactor = Math.max(0.2, Math.min(1.15, 0.95 - (ninetyEastRidge + carlsbergRidge + centralRidge + shelfElevation + noise) - javaTrench));

      // Set base Y position at max depth (-BASE_DEPTH_HEIGHT)
      pos.setY(i, -depthFactor * BASE_DEPTH_HEIGHT);

      // Color coding by seabed depth (deep navy -> obsidian blue -> ridge teal)
      const elevation = 1.0 - depthFactor; // 0 (deep) to 1 (shallow)
      const r = 0.02 + 0.12 * elevation;
      const g = 0.06 + 0.28 * elevation;
      const b = 0.14 + 0.42 * elevation;

      colors[i * 3 + 0] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    this.baseGeometry.computeVertexNormals();
    this.baseGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom Shaded Seabed Material
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.proceduralMesh = new THREE.Mesh(this.baseGeometry, material);
    this.proceduralMesh.receiveShadow = true;
    this.group.add(this.proceduralMesh);

    // Subtle bathymetric wireframe grid for scientific aesthetic
    const wireframeGeom = new THREE.WireframeGeometry(this.baseGeometry);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x1f4f9c,
      transparent: true,
      opacity: 0.18,
    });
    this.wireframeMesh = new THREE.LineSegments(wireframeGeom, wireframeMat);
    this.group.add(this.wireframeMesh);
  }

  /**
   * Update vertical scale dynamically with Vertical Exaggeration
   */
  public update(verticalExaggeration: number): void {
    if (this.isGlbLoaded && this.glbModel) {
      this.glbModel.scale.set(1, verticalExaggeration, 1);
      this.glbModel.position.set(0, -BASE_DEPTH_HEIGHT * verticalExaggeration, 0);
    } else {
      if (this.proceduralMesh) {
        this.proceduralMesh.scale.set(1, verticalExaggeration, 1);
      }
      if (this.wireframeMesh) {
        this.wireframeMesh.scale.set(1, verticalExaggeration, 1);
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    if (this.baseGeometry) this.baseGeometry.dispose();
  }
}
