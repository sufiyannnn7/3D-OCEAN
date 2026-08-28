import * as THREE from 'three';
import { SCENE_WIDTH, SCENE_DEPTH } from '../../services/coordinateTransform';
import { WaveManifest, WaveTimestepData, WaveSettings } from '../../types/wave';
import { waveDataLoader } from '../../services/waveDataLoader';

export class WaveSurfaceMesh {
  public group: THREE.Group;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private dataTexture: THREE.DataTexture | null = null;
  private manifest: WaveManifest;
  private totalTime: number = 0;

  constructor(manifest: WaveManifest) {
    this.group = new THREE.Group();
    this.group.name = 'INCOIS_WW3_WaveSurfaceLayer';
    this.manifest = manifest;

    this.initSurfaceMesh();
  }

  private initSurfaceMesh(): void {
    const { lonCount, latCount } = this.manifest.grid;

    // 1. Create Initial Data Texture with Linear Filtering for GPU Bilinear Interpolation
    const initialBuffer = new Float32Array(lonCount * latCount * 4);
    this.dataTexture = new THREE.DataTexture(
      initialBuffer,
      lonCount,
      latCount,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.dataTexture.minFilter = THREE.LinearFilter;
    this.dataTexture.magFilter = THREE.LinearFilter;
    this.dataTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.dataTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.dataTexture.needsUpdate = true;

    // 2. High-resolution geometry matching the geographic aspect ratio
    // 223 x 147 divisions provides smooth continuous curvature across the Indian Ocean basin
    const geometry = new THREE.PlaneGeometry(SCENE_WIDTH, SCENE_DEPTH, 223, 147);
    geometry.rotateX(-Math.PI / 2);

    // 3. Custom Scientific Ocean Surface Shader
    const vertexShader = `
      uniform sampler2D uWaveData;
      uniform float uTime;
      uniform float uIntensity;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vWaveHeight;
      varying float vMask;

      // Realistic directional Gerstner Wave component
      void calcGerstnerWave(
        vec2 dir,
        float steepness,
        float wavelength,
        float speed,
        vec3 basePos,
        float t,
        inout vec3 displaced,
        inout vec3 norm
      ) {
        float k = 2.0 * 3.14159265359 / max(wavelength, 0.5);
        float phase = k * (dot(dir, basePos.xz) - speed * t);
        float a = steepness / k;

        displaced.x += dir.x * (a * cos(phase));
        displaced.y += a * sin(phase);
        displaced.z += dir.y * (a * cos(phase));

        norm.x -= dir.x * (steepness * sin(phase));
        norm.y -= steepness * cos(phase);
        norm.z -= dir.y * (steepness * sin(phase));
      }

      void main() {
        vUv = uv;

        // Sample real INCOIS WW3 parameters from hardware-interpolated texture
        vec4 waveParams = texture2D(uWaveData, uv);
        float hs = waveParams.r;     // Wave Height (meters)
        float mwd = waveParams.g;    // Mean Wave Direction (radians)
        float pwp = waveParams.b;    // Peak Wave Period (seconds)
        float mask = waveParams.a;   // Land/Ocean mask (0.0 to 1.0)

        vWaveHeight = hs * mask;
        vMask = mask;

        vec3 pos = position;

        if (mask > 0.01 && hs > 0.01) {
          // Oceanographic wave propagation vector towards (mwd in radians):
          vec2 mainDir = normalize(vec2(sin(mwd), -cos(mwd)));
          vec2 crossDir = normalize(vec2(sin(mwd + 0.4), -cos(mwd + 0.4)));

          float omega = 2.0 * 3.14159265359 / max(pwp, 2.0);
          float ampScale = hs * 0.14 * uIntensity; // Physical scale for 3D domain

          float wl1 = max(pwp * 1.6, 4.0);
          float wl2 = max(pwp * 0.8, 2.0);

          vec3 displaced = vec3(0.0);
          vec3 n = vec3(0.0, 1.0, 0.0);

          // Primary swell wave
          calcGerstnerWave(mainDir, clamp(ampScale * 0.45, 0.0, 0.35), wl1, omega / (2.0 * 3.14159265359 / wl1), pos, uTime, displaced, n);
          // Secondary directional harmonic
          calcGerstnerWave(crossDir, clamp(ampScale * 0.22, 0.0, 0.18), wl2, (omega * 1.45) / (2.0 * 3.14159265359 / wl2), pos, uTime, displaced, n);

          pos += displaced * mask;
          vNormal = normalize(n);
        } else {
          vNormal = vec3(0.0, 1.0, 0.0);
        }

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform float uColorByHeight;
      uniform float uOpacity;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vWaveHeight;
      varying float vMask;

      // Scientific Colormap for Wave Height: 0m (deep blue) -> 2m (cyan/teal) -> 4m (gold) -> 6m+ (magenta)
      vec3 waveHeightColormap(float h) {
        float t = clamp(h / 6.0, 0.0, 1.0);
        if (t < 0.25) {
          return mix(vec3(0.03, 0.18, 0.45), vec3(0.0, 0.65, 0.85), t / 0.25);
        } else if (t < 0.5) {
          return mix(vec3(0.0, 0.65, 0.85), vec3(0.15, 0.85, 0.65), (t - 0.25) / 0.25);
        } else if (t < 0.75) {
          return mix(vec3(0.15, 0.85, 0.65), vec3(0.95, 0.7, 0.12), (t - 0.5) / 0.25);
        } else {
          return mix(vec3(0.95, 0.7, 0.12), vec3(0.95, 0.18, 0.35), (t - 0.75) / 0.25);
        }
      }

      void main() {
        if (vMask < 0.05) {
          discard;
        }

        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 lightDir = normalize(vec3(40.0, 80.0, 50.0));
        vec3 normal = normalize(vNormal);

        // Fresnel reflection
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
        fresnel = clamp(fresnel, 0.18, 0.88);

        // Specular sunlight glint
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), 36.0);

        // Base ocean surface palette
        vec3 deepWater = vec3(0.02, 0.10, 0.24);
        vec3 shallowWater = vec3(0.0, 0.42, 0.62);
        vec3 skyColor = vec3(0.4, 0.7, 0.98);

        vec3 baseColor;
        if (uColorByHeight > 0.5) {
          baseColor = waveHeightColormap(vWaveHeight);
        } else {
          baseColor = mix(deepWater, shallowWater, clamp(vWaveHeight / 4.5, 0.0, 0.75));
        }

        // Combine lighting and reflections
        float diff = max(dot(normal, lightDir), 0.0) * 0.4 + 0.6;
        vec3 finalColor = baseColor * diff + skyColor * fresnel * 0.4 + vec3(1.0, 0.98, 0.92) * spec * 0.65;

        gl_FragColor = vec4(finalColor, uOpacity * vMask);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uWaveData: { value: this.dataTexture },
        uTime: { value: 0.0 },
        uIntensity: { value: 1.0 },
        uColorByHeight: { value: 1.0 },
        uOpacity: { value: 0.88 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(0, 0.08, 0); // Position slightly above baseline
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    this.group.add(this.mesh);
  }

  /**
   * Update GPU Data Texture when wave timestep changes
   */
  public updateTimestep(stepData: WaveTimestepData): void {
    if (!this.dataTexture) return;

    const buffer = waveDataLoader.createWaveDataTextureBuffer(stepData);
    this.dataTexture.image.data = buffer;
    this.dataTexture.needsUpdate = true;
  }

  /**
   * Animation tick in render loop
   */
  public update(
    settings: WaveSettings,
    deltaSeconds: number
  ): void {
    if (!this.material) return;

    if (settings.isPlaying) {
      this.totalTime += deltaSeconds;
      this.material.uniforms.uTime.value = this.totalTime;
    }

    this.material.uniforms.uIntensity.value = settings.intensity;
    this.material.uniforms.uColorByHeight.value = settings.colorByWaveHeight ? 1.0 : 0.0;
    this.material.uniforms.uOpacity.value = settings.opacity;
    this.group.visible = settings.showWaves;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  public dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.dataTexture) {
      this.dataTexture.dispose();
    }
  }
}
