import * as THREE from 'three';
import { defaultCoordTransform } from '../../services/coordinateTransform';

interface GeoJSONFeature {
  type: string;
  properties: any;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export class LandmassMesh {
  public group: THREE.Group;
  private landMesh: THREE.Mesh | null = null;
  private coastLines: THREE.LineSegments | null = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  // Materials
  private landMaterial: THREE.MeshStandardMaterial;
  private coastMaterial: THREE.LineBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GeographicLandLayer';

    // Premium dark scientific aesthetic for continental landmasses
    this.landMaterial = new THREE.MeshStandardMaterial({
      color: 0x091830, // Deep slate obsidian
      roughness: 0.7,
      metalness: 0.2,
      flatShading: false,
      side: THREE.DoubleSide,
    });

    // Luminous coastline edge outline
    this.coastMaterial = new THREE.LineBasicMaterial({
      color: 0x3894f2,
      transparent: true,
      opacity: 0.65,
    });

    // Load Natural Earth GeoJSON at runtime
    this.loadLandGeoJson('/geographic/land.geojson');
  }

  /**
   * Asynchronously load and parse WGS84 GeoJSON land dataset
   */
  private async loadLandGeoJson(url: string): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch ${url}`);
      const geojson: GeoJSONFeatureCollection = await res.json();

      this.buildGeographicLand(geojson);
      this.isLoaded = true;
      this.isLoading = false;
      console.log('Successfully loaded and rendered Natural Earth geographic land dataset.');
    } catch (err) {
      this.isLoading = false;
      console.error('Error loading geographic land GeoJSON:', err);
    }
  }

  /**
   * Convert GeoJSON MultiPolygon & Polygon coordinates into 3D extruded land geometry
   */
  private buildGeographicLand(geojson: GeoJSONFeatureCollection): void {
    const shapes: THREE.Shape[] = [];
    const linePoints: THREE.Vector3[] = [];

    const ELEVATION_HEIGHT = 0.6; // 3D land elevation above ocean surface

    geojson.features.forEach((feature) => {
      if (!feature.geometry) return;

      const { type, coordinates } = feature.geometry;

      // Normalize to list of Polygons: Array of [exteriorRing, hole1, hole2...]
      let polygons: number[][][][] = [];
      if (type === 'MultiPolygon') {
        polygons = coordinates as number[][][][];
      } else if (type === 'Polygon') {
        polygons = [coordinates as number[][][]];
      }

      polygons.forEach((poly) => {
        if (!poly || poly.length === 0 || poly[0].length < 3) return;

        // 1. Exterior Ring (Shape boundary)
        const exteriorRing = poly[0];
        const shape = new THREE.Shape();

        exteriorRing.forEach(([lon, lat], idx) => {
          const pt3D = defaultCoordTransform.geoTo3D(lat, lon, 0, 1.0);
          // Map to 2D Shape space (X = X, Y = -Z)
          if (idx === 0) {
            shape.moveTo(pt3D.x, -pt3D.z);
          } else {
            shape.lineTo(pt3D.x, -pt3D.z);
          }
        });

        // 2. Interior Rings (Holes/Cutouts)
        for (let h = 1; h < poly.length; h++) {
          const holeRing = poly[h];
          if (holeRing.length < 3) continue;

          const holePath = new THREE.Path();
          holeRing.forEach(([lon, lat], idx) => {
            const pt3D = defaultCoordTransform.geoTo3D(lat, lon, 0, 1.0);
            if (idx === 0) {
              holePath.moveTo(pt3D.x, -pt3D.z);
            } else {
              holePath.lineTo(pt3D.x, -pt3D.z);
            }
          });
          shape.holes.push(holePath);
        }

        shapes.push(shape);

        // 3. Coastline Outline Segments (drawn at elevated surface)
        poly.forEach((ring) => {
          for (let i = 0; i < ring.length - 1; i++) {
            const p0 = defaultCoordTransform.geoTo3D(ring[i][1], ring[i][0], 0, 1.0);
            const p1 = defaultCoordTransform.geoTo3D(ring[i + 1][1], ring[i + 1][0], 0, 1.0);

            linePoints.push(
              new THREE.Vector3(p0.x, ELEVATION_HEIGHT + 0.02, p0.z),
              new THREE.Vector3(p1.x, ELEVATION_HEIGHT + 0.02, p1.z)
            );
          }
        });
      });
    });

    if (shapes.length === 0) return;

    // Extrude 3D Land Geometry
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: ELEVATION_HEIGHT,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };

    const geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);

    // Rotate so Shape (X, Y) lies in horizontal (X, Z) plane, and extruded depth goes along +Y
    geometry.rotateX(-Math.PI / 2);

    geometry.computeVertexNormals();

    this.landMesh = new THREE.Mesh(geometry, this.landMaterial);
    this.landMesh.castShadow = true;
    this.landMesh.receiveShadow = true;
    this.group.add(this.landMesh);

    // Build Coastlines Mesh
    if (linePoints.length > 0) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
      this.coastLines = new THREE.LineSegments(lineGeom, this.coastMaterial);
      this.group.add(this.coastLines);
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    if (this.landMesh) {
      this.landMesh.geometry.dispose();
    }
    if (this.coastLines) {
      this.coastLines.geometry.dispose();
    }
    this.landMaterial.dispose();
    this.coastMaterial.dispose();
  }
}
