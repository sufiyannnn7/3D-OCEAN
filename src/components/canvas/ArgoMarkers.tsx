import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { defaultCoordTransform } from '../../services/coordinateTransform';
import { ArgoFloat } from '../../types/argo';

interface FloatMeshInstance {
  float: ArgoFloat;
  group: THREE.Group;
  markerRoot: THREE.Group;
  pulseRing: THREE.Mesh;
  hitSphere: THREE.Mesh;
}

export class ArgoMarkers {
  public group: THREE.Group;
  private floats: ArgoFloat[] = [];
  private instances: FloatMeshInstance[] = [];
  private glbTemplate: THREE.Object3D | null = null;
  private isGlbLoaded: boolean = false;
  private hoveredFloatId: string | null = null;
  private selectedFloatId: string | null = null;
  private animTime: number = 0;

  // Materials
  private buoyYellowMat: THREE.MeshStandardMaterial;
  private buoyBlackMat: THREE.MeshStandardMaterial;
  private buoyWhiteMat: THREE.MeshStandardMaterial;
  private pulseMat: THREE.MeshBasicMaterial;
  private hitMat: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ArgoMarkersLayer';

    // Materials definition
    this.buoyYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffb703, // Oceanographic instrument yellow
      roughness: 0.35,
      metalness: 0.15,
      emissive: 0x332200,
    });

    this.buoyBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.4,
      metalness: 0.8,
    });

    this.buoyWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.2,
      metalness: 0.3,
    });

    this.pulseMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.hitMat = new THREE.MeshBasicMaterial({
      visible: false,
    });

    // Try loading custom Blender GLB
    this.tryLoadGlb('/assets/argo-float.glb');
  }

  private tryLoadGlb(url: string) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        this.glbTemplate = gltf.scene;
        this.glbTemplate.scale.set(0.5, 0.5, 0.5);
        this.isGlbLoaded = true;
        this.rebuildInstances();
      },
      undefined,
      () => {
        this.isGlbLoaded = false;
      }
    );
  }

  public setFloats(floats: ArgoFloat[]) {
    this.floats = floats;
    this.rebuildInstances();
  }

  /**
   * Create procedural scientific Argo Profiler Model
   */
  private createProceduralBuoy(): THREE.Group {
    const buoy = new THREE.Group();

    // 1. Aluminum Pressure Hull
    const hullGeom = new THREE.CylinderGeometry(0.32, 0.32, 1.8, 14);
    const hull = new THREE.Mesh(hullGeom, this.buoyYellowMat);
    hull.position.y = -0.5;
    hull.castShadow = true;
    buoy.add(hull);

    // 2. Black Collar Ring
    const ringGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 14);
    const ring = new THREE.Mesh(ringGeom, this.buoyBlackMat);
    ring.position.y = 0.2;
    buoy.add(ring);

    // 3. Top CTD Sensor Head
    const ctdCapGeom = new THREE.CylinderGeometry(0.2, 0.3, 0.3, 14);
    const ctdCap = new THREE.Mesh(ctdCapGeom, this.buoyWhiteMat);
    ctdCap.position.y = 0.55;
    buoy.add(ctdCap);

    // 4. Satellite Antenna & GPS Mast
    const mastGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8);
    const mast = new THREE.Mesh(mastGeom, this.buoyBlackMat);
    mast.position.y = 1.15;
    buoy.add(mast);

    // 5. Antenna Glow Tip
    const tipGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const tip = new THREE.Mesh(tipGeom, tipMat);
    tip.position.y = 1.65;
    buoy.add(tip);

    // 6. Bottom Damping Plate
    const plateGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.06, 14);
    const plate = new THREE.Mesh(plateGeom, this.buoyBlackMat);
    plate.position.y = -1.45;
    buoy.add(plate);

    return buoy;
  }

  private rebuildInstances() {
    // Clear existing
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.instances = [];

    this.floats.forEach((float) => {
      const floatGroup = new THREE.Group();
      floatGroup.name = `Float_${float.floatId}`;

      // Marker model (GLB or Procedural)
      let markerRoot: THREE.Group;
      if (this.isGlbLoaded && this.glbTemplate) {
        markerRoot = this.glbTemplate.clone() as THREE.Group;
      } else {
        markerRoot = this.createProceduralBuoy();
      }
      floatGroup.add(markerRoot);

      // Pulsing Beacon Wave Ring
      const ringGeom = new THREE.RingGeometry(0.5, 0.8, 24);
      ringGeom.rotateX(-Math.PI / 2);
      const pulseRing = new THREE.Mesh(ringGeom, this.pulseMat.clone());
      pulseRing.position.y = 0.05;
      floatGroup.add(pulseRing);

      // Invisible Raycasting Hit Sphere
      const hitSphereGeom = new THREE.SphereGeometry(1.5, 10, 10);
      const hitSphere = new THREE.Mesh(hitSphereGeom, this.hitMat);
      hitSphere.userData = { floatId: float.floatId, float };
      floatGroup.add(hitSphere);

      this.group.add(floatGroup);

      this.instances.push({
        float,
        group: floatGroup,
        markerRoot,
        pulseRing,
        hitSphere,
      });
    });
  }

  /**
   * Update markers position, scale and pulse animations
   */
  public update(
    verticalExaggeration: number,
    delta: number,
    hoveredFloatId: string | null,
    selectedFloatId: string | null
  ): void {
    this.hoveredFloatId = hoveredFloatId;
    this.selectedFloatId = selectedFloatId;
    this.animTime += delta;

    this.instances.forEach((inst) => {
      const { float, group, markerRoot, pulseRing } = inst;

      // Position float at its real geographic coordinates
      const pos3D = defaultCoordTransform.geoTo3D(float.lat, float.lon, 0, verticalExaggeration);
      group.position.copy(pos3D);

      const isHovered = float.floatId === this.hoveredFloatId;
      const isSelected = float.floatId === this.selectedFloatId;

      // Scale up slightly on hover/selection
      const targetScale = isSelected ? 1.4 : isHovered ? 1.25 : 0.75;
      markerRoot.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

      // Animated Bobbing on ocean surface
      const bobOffset = Math.sin(this.animTime * 2.2 + parseFloat(float.floatId) % 10) * 0.1;
      markerRoot.position.y = bobOffset;

      // Beacon Wave Pulsing Animation
      const pulsePhase = (this.animTime * 1.4 + (parseFloat(float.floatId) % 5)) % 2.0;
      const pulseScale = 1.0 + pulsePhase * 2.2;
      const pulseOpacity = Math.max(0, 0.75 * (1.0 - pulsePhase / 2.0));
      pulseRing.scale.set(pulseScale, pulseScale, pulseScale);
      (pulseRing.material as THREE.MeshBasicMaterial).opacity = isSelected || isHovered ? 0.95 : pulseOpacity;
      (pulseRing.material as THREE.MeshBasicMaterial).color.set(
        isSelected ? 0xffb703 : isHovered ? 0x00f2fe : 0x00c4ff
      );
    });
  }

  public getRaycastObjects(): THREE.Object3D[] {
    return this.instances.map((inst) => inst.hitSphere);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.buoyYellowMat.dispose();
    this.buoyBlackMat.dispose();
    this.buoyWhiteMat.dispose();
    this.pulseMat.dispose();
    this.hitMat.dispose();
  }
}
