import * as THREE from 'three';
import { SCENE_WIDTH, SCENE_DEPTH, BASE_DEPTH_HEIGHT, defaultCoordTransform } from '../../services/coordinateTransform';
import { GridManifest } from '../../types/ocean';

export class CoordinateAxes {
  public group: THREE.Group;
  private boxWireframe: THREE.LineSegments | null = null;
  private depthRulerGroup: THREE.Group;
  private labelsGroup: THREE.Group;
  private gridLinesGroup: THREE.Group;
  private compassGroup: THREE.Group;

  constructor(manifest: GridManifest) {
    this.group = new THREE.Group();
    this.group.name = 'CoordinateAxesLayer';

    this.depthRulerGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();
    this.gridLinesGroup = new THREE.Group();
    this.compassGroup = new THREE.Group();

    this.group.add(this.depthRulerGroup);
    this.group.add(this.labelsGroup);
    this.group.add(this.gridLinesGroup);
    this.group.add(this.compassGroup);

    this.buildBoundingBox();
    this.buildLatLonGrid();
    this.buildCompass();
    this.updateDepthRuler(1.0);
  }

  private buildBoundingBox() {
    const boxGeom = new THREE.BoxGeometry(SCENE_WIDTH, BASE_DEPTH_HEIGHT, SCENE_DEPTH);
    const wireGeom = new THREE.WireframeGeometry(boxGeom);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x256ec7,
      transparent: true,
      opacity: 0.35,
    });
    this.boxWireframe = new THREE.LineSegments(wireGeom, wireMat);
    this.boxWireframe.position.set(0, -BASE_DEPTH_HEIGHT / 2, 0);
    this.group.add(this.boxWireframe);
  }

  private buildLatLonGrid() {
    const latTicks = [-20, -10, 0, 10, 20];
    const lonTicks = [40, 60, 80, 100];

    const lineMat = new THREE.LineDashedMaterial({
      color: 0x1f4f9c,
      transparent: true,
      opacity: 0.45,
      dashSize: 1.5,
      gapSize: 1.0,
    });

    latTicks.forEach((lat) => {
      const zPos = defaultCoordTransform.geoTo3D(lat, 75, 0).z;
      const points = [
        new THREE.Vector3(-SCENE_WIDTH / 2, 0.05, zPos),
        new THREE.Vector3(SCENE_WIDTH / 2, 0.05, zPos),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, lineMat);
      line.computeLineDistances();
      this.gridLinesGroup.add(line);

      const labelText = lat === 0 ? '0° EQ' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`;
      const spriteW = this.createTextSprite(labelText, '#70b5ff');
      spriteW.position.set(-SCENE_WIDTH / 2 - 3.2, 0.5, zPos);
      this.labelsGroup.add(spriteW);

      const spriteE = this.createTextSprite(labelText, '#70b5ff');
      spriteE.position.set(SCENE_WIDTH / 2 + 3.2, 0.5, zPos);
      this.labelsGroup.add(spriteE);
    });

    lonTicks.forEach((lon) => {
      const xPos = defaultCoordTransform.geoTo3D(0, lon, 0).x;
      const points = [
        new THREE.Vector3(xPos, 0.05, -SCENE_DEPTH / 2),
        new THREE.Vector3(xPos, 0.05, SCENE_DEPTH / 2),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, lineMat);
      line.computeLineDistances();
      this.gridLinesGroup.add(line);

      const labelText = `${lon}°E`;
      const spriteN = this.createTextSprite(labelText, '#70b5ff');
      spriteN.position.set(xPos, 0.5, -SCENE_DEPTH / 2 - 2.8);
      this.labelsGroup.add(spriteN);

      const spriteS = this.createTextSprite(labelText, '#70b5ff');
      spriteS.position.set(xPos, 0.5, SCENE_DEPTH / 2 + 2.8);
      this.labelsGroup.add(spriteS);
    });
  }

  private buildCompass() {
    const posX = SCENE_WIDTH / 2 - 6;
    const posZ = -SCENE_DEPTH / 2 + 6;

    const arrowGroup = new THREE.Group();
    arrowGroup.position.set(posX, 1.2, posZ);

    const coneGeom = new THREE.ConeGeometry(0.8, 2.5, 8);
    coneGeom.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x006688,
    });
    const northCone = new THREE.Mesh(coneGeom, coneMat);
    northCone.position.z = -1.25;
    arrowGroup.add(northCone);

    const southGeom = new THREE.ConeGeometry(0.8, 2.5, 8);
    southGeom.rotateX(Math.PI / 2);
    const southMat = new THREE.MeshStandardMaterial({
      color: 0x18386e,
    });
    const southCone = new THREE.Mesh(southGeom, southMat);
    southCone.position.z = 1.25;
    arrowGroup.add(southCone);

    const nSprite = this.createTextSprite('N', '#00f2fe', 48);
    nSprite.position.set(0, 0.2, -3.2);
    arrowGroup.add(nSprite);

    this.compassGroup.add(arrowGroup);
  }

  public updateDepthRuler(verticalExaggeration: number): void {
    while (this.depthRulerGroup.children.length > 0) {
      this.depthRulerGroup.remove(this.depthRulerGroup.children[0]);
    }

    const totalHeight = BASE_DEPTH_HEIGHT * verticalExaggeration;
    const cornerX = -SCENE_WIDTH / 2;
    const cornerZ = SCENE_DEPTH / 2;

    if (this.boxWireframe) {
      this.boxWireframe.scale.set(1, verticalExaggeration, 1);
      this.boxWireframe.position.set(0, -totalHeight / 2, 0);
    }

    const spinePoints = [
      new THREE.Vector3(cornerX, 0, cornerZ),
      new THREE.Vector3(cornerX, -totalHeight, cornerZ),
    ];
    const spineGeom = new THREE.BufferGeometry().setFromPoints(spinePoints);
    const spineMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 2 });
    const spine = new THREE.Line(spineGeom, spineMat);
    this.depthRulerGroup.add(spine);

    const depthTicks = [5, 100, 250, 500, 1000, 2000];
    depthTicks.forEach((depthM) => {
      const depthFrac = Math.min(1.0, depthM / 2000);
      const yPos = -depthFrac * totalHeight;

      const tickPoints = [
        new THREE.Vector3(cornerX, yPos, cornerZ),
        new THREE.Vector3(cornerX - 1.5, yPos, cornerZ + 1.5),
      ];
      const tickGeom = new THREE.BufferGeometry().setFromPoints(tickPoints);
      const tickMat = new THREE.LineBasicMaterial({ color: 0x70b5ff });
      const tickLine = new THREE.Line(tickGeom, tickMat);
      this.depthRulerGroup.add(tickLine);

      const labelText = depthM === 5 ? '5 m (Surface)' : `-${depthM} m`;
      const sprite = this.createTextSprite(labelText, '#a8d3ff', 32);
      sprite.position.set(cornerX - 4.5, yPos, cornerZ + 3.0);
      this.depthRulerGroup.add(sprite);
    });
  }

  private createTextSprite(text: string, color: string = '#ffffff', fontSize: number = 36): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 128);
      ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText(text, 128, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(6.0, 3.0, 1.0);
    return sprite;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {}
}
